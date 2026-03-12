/**
 * Smoke-test for lib/crypto.ts.
 * Verifies the AES-256-GCM round-trip, tamper detection, and null passthrough.
 *
 *   npm run test:crypto
 */
import { encrypt, decrypt, encryptToken, decryptToken } from "../lib/crypto"
import * as dotenv from "dotenv"

dotenv.config()

let passed = 0
let failed = 0

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ ${message}`)
    passed++
  } else {
    console.error(`  ❌ ${message}`)
    failed++
  }
}

console.log("\n🔐 Crypto tests\n")

// 1. Basic round-trip
const plaintext = "xoxb-slack-bot-token-example"
const ciphertext = encrypt(plaintext)
assert(ciphertext !== plaintext, "Ciphertext differs from plaintext")
assert(ciphertext.length > 0, "Ciphertext is non-empty")
const decrypted = decrypt(ciphertext)
assert(decrypted === plaintext, "Round-trip decrypt matches original")

// 2. Unique ciphertexts per call (random IV)
const ct1 = encrypt(plaintext)
const ct2 = encrypt(plaintext)
assert(ct1 !== ct2, "Each encryption produces a unique ciphertext (random IV)")

// 3. Tamper detection
let tamperCaught = false
try {
  const raw = Buffer.from(ciphertext, "base64")
  raw[raw.length - 1] ^= 0xff  // Flip bits in the auth tag
  decrypt(raw.toString("base64"))
} catch {
  tamperCaught = true
}
assert(tamperCaught, "Tampered ciphertext throws an error (auth tag check)")

// 4. Nullable helpers
assert(decryptToken(null) === null, "decryptToken(null) returns null")
assert(decryptToken(undefined) === null, "decryptToken(undefined) returns null")
assert(encryptToken(null) === null, "encryptToken(null) returns null")
const tokenPlain = "glpat-gitlab-personal-access-token"
const tokenCipher = encryptToken(tokenPlain)!
assert(decryptToken(tokenCipher) === tokenPlain, "Nullable helper round-trip works")

// 5. Long value
const longValue = "a".repeat(4096)
assert(decrypt(encrypt(longValue)) === longValue, "Round-trip works on 4096-char string")

console.log(`\n${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
