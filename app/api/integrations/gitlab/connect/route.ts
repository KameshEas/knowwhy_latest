import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { encrypt } from "@/lib/crypto"
import { createAuditLog } from "@/lib/audit"

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { token, gitlabUrl = "https://gitlab.com" } = await request.json()

    if (!token || token.trim() === "") {
      return NextResponse.json(
        { error: "Personal Access Token is required" },
        { status: 400 }
      )
    }

    // Validate token by fetching user info from GitLab
    const response = await fetch(`${gitlabUrl}/api/v4/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: "Invalid token or GitLab URL" },
        { status: 400 }
      )
    }

    const userData = await response.json()

    // Save or update GitLab integration — token is encrypted before storage
    await prisma.gitLabIntegration.upsert({
      where: {
        userId: session.user.id,
      },
      update: {
        accessToken: encrypt(token),
        gitlabUrl,
        username: userData.username,
        userGitlabId: userData.id,
        connectedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        accessToken: encrypt(token),
        gitlabUrl,
        username: userData.username,
        userGitlabId: userData.id,
      },
    })

    await createAuditLog(session.user.id, "INTEGRATION_CONNECTED", { provider: "gitlab", gitlabUrl }, request)

    return NextResponse.json({
      success: true,
      message: "GitLab connected successfully",
      user: {
        username: userData.username,
        gitlabUrl,
      },
    })
  } catch (error) {
    console.error("Error connecting GitLab:", error)
    return NextResponse.json(
      { error: "Failed to connect GitLab" },
      { status: 500 }
    )
  }
}