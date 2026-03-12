/**
 * scripts/encrypt-google-tokens.ts
 *
 * One-shot migration: encrypts all plaintext Google OAuth tokens in the
 * `accounts` table using the same AES-256-GCM scheme applied to Slack/GitLab
 * tokens and to new Google tokens written via the encrypted PrismaAdapter.
 *
 * Run ONCE after deploying the encrypted-adapter changes to auth.ts:
 *
 *   npx ts-node --project tsconfig.json scripts/encrypt-google-tokens.ts
 *
 * The script is idempotent: already-encrypted tokens are recognized by the
 * `safeDecryptToken` → `decrypt` round-trip and are skipped.
 *
 * Prerequisites:
 *   - DATABASE_URL env var pointing to the production database
 *   - ENCRYPTION_KEY env var (64-char hex) matching the running application
 *
 * Safety:
 *   - Processes accounts in batches of 100 with a 200 ms pause between batches
 *     to avoid locking the DB.
 *   - Prints a summary at the end: accounts processed, tokens encrypted, skipped.
 *   - Does NOT delete or modify any other fields.
 */

import { prisma } from "../lib/prisma"
import { encrypt, decrypt } from "../lib/crypto"

const BATCH_SIZE = 100
const BATCH_PAUSE_MS = 200

function isEncrypted(value: string): boolean {
  // A valid ciphertext is Base64 and at least 12 (IV) + 1 (data) + 16 (tag) = 29 bytes.
  // Raw Google tokens start with "ya29." or are plain JWTs — never valid Base64 of ≥29 bytes.
  try {
    const buf = Buffer.from(value, "base64")
    if (buf.length < 29) return false
    // Try a decrypt round-trip; if it succeeds, it's already encrypted.
    decrypt(value)
    return true
  } catch {
    return false
  }
}

async function main() {
  console.log("🔐 Starting Google token encryption migration...")
  console.log(`   Database: ${process.env.DATABASE_URL?.replace(/:[^@]+@/, ":***@")}`)

  let offset = 0
  let totalProcessed = 0
  let totalEncrypted = 0
  let totalSkipped = 0

  while (true) {
    const accounts = await prisma.account.findMany({
      where: { provider: "google" },
      select: { id: true, access_token: true, refresh_token: true },
      skip: offset,
      take: BATCH_SIZE,
      orderBy: { id: "asc" },
    })

    if (accounts.length === 0) break

    for (const account of accounts) {
      let needsUpdate = false
      const data: { access_token?: string; refresh_token?: string } = {}

      if (account.access_token) {
        if (!isEncrypted(account.access_token)) {
          data.access_token = encrypt(account.access_token)
          needsUpdate = true
        }
      }

      if (account.refresh_token) {
        if (!isEncrypted(account.refresh_token)) {
          data.refresh_token = encrypt(account.refresh_token)
          needsUpdate = true
        }
      }

      if (needsUpdate) {
        await prisma.account.update({ where: { id: account.id }, data })
        totalEncrypted++
        console.log(`   ✅ Encrypted tokens for account ${account.id}`)
      } else {
        totalSkipped++
        console.log(`   ⏭️  Skipped account ${account.id} (already encrypted or no token)`)
      }

      totalProcessed++
    }

    offset += BATCH_SIZE

    if (accounts.length === BATCH_SIZE) {
      console.log(`   ⏳ Pausing ${BATCH_PAUSE_MS}ms before next batch...`)
      await new Promise((r) => setTimeout(r, BATCH_PAUSE_MS))
    }
  }

  console.log("\n✅ Migration complete:")
  console.log(`   Total accounts processed : ${totalProcessed}`)
  console.log(`   Tokens encrypted         : ${totalEncrypted}`)
  console.log(`   Already encrypted (skipped): ${totalSkipped}`)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("❌ Migration failed:", err)
  process.exit(1)
})
