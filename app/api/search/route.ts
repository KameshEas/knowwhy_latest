import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")

    if (!query || query.trim() === "") {
      return NextResponse.json({
        success: true,
        decisions: [],
        query: "",
      })
    }

    // Search in decisions
    const decisions = await prisma.decision.findMany({
      where: {
        userId: session.user.id,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { summary: { contains: query, mode: "insensitive" } },
          { problemStatement: { contains: query, mode: "insensitive" } },
          { finalDecision: { contains: query, mode: "insensitive" } },
          { rationale: { contains: query, mode: "insensitive" } },
          { optionsDiscussed: { hasSome: [query] } },
        ],
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
      take: 20,
    })

    return NextResponse.json({
      success: true,
      query,
      decisions,
      count: decisions.length,
    })
  } catch (error) {
    console.error("Error searching decisions:", error)
    return NextResponse.json(
      { error: "Failed to search decisions" },
      { status: 500 }
    )
  }
}