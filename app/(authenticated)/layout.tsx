import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { SidebarNav } from "@/components/sidebar-nav"
import { UserNav } from "@/components/user-nav"

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen bg-zinc-50/50 dark:bg-zinc-950">
      {/* Left Sidebar */}
      <SidebarNav user={session.user} />
      
      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}
