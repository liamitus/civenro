"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report to error alerting endpoint (fire-and-forget)
    fetch("/api/errors/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        stack: error.stack,
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-white">
        <div className="max-w-md px-4 text-center space-y-6">
          <p className="text-sm tracking-widest uppercase" style={{ color: "#B8860B" }}>
            Something Went Wrong
          </p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#0A1F44" }}>
            Unexpected Error
          </h1>
          <p className="text-gray-500">
            We hit an unexpected problem. Please try again, or head back to the homepage.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <button
              onClick={reset}
              className="inline-flex items-center rounded-md px-4 py-2 text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: "#0A1F44" }}
            >
              Try again
            </button>
            <a
              href="/"
              className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium transition-colors"
              style={{ borderColor: "rgba(10,31,68,0.2)" }}
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
