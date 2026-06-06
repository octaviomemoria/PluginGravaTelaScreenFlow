import { NextResponse } from "next/server"
import { requireAuthUser, getOrCreateDbUser } from "@/server/auth"
import { getStripe } from "@/lib/stripe"

export const dynamic = "force-dynamic"

export async function POST() {
  try {
    const user = await requireAuthUser()
    const dbUser = await getOrCreateDbUser(user)

    if (!dbUser.stripeCustomerId) {
      return NextResponse.json({ error: "No Stripe customer" }, { status: 400 })
    }

    const stripe = getStripe()
    const session = await stripe.billingPortal.sessions.create({
      customer: dbUser.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
