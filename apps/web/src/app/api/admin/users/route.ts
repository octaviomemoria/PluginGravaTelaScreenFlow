import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminRequest } from "@/lib/admin-auth"
import { getAdminUsers } from "@/server/admin-queries"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const { searchParams } = request.nextUrl
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"))
  const search = searchParams.get("search") ?? undefined
  const plan = searchParams.get("plan") ?? undefined
  const status = searchParams.get("status") ?? undefined
  const driveConnected = searchParams.get("driveConnected") ?? undefined

  const result = await getAdminUsers({ page, search, plan, status, driveConnected })
  return NextResponse.json(result)
}
