/**
 * Application-layer encryption using AES-256-GCM.
 *
 * Every integration token (Slack, GitLab, Google OAuth) is encrypted before being
 * written to the database and decrypted on read. Anyone with raw DB access only
 * sees ciphertext — live API credentials are never stored in the clear.
 *
 * Wire format (Base64-encoded):  <12-byte IV> | <ciphertext> | <16-byte auth tag>
 */
import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12 // 96-bit IV, recommended for GCM
const TAG_LENGTH = 16 // 128-bit auth tag

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw || !/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error(
      "ENCRYPTION_KEY must be a 64-character hex string. " +
        "Generate one with: openssl rand -hex 32"
    )
  }
  return Buffer.from(raw, "hex")
}

/**
 * Encrypt a plaintext string.
 * Returns a Base64-encoded string safe for storage in a TEXT column.
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH })

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()

  // Pack: iv (12) | ciphertext (variable) | tag (16)
  const combined = Buffer.concat([iv, encrypted, tag])
  return combined.toString("base64")
}

/**
 * Decrypt a Base64-encoded ciphertext produced by `encrypt()`.
 * Throws if the ciphertext has been tampered with (auth tag mismatch).
 */
export function decrypt(ciphertext: string): string {
  const key = getKey()
  const combined = Buffer.from(ciphertext, "base64")

  if (combined.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error("Ciphertext is too short to be valid")
  }

  const iv = combined.subarray(0, IV_LENGTH)
  const tag = combined.subarray(combined.length - TAG_LENGTH)
  const encrypted = combined.subarray(IV_LENGTH, combined.length - TAG_LENGTH)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH })
  decipher.setAuthTag(tag)

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString("utf8")
}

/**
 * Safely decrypt a nullable token field.
 * Returns null if the input is null/undefined (no token stored).
 */
export function decryptToken(token: string | null | undefined): string | null {
  if (!token) return null
  return decrypt(token)
}

/**
 * Safely encrypt a nullable token field.
 * Returns null if the input is null/undefined.
 */
export function encryptToken(token: string | null | undefined): string | null {
  if (!token) return null
  return encrypt(token)
}

/**
 * Attempt to decrypt a token that MAY still be stored as plaintext.
 *
 * During the migration window (after deploying encryption but before running the
 * migration script), some tokens in the `accounts` table will still be in plaintext
 * form. This helper tries to decrypt; on failure it returns the original value so
 * existing sessions continue working until the migration script runs.
 *
 * After the migration script (`scripts/encrypt-google-tokens.ts`) has been run,
 * this function should never fall back to the plaintext path.
 */
export function safeDecryptToken(token: string | null | undefined): string | null {
  if (!token) return null
  try {
    return decrypt(token)
  } catch {
    // Token was likely stored as plaintext before encryption was introduced.
    // Return it as-is so the session remains functional.
    return token
  }
}
