import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { HttpError } from "@/lib/errors";

export const SESSION_COOKIE = "veyra_session";
const SESSION_SECONDS = 8 * 60 * 60;
export type Principal = { orgId: string; subject: string; role: "owner"; via: "session" | "api_key" };

function orgId() {
  return process.env.APP_ORG_ID || "veyra-local-workspace";
}

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new HttpError(503, "AUTH_NOT_CONFIGURED", "Authentication is unavailable until AUTH_SECRET is configured.");
  return value;
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(subject = "local-owner") {
  const payload = Buffer.from(JSON.stringify({
    sub: subject,
    org: orgId(),
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS
  })).toString("base64url");
  return payload + "." + signature(payload);
}

export function verifySessionToken(token: string | undefined | null): Principal | null {
  if (!token) return null;
  const [payload, supplied, extra] = token.split(".");
  if (!payload || !supplied || extra) return null;
  try {
    if (!safeEqual(signature(payload), supplied)) return null;
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: string; org?: string; exp?: number };
    if (!decoded.sub || decoded.org !== orgId() || !decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return { orgId: decoded.org, subject: decoded.sub, role: "owner", via: "session" };
  } catch {
    return null;
  }
}

export function principalFromRequest(request: Request): Principal | null {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookieValue = cookieHeader.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(SESSION_COOKIE + "="))?.slice(SESSION_COOKIE.length + 1);
  const session = verifySessionToken(cookieValue ? decodeURIComponent(cookieValue) : null);
  if (session) return session;
  const configuredKey = process.env.VYERA_API_KEY;
  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (configuredKey && bearer && safeEqual(configuredKey, bearer)) {
    return { orgId: orgId(), subject: "api-credential", role: "owner", via: "api_key" };
  }
  return null;
}

export async function requirePageSession() {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

export function loginPasswordMatches(value: unknown) {
  const expected = process.env.APP_LOGIN_PASSWORD || "";
  if (typeof value !== "string" || !expected) return false;
  return safeEqual(expected, value);
}

export function sessionCookie(token: string, secure: boolean) {
  return SESSION_COOKIE + "=" + encodeURIComponent(token) + "; Path=/; HttpOnly; SameSite=Strict; Max-Age=" + SESSION_SECONDS + (secure ? "; Secure" : "");
}

export function clearSessionCookie(secure: boolean) {
  return SESSION_COOKIE + "=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0" + (secure ? "; Secure" : "");
}

export function requirePrincipal(request: Request) {
  const principal = principalFromRequest(request);
  if (!principal) throw new HttpError(401, "UNAUTHENTICATED", "Sign in or provide a scoped API credential.");
  return principal;
}