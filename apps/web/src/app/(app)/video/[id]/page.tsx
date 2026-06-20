import { notFound } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getVideoById } from "@/server/queries"
import { getDriveStreamUrl } from "@/lib/google-drive"
import { VideoPlayer } from "@/components/video/VideoPlayer"
import { VideoActions } from "@/components/video/VideoActions"
import { formatDuration, formatRelativeDate } from "@screenflow/shared"

interface Props {
  params: Promise<{ id: string }>
}

export default async function VideoPage({ params }: Props) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const video = await getVideoById(id, user.id)
  if (!video) notFound()

  const videoSrc = video.googleDriveFileId
    ? getDriveStreamUrl(video.googleDriveFileId)
    : video.playbackUrl ?? null

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/p/${video.publicId}`
  const isAudio = video.mimeType?.startsWith("audio/") ?? false

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className={`bg-black rounded-xl overflow-hidden ${isAudio ? "" : "aspect-video"}`}>
        {videoSrc ? (
          <VideoPlayer url={videoSrc} mimeType={video.mimeType} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-secondary py-12">
            <p>Processando gravação...</p>
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <VideoActions videoId={video.id} title={video.title} visibility={video.visibility} shareUrl={shareUrl} />
          <div className="flex items-center gap-4 mt-2 text-sm text-text-secondary">
            {video.durationSeconds != null && <span>{formatDuration(video.durationSeconds)}</span>}
            <span>{formatRelativeDate(video.createdAt.toISOString())}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
