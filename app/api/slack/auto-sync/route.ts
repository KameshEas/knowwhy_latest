import { auth } from "@/auth"
import { autoSyncSlackChannels } from "@/lib/slack-sync"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log(`[Auto-Sync] Starting Slack sync for user: ${session.user.id}`)
    
    const results = await autoSyncSlackChannels(session.user.id)
    
    const totalMessages = results.reduce((sum, r) => sum + r.messagesProcessed, 0)
    const totalDecisions = results.reduce((sum, r) => sum + r.decisionsFound, 0)
    const errors = results.filter(r => r.errors)

    console.log(`[Auto-Sync] Completed: ${totalMessages} messages, ${totalDecisions} decisions, ${errors.length} errors`)

    return NextResponse.json({
      success: true,
      summary: {
        channelsProcessed: results.length,
        totalMessages,
        totalDecisions,
        errors: errors.length,
      },
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Auto-Sync] Failed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Auto-sync failed" },
      { status: 500 }
    )
  }
}