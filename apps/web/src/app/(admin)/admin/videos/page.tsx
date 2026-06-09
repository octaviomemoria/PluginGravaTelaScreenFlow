"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "@/components/ui/Toast"
import { DataTable, type Column } from "@/components/admin/DataTable"
import { ConfirmModal } from "@/components/admin/ConfirmModal"
import { ExternalLink } from "lucide-react"

interface VideoRow {
  id: string
  publicId: string
  title: string
  recordingMinutes: number
  durationSeconds: number | null
  visibility: string
  createdAt: string
  user: { name: string | null; email: string }
}

interface VideosResponse {
  rows: VideoRow[]
  total: number
  page: number
  totalPages: number
}

const VISIBILITY_LABELS: Record<string, string> = {
  PRIVATE: "Privado",
  LINK: "Por link",
  PUBLIC: "Público",
}

export default function AdminVideosPage() {
  const [data, setData] = useState<VideosResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [visibilityFilter, setVisibilityFilter] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<VideoRow | null>(null)

  const fetchVideos = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (search) params.set("search", search)
    if (visibilityFilter) params.set("visibility", visibilityFilter)

    const res = await fetch(`/api/admin/videos?${params}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [page, search, visibilityFilter])

  useEffect(() => { fetchVideos() }, [fetchVideos])

  const handleChangeVisibility = async (video: VideoRow, visibility: string) => {
    const res = await fetch(`/api/admin/videos/${video.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility }),
    })
    toast(res.ok ? "Visibilidade alterada." : "Erro.", res.ok ? "success" : "error")
    if (res.ok) fetchVideos()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const res = await fetch(`/api/admin/videos/${deleteTarget.id}`, { method: "DELETE" })
    setDeleteTarget(null)
    toast(res.ok ? "Vídeo deletado." : "Erro.", res.ok ? "success" : "error")
    if (res.ok) fetchVideos()
  }

  const columns: Column<VideoRow>[] = [
    {
      key: "title",
      header: "Título",
      render: (v) => (
        <a
          href={`/p/${v.publicId}`}
          target="_blank"
          rel="noreferrer"
          className="text-text-primary hover:text-accent flex items-center gap-1"
        >
          <span className="truncate max-w-[180px]">{v.title}</span>
          <ExternalLink size={10} className="shrink-0" />
        </a>
      ),
    },
    {
      key: "user",
      header: "Usuário",
      render: (v) => (
        <div className="text-xs">
          <div className="text-text-primary">{v.user.name ?? "—"}</div>
          <div className="text-text-secondary">{v.user.email}</div>
        </div>
      ),
    },
    {
      key: "duration",
      header: "Duração",
      render: (v) => (
        <span className="text-text-secondary text-xs">{Math.round(v.recordingMinutes)}m</span>
      ),
    },
    {
      key: "visibility",
      header: "Visibilidade",
      render: (v) => (
        <select
          value={v.visibility}
          onChange={(e) => handleChangeVisibility(v, e.target.value)}
          className="bg-transparent border border-border rounded px-2 py-1 text-xs text-text-secondary cursor-pointer"
        >
          <option value="PRIVATE">Privado</option>
          <option value="LINK">Por link</option>
          <option value="PUBLIC">Público</option>
        </select>
      ),
    },
    {
      key: "createdAt",
      header: "Data",
      render: (v) => (
        <span className="text-text-secondary text-xs">
          {new Date(v.createdAt).toLocaleDateString("pt-BR")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Ações",
      render: (v) => (
        <button
          onClick={() => setDeleteTarget(v)}
          className="text-xs px-2 py-1 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
        >
          Deletar
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Vídeos</h1>
        {data && (
          <span className="text-sm text-text-secondary">{data.total} vídeo(s)</span>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por título..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent w-64"
        />
        <select
          value={visibilityFilter}
          onChange={(e) => { setVisibilityFilter(e.target.value); setPage(1) }}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
        >
          <option value="">Todas as visibilidades</option>
          <option value="PRIVATE">Privado</option>
          <option value="LINK">Por link</option>
          <option value="PUBLIC">Público</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data?.rows ?? []}
        isLoading={loading}
        emptyMessage="Nenhum vídeo encontrado."
        page={page}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPage}
      />

      {deleteTarget && (
        <ConfirmModal
          open
          title="Deletar vídeo"
          description={`Deletar permanentemente "${deleteTarget.title}"?`}
          confirmLabel="Deletar"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
