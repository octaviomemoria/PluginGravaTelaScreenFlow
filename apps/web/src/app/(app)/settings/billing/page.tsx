import { createSupabaseServerClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { PLAN_LIMITS, PLAN_PRICES_BRL } from "@screenflow/shared"
import type { Plan } from "@screenflow/shared"
import { BillingActions } from "@/components/billing/BillingActions"
import { getUserWithUsage } from "@/server/queries"

export default async function BillingPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect("/login")

  const { user, usage } = await getUserWithUsage(authUser.id)
  if (!user) redirect("/login")

  const limits = PLAN_LIMITS[user.plan as Plan]
  const recUsed = usage?.recordingMinutesUsed ?? 0
  const trxUsed = usage?.transcriptionMinutesUsed ?? 0
  const recTotal = limits.recordingMinutesPerMonth
  const trxTotal = limits.transcriptionMinutesPerMonth

  const recPct = Math.min(100, Math.round((recUsed / recTotal) * 100))

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Plano e faturamento</h1>
        <p className="text-text-secondary text-sm mt-1">Gerencie sua assinatura e limites de uso</p>
      </div>

      {/* Current plan card */}
      <div className="bg-surface border border-border rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-lg">Plano {user.plan}</p>
            <p className="text-text-secondary text-sm">
              {user.plan === "FREE" ? "Gratuito para sempre" : "Cobrança mensal via Stripe"}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
            user.plan === "FREE" ? "bg-border text-text-secondary" :
            user.plan === "PRO" ? "bg-accent/20 text-accent" :
            "bg-purple-500/20 text-purple-400"
          }`}>
            {user.plan}
          </span>
        </div>

        {/* Usage bars */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-text-secondary">Gravação este mês</span>
              <span className="font-medium">{Math.round(recUsed)} / {recTotal} min ({Math.round(recUsed / 60 * 10) / 10}h)</span>
            </div>
            <div className="h-2 bg-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${recPct >= 90 ? "bg-red-500" : "bg-accent"}`}
                style={{ width: `${recPct}%` }}
              />
            </div>
          </div>

          {trxTotal > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-text-secondary">Transcrição este mês</span>
                <span className="font-medium">{Math.round(trxUsed)} / {trxTotal} min</span>
              </div>
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-purple-500 transition-all"
                  style={{ width: `${Math.min(100, Math.round((trxUsed / trxTotal) * 100))}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
            <Stat label="Marca d'água" value={limits.watermark ? "Sim" : "Não"} />
            <Stat label="Expiração de links" value={limits.linkExpiryDays ? `${limits.linkExpiryDays} dias` : "Nunca"} />
            <Stat label="Assentos" value={String(limits.seats)} />
          </div>
        </div>
      </div>

      {/* Upgrade cards for FREE users */}
      {user.plan === "FREE" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PricingCard
            name="Pro"
            price={`R$ ${PLAN_PRICES_BRL.PRO.monthly}`}
            features={[
              "20h de gravação/mês",
              "3h de transcrição/mês (pt-BR)",
              "Links permanentes",
              "Sem marca d'água",
              "Google Drive do cliente",
            ]}
            plan="PRO"
            highlight
          />
          <PricingCard
            name="Business"
            price={`R$ ${PLAN_PRICES_BRL.BUSINESS.monthly}`}
            features={[
              "160h de gravação/mês",
              "15h de transcrição/mês",
              "5 assentos inclusos",
              "Links permanentes",
              "Sem marca d'água",
            ]}
            plan="BUSINESS"
          />
        </div>
      )}

      <BillingActions plan={user.plan as Plan} hasStripeId={!!user.stripeCustomerId} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background rounded-lg p-3">
      <p className="text-xs text-text-secondary mb-1">{label}</p>
      <p className="font-semibold text-sm">{value}</p>
    </div>
  )
}

function PricingCard({ name, price, features, plan, highlight }: {
  name: string
  price: string
  features: string[]
  plan: string
  highlight?: boolean
}) {
  return (
    <div className={`bg-surface border rounded-xl p-5 space-y-4 ${highlight ? "border-accent" : "border-border"}`}>
      {highlight && (
        <span className="text-xs font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full">Mais popular</span>
      )}
      <div>
        <p className="font-bold text-lg">{name}</p>
        <p className="text-2xl font-bold mt-1">{price}<span className="text-sm font-normal text-text-secondary">/mês</span></p>
      </div>
      <ul className="space-y-1.5">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-text-secondary">
            <span className="text-accent">✓</span> {f}
          </li>
        ))}
      </ul>
      <form action={`/api/billing/create-checkout?plan=${plan}`} method="POST">
        <button
          type="submit"
          className={`w-full py-2 rounded-lg font-semibold text-sm transition-colors ${
            highlight ? "bg-accent hover:bg-accent-hover text-white" : "bg-border hover:bg-border/80 text-text-primary"
          }`}
        >
          Assinar {name}
        </button>
      </form>
    </div>
  )
}
