import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminRequest, createAdminLog } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const user = await prisma.user.findUnique({
    where: { id },
    select: { email: true },
  })
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.monthlyUsage.updateMany({
    where: { userId: id, year, month },
    data: { recordingMinutesUsed: 0, transcriptionMinutesUsed: 0 },
  })

  await createAdminLog(
    `Uso mensal resetado: ${user.email} (${month}/${year})`,
    auth.userId,
    id
  )

  return NextResponse.json({ ok: true })
}
