"use client"

import { useEffect } from "react"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
      <div className="text-4xl">⚠️</div>
      <h2 className="text-lg font-semibold">Erro ao carregar o dashboard</h2>
      <p className="text-text-secondary text-sm max-w-sm">
        Não foi possível conectar ao banco de dados. Tente novamente em instantes.
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  )
}
