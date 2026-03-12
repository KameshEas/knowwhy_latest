/**
 * DELETE /api/user
 *
 * GDPR Art. 17 — Right to Erasure.
 * Deletes the authenticated user's account including:
 *   - All Decision records + their Weaviate vector embeddings
 *   - All Meeting records
 *   - SlackIntegration and GitLabIntegration rows
 *   - All Account rows (OAuth links)
 *   - All AuditLog rows (recorded before deletion for a final trace)
 *   - The User row itself (Prisma cascade handles remaining FK references)
 *
 * The session is invalidated client-side by the caller after receiving 200.
 */
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { deleteDecisionFromWeaviate } from "@/lib/weaviate"
import { NextResponse } from "next/server"

export async function DELETE(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // 1. Write a final audit entry before deletion (fire-and-forget still safe here
    //    because we await it explicitly to ensure it lands before the user row is removed).
    await createAuditLog(userId, "ACCOUNT_DELETED", { email: session.user.email }, request)

    // 2. Delete all Weaviate vector embeddings for this user's decisions.
    //    Fetched first because the Prisma cascade will remove the Decision rows.
    const decisions = await prisma.decision.findMany({
      where: { userId },
      select: { id: true },
    })

    // Delete vectors concurrently but don't let individual failures abort the account deletion.
    await Promise.allSettled(
      decisions.map((d) => deleteDecisionFromWeaviate(d.id))
    )

    // 3. Delete the User row. All child tables (Decision, Meeting, SlackIntegration,
    //    GitLabIntegration, Account, AuditLog) cascade automatically via the Prisma schema.
    await prisma.user.delete({ where: { id: userId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/user] Error:", error)
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
  }
}
