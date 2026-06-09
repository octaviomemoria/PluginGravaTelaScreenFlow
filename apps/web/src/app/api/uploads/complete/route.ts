import { NextRequest, NextResponse } from "next/server"
import { refreshAccessToken, setFilePermissionPublic, getDriveStreamUrl } from "@/lib/google-drive"
import { finalizeVideo, incrementRecordingMinutes, getVideoById } from "@/server/queries"
import type { UploadCompletePayload } from "@screenflow/shared"
import { getAuthUserFromRequest } from "@/lib/auth"
import { getCorsHeaders } from "@/lib/cors"

export const dynamic = "force-dynamic"

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin")
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(origin) })
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin")
  const corsHeaders = getCorsHeaders(origin)

  const authUser = await getAuthUserFromRequest(req)
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders })
  }

  const body = (await req.json()) as UploadCompletePayload

  const video = await getVideoById(body.videoId, authUser.id)
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404, headers: corsHeaders })
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

  return NextResponse.json({ shareUrl, publicId: video.publicId }, { headers: corsHeaders })
}
