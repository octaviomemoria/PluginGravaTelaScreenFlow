import { NextResponse } from "next/server"
import { requireAuthUser, getOrCreateDbUser } from "@/server/auth"
import { getStripe, STRIPE_PLANS } from "@/lib/stripe"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const user = await requireAuthUser()
    const dbUser = await getOrCreateDbUser(user)

    const { searchParams } = new URL(request.url)
    const plan = searchParams.get("plan") as keyof typeof STRIPE_PLANS | null

    if (!plan || !STRIPE_PLANS[plan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
    }

    const stripe = getStripe()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL!

    const session = await stripe.checkout.sessions.create({
      ...(dbUser.stripeCustomerId ? { customer: dbUser.stripeCustomerId } : { customer_email: dbUser.email }),
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: STRIPE_PLANS[plan], quantity: 1 }],
      success_url: `${appUrl}/settings/billing?success=true`,
      cancel_url: `${appUrl}/settings/billing`,
      metadata: { userId: dbUser.id, plan },
      subscription_data: { metadata: { userId: dbUser.id, plan } },
    })

    return NextResponse.redirect(session.url!, 303)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 })
  }
}
