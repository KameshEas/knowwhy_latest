"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { X, ChevronRight, Loader2 } from "lucide-react"
import { EmptyState } from "@/components/empty-state"

interface Decision {
  id: string
  title: string
  summary: string
  problemStatement: string
  optionsDiscussed: string[]
  finalDecision: string
  rationale: string
  actionItems: string[]
  confidence: number
  source: string
  timestamp: string
  createdAt: string
  meeting?: {
    id: string
    title: string
    startTime: string
    meetLink?: string
  }
}

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null)

  const fetchDecisions = async () => {
    try {
      const response = await fetch("/api/decisions")
      const data = await response.json()
      if (data.decisions) {
        setDecisions(data.decisions)
      }
    } catch (error) {
      console.error("Error fetching decisions:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadDemoData = () => {
    const demoDecisions: Decision[] = [
      {
        id: "demo-1",
        title: "Migrate to PostgreSQL from MongoDB",
        summary: "The team decided to migrate the main database from MongoDB to PostgreSQL for better relational data support and ACID compliance.",
        problemStatement: "Current MongoDB setup is causing data consistency issues with complex relationships between entities.",
        optionsDiscussed: ["Stay with MongoDB and add validation", "Migrate to PostgreSQL", "Use both databases (polyglot persistence)"],
        finalDecision: "Migrate to PostgreSQL with a phased approach over 2 months",
        rationale: "PostgreSQL provides better ACID guarantees, mature tooling, and team has more experience with SQL databases.",
        actionItems: ["Create migration plan", "Set up PostgreSQL instance", "Write data migration scripts", "Update application layer"],
        confidence: 0.92,
        source: "meeting",
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        meeting: {
          id: "demo-meeting",
          title: "Architecture Review - Database Migration",
          startTime: new Date().toISOString(),
        }
      },
      {
        id: "demo-2",
        title: "Adopt TypeScript for Frontend",
        summary: "Team agreed to migrate the React frontend to TypeScript for better type safety and developer experience.",
        problemStatement: "Runtime errors in production due to type mismatches and lack of IDE support slowing development.",
        optionsDiscussed: ["Keep JavaScript with JSDoc", "Migrate to TypeScript gradually", "Full TypeScript rewrite"],
        finalDecision: "Gradual migration - new features in TypeScript, migrate existing code incrementally",
        rationale: "Gradual approach minimizes risk while getting immediate benefits on new code. Team already familiar with TypeScript.",
        actionItems: ["Set up TypeScript configuration", "Update build pipeline", "Train team on best practices", "Migrate utils first"],
        confidence: 0.88,
        source: "slack",
        timestamp: new Date().toISOString(),
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ]
    setDecisions(demoDecisions)
  }

  useEffect(() => {
    fetchDecisions()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-blue-900 dark:text-blue-100">Decisions</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">
            AI-detected decisions from your meetings and conversations.
          </p>
        </div>
      </div>

      {/* Decision Detail Modal */}
      {selectedDecision && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-950 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100">{selectedDecision.title}</h2>
                  <p className="text-sm text-zinc-500 mt-1">
                    Detected on {format(new Date(selectedDecision.createdAt), "PPP")}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDecision(null)}
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Summary</h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200">{selectedDecision.summary}</p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Problem Statement</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{selectedDecision.problemStatement}</p>
                </div>

                {selectedDecision.optionsDiscussed.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Options Discussed</h3>
                    <ul className="list-disc list-inside text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                      {selectedDecision.optionsDiscussed.map((option, i) => (
                        <li key={i}>{option}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h3 className="font-medium text-green-900 dark:text-green-100 mb-1">Final Decision</h3>
                  <p className="text-sm text-green-800 dark:text-green-200">{selectedDecision.finalDecision}</p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Rationale</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{selectedDecision.rationale}</p>
                </div>

                {selectedDecision.actionItems.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Action Items</h3>
                    <ul className="list-disc list-inside text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                      {selectedDecision.actionItems.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedDecision.meeting && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="font-medium mb-2">Source Meeting</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {selectedDecision.meeting.title} - {" "}
                      {format(new Date(selectedDecision.meeting.startTime), "PPP")}
                    </p>
                    {selectedDecision.meeting.meetLink && (
                      <a
                        href={selectedDecision.meeting.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 mt-1 inline-block"
                      >
                        View Meeting →
                      </a>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <span>Confidence: {Math.round(selectedDecision.confidence * 100)}%</span>
                  <span>•</span>
                  <span className="capitalize">Source: {selectedDecision.source}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-400" />
            <p className="mt-4 text-zinc-500">Loading decisions...</p>
          </CardContent>
        </Card>
      ) : decisions.length === 0 ? (
        <EmptyState type="decisions" onDemoData={loadDemoData} />
      ) : (
        <Card className="border-blue-100 dark:border-blue-900">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">Decision Library</CardTitle>
            <CardDescription>
              AI-analyzed decisions from your meetings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {decisions.map((decision) => (
                <div
                  key={decision.id}
                  className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer transition-all"
                  onClick={() => setSelectedDecision(decision)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-blue-900 dark:text-blue-100">{decision.title}</h3>
                      <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{decision.summary}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-zinc-400">
                        <span>{format(new Date(decision.createdAt), "PPP")}</span>
                        {decision.meeting && (
                          <>
                            <span>•</span>
                            <span>{decision.meeting.title}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          decision.confidence >= 0.8
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : decision.confidence >= 0.6
                            ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                            : "bg-gray-100 text-gray-800 border border-gray-200"
                        }`}
                      >
                        {Math.round(decision.confidence * 100)}% confidence
                      </span>
                      <ChevronRight className="w-5 h-5 text-zinc-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}