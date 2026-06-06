import { NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import type { Plan } from "@screenflow/shared"
import type Stripe from "stripe"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")!

  const stripe = getStripe()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const plan = session.metadata?.plan as Plan | undefined

        if (userId && plan && session.customer) {
          await prisma.user.update({
            where: { id: userId },
            data: { plan, stripeCustomerId: session.customer as string },
          })
        }
        break
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId
        const plan = sub.metadata?.plan as Plan | undefined

        if (userId && plan) {
          await prisma.user.update({ where: { id: userId }, data: { plan } })
        }
        break
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { plan: "FREE" },
        })
        break
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err)
    return NextResponse.json({ error: "Handler failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
