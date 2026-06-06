"use client"

interface BillingActionsProps {
  plan: string
  hasStripeId: boolean
}

export function BillingActions({ plan, hasStripeId }: BillingActionsProps) {
  async function handlePortal() {
    const res = await fetch("/api/billing/portal", { method: "POST" })
    const { url } = await res.json()
    if (url) window.location.href = url
  }

  if (plan === "FREE" || !hasStripeId) return null

  return (
    <div className="border-t border-border pt-6">
      <p className="text-sm text-text-secondary mb-3">Gerencie sua assinatura, histórico de pagamentos ou cancele a qualquer momento.</p>
      <button
        onClick={handlePortal}
        className="px-4 py-2 bg-surface border border-border text-sm font-medium rounded-lg hover:bg-border transition-colors"
      >
        Gerenciar assinatura
      </button>
    </div>
  )
}
