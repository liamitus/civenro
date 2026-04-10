import { getBudgetSnapshot, getTypicalDonationCents } from "@/lib/budget";
import { prisma } from "@/lib/prisma";
import { DonateForm } from "./donate-form";
import { BudgetThermometer } from "./budget-thermometer";
import Link from "next/link";

export const metadata = {
  title: "Support Civenro — Keep Civic Transparency Running",
  description:
    "Civenro is supported by readers, not lobbyists. Your contribution keeps AI-powered bill analysis and civic tools free for everyone.",
};

export const revalidate = 300; // 5 min cache

export default async function SupportPage() {
  const [snapshot, typicalCents, donorCount] = await Promise.all([
    getBudgetSnapshot(),
    getTypicalDonationCents(),
    prisma.donation.count({
      where: { moderationStatus: { in: ["APPROVED", "PENDING"] } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-10">
      {/* Hero */}
      <header className="text-center space-y-3">
        <p className="text-civic-gold text-sm tracking-widest uppercase star-accent">
          Reader-Supported
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Civenro is supported by readers,{" "}
          <span className="text-navy-light">not lobbyists.</span>
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Every AI summary, every vote tracker, and every civic tool on Civenro
          is funded by people like you. No ads. No corporate sponsors. No
          paywalls.
        </p>
      </header>

      {/* Budget thermometer */}
      <BudgetThermometer
        incomeCents={snapshot.incomeCents}
        spendCents={snapshot.spendCents}
        aiEnabled={snapshot.aiEnabled}
        period={snapshot.period}
      />

      {/* Donate form */}
      <DonateForm
        typicalDonationCents={typicalCents}
        donorCount={donorCount}
      />

      {/* Social proof */}
      {donorCount > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Join{" "}
          <Link
            href="/made-possible-by"
            className="text-primary underline underline-offset-2 hover:text-navy"
          >
            {donorCount.toLocaleString()} citizen{donorCount !== 1 ? "s" : ""}
          </Link>{" "}
          keeping Civenro running.
        </p>
      )}

      {/* Legal disclosure */}
      <footer className="border-t pt-6 space-y-2 text-xs text-muted-foreground leading-relaxed">
        <p>
          Contributions are processed by Stripe and received by Civenro.
          Contributions are <strong>not tax-deductible</strong> for U.S. federal
          income tax purposes.
        </p>
        <p>
          Refunds are available within 14 days for accidental or duplicate
          charges. Recurring contributions can be canceled at any time.{" "}
          <Link href="/support/terms" className="underline hover:text-foreground">
            Full terms
          </Link>
        </p>
      </footer>
    </div>
  );
}
