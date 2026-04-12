import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Civenro",
  description:
    "Civenro is an independent civic transparency platform making legislation accessible to everyday people.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-8">
      <header className="space-y-3">
        <p className="text-civic-gold text-sm tracking-widest uppercase star-accent">
          About
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Making legislation accessible to everyday people.
        </h1>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Our mission</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Civenro is an independent civic transparency platform. We believe
          everyone should be able to see what Congress is doing — what bills are
          moving, how their representatives vote, and what proposed legislation
          actually means — without needing a law degree or hours of free time.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We use AI to summarize complex legislation in plain language and
          surface the information that matters most: the bills your
          representatives are voting on, the ones gaining momentum, and the ones
          that affect your daily life.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">How it works</h2>
        <ul className="text-sm text-muted-foreground leading-relaxed space-y-2 list-disc pl-5">
          <li>
            <strong className="text-foreground">Legislative data</strong> is
            sourced from{" "}
            <a
              href="https://congress.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              congress.gov
            </a>{" "}
            and the Congressional API. Bill text, vote records, and
            representative information come directly from official government
            sources.
          </li>
          <li>
            <strong className="text-foreground">AI summaries</strong> are
            generated to help you understand what bills do in plain language.
            These summaries are informational and may contain errors — always
            refer to the official bill text for authoritative information.
          </li>
          <li>
            <strong className="text-foreground">Representative lookup</strong>{" "}
            uses your address to identify your elected officials. Your address
            stays on your device and is never sent to our servers.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Nonpartisan commitment</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Civenro does not endorse candidates, political parties, or positions
          on legislation. We present legislative data and voting records as
          they are. Our goal is to inform, not to persuade.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">How it&apos;s funded</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Civenro is supported entirely by{" "}
          <Link
            href="/support"
            className="text-primary underline underline-offset-2"
          >
            reader contributions
          </Link>
          . No ads, no corporate sponsors, no paywalls. Infrastructure, data,
          and AI costs are covered by the people who use and believe in the
          platform.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Who built this</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Civenro is built and maintained by{" "}
          <a
            href="https://liamhowell.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            Liam Howell
          </a>
          , a software engineer who believes civic tools should be free, open,
          and accessible to everyone.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Get in touch</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Have feedback, found a bug, or have a question?{" "}
          <Link
            href="/contact"
            className="text-primary underline underline-offset-2"
          >
            Reach out
          </Link>
          . We&apos;d love to hear from you.
        </p>
      </section>
    </div>
  );
}
