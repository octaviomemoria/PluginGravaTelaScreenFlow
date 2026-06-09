import type { NextRequest } from "next/server"
import { createSupabaseServerClient, createSupabaseAdminClient } from "./supabase/server"
import type { User } from "@supabase/supabase-js"

/**
 * Returns the authenticated Supabase user from either:
 *  1. Cookie-based session (web app)
 *  2. Authorization: Bearer <token> header (Chrome extension)
 */
export async function getAuthUserFromRequest(request: NextRequest): Promise<User | null> {
  // Try cookie-based auth first (web app)
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) return user

  // Fall back to Bearer token (extension)
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null
  const token = authHeader.slice(7)
  if (!token) return null

  const admin = await createSupabaseAdminClient()
  const { data: { user: tokenUser } } = await admin.auth.getUser(token)
  return tokenUser ?? null
}
