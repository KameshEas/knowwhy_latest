"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, 
  MessageSquare, 
  ArrowLeft, 
  RefreshCw,
  Brain,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface SlackMessage {
  ts: string
  text: string
  user: string
  type: string
  subtype?: string
  threadTs?: string
  replyCount?: number
  timestamp: string
}

interface AnalysisResult {
  success: boolean
  decision?: {
    id: string
    title: string
    summary: string
    confidence: number
  }
  detected?: boolean
  confidence?: number
  message?: string
}

export default function SlackChannelDetailPage() {
  const params = useParams()
  const channelId = params.channelId as string
  
  const [messages, setMessages] = useState<SlackMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)

  const fetchMessages = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/slack/channels/${channelId}/messages?limit=50`)
      const data = await response.json()
      
      if (data.success) {
        setMessages(data.messages)
      } else {
        toast.error(data.error || "Failed to fetch messages")
      }
    } catch (error) {
      toast.error("Failed to fetch messages")
    } finally {
      setLoading(false)
    }
  }

  const analyzeMessages = async () => {
    setAnalyzing(true)
    setAnalysisResult(null)
    
    try {
      const response = await fetch(`/api/slack/channels/${channelId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 50 }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setAnalysisResult(data)
        if (data.detected) {
          toast.success(`Decision detected! "${data.decision?.title}"`)
        } else {
          toast.info(data.message || "No decisions detected")
        }
      } else {
        toast.error(data.error || "Analysis failed")
      }
    } catch (error) {
      toast.error("Failed to analyze messages")
    } finally {
      setAnalyzing(false)
    }
  }

  useEffect(() => {
    if (channelId) {
      fetchMessages()
    }
  }, [channelId])

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/slack">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Channel Messages</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">
              View and analyze Slack messages for decisions.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchMessages}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button
            onClick={analyzeMessages}
            disabled={analyzing || messages.length === 0}
          >
            {analyzing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Brain className="mr-2 h-4 w-4" />
            )}
            Analyze for Decisions
          </Button>
        </div>
      </div>

      {analysisResult && (
        <Card className={analysisResult.detected ? "border-green-500" : "border-yellow-500"}>
          <CardHeader>
            <div className="flex items-center gap-2">
              {analysisResult.detected ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              <CardTitle>
                {analysisResult.detected ? "Decision Detected!" : "Analysis Complete"}
              </CardTitle>
            </div>
            <CardDescription>
              {analysisResult.message}
              {analysisResult.confidence && (
                <span className="ml-2">
                  Confidence: {Math.round(analysisResult.confidence * 100)}%
                </span>
              )}
            </CardDescription>
          </CardHeader>
          {analysisResult.decision && (
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium">{analysisResult.decision.title}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {analysisResult.decision.summary}
                </p>
                <Link href="/decisions">
                  <Button variant="link" className="p-0">
                    View all decisions →
                  </Button>
                </Link>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      ) : messages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-zinc-400" />
            <h3 className="mt-4 text-lg font-medium">No messages found</h3>
            <p className="text-zinc-500 mt-2">
              No messages in this channel or check your Slack connection.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Messages ({messages.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={message.ts}
                className={`p-4 rounded-lg ${
                  index % 2 === 0 ? "bg-zinc-50 dark:bg-zinc-900" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{message.user}</span>
                      <span className="text-xs text-zinc-400">
                        {formatTimestamp(message.timestamp)}
                      </span>
                      {message.replyCount && message.replyCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {message.replyCount} replies
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      {message.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}