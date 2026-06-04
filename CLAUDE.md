# CLAUDE.md — Clipboard AI

## What this app does

Clipboard AI is a macOS menu-bar utility. Press **⌥ Space** from any app, and a
floating HUD appears over your current window. It shows the last text you copied
and lets you transform it with a plain-English command ("make this friendlier",
"translate to Hindi", "summarize"). The result lands back in your clipboard and
auto-pastes where your cursor is — all in ~1.5 s, without ever leaving your app.

## Tech stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 33 |
| Build | electron-vite 2 + Vite 5 |
| UI | React 18 + TypeScript |
| AI | Groq API (llama-3.3-70b-versatile) |
| Secrets | Electron safeStorage → macOS Keychain |
| Packaging | electron-builder → .dmg |
| Hotkey | Electron globalShortcut (⌥ Space) |
| Paste | osascript keystroke |

## Project layout

```
clipboard-ai/
├── CLAUDE.md                        ← you are here
├── README.md
├── ARCHITECTURE.md
├── ROADMAP.md
├── package.json
├── tsconfig.json / tsconfig.node.json / tsconfig.web.json
├── electron.vite.config.ts
├── electron-builder.yml
├── .gitignore
│
├── electron/
│   ├── main/
│   │   ├── index.ts               ← app entry, tray, windows, IPC
│   │   ├── hotkey.ts              ← globalShortcut registration
│   │   ├── groq.ts                ← Groq API client + transforms
│   │   ├── keychain.ts            ← safeStorage wrapper
│   │   └── paste.ts               ← osascript auto-paste
│   └── preload/
│       └── index.ts               ← contextBridge API surface
│
├── renderer/
│   ├── index.html                 ← single HTML entry
│   └── src/
│       ├── main.tsx               ← React mount, view router
│       ├── types.ts               ← shared TypeScript types
│       ├── components/
│       │   ├── HUD.tsx            ← the floating command bar (primary UX)
│       │   ├── Onboarding.tsx     ← first-run API key + permission setup
│       │   └── Settings.tsx       ← menu-bar popover (hotkey, key, history)
│       └── styles/
│           └── global.css         ← resets + macOS vibrancy tweaks
│
├── native/macos/
│   └── HotkeyHelper.swift         ← optional Swift upgrade path for v2
│
├── resources/
│   ├── icon.png                   ← 512×512 app icon
│   ├── tray-icon.png              ← 16×16 or 32×32 template image
│   └── entitlements.mac.plist     ← hardened runtime entitlements
│
└── scripts/
    └── build-native.sh            ← compile Swift helper (v2)
```

## Running locally

```bash
npm install
npm run dev          # opens Electron in dev mode with hot reload
```

On first run the Onboarding screen appears automatically if no API key is stored.

## Building a distributable

```bash
npm run dist         # builds macOS .dmg (arm64 + x64 universal)
```

Output goes to `dist/`. Requires macOS. No Apple Developer account needed for
local testing (the .dmg is unsigned — users must right-click → Open first time).

## IPC communication contract

All renderer ↔ main communication goes through the `window.electronAPI` bridge
exposed in `preload/index.ts`. Never use `nodeIntegration: true`.

| Channel | Direction | Purpose |
|---|---|---|
| `transform:text` | renderer → main | `(text, command) → {success, result, error}` |
| `clipboard:get` | renderer → main | `() → string` |
| `clipboard:accept` | renderer → main | `(text) → void` — writes + auto-pastes |
| `hud:hide` | renderer → main | dismiss HUD |
| `hud:resize` | renderer → main | `(height: number)` — resize HUD window |
| `hud:show` | main → renderer | `{clipboardText}` — populate HUD on open |
| `keychain:get` | renderer → main | `(key) → string \| null` |
| `keychain:set` | renderer → main | `(key, value) → void` |
| `settings:get` | renderer → main | `() → Settings` |
| `settings:save` | renderer → main | `(Settings) → void` |

## HUD states

```
IDLE ──[hotkey]──► POPULATED ──[type + enter]──► LOADING ──[api returns]──► RESULT
                        │                                                       │
                        └──[ESC / blur]──► hidden          [Accept] or [Dismiss]
```

HUD window height changes per state:
- IDLE / POPULATED (no result): 175 px
- RESULT: 260 px
- Resize via `hud:resize` IPC

## Adding a new transform

1. Add an entry to `QUICK_CHIPS` in `renderer/src/components/HUD.tsx`
2. No backend changes needed — the command string is passed directly to Groq

## Groq prompt engineering

System prompt in `electron/main/groq.ts`:
- Role: "You are a text transformation assistant."
- Rule: "Return ONLY the transformed text. No preamble, no quotes, no markdown."
- Rule: "Preserve the language of the original unless explicitly asked to translate."
- Rule: "If the command is ambiguous, make the most helpful reasonable interpretation."

Model: `llama-3.3-70b-versatile` — fast enough for interactive use (~1–2 s).
Fallback: `llama3-8b-8192` if the primary model returns an error.

## Settings schema

```ts
interface Settings {
  hotkey: string          // default: "Alt+Space"
  model: string           // default: "llama-3.3-70b-versatile"
  recentTransforms: {     // capped at 20 entries
    command: string
    inputSnippet: string
    timestamp: number
  }[]
}
```

Stored via `electron-store` (JSON on disk, not Keychain — non-sensitive).
API key stored separately via `safeStorage` (Keychain).

## macOS permissions required

| Permission | Why | How prompted |
|---|---|---|
| Accessibility | Auto-paste via osascript keystroke | System Settings on first use |

Microphone and Input Monitoring are NOT required for v1 (no voice input).

## Known gotchas

- **`app.dock.hide()`** must be called before `app.whenReady()` on some macOS versions.
  Call it at module scope, not inside the ready handler.
- **HUD blur dismiss**: the `blur` event fires when macOS system dialogs (like
  permission prompts) appear. Add a 200 ms grace period before hiding on blur
  to avoid the window vanishing during permission requests.
- **safeStorage on first run**: `safeStorage.isEncryptionAvailable()` returns false
  until Keychain is unlocked (rare). Always handle the null case gracefully.
- **osascript paste**: requires Accessibility permission. If denied, the text is
  still written to clipboard — the user can paste manually with ⌘V.
- **globalShortcut conflicts**: if ⌥ Space is already taken by another app,
  `register()` returns false silently. Check the return value and notify the user.

## v2 upgrade notes (do not implement now)

- Voice command: replace text input with `MediaRecorder` → Groq Whisper API
- Multi-provider: abstract `groq.ts` into a `provider/` directory
- Swift hotkey helper: see `native/macos/HotkeyHelper.swift` for Fn / CapsLock support
- Custom preset templates: extend `Settings.recentTransforms` into saved presets
- App-context detection: use Accessibility API to read frontmost app name,
  inject into system prompt for context-aware transforms
