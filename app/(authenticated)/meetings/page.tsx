"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { signOut } from "next-auth/react"
import { Plus, RefreshCw, Loader2, X, CheckCircle, AlertTriangle, Lightbulb, Trash2, ExternalLink, Video } from "lucide-react"

interface Meeting {
  id: string
  title: string
  description?: string
  startTime: string
  endTime: string
  meetLink?: string
  status: string
  transcript?: string
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createdMeetLink, setCreatedMeetLink] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    attendees: "",
  })

  const fetchMeetings = async () => {
    try {
      const response = await fetch("/api/meetings")
      const data = await response.json()
      if (data.meetings) {
        setMeetings(data.meetings)
      }
    } catch (error) {
      console.error("Error fetching meetings:", error)
    } finally {
      setLoading(false)
    }
  }

  const syncMeetings = async () => {
    setSyncing(true)
    try {
      const response = await fetch("/api/meetings/sync", {
        method: "POST",
      })
      const data = await response.json()
      if (data.success) {
        await fetchMeetings()
      }
    } catch (error) {
      console.error("Error syncing meetings:", error)
    } finally {
      setSyncing(false)
    }
  }

  const cancelMeeting = async (meetingId: string) => {
    if (!confirm("Are you sure you want to cancel this meeting?")) {
      return
    }

    setCancellingId(meetingId)
    try {
      const response = await fetch(`/api/meetings/${meetingId}/cancel`, {
        method: "POST",
      })
      const data = await response.json()

      if (data.success) {
        await fetchMeetings()
      } else {
        alert(data.error || "Failed to cancel meeting")
      }
    } catch (error) {
      console.error("Error cancelling meeting:", error)
      alert("Failed to cancel meeting")
    } finally {
      setCancellingId(null)
    }
  }

  const analyzeMeeting = async (meetingId: string) => {
    setAnalyzingId(meetingId)
    try {
      const response = await fetch(`/api/meetings/${meetingId}/analyze`, {
        method: "POST",
      })
      const data = await response.json()

      if (data.success) {
        setAnalysisResult(data)
      } else {
        alert(data.message || "No decision detected in this meeting")
      }
    } catch (error) {
      console.error("Error analyzing meeting:", error)
      alert("Failed to analyze meeting. Make sure GROQ_API_KEY is set in .env")
    } finally {
      setAnalyzingId(null)
    }
  }

  const disconnectGoogle = async () => {
    setDisconnecting(true)
    try {
      const response = await fetch("/api/auth/disconnect-google", {
        method: "POST",
      })
      const data = await response.json()
      if (data.success) {
        await signOut({ callbackUrl: "/login" })
      }
    } catch (error) {
      console.error("Error disconnecting Google account:", error)
    } finally {
      setDisconnecting(false)
    }
  }

  const createMeeting = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setAuthError(null)
    try {
      const attendees = formData.attendees
        .split(",")
        .map((email) => email.trim())
        .filter((email) => email.length > 0)

      const response = await fetch("/api/meetings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          startTime: formData.startTime,
          endTime: formData.endTime,
          attendees,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        if (data.code === "INSUFFICIENT_SCOPES" || data.code === "INVALID_CREDENTIALS") {
          setAuthError(data.error)
          setShowCreateModal(false)
        }
        throw new Error(data.error)
      }

      if (data.success) {
        setCreatedMeetLink(data.meetLink)
        setShowCreateModal(false)
        setFormData({ title: "", description: "", startTime: "", endTime: "", attendees: "" })
        await fetchMeetings()
      }
    } catch (error) {
      console.error("Error creating meeting:", error)
    } finally {
      setCreating(false)
    }
  }

  useEffect(() => {
    fetchMeetings()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">
            Connect and manage your Google Meet sessions.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateModal(true)} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Create Meeting
          </Button>
          <Button onClick={syncMeetings} disabled={syncing}>
            {syncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Meetings
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Auth Error Banner */}
      {authError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-yellow-800">Google Calendar Permission Required</h3>
              <p className="text-sm text-yellow-700 mt-1">{authError}</p>
              <Button
                onClick={disconnectGoogle}
                disabled={disconnecting}
                variant="outline"
                className="mt-3 bg-white"
              >
                {disconnecting ? "Reconnecting..." : "Reconnect Google Account"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Result Modal */}
      {analysisResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-950 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-green-600">Decision Detected! ✓</h2>
                  <p className="text-sm text-zinc-500 mt-1">
                    AI analyzed the meeting and found a decision
                  </p>
                </div>
                <button
                  onClick={() => setAnalysisResult(null)}
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">{analysisResult.brief.title}</h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200">{analysisResult.brief.summary}</p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Problem Statement</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{analysisResult.brief.problemStatement}</p>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h3 className="font-medium text-green-900 dark:text-green-100 mb-1">Final Decision</h3>
                  <p className="text-sm text-green-800 dark:text-green-200">{analysisResult.brief.finalDecision}</p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Rationale</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{analysisResult.brief.rationale}</p>
                </div>

                <div className="flex items-center gap-2 text-sm text-zinc-500 pt-4 border-t">
                  <span>Confidence: {Math.round(analysisResult.decision.confidence * 100)}%</span>
                  <span>•</span>
                  <a href="/decisions" className="text-blue-600 hover:text-blue-800">
                    View in Decision Library →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal with Meet Link */}
      {createdMeetLink && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-950 rounded-lg p-6 w-full max-w-md">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Meeting Created!</h2>
              <p className="text-zinc-500 mb-4">Your Google Meet has been created and added to your calendar.</p>
              <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-lg mb-4">
                <p className="text-sm text-zinc-500 mb-1">Meet Link:</p>
                <a
                  href={createdMeetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 font-medium break-all"
                >
                  {createdMeetLink}
                </a>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCreatedMeetLink(null)}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    window.open(createdMeetLink, "_blank")
                    setCreatedMeetLink(null)
                  }}
                  className="flex-1"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Join Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-950 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Create New Meeting</h2>
            <form onSubmit={createMeeting} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md dark:bg-zinc-900 dark:border-zinc-700"
                  placeholder="Meeting title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md dark:bg-zinc-900 dark:border-zinc-700"
                  rows={3}
                  placeholder="Meeting description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md dark:bg-zinc-900 dark:border-zinc-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md dark:bg-zinc-900 dark:border-zinc-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Attendees (comma-separated emails)</label>
                <input
                  type="text"
                  value={formData.attendees}
                  onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md dark:bg-zinc-900 dark:border-zinc-700"
                  placeholder="email1@example.com, email2@example.com"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={creating} className="flex-1">
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Meeting"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Connected Meetings</CardTitle>
          <CardDescription>
            Your Google Calendar events with Meet links
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-zinc-500">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-zinc-400" />
              <p className="mt-2">Loading meetings...</p>
            </div>
          ) : meetings.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <Video className="mx-auto h-12 w-12 text-zinc-300 mb-4" />
              <p className="text-lg font-medium">No meetings connected</p>
              <p className="text-sm mt-1">
                Click "Sync Meetings" to fetch your Google Calendar events or "Create Meeting" to add manually.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <div className="flex-1">
                    <h3 className="font-medium">{meeting.title}</h3>
                    {meeting.description && (
                      <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{meeting.description}</p>
                    )}
                    <p className="text-sm text-zinc-500 mt-2">
                      {format(new Date(meeting.startTime), "PPP p")} - {format(new Date(meeting.endTime), "p")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {meeting.meetLink && (
                      <a
                        href={meeting.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                      >
                        <ExternalLink className="mr-1 h-3 w-3" />
                        Join
                      </a>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => analyzeMeeting(meeting.id)}
                      disabled={analyzingId === meeting.id || !meeting.transcript}
                      title={!meeting.transcript ? "No transcript available" : "Analyze for decisions"}
                    >
                      {analyzingId === meeting.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Lightbulb className="mr-1 h-3 w-3" />
                          Analyze
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => cancelMeeting(meeting.id)}
                      disabled={cancellingId === meeting.id}
                    >
                      {cancellingId === meeting.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        meeting.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : meeting.status === "processing"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {meeting.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}