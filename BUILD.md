# Build guide

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| macOS | 13 Ventura + | — |
| Node.js | 18 + | https://nodejs.org |
| npm | 10 + | bundled with Node |
| Xcode CLI | latest | `xcode-select --install` |

## Development (hot reload)

```bash
npm install
npm run dev
```

The app launches in dev mode. The HUD is bound to ⌥ Space immediately.
DevTools open via right-click → Inspect or `Cmd+Opt+I` in any window.

## Production build

```bash
npm run build     # compile TypeScript → out/
npm run dist      # package → dist/Clipboard AI-1.0.0.dmg
```

Both arm64 (Apple Silicon) and x64 (Intel) are built by default.

## Universal binary (arm64 + x64)

electron-builder handles this automatically via the `arch: [arm64, x64]`
config in `electron-builder.yml`. The result is a universal `.dmg`.

## Installing the DMG

1. Open `dist/Clipboard AI-1.0.0.dmg`
2. Drag **Clipboard AI** to `/Applications`
3. **Right-click → Open** on first launch (unsigned app warning)
4. Follow the onboarding wizard

## Granting Accessibility permission

System Settings → Privacy & Security → Accessibility → enable Clipboard AI

Without this permission, the text transform still works — but auto-paste
(step 4 of the flow) is skipped. The result lands in clipboard for manual ⌘V.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `⌥ Space` does nothing | Another app owns the shortcut. Open Settings (tray icon → Settings) and check the hotkey. |
| "No API key configured" error | Open Settings, paste your Groq key, save. |
| Auto-paste doesn't fire | Grant Accessibility permission (see above). |
| DMG build fails with `Exit code: ENOENT` | Run `npm run build` first, then `npm run dist`. |
| `safeStorage` not available | Rare: Keychain locked on first launch. Quit and reopen. |

## CI (GitHub Actions)

See `.github/workflows/build.yml` for the automated build workflow.
DMG artifact is uploaded on every push to `main`.
