// Defer loading of the heavy weaviate client until runtime to avoid inflating server startup
let client: any | null = null

export function getWeaviateClient(): any {
  if (client) return client

  const weaviateUrl = process.env.WEAVIATE_URL || 'http://localhost:8080'

  // Dynamically import the weaviate client only when needed
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const weaviate = require('weaviate-ts-client')

  try {
    const parsed = new URL(weaviateUrl)
    client = weaviate.client({
      scheme: parsed.protocol.replace(":", ""),
      host: parsed.host,
      headers: {
        'X-OpenAI-Api-Key': process.env.GROQ_API_KEY || '',
      },
    })
  } catch (err) {
    client = weaviate.client({
      scheme: 'http',
      host: 'localhost:8080',
      headers: {
        'X-OpenAI-Api-Key': process.env.GROQ_API_KEY || '',
      },
    })
  }

  return client
}

// Decision schema configuration for Weaviate
export const DECISION_SCHEMA = {
  class: 'Decision',
  description: 'A decision extracted from meetings, Slack, or GitLab',
  vectorizer: 'text2vec-ollama', // Uses Ollama for embeddings
  moduleConfig: {
    'text2vec-ollama': {
      model: process.env.OLLAMA_EMBEDDING_MODEL || 'mxbai-embed-large',
      vectorizeClassName: false,
    },
  },
  properties: [
    {
      name: 'decisionId',
      dataType: ['text'],
      description: 'Unique identifier from PostgreSQL',
    },
    {
      name: 'userId',
      dataType: ['text'],
      description: 'User who owns this decision',
    },
    {
      name: 'title',
      dataType: ['text'],
      description: 'Decision title',
    },
    {
      name: 'summary',
      dataType: ['text'],
      description: 'Brief summary of the decision',
    },
    {
      name: 'problemStatement',
      dataType: ['text'],
      description: 'The problem that was being solved',
    },
    {
      name: 'optionsDiscussed',
      dataType: ['text[]'],
      description: 'Options that were considered',
    },
    {
      name: 'finalDecision',
      dataType: ['text'],
      description: 'The final decision that was made',
    },
    {
      name: 'rationale',
      dataType: ['text'],
      description: 'Why this decision was made',
    },
    {
      name: 'actionItems',
      dataType: ['text[]'],
      description: 'Action items from the decision',
    },
    {
      name: 'source',
      dataType: ['text'],
      description: 'Source of the decision (meet, slack, gitlab)',
    },
    {
      name: 'sourceLink',
      dataType: ['text'],
      description: 'Link to the original source',
    },
    {
      name: 'timestamp',
      dataType: ['date'],
      description: 'When the decision was made',
    },
  ],
}

// Ensure the Decision schema exists in Weaviate
export async function ensureDecisionSchema(): Promise<boolean> {
  try {
    const client = getWeaviateClient()
    
    // Check if schema already exists
    const schema = await client.schema.getter().do()
    const classExists = schema.classes?.some((c) => c.class === DECISION_SCHEMA.class)
    
    if (!classExists) {
      // Create the schema
      await client.schema.classCreator().withClass(DECISION_SCHEMA).do()
      console.log('✅ Weaviate Decision schema created')
    } else {
      console.log('✅ Weaviate Decision schema already exists')
    }
    
    return true
  } catch (error) {
    console.error('❌ Failed to ensure Weaviate schema:', error)
    return false
  }
}

// Add a decision to Weaviate
export async function addDecisionToWeaviate(decision: {
  id: string
  userId: string
  title: string
  summary: string
  problemStatement: string
  optionsDiscussed: string[]
  finalDecision: string
  rationale: string
  actionItems: string[]
  source: string
  sourceLink?: string
  timestamp: Date
}): Promise<boolean> {
  try {
    const client = getWeaviateClient()
    
    // Create a combined text field for semantic search
    const combinedText = `
      ${decision.title}
      ${decision.summary}
      Problem: ${decision.problemStatement}
      Options considered: ${decision.optionsDiscussed.join(', ')}
      Decision: ${decision.finalDecision}
      Rationale: ${decision.rationale}
      Actions: ${decision.actionItems.join(', ')}
    `.trim()

    await client.data
      .creator()
      .withClassName('Decision')
      .withProperties({
        decisionId: decision.id,
        userId: decision.userId,
        title: decision.title,
        summary: decision.summary,
        problemStatement: decision.problemStatement,
        optionsDiscussed: decision.optionsDiscussed,
        finalDecision: decision.finalDecision,
        rationale: decision.rationale,
        actionItems: decision.actionItems,
        source: decision.source,
        sourceLink: decision.sourceLink || '',
        timestamp: decision.timestamp.toISOString(),
        // The text2vec-ollama module will automatically vectorize the properties
        // We pass the combined text as a workaround for explicit vectorization
        text: combinedText,
      })
      .do()

    return true
  } catch (error) {
    console.error('❌ Failed to add decision to Weaviate:', error)
    return false
  }
}

// Search decisions using vector similarity
export async function searchDecisions(
  userId: string,
  query: string,
  limit: number = 10
): Promise<
  Array<{
    decisionId: string
    title: string
    summary: string
    finalDecision: string
    source: string
    timestamp: string
    score: number
  }>
> {
  try {
    const client = getWeaviateClient()

    const response = await client.graphql
      .get()
      .withClassName('Decision')
      .withNearText({
        concepts: [query],
        distance: 0.7, // Threshold for similarity
      })
      .withWhere({
        operator: 'Equal',
        path: ['userId'],
        valueString: userId,
      })
      .withLimit(limit)
      .withFields('decisionId title summary finalDecision source timestamp')
      .do()

    const results = response.data.Get.Decision || []

    return results.map((item: Record<string, unknown>) => ({
      decisionId: item.decisionId as string,
      title: item.title as string,
      summary: item.summary as string,
      finalDecision: item.finalDecision as string,
      source: item.source as string,
      timestamp: item.timestamp as string,
      // Weaviate doesn't return scores in this format, using certainty as proxy
      score: 0.9, // Placeholder - actual implementation would need to check _additional
    }))
  } catch (error) {
    console.error('❌ Failed to search decisions in Weaviate:', error)
    return []
  }
}

// Hybrid search (vector + keyword)
export async function hybridSearchDecisions(
  userId: string,
  query: string,
  limit: number = 10,
  alpha: number = 0.7 // 0 = keyword, 1 = vector
): Promise<
  Array<{
    decisionId: string
    title: string
    summary: string
    finalDecision: string
    source: string
    timestamp: string
    score: number
  }>
> {
  try {
    const client = getWeaviateClient()

    const response = await client.graphql
      .get()
      .withClassName('Decision')
      .withHybrid({
        query,
        alpha,
        properties: ['title', 'summary', 'finalDecision', 'rationale'],
      })
      .withWhere({
        operator: 'Equal',
        path: ['userId'],
        valueString: userId,
      })
      .withLimit(limit)
      .withFields('decisionId title summary finalDecision source timestamp')
      .do()

    const results = response.data.Get.Decision || []

    return results.map((item: Record<string, unknown>) => ({
      decisionId: item.decisionId as string,
      title: item.title as string,
      summary: item.summary as string,
      finalDecision: item.finalDecision as string,
      source: item.source as string,
      timestamp: item.timestamp as string,
      score: 0.9,
    }))
  } catch (error) {
    console.error('❌ Failed to hybrid search in Weaviate:', error)
    // Fallback to pure vector search
    return searchDecisions(userId, query, limit)
  }
}

// Delete a decision from Weaviate
export async function deleteDecisionFromWeaviate(decisionId: string): Promise<boolean> {
  try {
    const client = getWeaviateClient()

    // Find the decision by decisionId
    const response = await client.graphql
      .get()
      .withClassName('Decision')
      .withWhere({
        operator: 'Equal',
        path: ['decisionId'],
        valueString: decisionId,
      })
      .withFields('_id')
      .do()

    const results = response.data.Get.Decision || []

    if (results.length > 0) {
      const weaviateId = results[0]._id
      await client.data.deleter().withClassName('Decision').withId(weaviateId).do()
    }

    return true
  } catch (error) {
    console.error('❌ Failed to delete decision from Weaviate:', error)
    return false
  }
}

// Get all decisions for a user from Weaviate
export async function getAllDecisionsFromWeaviate(
  userId: string,
  limit: number = 100
): Promise<string[]> {
  try {
    const client = getWeaviateClient()

    const response = await client.graphql
      .get()
      .withClassName('Decision')
      .withWhere({
        operator: 'Equal',
        path: ['userId'],
        valueString: userId,
      })
      .withLimit(limit)
      .withFields('decisionId')
      .do()

    const results = response.data.Get.Decision || []

    return results.map((item: Record<string, unknown>) => item.decisionId as string)
  } catch (error) {
    console.error('❌ Failed to get all decisions from Weaviate:', error)
    return []
  }
}

// Check if Weaviate is healthy
export async function checkWeaviateHealth(): Promise<boolean> {
  try {
    const client = getWeaviateClient()
    const meta = await client.misc.metaGetter().do()
    return !!meta
  } catch (error) {
    console.error('❌ Weaviate health check failed:', error)
    return false
  }
}
