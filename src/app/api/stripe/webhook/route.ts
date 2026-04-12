import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { recordIncome } from "@/lib/budget";
import { invalidateAiGateCache } from "@/lib/ai-gate";
import { moderateName } from "@/lib/moderation/pipeline";
import { randomBytes } from "crypto";

/**
 * POST /api/stripe/webhook
 *
 * Single entry point for all Stripe webhook events. Handles:
 *   - checkout.session.completed  → create Donation row, run moderation, update budget
 *   - invoice.payment_succeeded   → recurring renewal income
 *   - customer.subscription.deleted → mark recurring as canceled
 *   - invoice.payment_failed      → start grace period
 */

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const sig = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "invoice.payment_succeeded":
        await handleInvoiceSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_failed":
        await handleInvoiceFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        // Unhandled event type — ack it so Stripe doesn't retry
        break;
    }
  } catch (err) {
    console.error(`Webhook handler error (${event.type}):`, err);
    return NextResponse.json(
      { error: "Webhook handler failed." },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

// ── Event handlers ─────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const meta = session.metadata ?? {};
  const displayMode = (meta.govrollDisplayMode || "ANONYMOUS") as
    | "ANONYMOUS"
    | "NAMED"
    | "TRIBUTE";
  const displayNameRaw = meta.govrollDisplayNameRaw || null;
  const tributeNameRaw = meta.govrollTributeNameRaw || null;
  const userId = meta.govrollUserId || null;

  const isRecurring = session.mode === "subscription";
  const amountCents = session.amount_total ?? 0;

  // Dedupe — Stripe can send the same event twice
  const stripePaymentId = isRecurring
    ? (session.subscription as string)
    : (session.payment_intent as string);

  if (!stripePaymentId) {
    console.error("No payment/subscription ID in checkout session");
    return;
  }

  const existing = await prisma.donation.findUnique({
    where: { stripePaymentId },
  });
  if (existing) return; // Already processed

  // Get IP from the session for rate limiting (if available via metadata — Stripe doesn't expose client IP directly)
  // For now, moderation runs without IP-based rate limiting on the webhook path
  const ip = undefined;

  // Run moderation on display name
  const nameMod = await moderateName(
    displayMode === "NAMED" ? displayNameRaw : null,
    ip
  );

  // Run moderation on tribute name separately
  const tributeMod = await moderateName(
    displayMode === "TRIBUTE" ? tributeNameRaw : null,
    ip
  );

  // Use the worse moderation status between the two
  const finalStatus =
    nameMod.status === "REJECTED" || tributeMod.status === "REJECTED"
      ? "REJECTED"
      : nameMod.status === "FLAGGED" || tributeMod.status === "FLAGGED"
        ? "FLAGGED"
        : "APPROVED";

  const notes = [nameMod.notes, tributeMod.notes].filter(Boolean).join("; ") || null;

  // Extract region from billing address if available
  const regionCode = session.customer_details?.address?.state
    ? `US-${session.customer_details.address.state}`
    : null;

  const donation = await prisma.donation.create({
    data: {
      stripePaymentId,
      stripeCustomerId: (session.customer as string) ?? null,
      userId: userId || null,
      amountCents,
      currency: session.currency ?? "usd",
      isRecurring,
      recurringStatus: isRecurring ? "ACTIVE" : null,
      displayMode,
      displayName: finalStatus === "APPROVED" ? (nameMod.displayName ?? null) : null,
      displayNameRaw,
      tributeName: finalStatus === "APPROVED" ? (tributeMod.displayName ?? null) : null,
      tributeNameRaw,
      moderationStatus: finalStatus,
      moderationNotes: notes,
      regionCode,
      email: session.customer_details?.email ?? null,
    },
  });

  // Create a link token so the donor can attach this to their account later
  if (!userId && donation.email) {
    await prisma.donorLinkToken.create({
      data: {
        donationId: donation.id,
        token: randomBytes(32).toString("hex"),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });
    // TODO: send email with link token (Phase 6)
  }

  // Record income to the budget ledger
  await recordIncome(amountCents);
  invalidateAiGateCache();
}

function getSubscriptionId(invoice: Stripe.Invoice): string | null {
  const sub = invoice.parent?.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}

async function handleInvoiceSucceeded(invoice: Stripe.Invoice) {
  // Recurring payment renewal — record income but don't create a new Donation row
  // (the original subscription Donation is the canonical record)
  const amountCents = invoice.amount_paid ?? 0;
  if (amountCents <= 0) return;

  // Update the recurring donation's status if it was in grace
  const subscriptionId = getSubscriptionId(invoice);
  if (subscriptionId) {
    await prisma.donation.updateMany({
      where: {
        stripePaymentId: subscriptionId,
        recurringStatus: { in: ["GRACE", "LAPSED"] },
      },
      data: { recurringStatus: "ACTIVE" },
    });
  }

  await recordIncome(amountCents);
  invalidateAiGateCache();
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await prisma.donation.updateMany({
    where: { stripePaymentId: subscription.id },
    data: { recurringStatus: "CANCELED" },
  });
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  // Start grace period — Stripe's smart retries will attempt recovery for ~2 weeks.
  // Don't immediately strip Sustainer status.
  const subscriptionId = getSubscriptionId(invoice);
  if (!subscriptionId) return;

  await prisma.donation.updateMany({
    where: {
      stripePaymentId: subscriptionId,
      recurringStatus: "ACTIVE",
    },
    data: { recurringStatus: "GRACE" },
  });
}
