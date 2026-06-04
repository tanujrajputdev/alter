import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * Activate the named app (bring to front) so the next keystroke lands there.
 * Returns whether activation succeeded.
 */
export async function activateApp(appName: string): Promise<boolean> {
  if (process.platform !== 'darwin') return false
  if (!appName) return false
  // Escape double quotes in the app name to avoid breaking the AppleScript literal
  const safe = appName.replace(/"/g, '\\"')
  try {
    await execAsync(`osascript -e 'tell application "${safe}" to activate'`, { timeout: 1200 })
    return true
  } catch {
    // Some apps (System Settings, Finder file dialogs) need System Events instead
    try {
      await execAsync(
        `osascript -e 'tell application "System Events" to set frontmost of (first process whose name is "${safe}") to true'`,
        { timeout: 1200 }
      )
      return true
    } catch (err: any) {
      console.warn('[paste] failed to activate', appName, err?.message)
      return false
    }
  }
}

/**
 * Send ⌘V via System Events. Requires Accessibility permission.
 * Caller should ensure the target app is frontmost first via activateApp().
 */
export async function pasteToActiveApp(): Promise<boolean> {
  if (process.platform !== 'darwin') return false

  const script = 'tell application "System Events" to keystroke "v" using {command down}'
  try {
    await execAsync(`osascript -e '${script}'`, { timeout: 1500 })
    return true
  } catch (err: any) {
    const msg: string = err?.stderr?.toString?.() ?? err?.message ?? ''
    if (msg.includes('not allowed') || msg.includes('1002') || msg.includes('-1719')) {
      console.warn('[paste] Accessibility permission denied — text remains on clipboard for manual ⌘V')
    } else {
      console.error('[paste] osascript error:', msg)
    }
    return false
  }
}
