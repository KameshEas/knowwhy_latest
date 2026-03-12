/**
 * Ollama inference client — used as the default AI provider for self-hosted deployments.
 *
 * Set AI_PROVIDER=groq in your environment to switch to Groq's cloud API.
 * When AI_PROVIDER=ollama (the default), no data leaves your infrastructure.
 */
import { env } from "./env"

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

export interface DecisionBriefResult {
  title: string
  summary: string
  problemStatement: string
  optionsDiscussed: string[]
  finalDecision: string
  rationale: string
  actionItems: string[]
}

const DEFAULT_MODEL = env.OLLAMA_CHAT_MODEL

async function ollamaChat(prompt: string, systemPrompt: string): Promise<string> {
  const response = await fetch(`${env.OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      stream: false,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Ollama request failed (${response.status}): ${text}`)
  }

  const data = await response.json()
  return data.message?.content ?? ""
}

/**
 * Parse JSON from an LLM response that may be wrapped in markdown code blocks.
 */
function parseJsonFromResponse(content: string): any {
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1])
    } catch (_) {
      // fall through
    }
  }
  try {
    return JSON.parse(content)
  } catch (_) {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
    throw new Error("Invalid JSON response from Ollama")
  }
}

export async function detectDecisionOllama(transcript: string): Promise<DecisionDetectionResult> {
  const systemPrompt = `You are an expert at analyzing meeting transcripts and communications to identify decisions. 
Respond only with valid JSON matching the schema exactly.`

  const prompt = `Analyze this transcript and determine if a decision was made.

Transcript:
${transcript}

Respond with JSON:
{
  "isDecision": boolean,
  "confidence": number (0-1),
  "summary": "brief summary if decision",
  "problemStatement": "what problem was being solved",
  "optionsDiscussed": ["option1", "option2"],
  "finalDecision": "the decision made",
  "rationale": "why this decision",
  "participants": ["person1", "person2"]
}`

  const content = await ollamaChat(prompt, systemPrompt)
  return parseJsonFromResponse(content)
}

export async function generateDecisionBriefOllama(
  transcript: string,
  meetingTitle: string
): Promise<DecisionBriefResult> {
  const systemPrompt = `You are an expert at creating concise decision briefs from meeting transcripts.
Respond only with valid JSON matching the schema exactly.`

  const prompt = `Create a comprehensive decision brief from this transcript.

Meeting/Discussion: ${meetingTitle}

Transcript:
${transcript}

Respond with JSON:
{
  "title": "concise decision title",
  "summary": "2-3 sentence summary",
  "problemStatement": "what problem was being solved",
  "optionsDiscussed": ["option1", "option2"],
  "finalDecision": "the final decision",
  "rationale": "reasoning",
  "actionItems": ["action1", "action2"],
  "confidence": number (0-1)
}`

  const content = await ollamaChat(prompt, systemPrompt)
  return parseJsonFromResponse(content)
}
