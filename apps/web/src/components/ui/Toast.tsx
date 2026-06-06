"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

type ToastType = "success" | "error" | "info"

interface ToastData {
  id: string
  message: string
  type: ToastType
}

let addToast: ((msg: string, type?: ToastType) => void) | null = null

export function toast(msg: string, type: ToastType = "success") {
  addToast?.(msg, type)
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  useEffect(() => {
    addToast = (msg, type = "success") => {
      const id = Math.random().toString(36).slice(2)
      setToasts((prev) => [...prev, { id, message: msg, type }])
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500)
    }
    return () => { addToast = null }
  }, [])

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-in slide-in-from-right-4",
            t.type === "success" && "bg-accent text-white",
            t.type === "error" && "bg-red-500 text-white",
            t.type === "info" && "bg-surface border border-border text-text-primary"
          )}
        >
          {t.type === "success" && "✓"}
          {t.type === "error" && "✕"}
          {t.type === "info" && "ℹ"}
          {t.message}
        </div>
      ))}
    </div>
  )
}
