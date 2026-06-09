"use client"

import { useEffect, useState } from "react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts"

interface StatsData {
  totalUsers: number
  activeUsers: number
  totalVideos: number
  totalMinutes: number
  mrrEstimated: number
  proCount: number
  businessCount: number
  newUsersChart: Array<{ day: string; count: number }>
  newVideosChart: Array<{ day: string; count: number }>
  planDistribution: Array<{ plan: string; count: number }>
}

const PIE_COLORS: Record<string, string> = {
  FREE: "#94A3B8",
  PRO: "#22C55E",
  BUSINESS: "#FACC15",
}

const formatDay = (day: string) =>
  new Date(day).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })

export default function AdminStatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => { setStats(d); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-8 w-48 bg-surface animate-pulse rounded" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 bg-surface animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!stats) return <p className="text-text-secondary">Erro ao carregar estatísticas.</p>

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-text-primary">Estatísticas</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Novos usuários por dia */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">
            Novos usuários — últimos 7 dias
          </h2>
          {stats.newUsersChart.length === 0 ? (
            <p className="text-text-secondary text-sm">Sem dados.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.newUsersChart}>
                <XAxis
                  dataKey="day"
                  tickFormatter={formatDay}
                  tick={{ fill: "#94A3B8", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(v) => [v, "Usuários"]}
                  labelFormatter={(l) => formatDay(String(l))}
                  contentStyle={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#F8FAFC" }}
                />
                <Bar dataKey="count" fill="#22C55E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Vídeos por dia */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">
            Vídeos gravados — últimos 30 dias
          </h2>
          {stats.newVideosChart.length === 0 ? (
            <p className="text-text-secondary text-sm">Sem dados.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats.newVideosChart}>
                <XAxis
                  dataKey="day"
                  tickFormatter={formatDay}
                  tick={{ fill: "#94A3B8", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(v) => [v, "Vídeos"]}
                  labelFormatter={(l) => formatDay(String(l))}
                  contentStyle={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#F8FAFC" }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#22C55E"
                  fill="#22C55E20"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Distribuição de planos */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">
            Distribuição de planos
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={stats.planDistribution.map((d) => ({ name: d.plan, value: d.count }))}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                label={({ name, value }: any) => `${name} (${value})`}
                labelLine={false}
              >
                {stats.planDistribution.map((entry) => (
                  <Cell key={entry.plan} fill={PIE_COLORS[entry.plan] ?? "#94A3B8"} />
              ))}
              </Pie>
              <Legend
                formatter={(v) => <span style={{ color: "#94A3B8", fontSize: 12 }}>{v}</span>}
              />
              <Tooltip
                contentStyle={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* MRR info */}
        <div className="bg-surface border border-border rounded-xl p-5 flex flex-col justify-center gap-4">
          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
            Receita estimada
          </h2>
          <div>
            <p className="text-3xl font-bold text-accent">
              R$ {stats.mrrEstimated.toLocaleString("pt-BR")}
            </p>
            <p className="text-xs text-text-secondary mt-1">MRR estimado/mês</p>
          </div>
          <div className="flex gap-6">
            <div>
              <p className="text-lg font-semibold text-text-primary">{stats.proCount}</p>
              <p className="text-xs text-text-secondary">usuários PRO × R$49</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-text-primary">{stats.businessCount}</p>
              <p className="text-xs text-text-secondary">usuários BUSINESS × R$99</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-text-secondary">
              Total gravado: <span className="text-text-primary font-medium">{Math.round(stats.totalMinutes)}min</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
