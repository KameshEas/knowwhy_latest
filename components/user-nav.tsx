"use client"

import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"

interface UserNavProps {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function UserNav({ user }: UserNavProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="hidden sm:flex flex-col items-end">
        <p className="text-sm font-medium">{user?.name}</p>
        <p className="text-xs text-zinc-500">{user?.email}</p>
      </div>
      {user?.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.image}
          alt={user.name || "User"}
          className="h-8 w-8 rounded-full"
        />
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        Sign out
      </Button>
    </div>
  )
}