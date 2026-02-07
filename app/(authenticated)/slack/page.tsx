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

  const fetchChannels = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/slack/channels")
      const data = await response.json()
      
      if (data.success) {
        setChannels(data.channels)
        setFilteredChannels(data.channels)
      } else {
        toast.error(data.error || "Failed to fetch channels")
      }
    } catch (error) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Slack Channels</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">
            Browse and manage your Slack channels for decision detection.
          </p>
        </div>
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
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      ) : filteredChannels.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-zinc-400" />
            <h3 className="mt-4 text-lg font-medium">No channels found</h3>
            <p className="text-zinc-500 mt-2">
              {searchQuery
                ? "No channels match your search."
                : "Connect your Slack workspace to see channels here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredChannels.map((channel) => (
            <Card key={channel.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {channel.isPrivate ? (
                      <Lock className="h-5 w-5 text-zinc-500" />
                    ) : (
                      <Hash className="h-5 w-5 text-zinc-500" />
                    )}
                    <CardTitle className="text-lg">{channel.name}</CardTitle>
                  </div>
                  {channel.isPrivate && (
                    <Badge variant="secondary">Private</Badge>
                  )}
                </div>
                <CardDescription>
                  Created {formatDate(channel.created)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {channel.topic && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    <strong>Topic:</strong> {channel.topic}
                  </p>
                )}
                {channel.purpose && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                    <strong>Purpose:</strong> {channel.purpose}
                  </p>
                )}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1 text-sm text-zinc-500">
                    <Users className="h-4 w-4" />
                    {channel.memberCount} members
                  </div>
                  <Link href={`/slack/${channel.id}`}>
                    <Button variant="ghost" size="sm">
                      View Messages <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}