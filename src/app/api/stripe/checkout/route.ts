import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { checkNameL1 } from "@/lib/moderation/layer1";

/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout Session for one-time or recurring contributions.
 * Layer 1 name moderation runs here (fast fail before redirecting to Stripe).
 * Layer 2 runs asynchronously after payment via the webhook.
 */

interface CheckoutBody {
  amountCents: number;
  isRecurring: boolean;
  displayMode: "ANONYMOUS" | "NAMED" | "TRIBUTE";
  displayName?: string;
  tributeName?: string;
  email?: string;
  userId?: string;
  successUrl?: string;
  cancelUrl?: string;
}

const MIN_AMOUNT_CENTS = 100; // $1
const MAX_AMOUNT_CENTS = 100_000_00; // $100,000

export async function POST(request: NextRequest) {
  try {
    const body: CheckoutBody = await request.json();
    const {
      amountCents,
      isRecurring,
      displayMode,
      displayName,
      tributeName,
      email,
      userId,
    } = body;

    // Validate amount
    if (
      !amountCents ||
      !Number.isInteger(amountCents) ||
      amountCents < MIN_AMOUNT_CENTS ||
      amountCents > MAX_AMOUNT_CENTS
    ) {
      return NextResponse.json(
        { error: `Amount must be between $${MIN_AMOUNT_CENTS / 100} and $${MAX_AMOUNT_CENTS / 100}.` },
        { status: 400 }
      );
    }

    // Validate display mode
    if (!["ANONYMOUS", "NAMED", "TRIBUTE"].includes(displayMode)) {
      return NextResponse.json(
        { error: "Invalid display mode." },
        { status: 400 }
      );
    }

    // Layer 1 name validation (fast, deterministic)
    if (displayMode === "NAMED" && displayName) {
      const check = checkNameL1(displayName);
      if (!check.ok) {
        return NextResponse.json(
          { error: check.reason, field: "displayName" },
          { status: 422 }
        );
      }
    }

    if (displayMode === "TRIBUTE" && tributeName) {
      const check = checkNameL1(tributeName);
      if (!check.ok) {
        return NextResponse.json(
          { error: check.reason, field: "tributeName" },
          { status: 422 }
        );
      }
    }

    // Require a name when the display mode expects one
    if (displayMode === "NAMED" && !displayName?.trim()) {
      return NextResponse.json(
        { error: "A display name is required.", field: "displayName" },
        { status: 422 }
      );
    }
    if (displayMode === "TRIBUTE" && !tributeName?.trim()) {
      return NextResponse.json(
        { error: "An honoree name is required.", field: "tributeName" },
        { status: 422 }
      );
    }

    const stripe = getStripe();
    const origin = request.nextUrl.origin;
    const successUrl = body.successUrl || `${origin}/support/thank-you?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = body.cancelUrl || `${origin}/support`;

    // Metadata passed through to the webhook for donation creation
    const metadata: Record<string, string> = {
      civenroDisplayMode: displayMode,
      civenroDisplayNameRaw: displayName?.trim() ?? "",
      civenroTributeNameRaw: tributeName?.trim() ?? "",
      civenroUserId: userId ?? "",
    };

    if (isRecurring) {
      // Recurring: create a price on the fly and use subscription mode
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer_email: email || undefined,
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: amountCents,
              recurring: { interval: "month" },
              product_data: {
                name: "Civenro Monthly Support",
                description: "Monthly contribution to keep Civenro running.",
              },
            },
            quantity: 1,
          },
        ],
        subscription_data: { metadata },
        metadata,
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      return NextResponse.json({ url: session.url });
    }

    // One-time payment
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email || undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: "Civenro Support",
              description: "One-time contribution to keep Civenro running.",
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: { metadata },
      metadata,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session." },
      { status: 500 }
    );
  }
}
