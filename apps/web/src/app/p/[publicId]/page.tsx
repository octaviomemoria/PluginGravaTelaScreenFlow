import { notFound } from "next/navigation"
import { getPublicVideo } from "@/server/queries"
import { getDriveStreamUrl } from "@/lib/google-drive"
import { formatDuration, formatRelativeDate, PLAN_LIMITS } from "@screenflow/shared"
import type { Plan } from "@screenflow/shared"
import type { Metadata } from "next"

interface Props {
  params: Promise<{ publicId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { publicId } = await params
  const video = await getPublicVideo(publicId)
  if (!video) return {}
  return {
    title: video.title,
    openGraph: {
      title: video.title,
      images: video.thumbnailUrl ? [video.thumbnailUrl] : [],
    },
  }
}

export default async function PublicVideoPage({ params }: Props) {
  const { publicId } = await params
  const video = await getPublicVideo(publicId)
  if (!video) notFound()

  const userPlan = (video.user as { plan: Plan }).plan
  const showWatermark = PLAN_LIMITS[userPlan].watermark

  const videoSrc = video.googleDriveFileId
    ? getDriveStreamUrl(video.googleDriveFileId)
    : video.playbackUrl ?? null

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-4 h-12 flex items-center">
        <span className="font-bold text-sm flex items-center gap-2">
          <span className="w-5 h-5 bg-accent rounded flex items-center justify-center text-xs text-white font-black">S</span>
          ScreenFlow
        </span>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 space-y-6">
        <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
          {videoSrc ? (
            <video
              src={videoSrc}
              controls
              autoPlay={false}
              className="w-full h-full"
              playsInline
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-secondary">
              Processando vídeo...
            </div>
          )}

          {showWatermark && (
            <div className="absolute bottom-10 right-3 pointer-events-none">
              <a
                href="/"
                className="text-xs text-white/70 bg-black/50 px-2 py-1 rounded backdrop-blur-sm pointer-events-auto hover:text-white transition-colors"
              >
                Gravado com ScreenFlow
              </a>
            </div>
          )}
        </div>

        <div>
          <h1 className="text-xl font-bold">{video.title}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-text-secondary">
            {video.durationSeconds != null && <span>{formatDuration(video.durationSeconds)}</span>}
            <span>por {video.user.name ?? "Anônimo"}</span>
            <span>{formatRelativeDate(video.createdAt.toISOString())}</span>
          </div>
        </div>

        <div className="border-t border-border pt-4 text-center text-sm text-text-secondary">
          Gravado com{" "}
          <a href="/" className="text-accent hover:underline">ScreenFlow</a>
          {" "}— grave sua tela em segundos
        </div>
      </main>
    </div>
  )
}
