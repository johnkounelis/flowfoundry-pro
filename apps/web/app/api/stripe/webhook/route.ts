import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";
// import { prisma } from "@flowfoundry/db";
import { readEnv } from "@flowfoundry/config";

export async function POST(req: NextRequest) {
  const env = readEnv();
  if (env.STRIPE_MOCK === "1") return NextResponse.json({ mocked: true }, { status: 200 });

  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

  try {
    const evt = stripe.webhooks.constructEvent(raw, sig!, env.STRIPE_WEBHOOK_SECRET!);
    if (evt.type === "invoice.paid") {
      // update subscription
    } else if (evt.type === "customer.subscription.updated") {
      // sync plan
    } else if (evt.type === "customer.subscription.deleted") {
      // mark canceled
    }
  } catch (e: any) {
    console.error("Stripe webhook error", e.message);
    return NextResponse.json({ error: "invalid-signature" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
