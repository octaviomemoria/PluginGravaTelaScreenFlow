import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { refreshAccessToken } from "@/lib/google-drive"

export const dynamic = "force-dynamic"

const DRIVE_DOWNLOAD_URL = "https://www.googleapis.com/drive/v3/files"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params

  // Find the video to determine ownership (needed for token)
  const video = await prisma.video.findFirst({
    where: { googleDriveFileId: fileId },
    select: {
      id: true,
      visibility: true,
      linkExpiresAt: true,
      userId: true,
      user: { select: { googleDriveConnected: true } },
    },
  })

  if (!video) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Check link expiry
  if (video.linkExpiresAt && video.linkExpiresAt < new Date()) {
    return NextResponse.json({ error: "Link expired" }, { status: 410 })
  }

  // For PRIVATE videos, require auth and ownership
  if (video.visibility === "PRIVATE") {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== video.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const accessToken = await refreshAccessToken(video.userId)
    const rangeHeader = req.headers.get("Range")

    const driveRes = await fetch(
      `${DRIVE_DOWNLOAD_URL}/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(rangeHeader ? { Range: rangeHeader } : {}),
        },
      }
    )

    if (!driveRes.ok && driveRes.status !== 206) {
      return NextResponse.json({ error: "Drive fetch failed" }, { status: driveRes.status })
    }

    const contentType = driveRes.headers.get("Content-Type") ?? "video/webm"
    const contentLength = driveRes.headers.get("Content-Length")
    const contentRange = driveRes.headers.get("Content-Range")
    const acceptRanges = driveRes.headers.get("Accept-Ranges") ?? "bytes"

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Accept-Ranges": acceptRanges,
      "Cache-Control": "private, max-age=3600",
    }
    if (contentLength) headers["Content-Length"] = contentLength
    if (contentRange) headers["Content-Range"] = contentRange

    return new NextResponse(driveRes.body, {
      status: driveRes.status,
      headers,
    })
  } catch (err) {
    console.error("Video proxy error:", err)
    return NextResponse.json({ error: "Proxy error" }, { status: 500 })
  }
}
