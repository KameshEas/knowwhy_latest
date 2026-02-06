import Groq from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export interface DecisionDetectionResult {
  isDecision: boolean
  confidence: number
  summary?: string
  problemStatement?: string
  optionsDiscussed?: string[]
  finalDecision?: string
  rationale?: string
  participants?: string[]
}

export async function detectDecision(transcript: string): Promise<DecisionDetectionResult> {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant that analyzes meeting transcripts to detect if a decision was made.
          
          Analyze the transcript and determine:
          1. Whether a clear decision was made (isDecision: true/false)
          2. Your confidence level (0-1)
          3. If a decision was made, extract:
             - Summary of the decision
             - Problem statement that led to the decision
             - Options that were discussed
             - The final decision made
             - Rationale for the decision
             - Key participants in the decision
          
          Return ONLY a JSON object in this exact format:
          {
            "isDecision": boolean,
            "confidence": number (0-1),
            "summary": "string or null",
            "problemStatement": "string or null",
            "optionsDiscussed": ["array of strings or empty"],
            "finalDecision": "string or null",
            "rationale": "string or null",
            "participants": ["array of strings or empty"]
          }`,
        },
        {
          role: "user",
          content: `Analyze this meeting transcript and detect if a decision was made:\n\n${transcript}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return { isDecision: false, confidence: 0 }
    }

    // Parse JSON from response
    try {
      const result = JSON.parse(content)
      return result as DecisionDetectionResult
    } catch (parseError) {
      console.error("Failed to parse Groq response:", parseError)
      return { isDecision: false, confidence: 0 }
    }
  } catch (error) {
    console.error("Error calling Groq API:", error)
    throw error
  }
}

export async function generateDecisionBrief(
  transcript: string,
  meetingTitle: string
): Promise<{
  title: string
  summary: string
  problemStatement: string
  optionsDiscussed: string[]
  finalDecision: string
  rationale: string
  actionItems: string[]
}> {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant that generates structured decision briefs from meeting transcripts.
          
          Create a comprehensive decision brief with:
          1. A clear title for the decision
          2. Executive summary (2-3 sentences)
          3. Problem statement that was being solved
          4. Options/alternatives that were considered
          5. The final decision that was made
          6. Rationale/justification for the decision
          7. Action items or next steps
          
          Return ONLY a JSON object in this exact format:
          {
            "title": "string",
            "summary": "string",
            "problemStatement": "string",
            "optionsDiscussed": ["array of strings"],
            "finalDecision": "string",
            "rationale": "string",
            "actionItems": ["array of strings"]
          }`,
        },
        {
          role: "user",
          content: `Meeting Title: ${meetingTitle}\n\nTranscript:\n${transcript}\n\nGenerate a decision brief from this meeting.`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error("No content from Groq")
    }

    return JSON.parse(content)
  } catch (error) {
    console.error("Error generating decision brief:", error)
    throw error
  }
}