"use client"

import Link from "next/link"
import { formatDuration, formatRelativeDate } from "@screenflow/shared"
import { Copy, Trash2, Lock, Link2 } from "lucide-react"
import { useState } from "react"

interface VideoCardProps {
  video: {
    id: string
    publicId: string
    title: string
    thumbnailUrl: string | null
    durationSeconds: number | null
    visibility: string
    createdAt: Date
  }
}

export function VideoCard({ video }: VideoCardProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopyLink(e: React.MouseEvent) {
    e.preventDefault()
    const url = `${window.location.origin}/p/${video.publicId}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    if (!confirm("Tem certeza que deseja excluir este vídeo?")) return
    await fetch(`/api/videos/${video.id}`, { method: "DELETE" })
    window.location.reload()
  }

  return (
    <Link href={`/video/${video.id}`} className="group block bg-surface border border-border rounded-xl overflow-hidden hover:border-accent/50 transition-colors">
      <div className="relative aspect-video bg-background">
        {video.thumbnailUrl ? (
          <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
              <span className="text-accent text-xl">▶</span>
            </div>
          </div>
        )}
        {video.durationSeconds != null && (
          <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded font-mono">
            {formatDuration(video.durationSeconds)}
          </span>
        )}
        {video.visibility === "PRIVATE" && (
          <span className="absolute top-2 left-2 bg-black/70 text-text-secondary text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
            <Lock className="w-3 h-3" /> Privado
          </span>
        )}
      </div>

      <div className="p-3">
        <p className="font-medium text-sm truncate mb-1">{video.title}</p>
        <p className="text-xs text-text-secondary">{formatRelativeDate(video.createdAt.toISOString())}</p>

        <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent px-2 py-1 rounded bg-background transition-colors"
          >
            {copied ? <span className="text-accent">✓ Copiado</span> : <><Link2 className="w-3 h-3" /> Copiar link</>}
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-red-400 px-2 py-1 rounded bg-background transition-colors ml-auto"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </Link>
  )
}
