import { cn } from "@/lib/utils"

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-surface", className)} />
  )
}

export function VideoCardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <VideoCardSkeleton key={i} />
      ))}
    </div>
  )
}
