import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

function validSession(value: string | undefined) {
  const secret = process.env.AUTH_SECRET;
  if (!value || !secret || secret.length < 32) return false;
  const [payload, supplied, extra] = value.split(".");
  if (!payload || !supplied || extra) return false;
  try {
    const expected = createHmac("sha256", secret).update(payload).digest("base64url");
    const actualBytes = Buffer.from(supplied);
    const expectedBytes = Buffer.from(expected);
    if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) return false;
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { org?: string; exp?: number; sub?: string };
    return Boolean(decoded.sub && decoded.org === (process.env.APP_ORG_ID || "veyra-local-workspace") && decoded.exp && decoded.exp > Math.floor(Date.now() / 1000));
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  if (validSession(request.cookies.get("veyra_session")?.value)) return NextResponse.next();
  const target = new URL("/login", request.url);
  target.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(target);
}

export const config = {
  matcher: ["/app/:path*"]
};