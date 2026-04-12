import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact — Civenro",
  description:
    "Report a bug, send feedback, or get in touch with the Civenro team.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-8">
      <header className="space-y-3">
        <p className="text-civic-gold text-sm tracking-widest uppercase star-accent">
          Contact
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Get in touch</h1>
        <p className="text-muted-foreground">
          Found a bug, have feedback, or just want to say hello? We&apos;d love
          to hear from you.
        </p>
      </header>

      <div className="grid gap-6">
        <section className="rounded-lg border p-5 space-y-2">
          <h2 className="font-semibold">Report a bug or inaccuracy</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If something isn&apos;t working right or you&apos;ve spotted an
            inaccurate AI summary, bill status, or voting record, let us know.
            Include as much detail as you can — the bill, what looked wrong, and
            what you expected.
          </p>
          <p className="text-sm">
            <a
              href="mailto:support@civenro.com?subject=Bug Report"
              className="text-primary underline underline-offset-2"
            >
              support@civenro.com
            </a>
          </p>
        </section>

        <section className="rounded-lg border p-5 space-y-2">
          <h2 className="font-semibold">General feedback</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Feature ideas, usability feedback, or thoughts on how Civenro can
            better serve you — all welcome.
          </p>
          <p className="text-sm">
            <a
              href="mailto:feedback@civenro.com?subject=Feedback"
              className="text-primary underline underline-offset-2"
            >
              feedback@civenro.com
            </a>
          </p>
        </section>

        <section className="rounded-lg border p-5 space-y-2">
          <h2 className="font-semibold">Account &amp; billing</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Questions about your account, contributions, refunds, or recurring
            billing? We typically respond within one business day.
          </p>
          <p className="text-sm">
            <a
              href="mailto:support@civenro.com?subject=Account Question"
              className="text-primary underline underline-offset-2"
            >
              support@civenro.com
            </a>
          </p>
        </section>

        <section className="rounded-lg border p-5 space-y-2">
          <h2 className="font-semibold">Privacy &amp; data requests</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            To exercise your data rights — access, correction, or deletion — or
            to ask a question about our{" "}
            <Link
              href="/privacy"
              className="text-primary underline underline-offset-2"
            >
              privacy practices
            </Link>
            :
          </p>
          <p className="text-sm">
            <a
              href="mailto:privacy@civenro.com?subject=Privacy Request"
              className="text-primary underline underline-offset-2"
            >
              privacy@civenro.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
