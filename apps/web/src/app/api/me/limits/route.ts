import { NextRequest, NextResponse } from "next/server"
import { PLAN_LIMITS } from "@screenflow/shared"
import type { Plan, PlanLimitsResponse } from "@screenflow/shared"
import { getUserWithUsage } from "@/server/queries"
import { getAuthUserFromRequest } from "@/lib/auth"
import { getCorsHeaders } from "@/lib/cors"

export const dynamic = "force-dynamic"

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin")
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(origin) })
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin")
  const corsHeaders = getCorsHeaders(origin)

  const authUser = await getAuthUserFromRequest(request)
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders })
  }

  const { user, usage } = await getUserWithUsage(authUser.id)
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404, headers: corsHeaders })
  }

  const limits = PLAN_LIMITS[user.plan as Plan]
  const recordingMinutesUsed = usage?.recordingMinutesUsed ?? 0
  const transcriptionMinutesUsed = usage?.transcriptionMinutesUsed ?? 0
  const canRecord = recordingMinutesUsed < limits.recordingMinutesPerMonth

  const response: PlanLimitsResponse = {
    plan: user.plan as Plan,
    recordingMinutesUsed,
    transcriptionMinutesUsed,
    limits: {
      recordingMinutesPerMonth: limits.recordingMinutesPerMonth,
      transcriptionMinutesPerMonth: limits.transcriptionMinutesPerMonth,
      linkExpiryDays: limits.linkExpiryDays,
      watermark: limits.watermark,
      maxActiveVideos: limits.maxActiveVideos,
    },
    canRecord,
    googleDriveConnected: user.googleDriveConnected,
  }

  return NextResponse.json(response, { headers: corsHeaders })
}
