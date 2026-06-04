import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

let lastFrontmost: string | null = null

/**
 * Returns the name of the frontmost macOS application, or null if we can't tell.
 * Uses osascript — fast (~30 ms) and requires no extra permissions.
 */
export async function getFrontmostApp(): Promise<string | null> {
  if (process.platform !== 'darwin') return null

  try {
    const { stdout } = await execAsync(
      `osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`,
      { timeout: 500 }
    )
    const name = stdout.trim()
    // Skip our own app — return last known so we paste back into the real
    // foreground app (the one the user came from)
    if (!name || /^(Electron|Alter|Clipboard AI)$/i.test(name)) {
      return lastFrontmost
    }
    lastFrontmost = name
    return name
  } catch {
    return lastFrontmost
  }
}

/**
 * Translate a frontmost-app name into a system-prompt context snippet.
 * Keeps the model's transform relevant to where the user is working.
 */
export function appContextSnippet(app: string | null): string | null {
  if (!app) return null
  const key = app.toLowerCase()

  if (/mail|spark|airmail|outlook|superhuman/.test(key))
    return 'The user is drafting or reading an email. Match a professional but warm email tone.'
  if (/slack|discord|telegram|whatsapp|messages/.test(key))
    return 'The user is writing a chat message. Keep it concise and conversational.'
  if (/code|cursor|xcode|sublime|atom|webstorm|intellij|nvim|vim/.test(key))
    return 'The user is working in a code editor. If the input looks like code, preserve syntax. If it is a comment or doc, match technical writing conventions.'
  if (/notion|obsidian|bear|craft|logseq/.test(key))
    return 'The user is writing in a notes/docs app. Match clean documentation style with good structure.'
  if (/safari|chrome|firefox|arc|brave/.test(key))
    return 'The user is in a web browser. The text may be from any source — interpret based on content.'
  if (/figma|sketch|linear|jira|asana|trello/.test(key))
    return 'The user is in a product/design tool. Match a clear, action-oriented product writing style.'
  if (/word|pages|docs/.test(key))
    return 'The user is in a long-form document. Preserve formal document tone.'
  if (/terminal|iterm|warp|ghostty/.test(key))
    return 'The user is in a terminal. Treat input as command-line text or shell output.'

  return null
}
