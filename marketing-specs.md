# Alter — Marketing Specs

> Feed this file to Claude (or any LLM) to generate Twitter / LinkedIn / launch
> posts, ad copy, Product Hunt blurbs, cold DMs, landing-page copy, etc.

---

## 1. One-liner

**Alter is a macOS menu-bar app that turns your clipboard into an AI command line. Copy → ⌥ Space → type a command → paste. ~1.5 seconds, anywhere on macOS.**

Alternate one-liners:
- *"AI lives in your clipboard now."*
- *"Spotlight, but for transforming the text you just copied."*
- *"ChatGPT without the tab-switch. ⌥ Space, transform, paste."*
- *"The fastest way to rewrite, translate, shrink, or fix any text on your Mac."*
- *"Your clipboard, but it can think."*

---

## 2. The problem

Every knowledge worker has the same loop 30+ times a day:

1. Read a message / draft an email / receive a paragraph
2. Want to **rewrite it** / **shrink it** / **translate it** / **fix the tone** / **explain it**
3. Open a new tab → ChatGPT or Claude → paste → type instruction → wait → copy → switch back → paste

That's **8 steps and 30+ seconds** for what should be one keystroke. Multiply by 30 a day and it's an hour gone.

The tab-switch breaks flow. The waiting breaks flow. Most people just don't bother — they ship the worse draft.

---

## 3. The solution — what Alter does

Press **⌥ Space** in any app. A floating bar appears over your current window with the last text you copied already loaded. Type a plain-English command. Hit Enter. ~1.5 seconds later, the transformed text auto-pastes where your cursor was.

You never leave the app you're in. You never see a browser tab. The HUD vanishes.

### The full loop

```
⌘C  →  ⌥ Space  →  type "make this friendlier"  →  Enter  →  Accept  →  pasted
```

End-to-end: **under 2 seconds.**

---

## 4. Why it's different from ChatGPT / Claude / Raycast AI

| | ChatGPT (browser/app) | Raycast AI | **Alter** |
|---|---|---|---|
| Tab switch required | Yes | No | **No** |
| Pre-loads clipboard | No | No | **Yes** |
| Auto-pastes result | No | No | **Yes** |
| Time per transform | 30–60 s | 5–10 s | **~1.5 s** |
| Runs offline-first UI | No | No | **Yes (menu bar)** |
| Free / no subscription | $20/mo | $8/mo | **Free + free Groq tier** |
| Local API key (no account) | No | No | **Yes** |

Alter is positioned as the **micro-utility for text transformation** — not a chatbot, not a workspace, not a sidebar. One job, done in 1.5 seconds.

---

## 5. Core features (what's actually shipped in v1)

### The HUD (primary surface)
- Floating 540×210 px command bar that summons over any app via **⌥ Space**
- Auto-loads your last copied text
- Plain-English command input ("translate to Hindi", "make this shorter", "explain like I'm 5")
- 6 pinned one-click presets shown as chips: Rewrite, Shrink, Translate, Fix, Expand, Explain, Reply, Formal
- ⌘K opens the full preset library inline (browse + search)
- Result preview before pasting — Accept or Dismiss
- Auto-paste lands the result where your cursor is, in the app you came from
- Escape or click-away dismisses

### The Dashboard (secondary surface)
A polished menu-bar window for everything that doesn't belong in the HUD:
- **Presets tab** — manage your library of one-click transforms, add your own
- **History tab** — every transform you've made, with input + result snippets
- **Settings tab** — change hotkey, toggle features, manage permissions
- **API Key tab** — masked Groq key, copy/delete, status pill

Visual language: warm cream canvas (`#f4eee2`), black accents, status pills (GRANTED / REQUIRED / ACTIVE), white cards with soft rounded corners. Inspired by Unmute / Linear's premium feel.

### Speed & infra
- **Groq llama-3.3-70b-versatile** for ~1.5 s transforms (fallback: llama3-8b)
- Stateless API — no chat history sent, just the current text + command
- Single fetch per transform, no streaming overhead

### Privacy & security
- API key encrypted via **macOS Keychain** (`safeStorage`)
- No analytics, no telemetry, no remote logging
- No account, no signup — just paste your Groq key on first run
- Clipboard text only sent to Groq when you press Enter
- Open source — verifiable on GitHub

### macOS native polish
- Lives in the **menu bar** only — `LSUIElement: true`, zero Dock clutter
- Custom template tray icon (tints automatically light/dark)
- First-run **Onboarding flow** (welcome → API key → permission grant)
- Inline Accessibility permission check with one-tap prompt
- Smart paste flow that avoids the macOS "funk" sound — `app.hide()` + frontmost re-activation
- Hotkey conflict detection with safe re-registration
- Distributed as a signed-ready `.dmg` with proper drag-to-Applications UX

---

## 6. Stack (for the "how it's built" angle)

- Electron 33 + React 18 + TypeScript
- electron-vite 2 + Vite 5 for builds
- Groq API (OpenAI-compatible interface) for transforms
- `@hugeicons/react` for the icon system
- `electron-store` for non-sensitive prefs, `safeStorage` for the API key
- `electron-builder` for `.dmg` packaging (arm64 + x64)
- Native macOS APIs: `globalShortcut`, `clipboard`, `osascript`, `systemPreferences`

---

## 7. Built-in transforms (the "what can it do" list)

These ship as one-click chips. Each is also a plain command users can type freeform:

| Preset | What it does | Example |
|---|---|---|
| **Rewrite** | Improves clarity + flow without changing meaning | Slack message → cleaner Slack message |
| **Shrink** | Cuts to 1–2 sentences | 5-paragraph email → TL;DR |
| **Expand** | Fleshes out a terse line into a full paragraph | bullet → paragraph |
| **Translate** | To/from any language | English → Hindi, Spanish, Japanese |
| **Fix** | Grammar, spelling, punctuation, tone | typo'd note → publishable |
| **Explain** | Plain English, ELI5 | jargon → English |
| **Reply** | Drafts a contextual reply to a message | incoming email → ready-to-send reply |
| **Formal** | Casual → professional tone | DM tone → email tone |

Plus **anything you can type into ChatGPT** as a custom command:
- "translate to French and make it formal"
- "rewrite this as a tweet under 280 chars"
- "convert this to a bulleted list"
- "extract the action items"
- "summarize as 3 takeaways"
- "fix the JSON"
- "rewrite in the style of [X]"

---

## 8. Who it's for (audiences)

### Primary
- **Knowledge workers** writing 20+ messages/emails per day (PMs, founders, designers, recruiters, salespeople)
- **Non-native English writers** who paste into ChatGPT for tone polishing
- **Bilingual users** translating between two languages all day
- **Developers** who copy error messages, JSON, regex into ChatGPT for explanation

### Secondary
- **Students** writing assignments
- **Customer support** writing replies
- **Content creators** repurposing across formats (long → tweet, blog → newsletter)
- **Anyone who pays for ChatGPT Plus only to paste-and-rewrite**

### Anti-audience (don't market to)
- People who want a long-form chatbot
- Windows users (v1 is macOS only)
- Voice-first users (v1 is text only)

---

## 9. Positioning angles to test

Pick whichever resonates per channel:

1. **Speed angle**: "30 seconds → 1.5 seconds. The math on tab-switching to ChatGPT is brutal once you see it."
2. **Flow angle**: "Stop leaving the app you're in just to fix one sentence."
3. **Privacy angle**: "Your API key, your machine, your clipboard. No account. No telemetry. Open source."
4. **Power-user angle**: "I built this because I was paying $20/mo to ChatGPT to copy-paste 40 times a day. Now I press ⌥ Space."
5. **Native angle**: "macOS Spotlight for text transformations. Lives in the menu bar. Auto-pastes back where you were."
6. **Anti-SaaS angle**: "No subscription. No login. No cloud sync. Just a hotkey and a fast model."
7. **Builder angle**: "Built in a weekend with Electron + Groq + Claude Code. Here's how."

---

## 10. Launch beats / content hooks

### Twitter / X hook ideas
- *"I press ⌥ Space ~40 times a day now. Quietly the most-used app on my Mac."*
- *"Built a tiny macOS app that turns ⌥ Space into a 1.5 s text-rewriter. No tab switch, no ChatGPT, no account. Demo:"*
- *"Hot take: ChatGPT for editing text is the wrong UX. It should be a hotkey. So I built that."*
- *"3 keystrokes. ~1.5 seconds. Replaces 90% of what I used ChatGPT for."*
- *"Shipped Alter today. macOS. Free. Open source. Groq under the hood. ⌥ Space anywhere → transform → auto-paste."*

### LinkedIn hook ideas
- *"I noticed I was opening ChatGPT 30+ times a day just to rewrite a sentence. Then immediately closing it. So I built the tool I actually wanted."*
- *"Three weeks ago I had an idea. Today it's a signed .dmg. The new bar for shipping is a weekend."*
- *"AI products that respect your existing workflow > AI products that demand a new one. Here's a tiny example."*
- *"The best AI apps don't have a chat window."*

### Product Hunt tagline candidates
- "AI lives in your clipboard now"
- "⌥ Space → transform any text → paste. ~1.5 s, in any app."
- "The macOS menu-bar AI assistant that auto-pastes"
- "Spotlight for text transformations"

### Demo-script (for the GIF caption)
> Copy any text. Press ⌥ Space. Type "make this shorter and friendlier." Watch it paste back where you were. That's the whole product.

---

## 11. Honest limits (don't over-promise)

For credibility, lean into these — they make the pitch land harder:
- macOS only (v1) — Windows/Linux not yet
- Text only — no voice input in v1
- Brings your own Groq key (free tier is plenty for ~1,000 transforms/day)
- Unsigned .dmg right now — right-click → Open on first launch (or grab signed build when available)
- Internet required (Groq is cloud) — not a local LLM

---

## 12. Built-in differentiators worth highlighting

- **Auto-paste** — not just clipboard write, actual ⌘V into the source app
- **Frontmost-app awareness** — knows which app you came from and returns focus
- **Single hotkey, single window** — no tabs, no chat, no history scrolling required
- **First-class onboarding** — accessibility permission, key entry, hotkey verification in 3 screens
- **Preset library + history** — your common moves are 1 click; everything you've ever transformed is searchable

---

## 13. Where the product is going (v2 teasers — use sparingly)

- Voice command via Whisper
- Multi-provider (OpenAI, Anthropic, local Ollama)
- App-context aware (knows you're in Slack vs. email vs. code)
- Custom preset templates with variables
- Swift hotkey helper (Fn key, CapsLock as command key)

---

## 14. Names + brand vocabulary

- Product name: **Alter**
- Tagline (current): *AI lives in your clipboard now.*
- Brand colors: warm cream `#f4eee2`, ink black `#131210`, white surfaces
- Tone of voice: confident, dry, builder-to-builder, never breathless. Avoid: "revolutionary", "game-changing", "AI-powered". Use: "fast", "lives in your menu bar", "one keystroke", "1.5 seconds".
- Hotkey signature: **⌥ Space** (always written with the option-symbol)

---

## 15. Asset checklist

Available in the repo:
- `resources/alter-logo.png` — full color logo
- `resources/icon.icns` / `resources/icon.png` — app icon (1024×1024)
- `resources/tray-icon@2x.png` — menu-bar template icon
- `docs/demo-hud.gif` — HUD in action (the primary loop)
- `docs/demo-dashboard.gif` — Dashboard tour
- `dist/Alter-1.0.0-arm64.dmg` — distributable

---

## 16. CTA options

- "Get Alter (free) → [github.com/tanujrajputdev/alter](https://github.com/tanujrajputdev/alter)"
- "Download the .dmg → github.com/tanujrajputdev/alter/releases"
- "Star it on GitHub if you'd use this →"
- "RT if you'd press ⌥ Space ~40 times a day"

---

## 17. Prompt-ready summary for an LLM

If you want to paste a single block into Claude/ChatGPT for content generation, use this:

> Alter is a free, open-source macOS menu-bar app. The user presses ⌥ Space from any app, a floating command bar appears with their last-copied text pre-loaded, they type a plain-English instruction ("rewrite", "translate to Hindi", "make this shorter"), hit Enter, and ~1.5 seconds later the transformed text auto-pastes where their cursor was — in the original app, with zero tab-switching. Built on Electron + React + Groq (llama-3.3-70b). Stack is fast, the UI is warm cream + ink black inspired by Linear/Unmute. API key stored encrypted in macOS Keychain. No account, no telemetry, no subscription. Lives in the menu bar. Audience: knowledge workers who currently paste into ChatGPT 30+ times a day to rewrite, translate, or fix text. Positioning: not a chatbot, not a workspace — a one-keystroke micro-utility. Differentiators vs ChatGPT/Raycast AI: no tab switch, auto-paste, clipboard pre-load, ~1.5 s end-to-end. Tone: dry, builder-to-builder, anti-hype.
