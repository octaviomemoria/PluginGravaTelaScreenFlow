"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

interface AccountInfo {
  email: string
  name: string | null
  plan: string
  googleDriveConnected: boolean
}

export default function AccountPage() {
  const searchParams = useSearchParams()
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  useEffect(() => {
    fetch("/api/me/limits")
      .then((r) => r.json())
      .then((data: { plan: string; googleDriveConnected: boolean }) => {
        setAccount({
          email: "",
          name: null,
          plan: data.plan,
          googleDriveConnected: data.googleDriveConnected,
        })
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const drive = searchParams.get("drive")
    if (drive === "connected") setMessage({ text: "Google Drive conectado com sucesso!", ok: true })
    if (drive === "error") setMessage({ text: "Erro ao conectar o Google Drive. Tente novamente.", ok: false })
  }, [searchParams])

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await fetch("/api/auth/google/disconnect", { method: "POST" })
      setAccount((prev) => prev ? { ...prev, googleDriveConnected: false } : null)
      setMessage({ text: "Google Drive desconectado.", ok: true })
    } catch {
      setMessage({ text: "Erro ao desconectar.", ok: false })
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Conta</h1>
        <p className="text-text-secondary text-sm mt-1">Gerencie suas integrações e preferências</p>
      </div>

      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm ${message.ok ? "bg-green-500/10 border border-green-500/30 text-green-300" : "bg-red-500/10 border border-red-500/30 text-red-300"}`}>
          {message.text}
        </div>
      )}

      {/* Google Drive integration */}
      <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-xl">
            📁
          </div>
          <div>
            <p className="font-semibold">Google Drive</p>
            <p className="text-text-secondary text-sm">Seus vídeos são salvos diretamente no seu Drive</p>
          </div>
        </div>

        {account === null ? (
          <div className="h-10 bg-border rounded-lg animate-pulse" />
        ) : account.googleDriveConnected ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-green-400">
              <span>●</span>
              <span>Conectado</span>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
            >
              {disconnecting ? "Desconectando..." : "Desconectar"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">
              Conecte seu Google Drive para armazenar gravações. O ScreenFlow só acessa arquivos que ele mesmo criou.
            </p>
            <a
              href="/api/auth/google/connect"
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Conectar Google Drive
            </a>
          </div>
        )}
      </div>

      {/* Plan info */}
      {account && (
        <div className="bg-surface border border-border rounded-xl p-6">
          <p className="text-sm text-text-secondary">Plano atual</p>
          <p className="font-bold text-lg mt-1">{account.plan}</p>
          <a href="/settings/billing" className="text-accent text-sm hover:underline mt-2 inline-block">
            Gerenciar assinatura →
          </a>
        </div>
      )}
    </div>
  )
}
