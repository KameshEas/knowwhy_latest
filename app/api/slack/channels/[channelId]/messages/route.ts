import { auth } from "@/auth"
import { getSlackChannelMessages } from "@/lib/slack"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { channelId } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")

    const messages = await getSlackChannelMessages(
      session.user.id,
      channelId,
      limit
    )

    return NextResponse.json({
      success: true,
      messages: messages.map((msg: any) => ({
        ts: msg.ts,
        text: msg.text,
        user: msg.user,
        type: msg.type,
        subtype: msg.subtype,
        threadTs: msg.thread_ts,
        replyCount: msg.reply_count,
        timestamp: new Date(parseFloat(msg.ts) * 1000).toISOString(),
      })),
    })
  } catch (error) {
    console.error("Error fetching Slack messages:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch messages" },
      { status: 500 }
    )
  }
}