import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)

    // Filter options
    const source = searchParams.get("source")
    const status = searchParams.get("status")
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = parseInt(searchParams.get("offset") || "0")

    // Build where clause
    const where: any = { userId }
    if (source) where.source = source
    if (status) where.status = status

    const logs = await prisma.webhookLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 50),
      skip: offset,
    })

    const total = await prisma.webhookLog.count({ where })

    // Get stats
    const stats = await prisma.webhookLog.groupBy({
      by: ["status"],
      where: { userId },
      _count: true,
    })

    const statsMap = {
      total: 0,
      processed: 0,
      pending: 0,
      failed: 0,
    }

    stats.forEach((s) => {
      statsMap.total += s._count
      if (s.status === "processed") statsMap.processed = s._count
      if (s.status === "pending") statsMap.pending = s._count
      if (s.status === "failed") statsMap.failed = s._count
    })

    return NextResponse.json({
      success: true,
      logs: logs.map((log) => ({
        id: log.id,
        source: log.source,
        eventType: log.eventType,
        status: log.status,
        decisionId: log.decisionId,
        decisionTitle: log.decisionTitle,
        confidence: log.confidence,
        errorMessage: log.errorMessage,
        processedAt: log.processedAt,
        createdAt: log.createdAt,
      })),
      stats: statsMap,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + logs.length < total,
      },
    })
  } catch (error) {
    console.error("[WebhookLogs] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch webhook logs" },
      { status: 500 }
    )
  }
}
