import { getAdminPlanStats } from "@/server/admin-queries"
import { PLAN_LIMITS, PLAN_PRICES_BRL } from "@screenflow/shared"

export default async function AdminPlansPage() {
  const { planGroups } = await getAdminPlanStats()

  const countByPlan = Object.fromEntries(planGroups.map((g) => [g.plan, g.count]))

  const plans = [
    {
      name: "FREE",
      price: "Grátis",
      color: "text-text-secondary",
      count: countByPlan["FREE"] ?? 0,
      revenue: 0,
      limits: PLAN_LIMITS.FREE,
    },
    {
      name: "PRO",
      price: `R$ ${PLAN_PRICES_BRL.PRO.monthly}/mês`,
      color: "text-accent",
      count: countByPlan["PRO"] ?? 0,
      revenue: (countByPlan["PRO"] ?? 0) * PLAN_PRICES_BRL.PRO.monthly,
      limits: PLAN_LIMITS.PRO,
    },
    {
      name: "BUSINESS",
      price: `R$ ${PLAN_PRICES_BRL.BUSINESS.monthly}/mês`,
      color: "text-yellow-400",
      count: countByPlan["BUSINESS"] ?? 0,
      revenue: (countByPlan["BUSINESS"] ?? 0) * PLAN_PRICES_BRL.BUSINESS.monthly,
      limits: PLAN_LIMITS.BUSINESS,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Planos</h1>
        <p className="text-text-secondary text-sm mt-1">Referência dos limites e distribuição de usuários por plano</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan) => (
          <div key={plan.name} className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className={`text-xl font-bold ${plan.color}`}>{plan.name}</h2>
              <span className="text-sm text-text-secondary">{plan.price}</span>
            </div>

            <div className="text-center py-3 border border-border rounded-lg">
              <p className="text-2xl font-bold text-text-primary">{plan.count}</p>
              <p className="text-xs text-text-secondary">usuários</p>
              {plan.revenue > 0 && (
                <p className="text-sm text-accent mt-1">R$ {plan.revenue.toLocaleString("pt-BR")}/mês</p>
              )}
            </div>

            <div className="space-y-2 text-sm">
              <LimitRow
                label="Gravação/mês"
                value={
                  plan.limits.recordingMinutesPerMonth
                    ? `${Math.round(plan.limits.recordingMinutesPerMonth / 60)}h`
                    : "Ilimitado"
                }
              />
              <LimitRow
                label="Transcrição/mês"
                value={
                  plan.limits.transcriptionMinutesPerMonth
                    ? `${Math.round(plan.limits.transcriptionMinutesPerMonth / 60)}h`
                    : "Ilimitado"
                }
              />
              <LimitRow
                label="Validade do link"
                value={plan.limits.linkExpiryDays ? `${plan.limits.linkExpiryDays} dias` : "Permanente"}
              />
              <LimitRow
                label="Vídeos ativos"
                value={plan.limits.maxActiveVideos ? String(plan.limits.maxActiveVideos) : "Ilimitado"}
              />
              <LimitRow
                label="Marca d'água"
                value={plan.limits.watermark ? "Sim" : "Não"}
              />
              <LimitRow
                label="Assentos"
                value={String(plan.limits.seats)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LimitRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  )
}
