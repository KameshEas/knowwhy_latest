"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, 
  MessageSquare, 
  Lock, 
  Hash, 
  RefreshCw,
  Users,
  ArrowRight
} from "lucide-react"
import { toast } from "sonner"
import { EmptyState } from "@/components/empty-state"

interface SlackChannel {
  id: string
  name: string
  isPrivate: boolean
  memberCount: number
  created: number
  topic: string
  purpose: string
}

export default function SlackChannelsPage() {
  const [channels, setChannels] = useState<SlackChannel[]>([])
  const [filteredChannels, setFilteredChannels] = useState<SlackChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [error, setError] = useState<string | null>(null)

  const fetchChannels = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/slack/channels")
      const data = await response.json()
      
      if (data.success) {
        setChannels(data.channels)
        setFilteredChannels(data.channels)
      } else {
        setError(data.error || "Failed to fetch channels")
        toast.error(data.error || "Failed to fetch channels")
      }
    } catch (error) {
      setError("Failed to fetch channels")
      toast.error("Failed to fetch channels")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchChannels()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const filtered = channels.filter(
        (channel) =>
          channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          channel.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
          channel.purpose.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredChannels(filtered)
    } else {
      setFilteredChannels(channels)
    }
  }, [searchQuery, channels])

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  // Check if Slack is not connected (error indicates not connected)
  const isNotConnected = error?.includes("not connected") || error?.includes("Unauthorized") || (channels.length === 0 && !loading && !searchQuery)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-purple-900 dark:text-purple-100">Slack Channels</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">
            Browse and manage your Slack channels for decision detection.
          </p>
        </div>
        {!isNotConnected && (
          <Button
            variant="outline"
            onClick={fetchChannels}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        )}
      </div>

      {!isNotConnected && (
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-500" />
            <Input
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-purple-200 focus:border-purple-500"
              label="Search Slack channels"
              labelVisible={false}
              aria-label="Search Slack channels"
            />
          </div>
        </div>
      )}

      {loading ? (
        <Card className="border-purple-100">
          <CardContent className="py-12 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-500" />
            <p className="mt-4 text-zinc-500">Loading Slack channels...</p>
          </CardContent>
        </Card>
      ) : isNotConnected ? (
        <EmptyState type="slack" />
      ) : filteredChannels.length === 0 ? (
        <Card className="border-purple-100">
          <CardContent className="py-12 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-purple-300 mb-4" />
            <h3 className="text-lg font-medium text-purple-900 dark:text-purple-100">No channels found</h3>
            <p className="text-zinc-500 mt-2">
              {searchQuery
                ? "No channels match your search."
                : "No channels available in your workspace."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-xs text-zinc-500 mb-2">
            Showing {filteredChannels.length} of {channels.length} channels
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredChannels.map((channel) => (
            <Card key={channel.id} className="hover:shadow-lg hover:border-purple-300 transition-all border-2 border-transparent">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {channel.isPrivate ? (
                      <Lock className="h-5 w-5 text-purple-600" />
                    ) : (
                      <Hash className="h-5 w-5 text-purple-600" />
                    )}
                    <CardTitle className="text-lg text-purple-900 dark:text-purple-100">{channel.name}</CardTitle>
                  </div>
                  {channel.isPrivate && (
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">Private</Badge>
                  )}
                </div>
                <CardDescription>
                  Created {formatDate(channel.created)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {channel.topic && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    <strong className="text-purple-700">Topic:</strong> {channel.topic}
                  </p>
                )}
                {channel.purpose && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                    <strong className="text-purple-700">Purpose:</strong> {channel.purpose}
                  </p>
                )}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1 text-sm text-purple-600">
                    <Users className="h-4 w-4" />
                    {channel.memberCount} members
                  </div>
                  <Link href={`/slack/${channel.id}`}>
                    <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700 hover:bg-purple-50">
                      View Messages <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}