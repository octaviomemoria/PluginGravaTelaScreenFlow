import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminRequest } from "@/lib/admin-auth"
import { getAdminVideos } from "@/server/admin-queries"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const { searchParams } = request.nextUrl
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"))
  const search = searchParams.get("search") ?? undefined
  const visibility = searchParams.get("visibility") ?? undefined
  const userId = searchParams.get("userId") ?? undefined

  const result = await getAdminVideos({ page, search, visibility, userId })
  return NextResponse.json(result)
}
