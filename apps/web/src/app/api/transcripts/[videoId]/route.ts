import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { PLAN_LIMITS } from "@screenflow/shared"
import type { Plan } from "@screenflow/shared"
import { refreshAccessToken } from "@/lib/google-drive"
import { getUserWithUsage, incrementTranscriptionMinutes } from "@/server/queries"
import { transcribeAudioUrl } from "@/lib/deepgram"

export const dynamic = "force-dynamic"

async function getUserId(req: NextRequest): Promise<string | null> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await params
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const video = await prisma.video.findFirst({
    where: { id: videoId, userId },
    select: { id: true, transcript: true },
  })

  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!video.transcript) return NextResponse.json({ status: "NONE" })

  return NextResponse.json({
    status: video.transcript.status,
    language: video.transcript.language,
    fullText: video.transcript.fullText,
    segments: video.transcript.segments,
    createdAt: video.transcript.createdAt,
  })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await params
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { user, usage } = await getUserWithUsage(userId)
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const limits = PLAN_LIMITS[user.plan as Plan]

  if (limits.transcriptionMinutesPerMonth === 0) {
    return NextResponse.json(
      { error: "Transcrição não disponível no plano Free. Faça upgrade para Pro." },
      { status: 402 }
    )
  }

  const transcriptionUsed = usage?.transcriptionMinutesUsed ?? 0
  if (transcriptionUsed >= limits.transcriptionMinutesPerMonth) {
    return NextResponse.json(
      { error: `Limite de transcrição atingido (${limits.transcriptionMinutesPerMonth} min/mês).` },
      { status: 402 }
    )
  }

  const video = await prisma.video.findFirst({
    where: { id: videoId, userId },
    select: { id: true, googleDriveFileId: true, durationSeconds: true, transcript: true },
  })

  if (!video) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!video.googleDriveFileId) return NextResponse.json({ error: "Vídeo ainda não processado" }, { status: 400 })

  // If already done, return it
  if (video.transcript?.status === "DONE") {
    return NextResponse.json({ status: "DONE", message: "Transcrição já disponível" })
  }

  // Create or reset transcript record
  await prisma.transcript.upsert({
    where: { videoId },
    update: { status: "PROCESSING", errorMsg: null },
    create: { videoId, status: "PROCESSING" },
  })

  // Build audio URL via proxy (Drive stream)
  const audioUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/proxy/video/${video.googleDriveFileId}`

  // Run transcription (synchronous for simplicity — move to queue for production)
  try {
    const result = await transcribeAudioUrl(audioUrl)
    const durationMinutes = (video.durationSeconds ?? 0) / 60

    const segments = result.utterances.map((u) => ({
      start: u.start,
      end: u.end,
      text: u.transcript,
      confidence: u.confidence,
    }))

    await prisma.transcript.update({
      where: { videoId },
      data: {
        status: "DONE",
        fullText: result.transcript,
        segments,
        language: result.language,
      },
    })

    await incrementTranscriptionMinutes(userId, durationMinutes)

    return NextResponse.json({ status: "DONE", transcript: result.transcript })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    await prisma.transcript.update({
      where: { videoId },
      data: { status: "FAILED", errorMsg: message },
    })
    return NextResponse.json({ error: "Transcrição falhou", detail: message }, { status: 500 })
  }
}
