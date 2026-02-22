"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Trash2,
  Calendar,
  MessageSquare,
  GitBranch,
  Shield,
  Copy,
  Check,
  Webhook,
  ExternalLink,
  AlertCircle,
  Activity,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { toast } from "sonner"
import useSWR from "swr"

interface IntegrationStatus {
  google: boolean
  slack: boolean
  gitlab: boolean
}

interface SlackInfo {
  teamName: string
  userSlackId: string
  connectedAt: string
}

interface GitLabInfo {
  username: string
  gitlabUrl: string
  connectedAt: string
}

interface WebhookConfig {
  webhooks: {
    slack: {
      url: string
      events: string[]
      instructions: string
      setupSteps?: string[]
    }
    gitlab: {
      url: string
      events: string[]
      instructions: string
      setupSteps?: string[]
    }
  }
  environmentVariables: {
    slack: { required: string[] }
    gitlab: { required: string[] }
  }
  features?: {
    realtimeAnalysis?: string
    cooldown?: string
    automaticSaving?: string
  }
}

interface WebhookLogEntry {
  id: string
  source: string
  eventType: string
  status: string
  decisionId?: string
  decisionTitle?: string
  confidence?: number
  errorMessage?: string
  processedAt?: string
  createdAt: string
}

export default function SettingsPage() {
  const [status, setStatus] = useState<IntegrationStatus>({
    google: false,
    slack: false,
    gitlab: false,
  })
  const [activeTab, setActiveTab] = useState<string>("integrations")
  const [slackInfo, setSlackInfo] = useState<SlackInfo | null>(null)
  const [gitlabInfo, setGitLabInfo] = useState<GitLabInfo | null>(null)
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [gitlabToken, setGitlabToken] = useState("")
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<{slack?: any, gitlab?: any}>({})
  
  // Webhook logs state
  const [webhookLogs, setWebhookLogs] = useState<WebhookLogEntry[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsFilter, setLogsFilter] = useState<{source?: string, status?: string}>({})
  const [logsPagination, setLogsPagination] = useState({ total: 0, limit: 20, offset: 0, hasMore: false })

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/integrations/status")
      const data = await response.json()
      if (data.success) {
        setStatus(data.status)
        setSlackInfo(data.slack)
        setGitLabInfo(data.gitlab)
      }
    } catch (error) {
      console.error("Error fetching status:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWebhookConfig = async () => {
    try {
      const response = await fetch("/api/webhooks/config")
      const data = await response.json()
      if (data.success) {
        setWebhookConfig(data)
      }
    } catch (error) {
      console.error("Error fetching webhook config:", error)
    }
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      toast.success("Copied to clipboard!")
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      toast.error("Failed to copy")
    }
  }

  

  const connectSlack = async () => {
    setConnecting("slack")
    try {
      const response = await fetch("/api/integrations/slack/auth")
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      toast.error("Failed to start Slack connection")
      setConnecting(null)
    }
  }

  const disconnectSlack = async () => {
    setConnecting("slack")
    try {
      const response = await fetch("/api/integrations/slack/disconnect", {
        method: "POST",
      })
      const data = await response.json()
      if (data.success) {
        toast.success("Slack disconnected")
        fetchStatus()
      } else {
        toast.error(data.error || "Failed to disconnect")
      }
    } catch (error) {
      toast.error("Failed to disconnect Slack")
    } finally {
      setConnecting(null)
    }
  }

  const fetcher = (url: string) => fetch(url).then((res) => res.json())

  const { data: statusData, isLoading: statusLoading } = useSWR("/api/integrations/status", fetcher)
  const { data: webhookConfigData } = useSWR("/api/webhooks/config", fetcher)

  useEffect(() => {
    if (statusData?.success) {
      setStatus(statusData.status)
      setSlackInfo(statusData.slack)
      setGitLabInfo(statusData.gitlab)
    }
    setLoading(Boolean(statusLoading))
  }, [statusData, statusLoading])

  useEffect(() => {
    if (webhookConfigData?.success) {
      setWebhookConfig(webhookConfigData)
    }
  }, [webhookConfigData])
  

  const connectGitLab = async () => {
    if (!gitlabToken.trim()) {
      toast.error("Please enter your GitLab Personal Access Token")
      return
    }

    setConnecting("gitlab")
    try {
      const response = await fetch("/api/integrations/gitlab/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: gitlabToken }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success("GitLab connected successfully")
        setGitlabToken("")
        fetchStatus()
      } else {
        toast.error(data.error || "Failed to connect")
      }
    } catch (error) {
      toast.error("Failed to connect GitLab")
    } finally {
      setConnecting(null)
    }
  }

  const disconnectGitLab = async () => {
    setConnecting("gitlab")
    try {
      const response = await fetch("/api/integrations/gitlab/disconnect", {
        method: "POST",
      })
      const data = await response.json()
      if (data.success) {
        toast.success("GitLab disconnected")
        fetchStatus()
      } else {
        toast.error(data.error || "Failed to disconnect")
      }
    } catch (error) {
      toast.error("Failed to disconnect GitLab")
    } finally {
      setConnecting(null)
    }
  }

  const syncIntegrations = async () => {
    setConnecting("sync")
    try {
      const response = await fetch("/api/integrations/sync", {
        method: "POST",
      })
      const data = await response.json()
      if (data.success) {
        toast.success("Sync completed")
      } else {
        toast.error(data.error || "Sync failed")
      }
    } catch (error) {
      toast.error("Sync failed")
    } finally {
      setConnecting(null)
    }
  }

  const testWebhook = async (provider: "slack" | "gitlab") => {
    if (!status[provider]) {
      toast.error(`${provider === "slack" ? "Slack" : "GitLab"} is not connected`)
      return
    }

    setTestingWebhook(provider)
    try {
      const response = await fetch("/api/webhooks/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      })
      const data = await response.json()

      if (data.success) {
        setTestResults(prev => ({ ...prev, [provider]: data.testResult }))
        if (data.testResult?.decisionDetected) {
          toast.success(`🎉 ${provider === "slack" ? "Slack" : "GitLab"} webhook test successful! Decision detected.`)
        } else {
          toast.info("Webhook working but no decision detected in sample.")
        }
      } else {
        toast.error(data.error || "Test failed")
      }
    } catch (error) {
      toast.error("Test failed")
    } finally {
      setTestingWebhook(null)
    }
  }

  const fetchWebhookLogs = async (filter?: {source?: string, status?: string, offset?: number}, append = false) => {
    setLogsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter?.source) params.set("source", filter.source)
      if (filter?.status) params.set("status", filter.status)
      const offset = filter?.offset ?? 0
      if (offset) params.set("offset", offset.toString())
      params.set("limit", String(logsPagination.limit || 20))

      const response = await fetch(`/api/webhooks/logs?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        if (append) {
          setWebhookLogs((prev) => [...prev, ...data.logs])
        } else {
          setWebhookLogs(data.logs)
        }
        setLogsPagination((prev) => ({ ...prev, ...data.pagination, offset }))
      }
    } catch (error) {
      console.error("Error fetching webhook logs:", error)
    } finally {
      setLogsLoading(false)
    }
  }

  // Load webhook logs only when the Webhooks tab is active
  useEffect(() => {
    if (activeTab === "webhooks") {
      fetchWebhookLogs()
    }
  }, [activeTab])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2">
          Manage your account and integrations.
        </p>
      </div>

      <Tabs defaultValue="integrations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-6">
          {/* Google Calendar */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle>Google Calendar</CardTitle>
                    <CardDescription>Sync meetings and events</CardDescription>
                  </div>
                </div>
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                ) : status.google ? (
                  <span className="flex items-center gap-1 text-green-600 text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-zinc-500 text-sm">
                    <XCircle className="h-4 w-4" />
                    Not connected
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-500 mb-4">
                Google Calendar is connected through your primary Google account for authentication.
                This enables meeting sync and Google Meet integration.
              </p>
            </CardContent>
          </Card>

          {/* Slack */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <CardTitle>Slack</CardTitle>
                    <CardDescription>Capture decisions from conversations</CardDescription>
                  </div>
                </div>
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                ) : status.slack ? (
                  <span className="flex items-center gap-1 text-green-600 text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-zinc-500 text-sm">
                    <XCircle className="h-4 w-4" />
                    Not connected
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-500 mb-4">
                Connect Slack to analyze channel conversations and detect decisions made in team discussions.
              </p>
              <p className="text-xs text-zinc-500 mb-4">
                After connecting, visit
                {" "}
                <Link
                  href="/slack"
                  className="text-purple-600 hover:text-purple-700 underline-offset-2 hover:underline"
                >
                  Slack analysis
                </Link>
                {" "}
                to run channel analyses.
              </p>
              
              {status.slack && slackInfo ? (
                <div className="space-y-4">
                  <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg">
                    <p className="text-sm"><strong>Team:</strong> {slackInfo.teamName}</p>
                    <p className="text-sm"><strong>User ID:</strong> {slackInfo.userSlackId}</p>
                    <p className="text-sm text-zinc-500">
                      Connected on {new Date(slackInfo.connectedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={syncIntegrations}
                      disabled={connecting === "sync"}
                    >
                      {connecting === "sync" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Sync Now
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={disconnectSlack}
                      disabled={connecting === "slack"}
                    >
                      {connecting === "slack" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Disconnect
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={connectSlack}
                  disabled={connecting === "slack"}
                >
                  {connecting === "slack" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquare className="mr-2 h-4 w-4" />
                  )}
                  Connect Slack
                </Button>
              )}
            </CardContent>
          </Card>

          {/* GitLab */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <GitBranch className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <CardTitle>GitLab</CardTitle>
                    <CardDescription>Capture decisions from merge requests</CardDescription>
                  </div>
                </div>
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                ) : status.gitlab ? (
                  <span className="flex items-center gap-1 text-green-600 text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-zinc-500 text-sm">
                    <XCircle className="h-4 w-4" />
                    Not connected
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-500 mb-4">
                Connect GitLab to analyze merge request discussions and issues for decisions.
              </p>
              <p className="text-xs text-zinc-500 mb-4">
                After connecting, go to
                {" "}
                <Link
                  href="/gitlab"
                  className="text-orange-600 hover:text-orange-700 underline-offset-2 hover:underline"
                >
                  GitLab projects
                </Link>
                {" "}
                to explore and analyze repositories.
              </p>
              
              {status.gitlab && gitlabInfo ? (
                <div className="space-y-4">
                  <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg">
                    <p className="text-sm"><strong>Username:</strong> {gitlabInfo.username}</p>
                    <p className="text-sm"><strong>Instance:</strong> {gitlabInfo.gitlabUrl}</p>
                    <p className="text-sm text-zinc-500">
                      Connected on {new Date(gitlabInfo.connectedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={syncIntegrations}
                      disabled={connecting === "sync"}
                    >
                      {connecting === "sync" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Sync Now
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={disconnectGitLab}
                      disabled={connecting === "gitlab"}
                    >
                      {connecting === "gitlab" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Disconnect
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Personal Access Token</label>
                    <Input
                      type="password"
                      placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                      value={gitlabToken}
                      onChange={(e) => setGitlabToken(e.target.value)}
                    />
                    <p className="text-xs text-zinc-500">
                      Create a token at GitLab → Preferences → Access Tokens with "read_api" and "read_repository" scopes
                    </p>
                  </div>
                  <Button
                    onClick={connectGitLab}
                    disabled={connecting === "gitlab"}
                  >
                    {connecting === "gitlab" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <GitBranch className="mr-2 h-4 w-4" />
                    )}
                    Connect GitLab
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Webhook className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <CardTitle>Real-time Webhooks</CardTitle>
                  <CardDescription>Enable instant decision detection</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Setup Required</h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      To enable real-time analysis, you need to configure webhooks in Slack and GitLab. 
                      Add the webhook URLs below to your Slack App and GitLab project settings.
                    </p>
                  </div>
                </div>
              </div>

              {/* Slack Webhook */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                    <h3 className="font-medium">Slack Webhook</h3>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testWebhook("slack")}
                    disabled={testingWebhook === "slack" || !status.slack}
                  >
                    {testingWebhook === "slack" ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Test
                  </Button>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-500 uppercase font-medium">Webhook URL</label>
                    <div className="flex gap-2">
                      <Input 
                        readOnly 
                        value={webhookConfig?.webhooks?.slack?.url || "Loading..."}
                        className="font-mono text-sm"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        aria-label="Copy Slack webhook URL"
                        onClick={() => copyToClipboard(webhookConfig?.webhooks?.slack?.url || "", "slack-url")}
                      >
                        {copiedField === "slack-url" ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-500 uppercase font-medium">Events</label>
                    <p className="text-sm font-mono text-zinc-600 dark:text-zinc-400">
                      {webhookConfig?.webhooks?.slack?.events?.join(", ") || "message.posted"}
                    </p>
                  </div>
                  {/* Test Result */}
                  {testResults.slack && (
                    <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">Test Result</span>
                      </div>
                      <p className="text-xs text-green-700 dark:text-green-300">
                        Decision: {testResults.slack.decisionDetected ? "Detected" : "Not detected"} | 
                        Confidence: {Math.round(testResults.slack.confidence * 100)}%
                      </p>
                      {testResults.slack.title && (
                        <p className="text-xs font-medium mt-1 text-green-800 dark:text-green-200">
                          {testResults.slack.title}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="pt-2">
                    <a 
                      href="https://api.slack.com/apps" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                    >
                      Configure in Slack Apps <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>

              <Separator />

              {/* GitLab Webhook */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-5 h-5 text-orange-600" />
                    <h3 className="font-medium">GitLab Webhook</h3>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testWebhook("gitlab")}
                    disabled={testingWebhook === "gitlab" || !status.gitlab}
                  >
                    {testingWebhook === "gitlab" ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Test
                  </Button>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-500 uppercase font-medium">Webhook URL</label>
                    <div className="flex gap-2">
                      <Input 
                        readOnly 
                        value={webhookConfig?.webhooks?.gitlab?.url || "Loading..."}
                        className="font-mono text-sm"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        aria-label="Copy GitLab webhook URL"
                        onClick={() => copyToClipboard(webhookConfig?.webhooks?.gitlab?.url || "", "gitlab-url")}
                      >
                        {copiedField === "gitlab-url" ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-500 uppercase font-medium">Events</label>
                    <p className="text-sm font-mono text-zinc-600 dark:text-zinc-400">
                      {webhookConfig?.webhooks?.gitlab?.events?.join(", ") || "issue, merge_request"}
                    </p>
                  </div>
                  {/* Test Result */}
                  {testResults.gitlab && (
                    <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">Test Result</span>
                      </div>
                      <p className="text-xs text-green-700 dark:text-green-300">
                        Decision: {testResults.gitlab.decisionDetected ? "Detected" : "Not detected"} | 
                        Confidence: {Math.round(testResults.gitlab.confidence * 100)}%
                      </p>
                      {testResults.gitlab.title && (
                        <p className="text-xs font-medium mt-1 text-green-800 dark:text-green-200">
                          {testResults.gitlab.title}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="pt-2">
                    <a 
                      href="#" 
                      className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
                    >
                      Configure in GitLab Project Settings <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Security Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  <h4 className="text-sm font-medium">Security</h4>
                </div>
                <p className="text-sm text-zinc-500">
                  All webhook requests are verified using signature tokens. Make sure to set the following 
                  environment variables: <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-xs">SLACK_SIGNING_SECRET</code> and <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-xs">GITLAB_WEBHOOK_SECRET</code>
                </p>
              </div>

              <Separator />

              {/* Webhook Logs Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-medium">Delivery History</h3>
                </div>
                
                {/* Filters */}
                <div className="flex gap-2 flex-wrap items-center">
                  <div className="flex items-center gap-1">
                    <label htmlFor="logs-source-filter" className="sr-only">
                      Filter by source
                    </label>
                    <select 
                      id="logs-source-filter"
                      className="px-3 py-2 text-sm border rounded-lg bg-zinc-50 dark:bg-zinc-900"
                      onChange={(e) => {
                        const value = e.target.value || undefined
                        const newFilter = { ...logsFilter, source: value }
                        setLogsFilter(newFilter)
                        setLogsPagination((p) => ({ ...p, offset: 0 }))
                        fetchWebhookLogs({ ...newFilter, offset: 0 })
                      }}
                    >
                      <option value="">All Sources</option>
                      <option value="slack">Slack</option>
                      <option value="gitlab">GitLab</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <label htmlFor="logs-status-filter" className="sr-only">
                      Filter by status
                    </label>
                    <select 
                      id="logs-status-filter"
                      className="px-3 py-2 text-sm border rounded-lg bg-zinc-50 dark:bg-zinc-900"
                      onChange={(e) => {
                        const value = e.target.value || undefined
                        const newFilter = { ...logsFilter, status: value }
                        setLogsFilter(newFilter)
                        setLogsPagination((p) => ({ ...p, offset: 0 }))
                        fetchWebhookLogs({ ...newFilter, offset: 0 })
                      }}
                    >
                      <option value="">All Status</option>
                      <option value="processed">Processed</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => fetchWebhookLogs()}
                    disabled={logsLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${logsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>

                {/* Logs Table */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50 dark:bg-zinc-900">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium">Source</th>
                          <th className="px-4 py-2 text-left font-medium">Event</th>
                          <th className="px-4 py-2 text-left font-medium">Status</th>
                          <th className="px-4 py-2 text-left font-medium">Decision</th>
                          <th className="px-4 py-2 text-left font-medium">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logsLoading ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                            </td>
                          </tr>
                        ) : webhookLogs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                              No webhook deliveries yet
                            </td>
                          </tr>
                        ) : (
                          webhookLogs.map((log) => (
                            <tr key={log.id} className="border-t">
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                  {log.source === 'slack' && <MessageSquare className="h-4 w-4 text-purple-600" />}
                                  {log.source === 'gitlab' && <GitBranch className="h-4 w-4 text-orange-600" />}
                                  <span className="capitalize">{log.source}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2 text-zinc-600">{log.eventType}</td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  log.status === 'processed' ? 'bg-green-100 text-green-700' :
                                  log.status === 'failed' ? 'bg-red-100 text-red-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {log.status}
                                </span>
                              </td>
                              <td className="px-4 py-2">
                                {log.decisionTitle ? (
                                  <div>
                                    <p className="text-sm font-medium truncate max-w-[200px]">{log.decisionTitle}</p>
                                    {log.confidence && (
                                      <p className="text-xs text-zinc-500">{Math.round(log.confidence * 100)}% confidence</p>
                                    )}
                                  </div>
                                ) : log.errorMessage ? (
                                  <p className="text-xs text-red-600 truncate max-w-[200px]">{log.errorMessage}</p>
                                ) : (
                                  <span className="text-zinc-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-zinc-500 text-xs">
                                {new Date(log.createdAt).toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                {logsPagination.total > logsPagination.limit && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-500">Showing {webhookLogs.length} of {logsPagination.total} entries</p>
                    <div className="flex gap-2 items-center">
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={logsPagination.offset === 0}
                          onClick={() => {
                            const newOffset = Math.max(0, logsPagination.offset - logsPagination.limit)
                            fetchWebhookLogs({...logsFilter, offset: newOffset})
                          }}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={!logsPagination.hasMore}
                          onClick={() => {
                            const newOffset = logsPagination.offset + logsPagination.limit
                            fetchWebhookLogs({...logsFilter, offset: newOffset})
                          }}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      {logsPagination.hasMore && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchWebhookLogs({...logsFilter, offset: logsPagination.offset + logsPagination.limit}, true)}
                          disabled={logsLoading}
                        >
                          Load more
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>Manage your account security</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Data Encryption</h3>
                <p className="text-sm text-zinc-500">
                  All integration tokens are encrypted at rest using AES-256 encryption.
                </p>
              </div>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Connected Accounts</h3>
                <p className="text-sm text-zinc-500">
                  Your Google account is used for primary authentication. Additional integrations (Slack, GitLab) are optional.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
