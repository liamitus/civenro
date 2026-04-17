import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock all downstream dependencies so we can exercise the handler's
// signature/early-return paths without touching Stripe, Prisma, or moderation.
const constructEventMock = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: { constructEvent: constructEventMock },
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    donation: { findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    profile: { upsert: vi.fn() },
    donorLinkToken: { create: vi.fn() },
  },
}));

vi.mock("@/lib/budget", () => ({ recordIncome: vi.fn() }));
vi.mock("@/lib/ai-gate", () => ({ invalidateAiGateCache: vi.fn() }));
vi.mock("@/lib/moderation/pipeline", () => ({ moderateName: vi.fn() }));
vi.mock("@/lib/error-reporting", () => ({ reportError: vi.fn() }));

// Must import AFTER vi.mock calls so mocks are applied.
const { POST } = await import("./route");

function makeRequest(body: string, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: new Headers(headers),
    body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
});

describe("POST /api/stripe/webhook", () => {
  it("returns 400 when stripe-signature header is missing", async () => {
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/signature/i);
  });

  it("returns 400 when STRIPE_WEBHOOK_SECRET is not configured", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const res = await POST(
      makeRequest("{}", { "stripe-signature": "t=1,v1=fake" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when signature verification throws", async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error("Invalid signature");
    });
    const res = await POST(
      makeRequest("{}", { "stripe-signature": "t=1,v1=bad" }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid signature/i);
  });

  it("acks unhandled event types with 200 { received: true }", async () => {
    constructEventMock.mockReturnValue({
      type: "payment_intent.created",
      data: { object: {} },
    });
    const res = await POST(
      makeRequest("{}", { "stripe-signature": "t=1,v1=ok" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });
});
