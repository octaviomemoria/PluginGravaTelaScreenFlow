import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminRequest } from "@/lib/admin-auth"
import { getAdminStats } from "@/server/admin-queries"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const stats = await getAdminStats()
  return NextResponse.json(stats)
}
