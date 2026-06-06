import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ToastProvider } from "@/components/ui/Toast"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ScreenFlow — Grave e compartilhe sua tela",
  description: "Grave sua tela em segundos e compartilhe via link. Sem reuniões, sem complicação.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-background text-text-primary antialiased`}>
        {children}
        <ToastProvider />
      </body>
    </html>
  )
}
