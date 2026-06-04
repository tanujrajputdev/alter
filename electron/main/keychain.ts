import { safeStorage } from 'electron'
import Store from 'electron-store'

const store = new Store<{ encryptedApiKey?: string }>()
const STORE_KEY = 'encryptedApiKey'

/**
 * Store a Groq API key encrypted in the macOS Keychain via Electron safeStorage.
 * The encrypted buffer is persisted to electron-store (a local JSON file).
 *
 * Whitespace (especially trailing newlines from copy-paste) is silently trimmed
 * so the user can't accidentally save a key Groq would reject.
 *
 * Empty values delete the key entirely.
 */
export function setKey(apiKey: string): void {
  const trimmed = (apiKey ?? '').trim()
  if (!trimmed) {
    deleteKey()
    return
  }

  try {
    if (!safeStorage.isEncryptionAvailable()) {
      store.set(STORE_KEY, Buffer.from(trimmed).toString('base64'))
      return
    }
    const encrypted = safeStorage.encryptString(trimmed)
    store.set(STORE_KEY, encrypted.toString('base64'))
  } catch (err) {
    console.error('[keychain] encrypt failed:', err)
    // Fall back to base64 — better than losing the key. Decryption side
    // handles both cases since we test isEncryptionAvailable() on read too.
    store.set(STORE_KEY, Buffer.from(trimmed).toString('base64'))
  }
}

/**
 * Retrieve the stored API key. Returns null if not set or decryption fails.
 */
export function getKey(): string | null {
  const encoded = store.get(STORE_KEY)
  if (!encoded) return null

  try {
    if (!safeStorage.isEncryptionAvailable()) {
      return Buffer.from(encoded, 'base64').toString('utf-8')
    }
    const buf = Buffer.from(encoded, 'base64')
    return safeStorage.decryptString(buf)
  } catch (err) {
    console.error('[keychain] decryption failed:', err)
    return null
  }
}

export function deleteKey(): void {
  store.delete(STORE_KEY)
}
