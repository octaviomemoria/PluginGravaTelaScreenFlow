"use client"

import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-text-secondary hover:text-red-400 transition-colors"
    >
      Sair
    </button>
  )
}
