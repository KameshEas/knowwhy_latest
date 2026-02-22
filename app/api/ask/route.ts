import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { hybridSearchDecisions } from "@/lib/weaviate"
import { NextResponse } from "next/server"
import Groq from "groq-sdk"

const groqClient = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { question } = await request.json()

    if (!question || question.trim() === "") {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      )
    }

    // Try vector search first for semantic similarity
    let contextDecisions: any[] = []
    let searchType = "keyword"

    try {
      const vectorResults = await hybridSearchDecisions(
        session.user.id,
        question,
        10, // Get top 10 most relevant
        0.8 // 80% vector, 20% keyword for RAG
      )

      if (vectorResults.length > 0) {
        // Get full decision data from PostgreSQL
        const decisionIds = vectorResults.map((r) => r.decisionId)
        contextDecisions = await prisma.decision.findMany({
          where: {
            id: { in: decisionIds },
          },
          include: {
            meeting: {
              select: {
                title: true,
                startTime: true,
              },
            },
          },
        })

        // Sort by Weaviate relevance score
        const decisionMap = new Map(contextDecisions.map((d) => [d.id, d]))
        contextDecisions = decisionIds
          .map((id) => decisionMap.get(id))
          .filter(Boolean)

        searchType = "hybrid"
      }
    } catch (vectorError) {
      console.error("Vector search failed, using fallback:", vectorError)
    }

    // Fallback to recent decisions if vector search failed
    if (contextDecisions.length === 0) {
      contextDecisions = await prisma.decision.findMany({
        where: {
          userId: session.user.id,
        },
        include: {
          meeting: {
            select: {
              title: true,
              startTime: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      })
      searchType = "keyword"
    }

    if (contextDecisions.length === 0) {
      return NextResponse.json({
        success: true,
        answer: "I don't have any decisions recorded yet. Start by analyzing your meetings to capture decisions!",
        sources: [],
        searchType,
      })
    }

    // Prepare context for Groq with relevant decisions
    const decisionsContext = contextDecisions
      .map(
        (d: {
          id: string
          title: string
          summary: string
          problemStatement: string
          optionsDiscussed: string[]
          finalDecision: string
          rationale: string
          actionItems: string[]
          meeting?: { title?: string }
          createdAt: Date
        }) => `
Decision: ${d.title}
Summary: ${d.summary}
Problem: ${d.problemStatement}
Options: ${d.optionsDiscussed.join(", ")}
Final Decision: ${d.finalDecision}
Rationale: ${d.rationale}
Action Items: ${d.actionItems.join(", ")}
Meeting: ${d.meeting?.title || "N/A"}
Date: ${d.createdAt}
ID: ${d.id}
---
`
      )
      .join("\n")

    // Use Groq to answer the question with RAG
    const response = await groqClient.chat.completions.create({
      model: "llama-3.1-70b-versatile", // Use better model for RAG
      messages: [
        {
          role: "system",
          content: `You are an AI assistant for KnowWhy, a Decision Memory System. You help users understand their past decisions.

You have access to the user's decision history that was retrieved using semantic search based on their question. 
Answer their questions based ONLY on the decisions provided in the context. 
Be concise but informative. If the answer isn't in the decisions, say so clearly.

IMPORTANT: 
- Focus on decisions that are most relevant to the user's question
- Include specific decision IDs when referencing decisions
- Format your response in a clear, readable way
- Use bullet points if listing multiple items`,
        },
        {
          role: "user",
          content: `Based on the following relevant decisions from my history, please answer my question.\n\nQuestion: ${question}\n\n---\n\nRelevant Decisions:\n${decisionsContext}\n\n---\n\nPlease answer based on the decisions above.`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    })

    const answer = response.choices[0]?.message?.content || "I couldn't generate an answer."

    // Return sources with relevance info
    return NextResponse.json({
      success: true,
      answer,
      question,
      sources: contextDecisions.slice(0, 5).map((d: { id: string; title: string; meeting?: { title?: string }; createdAt: Date }) => ({
        id: d.id,
        title: d.title,
        meeting: d.meeting?.title,
        date: d.createdAt,
      })),
      searchType,
    })
  } catch (error) {
    console.error("Error answering question:", error)
    return NextResponse.json(
      { error: "Failed to answer question" },
      { status: 500 }
    )
  }
}
