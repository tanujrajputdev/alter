import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Transform
  transformText: (text: string, command: string) =>
    ipcRenderer.invoke('transform:text', text, command),

  // Clipboard
  getClipboard: () => ipcRenderer.invoke('clipboard:get'),
  setClipboard: (text: string) => ipcRenderer.invoke('clipboard:set', text),
  acceptResult: (text: string) => ipcRenderer.invoke('clipboard:accept', text),

  // Accessibility (required for auto-paste)
  checkAccessibility: () => ipcRenderer.invoke('accessibility:check'),
  requestAccessibility: () => ipcRenderer.invoke('accessibility:request'),

  // Undo
  undoLastTransform: () => ipcRenderer.invoke('undo:last'),
  getUndoState: () => ipcRenderer.invoke('undo:state'),

  // HUD controls
  hideHud: () => ipcRenderer.send('hud:hide'),
  resizeHud: (height: number) => ipcRenderer.send('hud:resize', height),
  onHudShow: (cb: (data: { clipboardText: string; appContext: string | null }) => void) => {
    const handler = (_: unknown, data: { clipboardText: string; appContext: string | null }) => cb(data)
    ipcRenderer.on('hud:show', handler)
    return () => ipcRenderer.off('hud:show', handler)
  },

  // Keychain
  getApiKey: () => ipcRenderer.invoke('keychain:get'),
  setApiKey: (value: string) => ipcRenderer.invoke('keychain:set', value),
  deleteApiKey: () => ipcRenderer.invoke('keychain:delete'),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (s: object) => ipcRenderer.invoke('settings:save', s),

  // Presets
  savePreset: (preset: object) => ipcRenderer.invoke('presets:save', preset),
  deletePreset: (id: string) => ipcRenderer.invoke('presets:delete', id),
  togglePinPreset: (id: string) => ipcRenderer.invoke('presets:togglePin', id),

  // Navigation
  openDashboard: (tab?: string) => ipcRenderer.send('dashboard:open', tab),

  // App context
  getFrontmostApp: () => ipcRenderer.invoke('frontmost:get')
})

export {}
