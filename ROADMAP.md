# Roadmap

## v1 — The core loop (current)

Goal: nail the copy → transform → paste habit. Nothing else.

- [x] Global hotkey (⌥ Space) triggers floating HUD
- [x] HUD reads and displays clipboard content
- [x] Plain-English command input
- [x] Six quick-pick chips (rewrite, shrink, expand, translate, explain, reply)
- [x] Groq API transforms text (~1.5 s)
- [x] Accept → auto-paste into active app
- [x] Dismiss / ESC → no changes
- [x] First-run onboarding (permission + API key + hotkey confirm)
- [x] API key stored in macOS Keychain via safeStorage
- [x] Menu bar icon (no Dock entry)
- [x] Settings panel (hotkey, model, recent history)
- [x] Recent transforms log (last 20, stored locally)

## v1.1 — Stability + polish

- [ ] Handle clipboard containing non-text (images, files) gracefully
- [ ] Keyboard navigation in quick-chips row (Tab key cycles)
- [ ] Error messages that are actually helpful (rate limit, invalid key, no internet)
- [ ] Hotkey conflict detection — notify user if ⌥ Space is already registered
- [ ] Auto-launch at login (menu bar toggle)
- [ ] App icon (proper .icns with all resolutions)

## v2 — Power features

- [ ] **Voice command**: hold ⌥ Space → speak command → release → transforms
  - Groq Whisper API for transcription
  - Swift helper for reliable Fn / CapsLock key capture
- [ ] **Multi-provider**: swap Groq for OpenAI, Anthropic, or local Ollama
  - Abstract into `providers/` directory
  - Per-provider model picker in Settings
- [ ] **Saved presets**: name and save custom commands
  - "My presets" section in Settings
  - Pin up to 3 as quick-pick chips
- [ ] **App-aware context**: detect frontmost app, inject as system prompt context
  - Gmail → "You are helping draft/reply to an email"
  - VS Code → "You are helping with code"
  - Notion → "You are helping with documentation"
- [ ] **Undo last transform**: ⌘Z restores previous clipboard content
- [ ] **Transform history search**: full-text search across recent transforms

## v3 — Distribution

- [ ] Apple notarization + signed DMG for frictionless install
- [ ] Homebrew cask: `brew install --cask clipboard-ai`
- [ ] Auto-update via `electron-updater`
- [ ] Telemetry opt-in (anonymous usage stats)
- [ ] Public website + Product Hunt launch

## Not planned

- iOS / iPadOS companion app
- Team sharing / cloud sync
- Browser extension
- Windows / Linux support
