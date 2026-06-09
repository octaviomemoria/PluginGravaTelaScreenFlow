import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminRequest, createAdminLog } from "@/lib/admin-auth"
import { getAdminUserDetail } from "@/server/admin-queries"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  const user = await getAdminUserDetail(id)
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(user)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = await request.json() as {
    action: string
    plan?: string
    name?: string
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { email: true, name: true, plan: true, suspended: true },
  })
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 })

  switch (body.action) {
    case "changePlan": {
      const validPlans = ["FREE", "PRO", "BUSINESS"]
      if (!body.plan || !validPlans.includes(body.plan)) {
        return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
      }
      await prisma.user.update({
        where: { id },
        data: { plan: body.plan as "FREE" | "PRO" | "BUSINESS" },
      })
      await createAdminLog(
        `Plano alterado: ${target.email} → ${body.plan}`,
        auth.userId,
        id,
        `De ${target.plan} para ${body.plan}`
      )
      break
    }

    case "suspend": {
      await prisma.user.update({ where: { id }, data: { suspended: true } })
      await createAdminLog(`Conta suspensa: ${target.email}`, auth.userId, id)
      break
    }

    case "unsuspend": {
      await prisma.user.update({ where: { id }, data: { suspended: false } })
      await createAdminLog(`Conta reativada: ${target.email}`, auth.userId, id)
      break
    }

    case "disconnectDrive": {
      await prisma.user.update({
        where: { id },
        data: {
          googleRefreshToken: null,
          googleAccessToken: null,
          googleTokenExpiry: null,
          googleDriveConnected: false,
        },
      })
      await createAdminLog(`Drive desconectado: ${target.email}`, auth.userId, id)
      break
    }

    case "editName": {
      if (typeof body.name !== "string") {
        return NextResponse.json({ error: "Invalid name" }, { status: 400 })
      }
      await prisma.user.update({ where: { id }, data: { name: body.name } })
      await createAdminLog(`Nome editado: ${target.email} → "${body.name}"`, auth.userId, id)
      break
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  const target = await prisma.user.findUnique({
    where: { id },
    select: { email: true },
  })
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Log before delete since cascade will remove the user
  await createAdminLog(`Usuário deletado: ${target.email}`, auth.userId, id)
  await prisma.user.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
