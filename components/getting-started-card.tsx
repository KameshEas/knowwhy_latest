"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CheckCircle } from "lucide-react"

type Step = {
  id: number
  label: string
  description: string
  completed: boolean
  href: string
}

export default function GettingStartedCard({
  setupSteps,
  completedSteps,
  setupProgress,
}: {
  setupSteps: Step[]
  completedSteps: number
  setupProgress: number
}) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      const v = localStorage.getItem("gettingStartedDismissed")
      if (v === "true") setDismissed(true)
    } catch (e) {
      // ignore
    }
  }, [])

  const handleClose = () => {
    try {
      localStorage.setItem("gettingStartedDismissed", "true")
    } catch (e) {
      // ignore
    }
    setDismissed(true)
  }

  if (dismissed) return null

  const allComplete = completedSteps === setupSteps.length

  return (
    <Card className="border-blue-100 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/20">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            Getting started with KnowWhy
          </CardTitle>
          <CardDescription className="mt-1">Complete these steps to start capturing high-quality decisions.</CardDescription>
        </div>
        <div className="hidden md:flex flex-col items-end gap-1">
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {allComplete ? "Setup complete" : `${completedSteps}/${setupSteps.length} steps done`}
          </span>
          <div className="w-40 h-2 bg-blue-100 dark:bg-blue-900/40 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${setupProgress}%` }} />
          </div>
        </div>
        {allComplete && (
          <div className="ml-2">
            <Button variant="ghost" size="sm" onClick={handleClose} aria-label="Dismiss getting started">
              Close
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {setupSteps.map((step) => (
          <div key={step.id} className="flex items-start justify-between gap-4 rounded-md px-2 py-2 hover:bg-blue-100/60 dark:hover:bg-blue-900/40 transition-colors">
            <div className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-4 w-4 items-center justify-center">
                {step.completed ? <CheckCircle className="h-4 w-4 text-green-600" /> : <span className="h-2 w-2 rounded-full bg-blue-400" />}
              </span>
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-50">{step.label}</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">{step.description}</p>
              </div>
            </div>
            <Link href={step.href} className="shrink-0">
              <Button size="sm" variant={step.completed ? "outline" : "default"} className={step.completed ? "" : "bg-blue-600 hover:bg-blue-700 text-white"}>
                {step.completed ? "View" : "Start"}
              </Button>
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
