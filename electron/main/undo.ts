import { clipboard } from 'electron'

interface UndoEntry {
  previousClipboard: string
  newClipboard: string
  timestamp: number
}

let lastEntry: UndoEntry | null = null
const TTL_MS = 5 * 60 * 1000  // undo available for 5 minutes after a transform

/**
 * Record a transform: remember what was in the clipboard before we wrote
 * the new value, so we can restore it.
 */
export function recordTransform(previousClipboard: string, newClipboard: string): void {
  lastEntry = {
    previousClipboard,
    newClipboard,
    timestamp: Date.now()
  }
}

/**
 * Restore the previous clipboard contents. Returns true if undo was performed.
 */
export function undoLast(): boolean {
  if (!lastEntry) return false
  if (Date.now() - lastEntry.timestamp > TTL_MS) {
    lastEntry = null
    return false
  }

  // Only undo if the current clipboard still matches what we wrote —
  // otherwise the user has copied something else since.
  const current = clipboard.readText()
  if (current === lastEntry.newClipboard) {
    clipboard.writeText(lastEntry.previousClipboard)
  } else {
    // User has moved on — still restore but don't clobber their new copy if it's intentional
    // We choose to restore anyway since they explicitly asked to undo.
    clipboard.writeText(lastEntry.previousClipboard)
  }

  lastEntry = null
  return true
}

export function getUndoState(): { available: boolean; previewPrev?: string; previewCurr?: string } {
  if (!lastEntry || Date.now() - lastEntry.timestamp > TTL_MS) {
    return { available: false }
  }
  return {
    available: true,
    previewPrev: lastEntry.previousClipboard.slice(0, 40),
    previewCurr: lastEntry.newClipboard.slice(0, 40)
  }
}

export function clearUndo(): void {
  lastEntry = null
}
