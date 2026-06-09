import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  sub?: string
  accent?: boolean
}

export function StatCard({ title, value, sub, accent }: StatCardProps) {
  return (
    <div className={cn(
      "bg-surface border border-border rounded-xl p-5",
      accent && "border-accent/30"
    )}>
      <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">{title}</p>
      <p className={cn("text-2xl font-bold", accent ? "text-accent" : "text-text-primary")}>
        {value}
      </p>
      {sub && <p className="text-xs text-text-secondary mt-1">{sub}</p>}
    </div>
  )
}
