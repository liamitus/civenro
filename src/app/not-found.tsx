import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-20 text-center">
      <p className="text-civic-gold star-accent text-sm tracking-widest uppercase">
        Page Not Found
      </p>
      <h1 className="text-3xl font-bold tracking-tight">404</h1>
      <p className="text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex justify-center gap-4 pt-4">
        <Link
          href="/"
          className="bg-navy hover:bg-navy-light inline-flex items-center rounded-md px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          Go home
        </Link>
        <Link
          href="/bills"
          className="border-navy/20 hover:bg-muted inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium transition-colors"
        >
          Browse bills
        </Link>
      </div>
    </div>
  );
}
