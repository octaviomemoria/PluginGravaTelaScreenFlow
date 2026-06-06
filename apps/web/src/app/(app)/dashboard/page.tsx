import { createSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getUserVideos, getUserWithUsage } from "@/server/queries"
import { getOrCreateDbUser } from "@/server/auth"
import { PLAN_LIMITS } from "@screenflow/shared"
import type { Plan } from "@screenflow/shared"
import { VideoCard } from "@/components/video/VideoCard"
import { EmptyState } from "@/components/video/EmptyState"
import Link from "next/link"

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function DashboardPage({ searchParams }: Props) {
  const { q } = await searchParams
  const supabase = await createSupabaseServerClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect("/login")

  await getOrCreateDbUser(authUser)

  const [videos, { user, usage }] = await Promise.all([
    getUserVideos(authUser.id, q),
    getUserWithUsage(authUser.id),
  ])

  const limits = user ? PLAN_LIMITS[user.plan as Plan] : null
  const recUsed = usage?.recordingMinutesUsed ?? 0
  const recTotal = limits?.recordingMinutesPerMonth ?? 120
  const recPct = Math.min(100, Math.round((recUsed / recTotal) * 100))
  const driveConnected = user?.googleDriveConnected ?? false

  return (
    <div className="space-y-6">
      {/* Drive warning */}
      {!driveConnected && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-sm">
          <span className="text-amber-400">⚠</span>
          <span className="text-amber-200 flex-1">Conecte seu Google Drive para começar a gravar.</span>
          <Link href="/settings/account" className="text-amber-400 font-semibold hover:underline whitespace-nowrap">
            Conectar Drive →
          </Link>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Meus vídeos</h1>
          {limits && (
            <div className="flex items-center gap-3 mt-1">
              <div className="h-1.5 w-32 bg-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${recPct >= 90 ? "bg-red-500" : "bg-accent"}`}
                  style={{ width: `${recPct}%` }}
                />
              </div>
              <span className="text-xs text-text-secondary">
                {Math.round(recUsed)}/{recTotal} min gravados este mês
              </span>
            </div>
          )}
        </div>
        <form className="flex-1 max-w-xs">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar vídeos..."
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm placeholder:text-text-secondary/50 focus:outline-none focus:border-accent transition-colors"
          />
        </form>
      </div>

      {videos.length === 0 ? (
        <EmptyState {...(q ? { search: q } : {})} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  )
}
