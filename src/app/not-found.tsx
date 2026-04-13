import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-6">
      <p className="text-civic-gold text-sm tracking-widest uppercase star-accent">
        Page Not Found
      </p>
      <h1 className="text-3xl font-bold tracking-tight">
        404
      </h1>
      <p className="text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex justify-center gap-4 pt-4">
        <Link
          href="/"
          className="inline-flex items-center rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light transition-colors"
        >
          Go home
        </Link>
        <Link
          href="/bills"
          className="inline-flex items-center rounded-md border border-navy/20 px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          Browse bills
        </Link>
      </div>
    </div>
  );
}
