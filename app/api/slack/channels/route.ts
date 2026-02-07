import { auth } from "@/auth"
import { getSlackChannels } from "@/lib/slack"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const channels = await getSlackChannels(session.user.id)

    return NextResponse.json({
      success: true,
      channels: channels.map((channel) => ({
        id: channel.id,
        name: channel.name,
        isPrivate: channel.is_private,
        memberCount: channel.num_members,
        created: channel.created,
        topic: channel.topic?.value || "",
        purpose: channel.purpose?.value || "",
      })),
    })
  } catch (error) {
    console.error("Error fetching Slack channels:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch channels" },
      { status: 500 }
    )
  }
}