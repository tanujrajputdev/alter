# Architecture

## Decision log

### Why Electron (not native Swift/SwiftUI)?

The app is ~95% TypeScript/React. The only macOS-specific surface is:
- Global hotkey registration (`globalShortcut`)
- Clipboard read/write (`electron.clipboard`)
- Auto-paste (`osascript`)
- API key storage (`safeStorage`)

All four are one-liners in Electron. A native rewrite would add weeks of
development for no user-visible benefit at this stage.

### Why Groq (not OpenAI)?

Latency. A Groq llama-3.3-70b call returns in 1–2 s. GPT-4o returns in 4–8 s.
For a clipboard utility, the difference between "instant" and "I'm waiting"
defines whether users adopt the habit.

Groq also has a generous free tier and a simple REST API compatible with the
OpenAI SDK interface — making provider switching trivial in v2.

### Why no streaming?

The transform output replaces the entire clipboard at once. There is no
"progressive paste" — partial text inserted mid-stream would corrupt the target
document. We wait for the full result before showing it.

For the loading state, a progress bar is animated client-side. Actual streaming
may be added in v2 for the result *preview* area (show text populating) while
keeping the clipboard write atomic.

### Single HTML entry (not multi-window HTML)

All windows (HUD, Settings, Onboarding) share one renderer bundle. The active
view is selected via `?view=hud|settings|onboarding` query parameter. This
simplifies the Vite config and eliminates duplicate bundle overhead.

Trade-off: the Settings and Onboarding bundles are loaded even when only the
HUD is visible. At this app's size (~50 KB JS), this is negligible.

### HUD window properties

```ts
{
  frame: false,          // no title bar
  transparent: true,     // lets vibrancy show through
  alwaysOnTop: true,     // appears over every app
  vibrancy: 'hud',       // macOS frosted glass
  visualEffectState: 'active',  // vibrancy stays active when unfocused
  hasShadow: true,
  skipTaskbar: true,
}
```

`vibrancy: 'hud'` gives the frosted-glass appearance native to macOS system
overlays (Spotlight, Notification Center) — users instantly recognise the
visual pattern as "system-level utility."

### IPC security model

- `contextIsolation: true` always
- `nodeIntegration: false` always
- Renderer only calls `window.electronAPI.*` methods exposed via `contextBridge`
- Main process validates all inputs before acting
- API key never flows back to renderer after being saved

### Auto-paste implementation

```bash
osascript -e 'tell application "System Events" to keystroke "v" using command down'
```

This requires Accessibility permission. Fallback: if permission is denied,
the text is silently written to clipboard — the user can paste with ⌘V.

The 150 ms delay between `hudWindow.hide()` and the osascript call ensures
the HUD has dismissed and focus has returned to the original app before the
paste keystroke fires.

### Keychain storage

```ts
// Write
const buf = safeStorage.encryptString(apiKey)
store.set('encrypted-api-key', buf.toString('base64'))

// Read
const buf = Buffer.from(store.get('encrypted-api-key'), 'base64')
return safeStorage.decryptString(buf)
```

`safeStorage` uses the macOS Keychain internally. The encrypted buffer is
persisted to `electron-store` (a JSON file) since Keychain doesn't expose a
simple persistent KV interface from Electron.

## Data flow diagram

```
User presses ⌥ Space
       │
       ▼
globalShortcut fires in main process
       │
       ├─── clipboard.readText() ──────────────────────┐
       │                                               │
       ▼                                               ▼
hudWindow.show()                             sends {clipboardText} to HUD
       │                                    via ipcMain → webContents.send
       ▼
HUD renders in renderer
       │
User types command + Enter
       │
       ▼
renderer calls window.electronAPI.transform(text, command)
       │
       ▼
main: ipcMain.handle('transform:text')
       │
       ▼
groq.ts: fetch(api.groq.com/openai/v1/chat/completions)
       │
       ▼
result returned to renderer via ipcMain.handle resolve
       │
       ▼
HUD shows result — user clicks Accept
       │
       ▼
renderer calls window.electronAPI.accept(resultText)
       │
       ▼
main:
  1. clipboard.writeText(resultText)
  2. hudWindow.hide()
  3. setTimeout(150ms)
  4. exec('osascript -e keystroke "v" using command down')
```
