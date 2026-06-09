import { redirect } from "next/navigation"
import Link from "next/link"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { AdminBadge } from "@/components/admin/AdminBadge"
import { LogoutButton } from "@/components/auth/LogoutButton"

const ADMIN_EMAIL = "octacm@gmail.com"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const isAdminEmail = user.email === ADMIN_EMAIL
  if (!isAdminEmail) {
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email ?? "" },
      select: { isAdmin: true },
    })
    if (!dbUser?.isAdmin) redirect("/dashboard")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-surface/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="font-bold text-text-primary flex items-center gap-2">
              <span className="w-6 h-6 bg-accent rounded-md flex items-center justify-center text-xs text-white font-black">S</span>
              ScreenFlow
            </Link>
            <AdminBadge />
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
              ← App
            </Link>
            <span className="text-sm text-text-secondary truncate max-w-[200px]">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 flex gap-8">
        <AdminSidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
