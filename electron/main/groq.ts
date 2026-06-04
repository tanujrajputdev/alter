const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

const SYSTEM_PROMPT = `You are a precise text transformation assistant.
Rules you MUST follow:
1. Return ONLY the transformed text — no preamble, no explanation, no quotes around the output.
2. Do not add "Here is the transformed text:" or any similar introduction.
3. Preserve the original language unless explicitly asked to translate.
4. Preserve formatting (paragraphs, bullet points) unless the command changes them.
5. If the command is ambiguous, make the most helpful reasonable interpretation.
6. If the input is empty or too short to transform meaningfully, return it unchanged.`

const PRIMARY_MODEL = 'llama-3.3-70b-versatile'
const FALLBACK_MODEL = 'llama3-8b-8192'

/**
 * Transform `text` according to a plain-English `command` using the Groq API.
 * Tries PRIMARY_MODEL first, falls back to FALLBACK_MODEL on model errors.
 */
export async function transformText(
  text: string,
  command: string,
  apiKey: string,
  model: string = PRIMARY_MODEL,
  appContext: string | null = null
): Promise<string> {
  if (!text.trim()) return text

  const userMessage = `TEXT TO TRANSFORM:\n${text}\n\nCOMMAND: ${command}`
  const systemPrompt = appContext
    ? `${SYSTEM_PROMPT}\n\nCONTEXT: ${appContext}`
    : SYSTEM_PROMPT

  try {
    return await callGroq(systemPrompt, userMessage, apiKey, model)
  } catch (err: any) {
    if (
      model !== FALLBACK_MODEL &&
      (err.message?.includes('model') || err.message?.includes('404'))
    ) {
      console.warn(`[groq] primary model failed, retrying with ${FALLBACK_MODEL}`)
      return await callGroq(systemPrompt, userMessage, apiKey, FALLBACK_MODEL)
    }
    throw err
  }
}

async function callGroq(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  model: string
): Promise<string> {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.3,
      max_tokens: 2048,
      stream: false
    })
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(parseGroqError(response.status, body))
  }

  const data = await response.json() as GroqResponse
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('Groq returned an empty response.')
  return content
}

function parseGroqError(status: number, body: string): string {
  switch (status) {
    case 401: return 'Invalid Groq API key. Open Settings to update it.'
    case 429: return 'Rate limit reached. Wait a moment and try again.'
    case 503: return 'Groq service is temporarily unavailable. Try again shortly.'
    default: {
      try {
        const parsed = JSON.parse(body)
        return parsed?.error?.message ?? `Groq API error (${status})`
      } catch {
        return `Groq API error (${status})`
      }
    }
  }
}

interface GroqResponse {
  choices: {
    message: { content: string }
    finish_reason: string
  }[]
}
