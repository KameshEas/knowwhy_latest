/**
 * GET /api/user/audit-logs
 *
 * Returns paginated audit log entries for the authenticated user.
 * Admins can additionally pass ?userId=<id> to view another user's log.
 *
 * Query params:
 *   limit    — number of records per page (default 20, max 100)
 *   offset   — pagination offset (default 0)
 *   action   — filter by AuditAction string
 */
import { auth } from "@/auth"
import { requireRole } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const session = await auth()

    const authCheck = requireRole(session, "USER")
    if (authCheck) return authCheck

    const userId = session!.user!.id as string
    const userRole = (session!.user as { role?: string }).role ?? "USER"

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100)
    const offset = parseInt(searchParams.get("offset") ?? "0", 10)
    const action = searchParams.get("action") ?? undefined

    // Admins may query any user's log; regular users are restricted to their own.
    const requestedUserId = searchParams.get("userId")
    const targetUserId =
      userRole === "ADMIN" && requestedUserId ? requestedUserId : userId

    const where: Record<string, unknown> = { userId: targetUserId }
    if (action) where.action = action

    const [logs, total] = await Promise.all([
      (prisma as any).auditLog.findMany({
        where,
        select: {
          id: true,
          action: true,
          metadata: true,
          ipAddress: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      (prisma as any).auditLog.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error("[GET /api/user/audit-logs] Error:", error)
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 })
  }
}
