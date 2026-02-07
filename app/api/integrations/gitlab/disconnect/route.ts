import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.gitLabIntegration.delete({
      where: {
        userId: session.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: "GitLab disconnected successfully",
    })
  } catch (error) {
    console.error("Error disconnecting GitLab:", error)
    return NextResponse.json(
      { error: "Failed to disconnect GitLab" },
      { status: 500 }
    )
  }
}