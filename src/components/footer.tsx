import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-navy/10 bg-civic-cream/50">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <Link href="/about" className="hover:text-foreground transition-colors">
              About
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">
              Contact
            </Link>
            <Link href="/support" className="hover:text-foreground transition-colors">
              Support Civenro
            </Link>
          </nav>

          <p className="text-xs text-muted-foreground/70">
            &copy; {new Date().getFullYear()} Civenro &middot; Built by{" "}
            <a
              href="https://liamhowell.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Liam Howell
            </a>
          </p>
        </div>

        <p className="mt-4 text-center text-[10px] text-muted-foreground/50 leading-relaxed">
          Legislative data sourced from{" "}
          <a
            href="https://congress.gov"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-muted-foreground/70"
          >
            congress.gov
          </a>
          . Civenro is not affiliated with or endorsed by the U.S. government.
        </p>
      </div>
    </footer>
  );
}
