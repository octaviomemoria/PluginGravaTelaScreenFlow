import { prisma } from "@/lib/prisma"
import { PLAN_LIMITS } from "@screenflow/shared"
import type { Visibility, Plan } from "@screenflow/shared"

export async function getUserVideos(userId: string, search?: string) {
  return prisma.video.findMany({
    where: {
      userId,
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      publicId: true,
      title: true,
      thumbnailUrl: true,
      durationSeconds: true,
      recordingMinutes: true,
      googleDriveFileId: true,
      visibility: true,
      linkExpiresAt: true,
      createdAt: true,
    },
  })
}

export async function getVideoById(id: string, userId: string) {
  return prisma.video.findFirst({
    where: { id, userId },
  })
}

export async function getPublicVideo(publicId: string) {
  const video = await prisma.video.findFirst({
    where: {
      publicId,
      visibility: "LINK",
    },
    select: {
      id: true,
      publicId: true,
      title: true,
      playbackUrl: true,
      googleDriveFileId: true,
      thumbnailUrl: true,
      durationSeconds: true,
      linkExpiresAt: true,
      createdAt: true,
      user: { select: { name: true, plan: true } },
    },
  })

  if (!video) return null
  if (video.linkExpiresAt && video.linkExpiresAt < new Date()) return null

  return video
}

export async function updateVideo(
  id: string,
  userId: string,
  data: { title?: string; visibility?: Visibility }
) {
  return prisma.video.update({
    where: { id, userId },
    data,
  })
}

export async function deleteVideo(id: string, userId: string) {
  return prisma.video.delete({ where: { id, userId } })
}

export async function createVideoRecord(data: {
  id: string
  userId: string
  publicId: string
  title: string
  googleDriveFileId?: string
  linkExpiresAt?: Date
  recordingMinutes?: number
}) {
  return prisma.video.create({ data })
}

export async function finalizeVideo(
  id: string,
  data: {
    googleDriveFileId?: string
    playbackUrl?: string
    durationSeconds: number
    recordingMinutes: number
    thumbnailUrl?: string
  }
) {
  return prisma.video.update({ where: { id }, data })
}

export async function getMonthlyUsage(userId: string) {
  const now = new Date()
  return prisma.monthlyUsage.findUnique({
    where: { userId_year_month: { userId, year: now.getFullYear(), month: now.getMonth() + 1 } },
  })
}

export async function incrementRecordingMinutes(userId: string, minutes: number) {
  const now = new Date()
  await prisma.monthlyUsage.upsert({
    where: { userId_year_month: { userId, year: now.getFullYear(), month: now.getMonth() + 1 } },
    update: { recordingMinutesUsed: { increment: minutes } },
    create: {
      userId,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      recordingMinutesUsed: minutes,
      transcriptionMinutesUsed: 0,
    },
  })
}

export async function incrementTranscriptionMinutes(userId: string, minutes: number) {
  const now = new Date()
  await prisma.monthlyUsage.upsert({
    where: { userId_year_month: { userId, year: now.getFullYear(), month: now.getMonth() + 1 } },
    update: { transcriptionMinutesUsed: { increment: minutes } },
    create: {
      userId,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      recordingMinutesUsed: 0,
      transcriptionMinutesUsed: minutes,
    },
  })
}

export async function canUserRecord(userId: string, estimatedMinutes = 0): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } })
  if (!user) return false

  const limits = PLAN_LIMITS[user.plan as Plan]
  const usage = await getMonthlyUsage(userId)
  const used = usage?.recordingMinutesUsed ?? 0

  return used + estimatedMinutes <= limits.recordingMinutesPerMonth
}

export async function getUserWithUsage(userId: string) {
  const now = new Date()
  const [user, usage] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.monthlyUsage.findUnique({
      where: { userId_year_month: { userId, year: now.getFullYear(), month: now.getMonth() + 1 } },
    }),
  ])
  return { user, usage }
}
