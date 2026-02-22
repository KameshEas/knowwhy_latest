/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma"
import { autoSyncAllSources } from "@/lib/auto-sync"
import { NextResponse } from "next/server"

/**
 * POST /api/auto-sync
 * Triggers automatic sync for all users
 * Can be called by GitHub Actions cron job
 */
export async function POST(request: Request) {
  try {
    // Verify cron secret if provided (for GitHub Actions)
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all users with at least one integration
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { slackIntegration: { isNot: null } },
          { gitlabIntegration: { isNot: null } },
          { accounts: { some: { provider: "google" } } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    const results = []

    for (const user of users) {
      try {
        console.log(`Auto-syncing user: ${user.email}`)
        const syncResults = await autoSyncAllSources(user.id)
        results.push({
          userId: user.id,
          email: user.email,
          results: syncResults,
        })
      } catch (error) {
        console.error(`Error syncing user ${user.email}:`, error)
        results.push({
          userId: user.id,
          email: user.email,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    // Calculate totals
    const totalDecisions = results.reduce((sum, r) => {
      if (r.results) {
        return sum + r.results.reduce((s: number, result: any) => s + result.decisionsFound, 0)
      }
      return sum
    }, 0)

    return NextResponse.json({
      success: true,
      usersProcessed: users.length,
      totalDecisionsFound: totalDecisions,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Auto-sync error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Auto-sync failed" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auto-sync
 * Returns sync status (for testing)
 */
export async function GET() {
  return NextResponse.json({
    message: "Auto-sync endpoint is active",
    timestamp: new Date().toISOString(),
  })
}
