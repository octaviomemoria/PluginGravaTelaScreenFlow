import { redirect } from "next/navigation"
import Link from "next/link"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getOrCreateDbUser } from "@/server/auth"
import { LogoutButton } from "@/components/auth/LogoutButton"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  let dbUser: { plan: string; name: string | null; email: string } | null = null
  try {
    dbUser = await getOrCreateDbUser(user)
  } catch (err) {
    console.error("[AppLayout] getOrCreateDbUser failed:", err)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-surface/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="font-bold text-text-primary flex items-center gap-2">
            <span className="w-6 h-6 bg-accent rounded-md flex items-center justify-center text-xs text-white font-black">S</span>
            ScreenFlow
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/settings/account" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
              Conta
            </Link>
            <Link href="/settings/billing" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
              {dbUser?.plan === "FREE" || !dbUser ? (
                <span className="flex items-center gap-1">
                  <span className="text-accent">↑</span> Upgrade
                </span>
              ) : (
                <span className="capitalize text-accent text-xs font-semibold px-2 py-0.5 bg-accent/10 rounded-full">
                  {dbUser.plan}
                </span>
              )}
            </Link>
            <div className="text-sm text-text-secondary truncate max-w-[150px]">{dbUser?.name ?? user.email}</div>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        {children}
      </main>
    </div>
  )
}
