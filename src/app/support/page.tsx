import {
  getBudgetSnapshot,
  getTypicalDonationCents,
  previousMonthSpendCents,
} from "@/lib/budget";
import { totalMonthlyCostCents } from "@/lib/site-costs";
import { prisma } from "@/lib/prisma";
import { DonateForm } from "./donate-form";
import { BudgetThermometer } from "./budget-thermometer";
import Link from "next/link";

export const metadata = {
  title: "Support Govroll — Keep Civic Tools Free",
  description:
    "Govroll is supported by citizens, not lobbyists. See exactly what it costs to run each month — and chip in if you want to.",
};

export const dynamic = "force-dynamic";
export const revalidate = 300; // 5 min cache

export default async function SupportPage() {
  const [snapshot, typicalCents, donorCount, lastMonthSpend] =
    await Promise.all([
      getBudgetSnapshot(),
      getTypicalDonationCents(),
      prisma.donation.count({
        where: { moderationStatus: { in: ["APPROVED", "PENDING"] } },
      }),
      previousMonthSpendCents(),
    ]);

  const totalCostCents = totalMonthlyCostCents(
    snapshot.spendCents,
    lastMonthSpend
  );
  const funded = snapshot.incomeCents >= totalCostCents;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-10">
      {/* Hero */}
      <header className="text-center space-y-3">
        <p className="text-civic-gold text-sm tracking-widest uppercase star-accent">
          Citizen-Supported
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Govroll is supported by citizens,{" "}
          <span className="text-navy-light">not lobbyists.</span>
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          This site costs real money to run — hosting, database, AI&nbsp;APIs.
          No ads. No corporate sponsors. No paywalls. Just citizens chipping in
          to keep it free for everyone.
        </p>
      </header>

      {/* Budget thermometer */}
      <BudgetThermometer
        incomeCents={snapshot.incomeCents}
        spendCents={snapshot.spendCents}
        lastMonthSpendCents={lastMonthSpend}
        aiEnabled={snapshot.aiEnabled}
        period={snapshot.period}
      />

      {/* Context-sensitive message */}
      {funded ? (
        <p className="text-center text-sm text-muted-foreground max-w-md mx-auto">
          Govroll is funded this month — thank you! Extra contributions help me
          work on this full-time, but please don&apos;t feel obligated.
        </p>
      ) : (
        <p className="text-center text-sm text-muted-foreground max-w-md mx-auto">
          Donating is totally optional. When enough citizens chip in, AI
          features come back online for everyone — including you, for&nbsp;free.
        </p>
      )}

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
          keeping Govroll running.
        </p>
      )}

      {/* Legal disclosure */}
      <footer className="border-t pt-6 space-y-2 text-xs text-muted-foreground leading-relaxed">
        <p>
          Contributions are processed by Stripe and received by Govroll.
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
