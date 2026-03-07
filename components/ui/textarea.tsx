import * as React from "react"

import { cn } from "@/lib/utils"

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  labelVisible?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, labelVisible = false, ...props }, ref) => {
    const textarea = (
      <textarea
        {...props}
        ref={ref}
        rows={3}
        className={cn(
          "flex min-h-[64px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:placeholder:text-zinc-400 dark:focus-visible:ring-zinc-300",
          className
        )}
      />
    )

    if (label) {
      if (labelVisible) {
        return (
          <label className="block">
            <span className="block text-sm font-medium mb-1">{label}</span>
            {textarea}
          </label>
        )
      }

      // Keep an accessible label for screen-readers without hiding the textarea.
      return (
        <>
          <span className="sr-only">{label}</span>
          {textarea}
        </>
      )
    }

    return textarea
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
