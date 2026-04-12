import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Govroll",
  description:
    "How Govroll collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">
          Last updated: April 11, 2026
        </p>
      </header>

      <p className="text-sm text-muted-foreground leading-relaxed">
        Govroll (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;)
        operates the website at govroll.com. This Privacy Policy explains what
        information we collect, how we use it, who we share it with, and your
        rights regarding your data.
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">1. Information we collect</h2>

        <h3 className="text-sm font-semibold mt-4">
          Information you provide directly
        </h3>
        <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
          <li>
            <strong className="text-foreground">Account information:</strong>{" "}
            email address and password when you create an account, or profile
            information from Google or GitHub if you use social sign-in.
          </li>
          <li>
            <strong className="text-foreground">Display name:</strong> an
            optional username you choose for comments and discussions.
          </li>
          <li>
            <strong className="text-foreground">Comments:</strong> content you
            post in bill discussions.
          </li>
          <li>
            <strong className="text-foreground">Payment information:</strong>{" "}
            if you make a contribution, payment details are collected and
            processed by Stripe. We do not store your full card number.
          </li>
          <li>
            <strong className="text-foreground">Correspondence:</strong> emails
            you send to us at support@govroll.com or related addresses.
          </li>
        </ul>

        <h3 className="text-sm font-semibold mt-4">
          Information stored on your device only
        </h3>
        <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
          <li>
            <strong className="text-foreground">Your address:</strong> when you
            enter your address to find your representatives, it is stored in
            your browser&apos;s local storage. It is never sent to or stored on
            our servers. You can clear it at any time from your browser settings.
          </li>
        </ul>

        <h3 className="text-sm font-semibold mt-4">
          Information collected automatically
        </h3>
        <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
          <li>
            <strong className="text-foreground">Authentication cookies:</strong>{" "}
            we use essential cookies to keep you signed in. These are strictly
            necessary for the service to function and cannot be disabled.
          </li>
          <li>
            <strong className="text-foreground">Server logs:</strong> our
            hosting provider may collect standard log data (IP address, browser
            type, pages visited) for security and operational purposes.
          </li>
        </ul>

        <p className="text-sm text-muted-foreground leading-relaxed">
          We do not use analytics trackers, advertising cookies, or third-party
          tracking pixels.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">2. How we use your information</h2>
        <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
          <li>To provide and maintain the service (account access, comments, bill tracking).</li>
          <li>To process contributions and send receipts via Stripe.</li>
          <li>To moderate user-generated content (comments are reviewed by a combination of automated AI moderation and human review).</li>
          <li>To respond to support requests and correspondence.</li>
          <li>To protect against fraud, abuse, and unauthorized access.</li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We do not sell, rent, or share your personal information for
          advertising or marketing purposes.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">3. Third-party services</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We use the following third-party services that may process your data:
        </p>
        <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
          <li>
            <strong className="text-foreground">Supabase</strong> — authentication and database hosting.
          </li>
          <li>
            <strong className="text-foreground">Stripe</strong> — payment processing for contributions. Stripe&apos;s privacy policy governs payment data they collect.
          </li>
          <li>
            <strong className="text-foreground">Vercel</strong> — website hosting and infrastructure.
          </li>
          <li>
            <strong className="text-foreground">Anthropic and OpenAI</strong> — AI services used to generate bill summaries and moderate content. Comment text may be sent to these services for moderation purposes.
          </li>
          <li>
            <strong className="text-foreground">Google Civic Information API</strong> — used to look up representatives by address. When you enter your address, it is sent directly from your browser to Google&apos;s API to identify your representatives. We do not receive or store your address.
          </li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Each of these services has its own privacy policy governing how they
          handle data. We select services with strong privacy practices, but we
          encourage you to review their policies.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">4. Artificial intelligence</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We use AI to generate plain-language bill summaries and to assist with
          content moderation. AI-generated summaries are for informational
          purposes only and may contain inaccuracies. When comments are
          submitted, their text may be processed by AI services to detect
          content that violates our community guidelines. We do not use your
          personal information to train AI models.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">5. Data retention and deletion</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We retain your account data for as long as your account is active.
          You can delete your account at any time from your{" "}
          <Link href="/account" className="text-primary underline underline-offset-2">
            account settings
          </Link>
          , which permanently removes your account information and associated
          data, subject to any legal record-keeping obligations (for example,
          financial records related to contributions may be retained as required
          by law).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">6. Children&apos;s privacy</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Govroll is not directed to children under the age of 13. We do not
          knowingly collect personal information from children under 13. If you
          believe a child has provided us with personal information, please{" "}
          <Link href="/contact" className="text-primary underline underline-offset-2">
            contact us
          </Link>{" "}
          and we will promptly delete it.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">7. Your rights</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Depending on your location, you may have the right to:
        </p>
        <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
          <li>Access the personal information we hold about you.</li>
          <li>Request correction of inaccurate information.</li>
          <li>Request deletion of your personal information.</li>
          <li>Object to or restrict processing of your information.</li>
          <li>Request portability of your data.</li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">
          To exercise any of these rights, email{" "}
          <a
            href="mailto:privacy@govroll.com"
            className="text-primary underline underline-offset-2"
          >
            privacy@govroll.com
          </a>
          . We will respond within 30 days.
        </p>

        <h3 className="text-sm font-semibold mt-4">
          California residents (CCPA)
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          If you are a California resident, you have the right to know what
          personal information we collect, request its deletion, and opt out of
          the &ldquo;sale&rdquo; of personal information. We do not sell your
          personal information. To make a request, contact{" "}
          <a
            href="mailto:privacy@govroll.com"
            className="text-primary underline underline-offset-2"
          >
            privacy@govroll.com
          </a>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">8. Security</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We use industry-standard security measures to protect your data,
          including encrypted connections (HTTPS), secure authentication via
          Supabase, and PCI-compliant payment processing via Stripe. However, no
          method of transmission or storage is 100% secure, and we cannot
          guarantee absolute security.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">9. Changes to this policy</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We may update this Privacy Policy from time to time. If we make
          material changes, we will notify you by updating the date at the top
          of this page. Your continued use of Govroll after changes are posted
          constitutes acceptance of the updated policy.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">10. Contact</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          If you have questions about this Privacy Policy or our data practices,
          contact us at{" "}
          <a
            href="mailto:privacy@govroll.com"
            className="text-primary underline underline-offset-2"
          >
            privacy@govroll.com
          </a>
          .
        </p>
      </section>
    </div>
  );
}
