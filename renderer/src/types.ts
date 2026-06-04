export interface TransformResult {
  success: boolean
  result?: string
  error?: string
  appContext?: string  // which app was frontmost when this ran
}

export interface Preset {
  id: string
  name: string
  icon: string           // icon name from PRESET_ICONS registry
  command: string
  pinned: boolean
  builtin?: boolean
}

export interface Settings {
  hotkey: string
  model: string
  appContextEnabled: boolean
  launchAtLogin: boolean
  presets: Preset[]
  recentTransforms: RecentTransform[]
}

export interface RecentTransform {
  id: string
  command: string
  inputSnippet: string
  resultSnippet: string
  appContext?: string
  timestamp: number
}

export interface UndoState {
  available: boolean
  previewPrev?: string  // first 40 chars of what we'd restore
  previewCurr?: string
}

export type HudState = 'idle' | 'populated' | 'loading' | 'result' | 'error'

declare global {
  interface Window {
    electronAPI: {
      // Transform
      transformText: (text: string, command: string) => Promise<TransformResult>

      // Clipboard
      getClipboard: () => Promise<string>
      setClipboard: (text: string) => Promise<void>
      acceptResult: (text: string) => Promise<{ pasted: boolean; accessibility: boolean }>
      checkAccessibility: () => Promise<boolean>
      requestAccessibility: () => Promise<boolean>

      // Undo
      undoLastTransform: () => Promise<boolean>
      getUndoState: () => Promise<UndoState>

      // HUD controls
      hideHud: () => void
      resizeHud: (height: number) => void
      onHudShow: (cb: (data: { clipboardText: string; appContext: string | null }) => void) => () => void

      // Keychain
      getApiKey: () => Promise<string | null>
      setApiKey: (value: string) => Promise<void>
      deleteApiKey: () => Promise<void>

      // Settings
      getSettings: () => Promise<Settings>
      saveSettings: (s: Partial<Settings>) => Promise<void>

      // Presets
      savePreset: (preset: Omit<Preset, 'id'> & { id?: string }) => Promise<Preset>
      deletePreset: (id: string) => Promise<void>
      togglePinPreset: (id: string) => Promise<void>

      // Navigation
      openDashboard: (tab?: string) => void

      // App context
      getFrontmostApp: () => Promise<string | null>
    }
  }
}
