"use client"

interface VideoPlayerProps {
  url: string
  mimeType?: string | null
}

export function VideoPlayer({ url, mimeType }: VideoPlayerProps) {
  const isAudio = mimeType?.startsWith("audio/")

  if (isAudio) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center">
          <span className="text-accent text-3xl">🎙️</span>
        </div>
        <audio src={url} controls autoPlay={false} className="w-full max-w-md" />
      </div>
    )
  }

  return (
    <video
      src={url}
      controls
      autoPlay={false}
      className="w-full h-full"
      playsInline
    />
  )
}
