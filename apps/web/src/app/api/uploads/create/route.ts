import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { PLAN_LIMITS } from "@screenflow/shared"
import type { Plan } from "@screenflow/shared"
import {
  refreshAccessToken,
  createResumableUploadSession,
  getOrCreateAppFolder,
  getDriveStreamUrl,
} from "@/lib/google-drive"
import { canUserRecord } from "@/server/queries"
import { nanoid } from "nanoid"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { plan: true, googleDriveConnected: true, googleRefreshToken: true },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  if (!user.googleDriveConnected || !user.googleRefreshToken) {
    return NextResponse.json(
      { error: "Google Drive não conectado. Conecte seu Drive em Configurações.", limitReached: false, driveMissing: true },
      { status: 402 }
    )
  }

  const limits = PLAN_LIMITS[user.plan as Plan]

  const allowed = await canUserRecord(authUser.id)
  if (!allowed) {
    return NextResponse.json(
      {
        error: `Limite mensal de gravação atingido (${limits.recordingMinutesPerMonth} min). Faça upgrade para continuar.`,
        limitReached: true,
      },
      { status: 402 }
    )
  }

  if (limits.maxActiveVideos !== null) {
    const count = await prisma.video.count({ where: { userId: authUser.id } })
    if (count >= limits.maxActiveVideos) {
      return NextResponse.json(
        {
          error: `Limite de ${limits.maxActiveVideos} vídeos atingido. Delete vídeos antigos ou faça upgrade.`,
          limitReached: true,
        },
        { status: 402 }
      )
    }
  }

  const body = (await req.json()) as { title?: string; mimeType?: string }
  const title = body.title ?? "Gravação sem título"
  const mimeType = body.mimeType ?? "video/webm"
  const videoId = nanoid()
  const publicId = nanoid()

  const accessToken = await refreshAccessToken(authUser.id)
  const folderId = await getOrCreateAppFolder(accessToken)
  const uploadUrl = await createResumableUploadSession(accessToken, `${videoId}.webm`, mimeType, folderId)

  const linkExpiresAt = limits.linkExpiryDays
    ? new Date(Date.now() + limits.linkExpiryDays * 24 * 60 * 60 * 1000)
    : null

  await prisma.video.create({
    data: {
      id: videoId,
      publicId,
      title,
      mimeType,
      userId: authUser.id,
      ...(linkExpiresAt ? { linkExpiresAt } : {}),
    },
  })

  return NextResponse.json({
    videoId,
    uploadUrl,
    googleAccessToken: accessToken,
    playbackUrl: getDriveStreamUrl("PENDING"),
  })
}
