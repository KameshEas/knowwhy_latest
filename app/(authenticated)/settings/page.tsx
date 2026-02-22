"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
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
  AlertCircle
} from "lucide-react"
import { toast } from "sonner"

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

export default function SettingsPage() {
  const [status, setStatus] = useState<IntegrationStatus>({
    google: false,
    slack: false,
    gitlab: false,
  })
  const [slackInfo, setSlackInfo] = useState<SlackInfo | null>(null)
  const [gitlabInfo, setGitLabInfo] = useState<GitLabInfo | null>(null)
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [gitlabToken, setGitlabToken] = useState("")
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<{slack?: any, gitlab?: any}>({})

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

  useEffect(() => {
    fetchStatus()
    fetchWebhookConfig()
  }, [])

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
