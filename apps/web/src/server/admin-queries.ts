import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export async function getAdminStats() {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const [
    totalUsers,
    activeUsers,
    totalVideos,
    minutesAgg,
    proCount,
    businessCount,
    newUsersRaw,
    newVideosRaw,
    planDistribution,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { lastLoginAt: { gte: thirtyDaysAgo } } }),
    prisma.video.count(),
    prisma.video.aggregate({ _sum: { recordingMinutes: true } }),
    prisma.user.count({ where: { plan: "PRO" } }),
    prisma.user.count({ where: { plan: "BUSINESS" } }),
    // New users grouped by day (last 7 days)
    prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT "createdAt"::date as day, COUNT(*) as count
      FROM users
      WHERE "createdAt" >= ${sevenDaysAgo}
      GROUP BY "createdAt"::date
      ORDER BY day ASC
    `,
    // New videos grouped by day (last 30 days)
    prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT "createdAt"::date as day, COUNT(*) as count
      FROM videos
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY "createdAt"::date
      ORDER BY day ASC
    `,
    prisma.user.groupBy({
      by: ["plan"],
      _count: { plan: true },
    }),
  ])

  const mrrEstimated = proCount * 49 + businessCount * 99

  return {
    totalUsers,
    activeUsers,
    totalVideos,
    totalMinutes: minutesAgg._sum.recordingMinutes ?? 0,
    mrrEstimated,
    proCount,
    businessCount,
    newUsersChart: newUsersRaw.map((r) => ({
      day: r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day),
      count: Number(r.count),
    })),
    newVideosChart: newVideosRaw.map((r) => ({
      day: r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day),
      count: Number(r.count),
    })),
    planDistribution: planDistribution.map((p) => ({
      plan: p.plan,
      count: p._count.plan,
    })),
    year,
    month,
  }
}

export type AdminUserRow = {
  id: string
  name: string | null
  email: string
  plan: string
  suspended: boolean
  googleDriveConnected: boolean
  videoCount: number
  recordingMinutesUsed: number
  createdAt: Date
  lastLoginAt: Date | null
}

export async function getAdminUsers(opts: {
  page: number
  search?: string
  plan?: string
  status?: string
  driveConnected?: string
}) {
  const { page, search, plan, status, driveConnected } = opts
  const take = 20
  const skip = (page - 1) * take
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const where: Prisma.UserWhereInput = {}
  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
    ]
  }
  if (plan && ["FREE", "PRO", "BUSINESS"].includes(plan)) {
    where.plan = plan as "FREE" | "PRO" | "BUSINESS"
  }
  if (status === "suspended") where.suspended = true
  if (status === "active") where.suspended = false
  if (driveConnected === "true") where.googleDriveConnected = true
  if (driveConnected === "false") where.googleDriveConnected = false

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        suspended: true,
        googleDriveConnected: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { videos: true } },
        monthlyUsages: {
          where: { year, month },
          select: { recordingMinutesUsed: true },
          take: 1,
        },
      },
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ])

  const rows: AdminUserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    plan: u.plan,
    suspended: u.suspended,
    googleDriveConnected: u.googleDriveConnected,
    videoCount: u._count.videos,
    recordingMinutesUsed: u.monthlyUsages[0]?.recordingMinutesUsed ?? 0,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
  }))

  return { rows, total, page, totalPages: Math.ceil(total / take) }
}

export async function getAdminUserDetail(id: string) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      suspended: true,
      isAdmin: true,
      createdAt: true,
      lastLoginAt: true,
      stripeCustomerId: true,
      googleDriveConnected: true,
      googleTokenExpiry: true,
      monthlyUsages: {
        where: { year, month },
        select: { recordingMinutesUsed: true, transcriptionMinutesUsed: true },
        take: 1,
      },
      videos: {
        select: {
          id: true,
          title: true,
          recordingMinutes: true,
          durationSeconds: true,
          visibility: true,
          createdAt: true,
          publicId: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  })
}

export async function getAdminVideos(opts: {
  page: number
  search?: string
  visibility?: string
  userId?: string
}) {
  const { page, search, visibility, userId } = opts
  const take = 20
  const skip = (page - 1) * take

  const where: Prisma.VideoWhereInput = {}
  if (search) where.title = { contains: search, mode: "insensitive" }
  if (visibility && ["PRIVATE", "LINK", "PUBLIC"].includes(visibility)) {
    where.visibility = visibility as "PRIVATE" | "LINK" | "PUBLIC"
  }
  if (userId) where.userId = userId

  const [videos, total] = await Promise.all([
    prisma.video.findMany({
      where,
      select: {
        id: true,
        publicId: true,
        title: true,
        recordingMinutes: true,
        durationSeconds: true,
        visibility: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.video.count({ where }),
  ])

  return { rows: videos, total, page, totalPages: Math.ceil(total / take) }
}

export async function getAdminLogs(page: number) {
  const take = 50
  const skip = (page - 1) * take

  const [logs, total] = await Promise.all([
    prisma.adminLog.findMany({
      select: {
        id: true,
        action: true,
        targetId: true,
        details: true,
        createdAt: true,
        admin: { select: { email: true, name: true } },
      },
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.adminLog.count(),
  ])

  return { rows: logs, total, page, totalPages: Math.ceil(total / take) }
}

export async function getAdminPlanStats() {
  const [planGroups, totalMinutesAgg] = await Promise.all([
    prisma.user.groupBy({
      by: ["plan"],
      _count: { plan: true },
    }),
    prisma.video.aggregate({ _sum: { recordingMinutes: true } }),
  ])

  return {
    planGroups: planGroups.map((g) => ({ plan: g.plan, count: g._count.plan })),
    totalMinutes: totalMinutesAgg._sum.recordingMinutes ?? 0,
  }
}

export async function getTopUsersByUsage() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      _count: { select: { videos: true } },
      videos: {
        select: { recordingMinutes: true },
      },
    },
    take: 100,
  })
}
