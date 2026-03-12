/**
 * Route handlers for a single Decision: GET and DELETE.
 *
 * DELETE /api/decisions/[id]
 *   - Removes the decision from PostgreSQL
 *   - Removes the vector embedding from Weaviate
 *   - Records a DECISION_DELETED audit log entry
 */
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { deleteDecisionFromWeaviate } from "@/lib/weaviate"
import { NextResponse } from "next/server"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const decision = await prisma.decision.findFirst({
      where: { id, userId: session.user.id },
      include: {
        meeting: { select: { id: true, title: true, startTime: true, meetLink: true } },
      },
    })

    if (!decision) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, decision })
  } catch (error) {
    console.error("[GET /api/decisions/[id]] Error:", error)
    return NextResponse.json({ error: "Failed to fetch decision" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Confirm ownership before deletion.
    const decision = await prisma.decision.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true, title: true },
    })

    if (!decision) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Delete from both stores concurrently.
    await Promise.all([
      prisma.decision.delete({ where: { id } }),
      deleteDecisionFromWeaviate(id),
    ])

    // Record audit event (fire-and-forget).
    createAuditLog(
      session.user.id,
      "DECISION_DELETED",
      { decisionId: id, title: decision.title },
      request
    ).catch(() => null)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/decisions/[id]] Error:", error)
    return NextResponse.json({ error: "Failed to delete decision" }, { status: 500 })
  }
}
