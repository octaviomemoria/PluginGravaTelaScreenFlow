import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { PLAN_LIMITS } from "@screenflow/shared"
import type { Plan, PlanLimitsResponse } from "@screenflow/shared"
import { getUserWithUsage } from "@/server/queries"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { user, usage } = await getUserWithUsage(authUser.id)
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
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

  return NextResponse.json(response)
}
