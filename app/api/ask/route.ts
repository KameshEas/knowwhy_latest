import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
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

    // Fetch all user's decisions for context
    const decisions = await prisma.decision.findMany({
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
      take: 50, // Limit to recent 50 decisions for context
    })

    if (decisions.length === 0) {
      return NextResponse.json({
        success: true,
        answer: "I don't have any decisions recorded yet. Start by analyzing your meetings to capture decisions!",
        sources: [],
      })
    }

    // Prepare context for Groq
    const decisionsContext = decisions
      .map(
        (d: {
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
---
`
      )
      .join("\n")

    // Use Groq to answer the question
    const response = await groqClient.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant for KnowWhy, a Decision Memory System. You help users understand their past decisions.
          
You have access to the user's decision history. Answer their questions based on the decisions provided.
Be concise but informative. If the answer isn't in the decisions, say so clearly.

Format your response in a clear, readable way. Use bullet points if listing multiple items.`,
        },
        {
          role: "user",
          content: `Here are my recorded decisions:\n\n${decisionsContext}\n\nMy question is: ${question}\n\nPlease answer based on the decisions above.`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    })

    const answer = response.choices[0]?.message?.content || "I couldn't generate an answer."

    // Find relevant decisions that match the question
    const relevantDecisions = decisions.filter(
      (d: {
        title: string
        summary: string
        finalDecision: string
      }) =>
        question.toLowerCase().includes(d.title.toLowerCase()) ||
        d.title.toLowerCase().includes(question.toLowerCase()) ||
        d.summary.toLowerCase().includes(question.toLowerCase()) ||
        d.finalDecision.toLowerCase().includes(question.toLowerCase())
    )

    return NextResponse.json({
      success: true,
      answer,
      question,
      sources: relevantDecisions.slice(0, 3).map((d: { id: string; title: string; meeting?: { title?: string }; createdAt: Date }) => ({
        id: d.id,
        title: d.title,
        meeting: d.meeting?.title,
        date: d.createdAt,
      })),
    })
  } catch (error) {
    console.error("Error answering question:", error)
    return NextResponse.json(
      { error: "Failed to answer question" },
      { status: 500 }
    )
  }
}