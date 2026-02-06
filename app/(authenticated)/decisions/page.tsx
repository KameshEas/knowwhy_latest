import { auth } from "@/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function DecisionsPage() {
  const session = await auth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Decisions</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2">
          View and search through your captured decisions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Decisions</CardTitle>
          <CardDescription>
            Decisions captured from your meetings and conversations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-zinc-500">
            <svg className="mx-auto h-12 w-12 text-zinc-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-lg font-medium">No decisions yet</p>
            <p className="text-sm mt-1">
              Connect your Google Meet to start capturing decisions automatically.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}