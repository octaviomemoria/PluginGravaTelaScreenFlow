"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { toast } from "@/components/ui/Toast"
import { DataTable, type Column } from "@/components/admin/DataTable"
import { ConfirmModal } from "@/components/admin/ConfirmModal"
import { cn } from "@/lib/utils"

interface UserRow {
  id: string
  name: string | null
  email: string
  plan: string
  suspended: boolean
  googleDriveConnected: boolean
  videoCount: number
  recordingMinutesUsed: number
  createdAt: string
  lastLoginAt: string | null
}

interface UsersResponse {
  rows: UserRow[]
  total: number
  page: number
  totalPages: number
}

const PLAN_COLORS: Record<string, string> = {
  FREE: "text-text-secondary",
  PRO: "text-accent",
  BUSINESS: "text-yellow-400",
}

export default function AdminUsersPage() {
  const [data, setData] = useState<UsersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [planFilter, setPlanFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [driveFilter, setDriveFilter] = useState("")
  const [confirm, setConfirm] = useState<{
    type: "delete" | "suspend" | "unsuspend" | "resetUsage" | "disconnectDrive"
    user: UserRow
  } | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (search) params.set("search", search)
    if (planFilter) params.set("plan", planFilter)
    if (statusFilter) params.set("status", statusFilter)
    if (driveFilter) params.set("driveConnected", driveFilter)

    const res = await fetch(`/api/admin/users?${params}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [page, search, planFilter, statusFilter, driveFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const patchUser = async (id: string, body: object) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    return res.ok
  }

  const handleConfirm = async () => {
    if (!confirm) return
    const { type, user } = confirm
    setConfirm(null)

    let ok = false
    if (type === "delete") {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" })
      ok = res.ok
    } else if (type === "suspend") {
      ok = await patchUser(user.id, { action: "suspend" })
    } else if (type === "unsuspend") {
      ok = await patchUser(user.id, { action: "unsuspend" })
    } else if (type === "resetUsage") {
      const res = await fetch(`/api/admin/users/${user.id}/reset-usage`, { method: "POST" })
      ok = res.ok
    } else if (type === "disconnectDrive") {
      ok = await patchUser(user.id, { action: "disconnectDrive" })
    }

    toast(ok ? "Ação realizada com sucesso." : "Erro ao realizar ação.", ok ? "success" : "error")
    if (ok) fetchUsers()
  }

  const handleChangePlan = async (user: UserRow, plan: string) => {
    const ok = await patchUser(user.id, { action: "changePlan", plan })
    toast(ok ? `Plano alterado para ${plan}.` : "Erro ao alterar plano.", ok ? "success" : "error")
    if (ok) fetchUsers()
  }

  const columns: Column<UserRow>[] = [
    {
      key: "name",
      header: "Nome",
      render: (u) => (
        <div>
          <div className="text-text-primary font-medium">{u.name ?? "—"}</div>
          <div className="text-text-secondary text-xs">{u.email}</div>
        </div>
      ),
    },
    {
      key: "plan",
      header: "Plano",
      render: (u) => (
        <select
          value={u.plan}
          onChange={(e) => handleChangePlan(u, e.target.value)}
          className={cn(
            "bg-transparent border border-border rounded px-2 py-1 text-xs cursor-pointer",
            PLAN_COLORS[u.plan]
          )}
        >
          <option value="FREE">FREE</option>
          <option value="PRO">PRO</option>
          <option value="BUSINESS">BUSINESS</option>
        </select>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (u) => (
        <span className={cn(
          "text-xs px-2 py-0.5 rounded-full",
          u.suspended ? "bg-red-500/10 text-red-400" : "bg-accent/10 text-accent"
        )}>
          {u.suspended ? "Suspenso" : "Ativo"}
        </span>
      ),
    },
    {
      key: "drive",
      header: "Drive",
      render: (u) => (
        <span className={u.googleDriveConnected ? "text-accent text-xs" : "text-text-secondary text-xs"}>
          {u.googleDriveConnected ? "✓ Sim" : "Não"}
        </span>
      ),
    },
    {
      key: "videos",
      header: "Vídeos",
      render: (u) => <span className="text-text-secondary text-xs">{u.videoCount}</span>,
    },
    {
      key: "usage",
      header: "Min. usados",
      render: (u) => (
        <span className="text-text-secondary text-xs">
          {Math.round(u.recordingMinutesUsed)}m
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Cadastro",
      render: (u) => (
        <span className="text-text-secondary text-xs">
          {new Date(u.createdAt).toLocaleDateString("pt-BR")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Ações",
      render: (u) => (
        <div className="flex gap-1 flex-wrap">
          <Link
            href={`/admin/users/${u.id}`}
            className="text-xs px-2 py-1 rounded border border-border text-text-secondary hover:text-text-primary transition-colors"
          >
            Detalhes
          </Link>
          <button
            onClick={() => setConfirm({ type: u.suspended ? "unsuspend" : "suspend", user: u })}
            className="text-xs px-2 py-1 rounded border border-border text-text-secondary hover:text-text-primary transition-colors"
          >
            {u.suspended ? "Reativar" : "Suspender"}
          </button>
          <button
            onClick={() => setConfirm({ type: "resetUsage", user: u })}
            className="text-xs px-2 py-1 rounded border border-border text-text-secondary hover:text-text-primary transition-colors"
          >
            Resetar uso
          </button>
          {u.googleDriveConnected && (
            <button
              onClick={() => setConfirm({ type: "disconnectDrive", user: u })}
              className="text-xs px-2 py-1 rounded border border-border text-text-secondary hover:text-text-primary transition-colors"
            >
              Desconectar Drive
            </button>
          )}
          <button
            onClick={() => setConfirm({ type: "delete", user: u })}
            className="text-xs px-2 py-1 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Deletar
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Usuários</h1>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent w-64"
        />
        <select
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value); setPage(1) }}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
        >
          <option value="">Todos os planos</option>
          <option value="FREE">FREE</option>
          <option value="PRO">PRO</option>
          <option value="BUSINESS">BUSINESS</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
        >
          <option value="">Todos os status</option>
          <option value="active">Ativo</option>
          <option value="suspended">Suspenso</option>
        </select>
        <select
          value={driveFilter}
          onChange={(e) => { setDriveFilter(e.target.value); setPage(1) }}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
        >
          <option value="">Drive: todos</option>
          <option value="true">Drive conectado</option>
          <option value="false">Drive desconectado</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data?.rows ?? []}
        isLoading={loading}
        emptyMessage="Nenhum usuário encontrado."
        page={page}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPage}
      />

      {confirm && (
        <ConfirmModal
          open
          title={
            confirm.type === "delete"
              ? "Deletar usuário"
              : confirm.type === "suspend"
              ? "Suspender conta"
              : confirm.type === "unsuspend"
              ? "Reativar conta"
              : confirm.type === "resetUsage"
              ? "Resetar uso mensal"
              : "Desconectar Google Drive"
          }
          description={
            confirm.type === "delete"
              ? `Tem certeza que deseja deletar permanentemente "${confirm.user.email}"? Todos os vídeos serão removidos.`
              : confirm.type === "suspend"
              ? `Suspender a conta de "${confirm.user.email}"?`
              : confirm.type === "unsuspend"
              ? `Reativar a conta de "${confirm.user.email}"?`
              : confirm.type === "resetUsage"
              ? `Zerar os minutos usados no mês atual para "${confirm.user.email}"?`
              : `Desconectar o Google Drive de "${confirm.user.email}"?`
          }
          danger={confirm.type === "delete"}
          confirmLabel={
            confirm.type === "delete"
              ? "Deletar"
              : confirm.type === "suspend"
              ? "Suspender"
              : "Confirmar"
          }
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
