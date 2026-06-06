"use client"

interface VideoPlayerProps {
  url: string
}

export function VideoPlayer({ url }: VideoPlayerProps) {
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
