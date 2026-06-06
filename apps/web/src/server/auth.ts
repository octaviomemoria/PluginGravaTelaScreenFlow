import { createSupabaseServerClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function getAuthUser() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function requireAuthUser() {
  const user = await getAuthUser()
  if (!user) throw new Error("Unauthorized")
  return user
}

export async function getOrCreateDbUser(supabaseUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }) {
  const email = supabaseUser.email ?? ""
  const name = (supabaseUser.user_metadata?.["full_name"] as string | undefined) ?? null
  const avatarUrl = (supabaseUser.user_metadata?.["avatar_url"] as string | undefined) ?? null

  return prisma.user.upsert({
    where: { email },
    update: { name, avatarUrl },
    create: { id: supabaseUser.id, email, name, avatarUrl },
  })
}
