import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decisions = await prisma.decision.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        meeting: {
          select: {
            id: true,
            title: true,
            startTime: true,
            meetLink: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({
      success: true,
      decisions,
    })
  } catch (error) {
    console.error("Error fetching decisions:", error)
    return NextResponse.json(
      { error: "Failed to fetch decisions" },
      { status: 500 }
    )
  }
}