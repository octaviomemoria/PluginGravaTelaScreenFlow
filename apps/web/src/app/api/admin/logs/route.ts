import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminRequest } from "@/lib/admin-auth"
import { getAdminLogs } from "@/server/admin-queries"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const { searchParams } = request.nextUrl
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"))

  const result = await getAdminLogs(page)
  return NextResponse.json(result)
}
