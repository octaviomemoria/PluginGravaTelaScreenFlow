import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  const envCheck = {
    DATABASE_URL: process.env.DATABASE_URL ? `SET (${process.env.DATABASE_URL.substring(0, 55)}...)` : "MISSING",
    DIRECT_URL: process.env.DIRECT_URL ? `SET (${process.env.DIRECT_URL.substring(0, 55)}...)` : "MISSING",
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "MISSING",
    SUPABASE_ANON: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "MISSING",
    NODE_ENV: process.env.NODE_ENV,
  }

  let dbTest: unknown = null
  try {
    const count = await prisma.user.count()
    dbTest = { ok: true, userCount: count }
  } catch (err) {
    dbTest = { ok: false, error: String(err) }
  }

  return NextResponse.json({ env: envCheck, db: dbTest })
}
