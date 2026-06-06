import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getVideoById, updateVideo, deleteVideo } from "@/server/queries"
import { refreshAccessToken, deleteFile } from "@/lib/google-drive"
import { z } from "zod"

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  visibility: z.enum(["PRIVATE", "LINK", "PUBLIC"]).optional(),
})

async function getAuthUserId(req: NextRequest): Promise<string | null> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await getAuthUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const video = await getVideoById(id, userId)
  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(video)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await getAuthUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const data = updateSchema.parse(body)
    const video = await updateVideo(id, userId, data)
    return NextResponse.json(video)
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await getAuthUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const video = await getVideoById(id, userId)
  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Delete from Google Drive (best-effort)
  if (video.googleDriveFileId) {
    try {
      const accessToken = await refreshAccessToken(userId)
      await deleteFile(accessToken, video.googleDriveFileId)
    } catch {
      // Don't fail the request if Drive delete fails
    }
  }

  await deleteVideo(id, userId)
  return NextResponse.json({ ok: true })
}
