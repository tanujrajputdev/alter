import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  clipboard,
  nativeImage,
  nativeTheme,
  screen,
  shell,
  systemPreferences
} from 'electron'
import path from 'path'
import { randomUUID } from 'crypto'
import { registerHotkey, unregisterHotkey } from './hotkey'
import { transformText } from './groq'
import { getKey, setKey, deleteKey } from './keychain'
import { pasteToActiveApp, activateApp } from './paste'
import { getFrontmostApp, appContextSnippet } from './frontmost'
import { recordTransform, undoLast, getUndoState } from './undo'
import Store from 'electron-store'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Preset {
  id: string
  name: string
  icon: string
  command: string
  pinned: boolean
  builtin?: boolean
}

interface RecentTransform {
  id: string
  command: string
  inputSnippet: string
  resultSnippet: string
  appContext?: string
  timestamp: number
}

interface Settings {
  hotkey: string
  model: string
  appContextEnabled: boolean
  launchAtLogin: boolean
  presets: Preset[]
  recentTransforms: RecentTransform[]
}

// ─── Default presets ─────────────────────────────────────────────────────────

const DEFAULT_PRESETS: Preset[] = [
  { id: 'p_rewrite',   name: 'Rewrite',     icon: 'sparkles', command: 'Rewrite this more clearly and concisely',           pinned: true,  builtin: true },
  { id: 'p_shrink',    name: 'Shrink',      icon: 'scissor',  command: 'Summarize this into 2–3 sentences',                 pinned: true,  builtin: true },
  { id: 'p_translate', name: 'Translate',   icon: 'globe',    command: 'Translate this to English',                         pinned: true,  builtin: true },
  { id: 'p_fix',       name: 'Fix grammar', icon: 'check',    command: 'Fix grammar and spelling without changing meaning', pinned: true,  builtin: true },
  { id: 'p_expand',    name: 'Expand',      icon: 'quill',    command: 'Expand this into full, polished prose',             pinned: false, builtin: true },
  { id: 'p_explain',   name: 'Explain',     icon: 'bulb',     command: 'Explain this in plain English',                     pinned: false, builtin: true },
  { id: 'p_reply',     name: 'Reply',       icon: 'reply',    command: 'Draft a polite, concise reply to this',             pinned: false, builtin: true },
  { id: 'p_formal',    name: 'Formal',      icon: 'wand',     command: 'Rewrite in a more formal, professional tone',       pinned: false, builtin: true },
]

// ─── Globals ─────────────────────────────────────────────────────────────────

let tray: Tray | null = null
let hudWindow: BrowserWindow | null = null
let dashboardWindow: BrowserWindow | null = null
let hudReady = false   // renderer has subscribed to hud:show

// The app that was frontmost when the HUD was summoned. We re-activate it
// before pasting so ⌘V lands in the user's app, not our own window.
let pasteTargetApp: string | null = null

// Stash the most recent show payload so the renderer can fetch it once it's
// ready. Prevents lost data on the first invocation before the React tree mounts.
let pendingShowPayload: { clipboardText: string; appContext: string | null } | null = null

const store = new Store<{ settings: Settings; encryptedApiKey?: string }>({
  defaults: {
    settings: {
      hotkey: 'Alt+Space',
      model: 'llama-3.3-70b-versatile',
      appContextEnabled: true,
      launchAtLogin: false,
      presets: DEFAULT_PRESETS,
      recentTransforms: []
    }
  }
})

// ─── Migrations (run on every boot, safe to repeat) ──────────────────────────

migrateSettings()

function migrateSettings() {
  const current = store.get('settings') as Settings | undefined
  if (!current) return

  let dirty = false
  let next: Settings = { ...current }

  // Presets: missing → seed; emoji → icon
  if (!next.presets || next.presets.length === 0) {
    next.presets = DEFAULT_PRESETS
    dirty = true
  } else {
    next.presets = next.presets.map(p => {
      const anyP = p as Preset & { emoji?: string }
      if (!p.icon) {
        // Map well-known builtins by id, else default to sparkles
        const fallback = DEFAULT_PRESETS.find(d => d.id === p.id)?.icon ?? 'sparkles'
        dirty = true
        return { ...p, icon: fallback }
      }
      // Keep but strip stale emoji
      if (anyP.emoji !== undefined) {
        dirty = true
        const { emoji: _omit, ...rest } = anyP as Preset & { emoji?: string }
        return rest
      }
      return p
    })
  }

  // History: backfill missing fields so old entries don't crash the UI
  if (next.recentTransforms?.length) {
    next.recentTransforms = next.recentTransforms.map(t => {
      const anyT = t as Partial<RecentTransform>
      if (!anyT.id || anyT.resultSnippet === undefined) {
        dirty = true
        return {
          id: anyT.id ?? randomUUID(),
          command: anyT.command ?? '',
          inputSnippet: anyT.inputSnippet ?? '',
          resultSnippet: anyT.resultSnippet ?? '',
          appContext: anyT.appContext,
          timestamp: anyT.timestamp ?? Date.now()
        }
      }
      return t as RecentTransform
    })
  }

  if (next.appContextEnabled === undefined) { next.appContextEnabled = true; dirty = true }
  if (next.launchAtLogin === undefined)     { next.launchAtLogin = false;  dirty = true }

  if (dirty) store.set('settings', next)
}

// Hide from Dock — must run before app.whenReady()
if (process.platform === 'darwin') {
  app.dock?.hide()
}

// Force light theme for the whole app
nativeTheme.themeSource = 'light'

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createTray()
  createHudWindow()
  setupIPC()
  registerHotkey(
    store.get('settings.hotkey', 'Alt+Space'),
    toggleHud
  )

  if (!getKey()) {
    openDashboard('onboarding')
  }
})

app.on('window-all-closed', () => { /* menu-bar app stays alive */ })
app.on('will-quit', () => unregisterHotkey())

// ─── Tray ─────────────────────────────────────────────────────────────────────

function trayIconPath(): string {
  // In packaged builds the file lives under process.resourcesPath (extraResources).
  // In dev __dirname is out/main, so go two levels up to the repo's resources/.
  const candidates = app.isPackaged
    ? [
        path.join(process.resourcesPath, 'tray-icon.png'),
        path.join(process.resourcesPath, 'tray-icon@2x.png'),
      ]
    : [
        path.join(__dirname, '../../resources/tray-icon.png'),
      ]
  return candidates[0]
}

function createTray() {
  let icon: Electron.NativeImage
  try {
    icon = nativeImage.createFromPath(trayIconPath())
    if (icon.isEmpty()) throw new Error('empty')
  } catch {
    // Inline 16×16 fallback (option-key glyph)
    icon = nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/' +
      '9hAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpg' +
      'AAA6mAAAF3CculE8AAAABmJLR0QA/wD/AP+gvaeTAAAAB3RJTUUH6AkECjAV0ybq6Q' +
      'AAAGZJREFUOMtjYBgFgx8wMjD8Z2BgYGBiYPgPZf8nMP4nMP4nMv4nMP4nMP4nMP4n' +
      'MP4nMP4nMEwiYAITYBCnAAMDAwMDI6MA=='
    )
  }
  // Template image lets macOS tint white/black per menu-bar appearance.
  icon.setTemplateImage(true)

  tray = new Tray(icon)
  tray.setToolTip('Alter — ⌥ Space')
  rebuildTrayMenu()
}

function rebuildTrayMenu() {
  if (!tray) return
  const undoState = getUndoState()
  const accessibility = process.platform === 'darwin'
    ? systemPreferences.isTrustedAccessibilityClient(false)
    : true

  const menu = Menu.buildFromTemplate([
    { label: 'Open HUD  ⌥ Space', click: () => toggleHud() },
    { type: 'separator' },
    { label: 'Dashboard…', click: () => openDashboard('dashboard') },
    {
      label: 'Undo last transform',
      enabled: undoState.available,
      accelerator: 'CmdOrCtrl+Shift+Z',
      click: () => { undoLast(); rebuildTrayMenu() }
    },
    ...(accessibility ? [] : [
      { type: 'separator' as const },
      {
        label: 'Grant Accessibility access…',
        click: () => openAccessibilitySettings()
      }
    ]),
    { type: 'separator' },
    { label: 'Quit Alter', role: 'quit' as const }
  ])
  tray.setContextMenu(menu)
  tray.removeAllListeners('click')
  tray.on('click', () => openDashboard('dashboard'))
}

function openAccessibilitySettings() {
  if (process.platform !== 'darwin') return
  // Trigger native prompt (returns true if already granted, prompts otherwise)
  systemPreferences.isTrustedAccessibilityClient(true)
  shell.openExternal(
    'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
  )
}

// ─── HUD Window ───────────────────────────────────────────────────────────────

function createHudWindow() {
  hudWindow = new BrowserWindow({
    width: 560,
    height: 210,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    hasShadow: true,
    // No vibrancy — vibrancy mirrors the OS theme. We force light by painting
    // a solid surface in the renderer instead.
    roundedCorners: true,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  hudWindow.setWindowButtonVisibility?.(false)
  hudWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  hudWindow.webContents.once('did-finish-load', () => {
    hudReady = true
    if (pendingShowPayload) {
      hudWindow?.webContents.send('hud:show', pendingShowPayload)
      pendingShowPayload = null
    }
  })
  loadWindow(hudWindow, '?view=hud')

  let blurTimer: ReturnType<typeof setTimeout> | null = null
  hudWindow.on('blur', () => {
    blurTimer = setTimeout(() => {
      if (!hudWindow?.isFocused()) hudWindow?.hide()
    }, 250)
  })
  hudWindow.on('focus', () => {
    if (blurTimer) clearTimeout(blurTimer)
  })
}

async function showHud() {
  if (!hudWindow || hudWindow.isDestroyed()) {
    createHudWindow()
  }
  if (!hudWindow) return

  // Capture frontmost BEFORE we focus our window
  const frontmost = await getFrontmostApp()
  pasteTargetApp = frontmost

  // Read clipboard untrimmed so meaningful whitespace survives the round-trip.
  // If the clipboard holds an image / file, surface a friendlier message than "empty".
  let rawClipboard = clipboard.readText()
  if (!rawClipboard) {
    const formats = clipboard.availableFormats()
    if (formats.some(f => f.startsWith('image/'))) {
      rawClipboard = ''  // keep empty so HUD knows there's no actionable text
    }
  }
  const cursorPoint = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(cursorPoint)
  const { x: dx, y: dy, width, height } = display.workArea

  hudWindow.setSize(560, 210)
  hudWindow.setPosition(
    Math.round(dx + width / 2 - 280),
    Math.round(dy + height / 3)
  )
  hudWindow.setAlwaysOnTop(true, 'floating')
  hudWindow.show()
  hudWindow.focus()

  const payload = { clipboardText: rawClipboard, appContext: frontmost }
  if (hudReady) {
    hudWindow.webContents.send('hud:show', payload)
  } else {
    // Renderer hasn't mounted yet — stash and let did-finish-load replay it.
    pendingShowPayload = payload
  }
}

function toggleHud() {
  if (hudWindow?.isVisible()) {
    hudWindow.hide()
  } else {
    showHud()
  }
}

// ─── Dashboard Window ─────────────────────────────────────────────────────────

function openDashboard(view: 'dashboard' | 'onboarding' = 'dashboard', tab?: string) {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.show()
    dashboardWindow.focus()
    if (tab) dashboardWindow.webContents.send('dashboard:tab', tab)
    return
  }

  const isOnboarding = view === 'onboarding'
  dashboardWindow = new BrowserWindow({
    width: isOnboarding ? 480 : 860,
    height: isOnboarding ? 600 : 640,
    minWidth: isOnboarding ? 480 : 760,
    minHeight: isOnboarding ? 600 : 580,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 18 },
    backgroundColor: '#f4eee2',  // cream canvas — avoids gray flash before React mounts
    // No vibrancy — keep solid light surface regardless of OS theme
    resizable: !isOnboarding,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  const query = isOnboarding ? '?view=onboarding' : `?view=dashboard${tab ? `&tab=${tab}` : ''}`
  loadWindow(dashboardWindow, query)
  dashboardWindow.on('closed', () => { dashboardWindow = null })
}

function loadWindow(win: BrowserWindow, query: string) {
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/index.html${query}`)
  } else {
    win.loadFile(
      path.join(__dirname, '../renderer/index.html'),
      { search: query }
    )
  }
}

// ─── IPC ─────────────────────────────────────────────────────────────────────

function setupIPC() {
  ipcMain.handle('transform:text', async (_, text: string, command: string) => {
    const apiKey = getKey()
    if (!apiKey) {
      return { success: false, error: 'No API key configured. Open Dashboard to add your Groq key.' }
    }
    const settings = store.get('settings') as Settings

    let appContext: string | null = null
    let appName: string | null = null
    if (settings.appContextEnabled) {
      appName = await getFrontmostApp()
      appContext = appContextSnippet(appName)
    }

    try {
      const result = await transformText(text, command, apiKey, settings.model, appContext)

      const history = settings.recentTransforms ?? []
      history.unshift({
        id: randomUUID(),
        command,
        inputSnippet: text.slice(0, 120),
        resultSnippet: result.slice(0, 120),
        appContext: appName ?? undefined,
        timestamp: Date.now()
      })
      store.set('settings.recentTransforms', history.slice(0, 50))

      return { success: true, result, appContext: appName ?? undefined }
    } catch (err: any) {
      return { success: false, error: err.message ?? 'Transform failed' }
    }
  })

  ipcMain.handle('clipboard:get', () => clipboard.readText())
  ipcMain.handle('clipboard:set', (_, text: string) => clipboard.writeText(text))

  ipcMain.handle('clipboard:accept', async (_, text: string) => {
    // Check accessibility BEFORE doing anything destructive to UI state.
    // We use prompt=false so we don't open the system dialog mid-paste,
    // which would steal focus back to our process and break the paste.
    const trusted = process.platform === 'darwin'
      ? systemPreferences.isTrustedAccessibilityClient(false)
      : true

    if (!trusted) {
      // Still write to clipboard so the user can ⌘V manually, but DON'T hide
      // the HUD so the paste-notice in the renderer stays visible.
      clipboard.writeText(text)
      const previous = clipboard.readText()
      recordTransform(previous, text)
      rebuildTrayMenu()
      return { pasted: false, accessibility: false }
    }

    const previous = clipboard.readText()
    clipboard.writeText(text)
    rebuildTrayMenu()

    // Step 1 — hide the HUD window
    hudWindow?.hide()

    // Step 2 — only deactivate our app if Dashboard isn't open; otherwise
    // app.hide() would also hide the Dashboard, which is jarring.
    const dashboardVisible = dashboardWindow && !dashboardWindow.isDestroyed() && dashboardWindow.isVisible()
    if (process.platform === 'darwin' && !dashboardVisible) {
      app.hide()
    }

    // Step 3 — explicitly reactivate the source app so ⌘V has a real target.
    if (pasteTargetApp) {
      await activateApp(pasteTargetApp)
    }

    // Step 4 — let activation settle. 200 ms is enough on every Mac I've tested.
    await new Promise(r => setTimeout(r, 200))

    const ok = await pasteToActiveApp()
    // Only record undo if paste actually succeeded
    if (ok) recordTransform(previous, text)
    rebuildTrayMenu()
    return { pasted: ok, accessibility: true }
  })

  // Undo
  ipcMain.handle('undo:last', () => {
    const ok = undoLast()
    rebuildTrayMenu()
    return ok
  })
  ipcMain.handle('undo:state', () => getUndoState())

  // Accessibility
  ipcMain.handle('accessibility:check', () => {
    if (process.platform !== 'darwin') return true
    return systemPreferences.isTrustedAccessibilityClient(false)
  })
  ipcMain.handle('accessibility:request', () => {
    if (process.platform !== 'darwin') return true
    const trusted = systemPreferences.isTrustedAccessibilityClient(true)
    if (!trusted) {
      shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility')
    }
    return trusted
  })

  // HUD
  ipcMain.on('hud:hide', () => hudWindow?.hide())
  ipcMain.on('hud:resize', (_, h: number) => {
    hudWindow?.setSize(560, Math.max(120, Math.min(560, h)))
  })

  // Keychain
  ipcMain.handle('keychain:get', () => getKey())
  ipcMain.handle('keychain:set', (_, value: string) => setKey(value))
  ipcMain.handle('keychain:delete', () => deleteKey())

  // Settings
  ipcMain.handle('settings:get', () => store.get('settings'))
  ipcMain.handle('settings:save', (_, s: Partial<Settings>) => {
    const current = store.get('settings') as Settings
    const next = { ...current, ...s }
    store.set('settings', next)

    if (s.hotkey && s.hotkey !== current.hotkey) {
      // Try the new hotkey FIRST; only if it succeeds do we drop the old one,
      // so a conflict doesn't leave the user with no working hotkey at all.
      unregisterHotkey()
      const ok = registerHotkey(s.hotkey, toggleHud)
      if (!ok) {
        // Restore the previous hotkey + revert the persisted value
        registerHotkey(current.hotkey, toggleHud)
        store.set('settings.hotkey', current.hotkey)
      }
    }
    if (s.launchAtLogin !== undefined && s.launchAtLogin !== current.launchAtLogin) {
      app.setLoginItemSettings({ openAtLogin: s.launchAtLogin })
    }
  })

  // Presets
  ipcMain.handle('presets:save', (_, preset: Omit<Preset, 'id'> & { id?: string }) => {
    const settings = store.get('settings') as Settings
    const presets = [...(settings.presets ?? [])]

    if (preset.id) {
      const idx = presets.findIndex(p => p.id === preset.id)
      if (idx >= 0) presets[idx] = { ...presets[idx], ...preset, id: preset.id } as Preset
    } else {
      const newPreset: Preset = {
        id: `p_${randomUUID().slice(0, 8)}`,
        name: preset.name,
        icon: preset.icon || 'sparkles',
        command: preset.command,
        pinned: preset.pinned ?? false,
        builtin: false
      }
      presets.push(newPreset)
      store.set('settings.presets', presets)
      return newPreset
    }

    store.set('settings.presets', presets)
    return presets.find(p => p.id === preset.id)
  })

  ipcMain.handle('presets:delete', (_, id: string) => {
    const settings = store.get('settings') as Settings
    const presets = (settings.presets ?? []).filter(p => p.id !== id)
    store.set('settings.presets', presets)
  })

  ipcMain.handle('presets:togglePin', (_, id: string) => {
    const settings = store.get('settings') as Settings
    const presets = [...(settings.presets ?? [])]
    const target = presets.find(p => p.id === id)
    if (!target) return

    if (!target.pinned) {
      const pinnedCount = presets.filter(p => p.pinned).length
      if (pinnedCount >= 4) {
        const firstPinned = presets.find(p => p.pinned && p.id !== id)
        if (firstPinned) firstPinned.pinned = false
      }
    }
    target.pinned = !target.pinned
    store.set('settings.presets', presets)
  })

  // Navigation
  ipcMain.on('dashboard:open', (_, tab?: string) => openDashboard('dashboard', tab))

  // App context
  ipcMain.handle('frontmost:get', () => getFrontmostApp())
}
