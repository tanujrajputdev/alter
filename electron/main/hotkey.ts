import { globalShortcut, dialog } from 'electron'

let registeredKey: string | null = null

/**
 * Register a global hotkey. Shows a user-facing alert if the key is
 * already claimed by another application.
 */
export function registerHotkey(accelerator: string, callback: () => void): boolean {
  try {
    const success = globalShortcut.register(accelerator, callback)
    if (success) {
      registeredKey = accelerator
      return true
    }

    // Key already claimed — notify user
    dialog.showMessageBox({
      type: 'warning',
      title: 'Hotkey conflict',
      message: `"${accelerator}" is already used by another app.`,
      detail: 'Open Settings to choose a different hotkey.',
      buttons: ['OK']
    })
    return false
  } catch (err) {
    console.error('[hotkey] registration failed:', err)
    return false
  }
}

export function unregisterHotkey(): void {
  if (registeredKey) {
    try {
      globalShortcut.unregister(registeredKey)
    } catch {
      // ignore — app may be quitting
    }
    registeredKey = null
  }
}

export function isRegistered(): boolean {
  return registeredKey !== null
}
