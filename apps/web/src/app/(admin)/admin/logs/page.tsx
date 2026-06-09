"use client"

import { useState, useEffect, useCallback } from "react"
import { DataTable, type Column } from "@/components/admin/DataTable"

interface LogRow {
  id: string
  action: string
  targetId: string | null
  details: string | null
  createdAt: string
  admin: { email: string; name: string | null } | null
}

interface LogsResponse {
  rows: LogRow[]
  total: number
  page: number
  totalPages: number
}

export default function AdminLogsPage() {
  const [data, setData] = useState<LogsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/logs?page=${page}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [page])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const columns: Column<LogRow>[] = [
    {
      key: "admin",
      header: "Admin",
      render: (l) => (
        <span className="text-text-secondary text-xs">{l.admin?.email ?? "—"}</span>
      ),
    },
    {
      key: "action",
      header: "Ação",
      render: (l) => (
        <div>
          <p className="text-text-primary text-sm">{l.action}</p>
          {l.details && <p className="text-text-secondary text-xs">{l.details}</p>}
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Data/Hora",
      render: (l) => (
        <span className="text-text-secondary text-xs">
          {new Date(l.createdAt).toLocaleString("pt-BR")}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Logs de Auditoria</h1>
        {data && (
          <span className="text-sm text-text-secondary">{data.total} registro(s)</span>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data?.rows ?? []}
        isLoading={loading}
        emptyMessage="Nenhuma ação registrada ainda."
        page={page}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPage}
      />
    </div>
  )
}
