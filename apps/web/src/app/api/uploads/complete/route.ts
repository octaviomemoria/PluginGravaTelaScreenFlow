import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { refreshAccessToken, setFilePermissionPublic, getDriveStreamUrl } from "@/lib/google-drive"
import { finalizeVideo, incrementRecordingMinutes, getVideoById } from "@/server/queries"
import type { UploadCompletePayload } from "@screenflow/shared"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json()) as UploadCompletePayload

  const video = await getVideoById(body.videoId, authUser.id)
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 })
  }

  const accessToken = await refreshAccessToken(authUser.id)

  if (video.visibility !== "PRIVATE") {
    await setFilePermissionPublic(accessToken, body.googleDriveFileId)
  }

  const recordingMinutes = body.durationSeconds / 60

  await finalizeVideo(body.videoId, {
    googleDriveFileId: body.googleDriveFileId,
    playbackUrl: getDriveStreamUrl(body.googleDriveFileId),
    durationSeconds: body.durationSeconds,
    recordingMinutes,
    thumbnailUrl: body.thumbnailDataUrl,
  })

  await incrementRecordingMinutes(authUser.id, recordingMinutes)

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/p/${video.publicId}`

  return NextResponse.json({ shareUrl, publicId: video.publicId })
}
