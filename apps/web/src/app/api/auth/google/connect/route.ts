import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getGoogleAuthUrl } from "@/lib/google-drive"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Encode userId in state to verify on callback
  const state = Buffer.from(JSON.stringify({ userId: user.id })).toString("base64url")
  const authUrl = getGoogleAuthUrl(state)

  return NextResponse.redirect(authUrl)
}
