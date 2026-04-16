import { NextResponse, type NextRequest } from "next/server";
import { isPreviewEnv, isWriteMethod } from "@/lib/preview-guard";

export function middleware(request: NextRequest) {
  if (isPreviewEnv() && isWriteMethod(request.method)) {
    return NextResponse.json(
      {
        error:
          "Write operations are disabled on Vercel Preview deployments to protect production data.",
      },
      { status: 503 }
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
