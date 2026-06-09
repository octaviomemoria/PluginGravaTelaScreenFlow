"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "@/components/ui/Toast"
import { ConfirmModal } from "@/components/admin/ConfirmModal"
import { Skeleton } from "@/components/ui/Skeleton"
import { cn } from "@/lib/utils"
import { ArrowLeft, ExternalLink } from "lucide-react"

interface VideoItem {
  id: string
  publicId: string
  title: string
  recordingMinutes: number
  visibility: string
  createdAt: string
}

interface UserDetail {
  id: string
  name: string | null
  email: string
  plan: string
  suspended: boolean
  isAdmin: boolean
  createdAt: string
  lastLoginAt: string | null
  stripeCustomerId: string | null
  googleDriveConnected: boolean
  googleTokenExpiry: string | null
  monthlyUsages: Array<{ recordingMinutesUsed: number; transcriptionMinutesUsed: number }>
  videos: VideoItem[]
}

const PLAN_COLORS: Record<string, string> = {
  FREE: "text-text-secondary",
  PRO: "text-accent",
  BUSINESS: "text-yellow-400",
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState("")
  const [confirm, setConfirm] = useState<"delete" | "suspend" | "unsuspend" | null>(null)

  const fetchUser = async () => {
    const res = await fetch(`/api/admin/users/${id}`)
    if (res.ok) {
      const data: UserDetail = await res.json()
      setUser(data)
      setNameInput(data.name ?? "")
    }
    setLoading(false)
  }

  useEffect(() => { fetchUser() }, [id])

  const patch = async (body: object) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    return res.ok
  }

  const handleSaveName = async () => {
    const ok = await patch({ action: "editName", name: nameInput })
    toast(ok ? "Nome atualizado." : "Erro ao atualizar.", ok ? "success" : "error")
    if (ok) { setEditingName(false); fetchUser() }
  }

  const handleChangePlan = async (plan: string) => {
    const ok = await patch({ action: "changePlan", plan })
    toast(ok ? `Plano alterado para ${plan}.` : "Erro.", ok ? "success" : "error")
    if (ok) fetchUser()
  }

  const handleConfirmAction = async () => {
    if (!confirm) return
    let ok = false
    if (confirm === "delete") {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" })
      ok = res.ok
      if (ok) { toast("Usuário deletado."); router.push("/admin/users"); return }
    } else {
      ok = await patch({ action: confirm })
    }
    setConfirm(null)
    toast(ok ? "Ação realizada." : "Erro.", ok ? "success" : "error")
    if (ok) fetchUser()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!user) {
    return <p className="text-text-secondary">Usuário não encontrado.</p>
  }

  const usage = user.monthlyUsages[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/users" className="text-text-secondary hover:text-text-primary transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-text-primary">{user.name ?? user.email}</h1>
          <p className="text-sm text-text-secondary">{user.email}</p>
        </div>
        <span className={cn(
          "text-xs px-2 py-0.5 rounded-full ml-auto",
          user.suspended ? "bg-red-500/10 text-red-400" : "bg-accent/10 text-accent"
        )}>
          {user.suspended ? "Suspenso" : "Ativo"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dados pessoais */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">Dados pessoais</h2>

          <div>
            <label className="text-xs text-text-secondary">Nome</label>
            {editingName ? (
              <div className="flex gap-2 mt-1">
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm text-text-primary focus:outline-none focus:border-accent"
                />
                <button onClick={handleSaveName} className="text-xs px-3 py-1 rounded bg-accent text-white">Salvar</button>
                <button onClick={() => setEditingName(false)} className="text-xs px-3 py-1 rounded border border-border text-text-secondary">Cancelar</button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-text-primary text-sm">{user.name ?? "—"}</p>
                <button onClick={() => setEditingName(true)} className="text-xs text-text-secondary hover:text-text-primary">editar</button>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-text-secondary">Plano</label>
            <select
              value={user.plan}
              onChange={(e) => handleChangePlan(e.target.value)}
              className={cn("mt-1 block bg-transparent border border-border rounded px-2 py-1 text-sm", PLAN_COLORS[user.plan])}
            >
              <option value="FREE">FREE</option>
              <option value="PRO">PRO</option>
              <option value="BUSINESS">BUSINESS</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-text-secondary">Cadastro</p>
              <p className="text-text-primary">{new Date(user.createdAt).toLocaleDateString("pt-BR")}</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Último login</p>
              <p className="text-text-primary">
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString("pt-BR") : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Integrações */}
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">Integrações</h2>

          <div>
            <p className="text-xs text-text-secondary">Google Drive</p>
            <p className={cn("text-sm mt-1", user.googleDriveConnected ? "text-accent" : "text-text-secondary")}>
              {user.googleDriveConnected ? "Conectado" : "Desconectado"}
              {user.googleDriveConnected && user.googleTokenExpiry && (
                <span className="text-text-secondary text-xs ml-2">
                  (expira {new Date(user.googleTokenExpiry).toLocaleDateString("pt-BR")})
                </span>
              )}
            </p>
          </div>

          <div>
            <p className="text-xs text-text-secondary">Stripe Customer ID</p>
            {user.stripeCustomerId ? (
              <a
                href={`https://dashboard.stripe.com/customers/${user.stripeCustomerId}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-accent hover:underline flex items-center gap-1 mt-1"
              >
                {user.stripeCustomerId}
                <ExternalLink size={12} />
              </a>
            ) : (
              <p className="text-text-secondary text-sm mt-1">—</p>
            )}
          </div>

          <div>
            <p className="text-xs text-text-secondary">Uso mensal atual</p>
            <div className="text-sm mt-1 space-y-1">
              <p className="text-text-primary">
                Gravação: {Math.round(usage?.recordingMinutesUsed ?? 0)}min
              </p>
              <p className="text-text-primary">
                Transcrição: {Math.round(usage?.transcriptionMinutesUsed ?? 0)}min
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">Ações</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setConfirm(user.suspended ? "unsuspend" : "suspend")}
            className="text-sm px-4 py-2 rounded-lg border border-border text-text-secondary hover:text-text-primary transition-colors"
          >
            {user.suspended ? "Reativar conta" : "Suspender conta"}
          </button>
          <button
            onClick={async () => {
              const res = await fetch(`/api/admin/users/${id}/reset-usage`, { method: "POST" })
              toast(res.ok ? "Uso resetado." : "Erro.", res.ok ? "success" : "error")
            }}
            className="text-sm px-4 py-2 rounded-lg border border-border text-text-secondary hover:text-text-primary transition-colors"
          >
            Resetar uso mensal
          </button>
          {user.googleDriveConnected && (
            <button
              onClick={async () => {
                const ok = await patch({ action: "disconnectDrive" })
                toast(ok ? "Drive desconectado." : "Erro.", ok ? "success" : "error")
                if (ok) fetchUser()
              }}
              className="text-sm px-4 py-2 rounded-lg border border-border text-text-secondary hover:text-text-primary transition-colors"
            >
              Desconectar Drive
            </button>
          )}
          <button
            onClick={() => setConfirm("delete")}
            className="text-sm px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Deletar usuário
          </button>
        </div>
      </div>

      {/* Últimos vídeos */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">Últimos 10 vídeos</h2>
        </div>
        {user.videos.length === 0 ? (
          <p className="px-5 py-8 text-text-secondary text-sm text-center">Nenhum vídeo.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs text-text-secondary">Título</th>
                <th className="px-4 py-3 text-left text-xs text-text-secondary">Duração</th>
                <th className="px-4 py-3 text-left text-xs text-text-secondary">Visibilidade</th>
                <th className="px-4 py-3 text-left text-xs text-text-secondary">Data</th>
              </tr>
            </thead>
            <tbody>
              {user.videos.map((v) => (
                <tr key={v.id} className="border-b border-border last:border-0 hover:bg-white/5">
                  <td className="px-4 py-3">
                    <a
                      href={`/p/${v.publicId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-text-primary hover:text-accent flex items-center gap-1"
                    >
                      {v.title}
                      <ExternalLink size={10} />
                    </a>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{Math.round(v.recordingMinutes)}m</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{v.visibility}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    {new Date(v.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirm && (
        <ConfirmModal
          open
          title={
            confirm === "delete"
              ? "Deletar usuário"
              : confirm === "suspend"
              ? "Suspender conta"
              : "Reativar conta"
          }
          description={
            confirm === "delete"
              ? `Deletar permanentemente ${user.email}? Todos os vídeos serão removidos.`
              : confirm === "suspend"
              ? `Suspender a conta de ${user.email}?`
              : `Reativar a conta de ${user.email}?`
          }
          danger={confirm === "delete"}
          confirmLabel={confirm === "delete" ? "Deletar" : "Confirmar"}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
