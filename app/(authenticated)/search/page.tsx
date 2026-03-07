"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"
import { Search, MessageCircle, Loader2, ArrowRight, FileText, X, Tag, Copy } from "lucide-react"

interface Decision {
  id: string
  title: string
  summary: string
  finalDecision: string
  confidence: number
  createdAt: string
  meeting?: {
    title: string
    startTime: string
  }
}

interface QAResponse {
  answer: string
  sources: {
    id: string
    title: string
    meeting?: string
    date: string
  }[]
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [question, setQuestion] = useState("")
  const [searchResults, setSearchResults] = useState<Decision[]>([])
  const [qaResponse, setQaResponse] = useState<QAResponse | null>(null)
  const [searching, setSearching] = useState(false)
  const [asking, setAsking] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Debounce searchQuery changes to reduce API calls
  useEffect(() => {
    const id = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery)
        setHasSearched(true)
      }
    }, 300)
    return () => clearTimeout(id)
  }, [searchQuery])

  const clearSearch = () => {
    setSearchQuery("")
    setSearchResults([])
    setHasSearched(false)
  }

  const clearQuestion = () => {
    setQuestion("")
    setQaResponse(null)
  }

  const suggestionTags = ["architecture", "pricing", "team structure", "on-call", "retrospective"]

  const applySuggestion = async (tag: string) => {
    setSearchQuery(tag)
    setHasSearched(true)
    await performSearch(tag)
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setHasSearched(true)
    await performSearch(searchQuery)
  }

  const performSearch = async (query: string) => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()
      if (data.decisions) {
        setSearchResults(data.decisions)
      }
    } catch (error) {
      console.error("Error searching:", error)
    } finally {
      setSearching(false)
    }
  }

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return

    setAsking(true)
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      })
      const data = await response.json()
      if (data.success) {
        setQaResponse({
          answer: data.answer,
          sources: data.sources,
        })
      }
    } catch (error) {
      console.error("Error asking:", error)
    } finally {
      setAsking(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Search & Ask</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2">
          Search through your decisions or ask natural language questions.
        </p>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Decisions
          </CardTitle>
          <CardDescription>
            Find decisions by keyword, topic, or content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search decisions... (e.g., 'architecture', 'pricing', 'team structure')"
                aria-label="Search decisions"
                label="Search decisions"
                labelVisible={false}
                className="flex-1"
              />
              <div className="flex items-stretch gap-2">
                {searchQuery && (
                  <Button variant="ghost" onClick={clearSearch} aria-label="Clear search">
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <Button type="submit" disabled={searching}>
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-sm text-zinc-500">Press Enter to search. Results update as you type.</p>
          </form>

          {hasSearched && (
            <div className="mt-6">
              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  <FileText className="mx-auto h-12 w-12 text-zinc-300 mb-4" />
                  <p>No decisions found matching "{searchQuery}"</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {suggestionTags.map((t) => (
                      <button
                        key={t}
                        onClick={() => applySuggestion(t)}
                        className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm text-zinc-600 hover:bg-zinc-50"
                      >
                        <Tag className="h-4 w-4" />
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-zinc-500">
                    Found {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
                  </p>
                  {searchResults.map((decision) => (
                    <div
                      key={decision.id}
                      className="p-4 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium">{decision.title}</h3>
                          <p className="text-sm text-zinc-500 mt-1 line-clamp-2">
                            {decision.summary}
                          </p>
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
                        <div className="ml-4 flex flex-col items-end gap-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              decision.confidence >= 0.8
                                ? "bg-green-100 text-green-800"
                                : decision.confidence >= 0.6
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {Math.round(decision.confidence * 100)}%
                          </span>
                          <a href={`/#`} className="text-xs text-zinc-500 hover:underline">View</a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Q&A Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Ask a Question
          </CardTitle>
          <CardDescription>
            Ask natural language questions about your decisions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAsk} className="space-y-4">
            <div className="flex gap-2">
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask something... (e.g., 'Why did we choose React?', 'What was decided about pricing?')"
                aria-label="Ask a question"
                label="Ask a question"
                labelVisible={false}
                className="flex-1"
              />
              <Button type="submit" disabled={asking}>
                {asking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex gap-2">
              {question && (
                <Button variant="ghost" onClick={clearQuestion} className="ml-auto">
                  <X className="h-4 w-4 mr-2" /> Clear
                </Button>
              )}
            </div>
          </form>

          {qaResponse && (
            <div className="mt-6 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Answer</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigator.clipboard?.writeText(qaResponse.answer)}
                      className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm bg-white/50"
                      aria-label="Copy answer"
                    >
                      <Copy className="h-4 w-4" /> Copy
                    </button>
                  </div>
                </div>
                <div className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                  {qaResponse.answer}
                </div>
              </div>

              {qaResponse.sources.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Related Decisions</h3>
                  <div className="space-y-2">
                    {qaResponse.sources.map((source) => (
                      <div key={source.id} className="p-3 border rounded-lg text-sm flex items-start justify-between">
                        <div>
                          <p className="font-medium">{source.title}</p>
                          <p className="text-zinc-500 text-xs mt-1">
                            {source.meeting} • {format(new Date(source.date), "PPP")}
                          </p>
                        </div>
                        <div className="text-xs text-zinc-500">
                          <a href="#" className="hover:underline">Open</a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Example Questions */}
      {!qaResponse && !hasSearched && (
        <Card>
          <CardHeader>
            <CardTitle>Example Questions</CardTitle>
            <CardDescription>Try asking these types of questions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2">
              {[
                "Why did we choose this tech stack?",
                "What was decided about pricing?",
                "When did we decide to pivot?",
                "What were the options for authentication?",
                "Why did we reject the alternative?",
                "What action items came from the last meeting?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setQuestion(q)}
                  className="text-left p-3 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 text-sm transition-colors"
                >
                  "{q}"
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}