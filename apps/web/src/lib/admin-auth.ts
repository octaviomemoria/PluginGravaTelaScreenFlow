import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

const ADMIN_EMAIL = "octacm@gmail.com"

export async function verifyAdminRequest(request: NextRequest): Promise<
  | { ok: true; userId: string; email: string }
  | { ok: false; response: NextResponse }
> {
  // Support both cookie-based (web) and Bearer token (extension)
  let email: string | null = null
  let userId: string | null = null

  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const { createClient } = await import("@supabase/supabase-js")
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const token = authHeader.slice(7)
    const { data: { user } } = await adminClient.auth.getUser(token)
    email = user?.email ?? null
    userId = user?.id ?? null
  } else {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    email = user?.email ?? null
    userId = user?.id ?? null
  }

  if (!email || !userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  // Primary check: email match (works before DB record exists)
  // Secondary check: isAdmin flag in DB (for future admins)
  const isAdminEmail = email === ADMIN_EMAIL
  if (!isAdminEmail) {
    const dbUser = await prisma.user.findUnique({
      where: { email },
      select: { isAdmin: true },
    })
    if (!dbUser?.isAdmin) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      }
    }
  }

  return { ok: true, userId, email }
}

export async function createAdminLog(
  action: string,
  adminId: string | null,
  targetId?: string,
  details?: string
) {
  try {
    await prisma.adminLog.create({
      data: { action, adminId, targetId, details },
    })
  } catch {
    // Non-fatal — don't let logging failures break the action
  }
}

export const ADMIN_EMAIL_CONST = ADMIN_EMAIL
