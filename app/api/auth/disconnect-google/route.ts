import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete the Google account
    const deleted = await prisma.account.deleteMany({
      where: {
        userId: session.user.id,
        provider: "google",
      },
    })

    return NextResponse.json({
      success: true,
      message: "Google account disconnected. Please sign out and sign back in to re-authenticate with calendar permissions.",
      deleted: deleted.count,
    })
  } catch (error) {
    console.error("Error disconnecting Google account:", error)
    return NextResponse.json(
      { error: "Failed to disconnect account" },
      { status: 500 }
    )
  }
}