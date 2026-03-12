import Link from "next/link"
import { Lightbulb } from "lucide-react"

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-white" />
            </div>
            KnowWhy
          </Link>
          <nav className="flex items-center gap-6 text-sm text-zinc-500 dark:text-zinc-400">
            <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Terms</Link>
            <Link href="/dpa" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">DPA</Link>
            <Link href="/security" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Security</Link>
            <Link href="/status" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Status</Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500 dark:text-zinc-400">
          <p>&copy; {new Date().getFullYear()} KnowWhy. All rights reserved.</p>
          <nav className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Terms of Service</Link>
            <Link href="/dpa" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">DPA</Link>
            <Link href="/security" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Security</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
