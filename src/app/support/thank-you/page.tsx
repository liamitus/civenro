import Link from "next/link";

export const metadata = {
  title: "Thank You — Govroll",
};

export default function ThankYouPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center space-y-6">
      <p className="text-civic-gold text-sm tracking-widest uppercase star-accent">
        Thank You
      </p>
      <h1 className="text-3xl font-bold tracking-tight">
        You&apos;re keeping civic transparency alive.
      </h1>
      <p className="text-muted-foreground">
        Your contribution goes directly to powering Govroll&apos;s AI tools,
        data infrastructure, and the mission of making legislation accessible to
        everyone. A receipt has been sent to your email.
      </p>
      <div className="flex justify-center gap-3 pt-2">
        <Link
          href="/made-possible-by"
          className="text-sm text-primary underline underline-offset-2 hover:text-navy"
        >
          See who makes Govroll possible
        </Link>
        <span className="text-muted-foreground">|</span>
        <Link
          href="/bills"
          className="text-sm text-primary underline underline-offset-2 hover:text-navy"
        >
          Back to bills
        </Link>
      </div>
    </div>
  );
}
