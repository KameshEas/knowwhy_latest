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
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant that analyzes conversation transcripts to detect if a FINAL decision was made.

CRITICAL INSTRUCTIONS:
1. Focus ONLY on the FINAL decision - ignore earlier discussions that were changed or reversed
2. Look for explicit statements like "we decided", "let's go with", "agreed to", "final decision is"
3. If the conversation shows a change of mind, ONLY report the LATEST decision
4. If no clear final decision is stated, return isDecision: false
5. Confidence should reflect how explicit and clear the final decision is

Analyze the transcript and determine:
1. Whether a CLEAR FINAL decision was made (isDecision: true/false)
2. Your confidence level (0-1) - higher for explicit, recent decisions
3. If a decision was made, extract:
   - Summary of the FINAL decision only
   - Problem statement
   - Options discussed (but mark which was chosen)
   - The FINAL decision (as stated at the end of conversation)
   - Rationale
   - Key participants

Return ONLY a JSON object in this exact format:
{
  "isDecision": boolean,
  "confidence": number (0-1),
  "summary": "string or null",
  "problemStatement": "string or null",
  "optionsDiscussed": ["array of strings or empty"],
  "finalDecision": "string or null - THE LATEST DECISION ONLY",
  "rationale": "string or null",
  "participants": ["array of strings or empty"]
}`,
        },
        {
          role: "user",
          content: `Analyze this conversation transcript and detect if a FINAL decision was made. Remember to focus on the LAST messages where the final decision is stated:

${transcript}`,
        },
      ],
      temperature: 0.2,
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
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant that generates structured decision briefs from conversation transcripts.

CRITICAL INSTRUCTION - FOCUS ON THE FINAL DECISION:
- The conversation may show changing opinions or discussions
- ONLY report the FINAL decision stated at the end
- If someone changed their mind, report their FINAL position
- Ignore earlier options that were rejected
- Be precise about what was ACTUALLY decided

Create a decision brief with:
1. Title - clear and specific to the FINAL decision
2. Summary - 2-3 sentences about the FINAL outcome only
3. Problem statement - what was being decided
4. Options discussed - what was considered (but clearly indicate which was chosen)
5. Final decision - THE ACTUAL DECISION MADE (from the end of conversation)
6. Rationale - why this decision was made
7. Action items - specific next steps mentioned

Return ONLY a JSON object:
{
  "title": "string - reflect the FINAL decision",
  "summary": "string - focus on final outcome",
  "problemStatement": "string",
  "optionsDiscussed": ["array of strings"],
  "finalDecision": "string - THE FINAL DECISION ONLY, not earlier discussions",
  "rationale": "string",
  "actionItems": ["array of strings"]
}`,
        },
        {
          role: "user",
          content: `Meeting/Discussion: ${meetingTitle}

Transcript (messages are in chronological order, last messages show final decision):
${transcript}

Generate a decision brief. REMEMBER: Focus on the FINAL decision stated at the end, not earlier discussions.`,
        },
      ],
      temperature: 0.2,
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
