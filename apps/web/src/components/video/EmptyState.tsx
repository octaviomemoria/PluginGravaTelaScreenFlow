export function EmptyState({ search }: { search?: string }) {
  if (search) {
    return (
      <div className="text-center py-20 text-text-secondary">
        <p className="text-lg">Nenhum vídeo encontrado para "{search}"</p>
        <p className="text-sm mt-1">Tente outra busca</p>
      </div>
    )
  }

  return (
    <div className="text-center py-20 space-y-4">
      <div className="w-16 h-16 bg-surface border border-border rounded-full flex items-center justify-center mx-auto">
        <span className="text-3xl">🎬</span>
      </div>
      <div>
        <p className="text-lg font-medium">Nenhum vídeo ainda</p>
        <p className="text-text-secondary text-sm mt-1">
          Instale a extensão Chrome e grave sua primeira tela
        </p>
      </div>
    </div>
  )
}
