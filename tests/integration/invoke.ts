/**
 * Call a Next.js route module directly with a Request. Bypasses the Next
 * runtime entirely — we're testing the handler logic and its DB/HTTP
 * side effects, not Next routing.
 */
type Handler = (req: Request) => Promise<Response>;

export interface InvokeOpts {
  auth?: string | null;
  search?: Record<string, string | number>;
  pathname?: string;
  method?: "GET" | "POST";
}

export async function invokeCron(
  handler: Handler,
  opts: InvokeOpts = {},
): Promise<Response> {
  const pathname = opts.pathname ?? "/api/cron/test";
  const url = new URL(`http://localhost${pathname}`);
  if (opts.search) {
    for (const [k, v] of Object.entries(opts.search)) {
      url.searchParams.set(k, String(v));
    }
  }

  const headers = new Headers();
  const cronSecret = process.env.CRON_SECRET ?? "test-cron-secret";
  const authHeader =
    opts.auth === null
      ? null
      : opts.auth === undefined
        ? `Bearer ${cronSecret}`
        : opts.auth;
  if (authHeader) headers.set("authorization", authHeader);

  const req = new Request(url, {
    method: opts.method ?? "GET",
    headers,
  });
  return handler(req);
}
