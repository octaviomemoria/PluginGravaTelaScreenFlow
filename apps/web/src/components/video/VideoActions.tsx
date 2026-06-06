"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Copy, Trash2, Lock, Link2, Globe } from "lucide-react"
import type { Visibility } from "@screenflow/shared"

interface VideoActionsProps {
  videoId: string
  title: string
  visibility: string
  shareUrl: string
}

export function VideoActions({ videoId, title, visibility, shareUrl }: VideoActionsProps) {
  const router = useRouter()
  const [currentTitle, setCurrentTitle] = useState(title)
  const [editing, setEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [currentVisibility, setCurrentVisibility] = useState(visibility)

  async function handleTitleSave() {
    setEditing(false)
    await fetch(`/api/videos/${videoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: currentTitle }),
    })
  }

  async function toggleVisibility() {
    const next = currentVisibility === "LINK" ? "PRIVATE" : "LINK"
    setCurrentVisibility(next)
    await fetch(`/api/videos/${videoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: next }),
    })
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir este vídeo?")) return
    await fetch(`/api/videos/${videoId}`, { method: "DELETE" })
    router.push("/dashboard")
  }

  return (
    <div className="space-y-3">
      {editing ? (
        <input
          autoFocus
          value={currentTitle}
          onChange={(e) => setCurrentTitle(e.target.value)}
          onBlur={handleTitleSave}
          onKeyDown={(e) => e.key === "Enter" && handleTitleSave()}
          className="text-xl font-bold bg-surface border border-accent rounded-lg px-3 py-1 w-full focus:outline-none"
        />
      ) : (
        <h1
          className="text-xl font-bold cursor-pointer hover:text-text-secondary transition-colors"
          onClick={() => setEditing(true)}
          title="Clique para editar"
        >
          {currentTitle}
        </h1>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors font-medium"
        >
          <Link2 className="w-4 h-4" />
          {copied ? "Copiado!" : "Copiar link"}
        </button>

        <button
          onClick={toggleVisibility}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-surface border border-border text-text-secondary hover:text-text-primary rounded-lg transition-colors"
        >
          {currentVisibility === "LINK" ? (
            <><Link2 className="w-4 h-4" /> Público por link</>
          ) : (
            <><Lock className="w-4 h-4" /> Privado</>
          )}
        </button>

        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-surface border border-border text-text-secondary hover:text-red-400 hover:border-red-400/30 rounded-lg transition-colors ml-auto"
        >
          <Trash2 className="w-4 h-4" /> Excluir
        </button>
      </div>
    </div>
  )
}
