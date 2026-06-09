import Link from "next/link"

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-3xl w-full text-center space-y-8">
        <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-1.5 rounded-full text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          Novo — grave sua tela em segundos
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
          Grave. Compartilhe.{" "}
          <span className="text-accent">Sem complicação.</span>
        </h1>

        <p className="text-lg text-text-secondary max-w-xl mx-auto">
          Extensão Chrome para gravar sua tela e câmera. Um link compartilhável em segundos.
          Sem reuniões, sem emails longos.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="px-8 py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors"
          >
            Começar grátis
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 bg-surface border border-border text-text-primary font-semibold rounded-lg hover:bg-border transition-colors"
          >
            Já tenho conta
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-6 pt-8 text-sm text-text-secondary">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-text-primary">4h</div>
            <div>grátis por mês</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-text-primary">30h</div>
            <div>no plano Pro</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-text-primary">120h</div>
            <div>no plano Business</div>
          </div>
        </div>
      </div>
    </main>
  )
}
