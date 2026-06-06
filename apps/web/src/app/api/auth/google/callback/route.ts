import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { exchangeCodeForTokens } from "@/lib/google-drive"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/settings/account?drive=error`)
  }

  // Decode and verify state
  let userId: string
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString()) as { userId: string }
    userId = decoded.userId
  } catch {
    return NextResponse.redirect(`${appUrl}/settings/account?drive=error`)
  }

  // Verify the logged-in user matches state
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.id !== userId) {
    return NextResponse.redirect(`${appUrl}/settings/account?drive=error`)
  }

  try {
    const tokens = await exchangeCodeForTokens(code)

    await prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: tokens.accessToken,
        googleRefreshToken: tokens.refreshToken,
        googleTokenExpiry: tokens.expiryDate,
        googleDriveConnected: true,
      },
    })

    return NextResponse.redirect(`${appUrl}/settings/account?drive=connected`)
  } catch {
    return NextResponse.redirect(`${appUrl}/settings/account?drive=error`)
  }
}
