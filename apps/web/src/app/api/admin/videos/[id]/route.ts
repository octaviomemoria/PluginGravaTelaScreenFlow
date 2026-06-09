import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminRequest, createAdminLog } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = await request.json() as { visibility: string }

  const valid = ["PRIVATE", "LINK", "PUBLIC"]
  if (!valid.includes(body.visibility)) {
    return NextResponse.json({ error: "Invalid visibility" }, { status: 400 })
  }

  const video = await prisma.video.findUnique({ where: { id }, select: { title: true } })
  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.video.update({
    where: { id },
    data: { visibility: body.visibility as "PRIVATE" | "LINK" | "PUBLIC" },
  })

  await createAdminLog(
    `Visibilidade alterada: "${video.title}" → ${body.visibility}`,
    auth.userId,
    id
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  const video = await prisma.video.findUnique({
    where: { id },
    select: { title: true, googleDriveFileId: true, userId: true },
  })
  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await createAdminLog(`Vídeo deletado: "${video.title}"`, auth.userId, id)
  await prisma.video.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
