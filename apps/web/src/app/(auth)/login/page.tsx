"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError("Email ou senha incorretos")
      setLoading(false)
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Entrar</h1>
          <p className="text-text-secondary mt-1 text-sm">Acesse sua conta ScreenFlow</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
              className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm placeholder:text-text-secondary/50 focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm placeholder:text-text-secondary/50 focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-sm text-text-secondary">
          Não tem conta?{" "}
          <Link href="/signup" className="text-accent hover:underline">
            Criar conta grátis
          </Link>
        </p>
      </div>
    </main>
  )
}
