/**
 * One-time migration: encrypt plaintext tokens already stored in the database.
 *
 * Run ONCE after deploying the encryption support:
 *   npm run encrypt:tokens
 *
 * Safe to re-run: already-encrypted values are detected by attempting a
 * Base64 decode + AES-GCM auth-tag check. Re-encrypting would fail decryption
 * later, so we skip any row where decryption of the stored value succeeds
 * (meaning it is already ciphertext).
 */
import { PrismaClient } from "@prisma/client"
import { encrypt, decrypt } from "../lib/crypto"
import * as dotenv from "dotenv"

dotenv.config()

const prisma = new PrismaClient()

function isAlreadyEncrypted(value: string): boolean {
  try {
    const raw = Buffer.from(value, "base64")
    // Minimum valid AES-GCM payload: 12 (IV) + 1 (data) + 16 (tag) = 29 bytes
    if (raw.length < 29) return false
    // Try to decrypt — if it succeeds the value is already encrypted
    decrypt(value)
    return true
  } catch {
    return false
  }
}

async function migrateSlackTokens() {
  const integrations = await prisma.slackIntegration.findMany()
  let migrated = 0

  for (const row of integrations) {
    const updates: Record<string, string | null> = {}

    if (row.accessToken && !isAlreadyEncrypted(row.accessToken)) {
      updates.accessToken = encrypt(row.accessToken)
    }
    if (row.refreshToken && !isAlreadyEncrypted(row.refreshToken)) {
      updates.refreshToken = encrypt(row.refreshToken)
    }

    if (Object.keys(updates).length > 0) {
      await prisma.slackIntegration.update({
        where: { id: row.id },
        data: updates,
      })
      migrated++
      console.log(`  ✅ Migrated Slack integration for user ${row.userId}`)
    }
  }

  console.log(`Slack: ${migrated}/${integrations.length} rows migrated`)
}

async function migrateGitLabTokens() {
  const integrations = await prisma.gitLabIntegration.findMany()
  let migrated = 0

  for (const row of integrations) {
    if (row.accessToken && !isAlreadyEncrypted(row.accessToken)) {
      await prisma.gitLabIntegration.update({
        where: { id: row.id },
        data: { accessToken: encrypt(row.accessToken) },
      })
      migrated++
      console.log(`  ✅ Migrated GitLab integration for user ${row.userId}`)
    }
  }

  console.log(`GitLab: ${migrated}/${integrations.length} rows migrated`)
}

async function main() {
  console.log("\n🔐 Token Encryption Migration")
  console.log("================================")
  console.log("Encrypting plaintext tokens in the database...\n")

  try {
    await migrateSlackTokens()
    await migrateGitLabTokens()
    console.log("\n✅ Migration complete.")
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
