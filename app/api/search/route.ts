import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { hybridSearchDecisions } from "@/lib/weaviate"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")
    const useVector = searchParams.get("vector") !== "false" // Default to vector search
    const limit = parseInt(searchParams.get("limit") || "20", 10)

    if (!query || query.trim() === "") {
      return NextResponse.json({
        success: true,
        decisions: [],
        query: "",
        searchType: "none",
      })
    }

    let decisions: any[] = []
    let searchType = "keyword"

    if (useVector) {
      try {
        // Try vector search first
        const vectorResults = await hybridSearchDecisions(
          session.user.id,
          query,
          limit,
          0.7 // 70% vector, 30% keyword
        )

        if (vectorResults.length > 0) {
          // Get full decision data from PostgreSQL
          const decisionIds = vectorResults.map((r) => r.decisionId)
          decisions = await prisma.decision.findMany({
            where: {
              id: { in: decisionIds },
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

          // Sort by Weaviate relevance score
          const decisionMap = new Map(decisions.map((d) => [d.id, d]))
          decisions = decisionIds
            .map((id) => decisionMap.get(id))
            .filter(Boolean)

          searchType = "hybrid"
        }
      } catch (vectorError) {
        console.error("Vector search failed, falling back to keyword:", vectorError)
      }
    }

    // Fallback to keyword search if vector search failed or returned no results
    if (decisions.length === 0) {
      decisions = await prisma.decision.findMany({
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
        take: limit,
      })

      searchType = "keyword"
    }

    return NextResponse.json({
      success: true,
      query,
      decisions,
      count: decisions.length,
      searchType,
    })
  } catch (error) {
    console.error("Error searching decisions:", error)
    return NextResponse.json(
      { error: "Failed to search decisions" },
      { status: 500 }
    )
  }
}
