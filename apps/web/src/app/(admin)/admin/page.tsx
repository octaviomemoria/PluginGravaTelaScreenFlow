import { getAdminStats } from "@/server/admin-queries"
import { StatCard } from "@/components/admin/StatCard"

function formatMinutes(min: number) {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default async function AdminDashboardPage() {
  const stats = await getAdminStats()

  const chartMax = Math.max(...stats.newUsersChart.map((d) => d.count), 1)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard Admin</h1>
        <p className="text-text-secondary text-sm mt-1">Visão geral da plataforma ScreenFlow</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total de usuários" value={stats.totalUsers} />
        <StatCard title="Usuários ativos (30d)" value={stats.activeUsers} />
        <StatCard title="Total de vídeos" value={stats.totalVideos} />
        <StatCard title="Minutos gravados" value={formatMinutes(stats.totalMinutes)} />
        <StatCard
          title="MRR Estimado"
          value={`R$ ${stats.mrrEstimated.toLocaleString("pt-BR")}`}
          sub={`${stats.proCount} PRO · ${stats.businessCount} BUSINESS`}
          accent
        />
        <StatCard
          title="Plano FREE"
          value={stats.totalUsers - stats.proCount - stats.businessCount}
          sub="usuários sem plano pago"
        />
      </div>

      <div className="bg-surface border border-border rounded-xl p-5">
        <h2 className="text-sm font-medium text-text-secondary mb-4 uppercase tracking-wider">
          Novos usuários — últimos 7 dias
        </h2>
        {stats.newUsersChart.length === 0 ? (
          <p className="text-text-secondary text-sm">Sem dados no período.</p>
        ) : (
          <div className="flex items-end gap-2 h-24">
            {stats.newUsersChart.map((d) => (
              <div key={d.day} className="flex flex-col items-center gap-1 flex-1">
                <span className="text-xs text-text-secondary">{d.count}</span>
                <div
                  className="w-full bg-accent rounded-t"
                  style={{ height: `${Math.max((d.count / chartMax) * 64, 4)}px` }}
                />
                <span className="text-xs text-text-secondary">
                  {new Date(d.day).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.planDistribution.map((p) => (
          <div key={p.plan} className="bg-surface border border-border rounded-xl p-4 text-center">
            <p className="text-lg font-bold text-text-primary">{p.count}</p>
            <p className="text-xs text-text-secondary uppercase tracking-wider mt-1">{p.plan}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
