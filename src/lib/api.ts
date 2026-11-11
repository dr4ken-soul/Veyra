import { randomUUID } from "node:crypto";
import { HttpError } from "@/lib/errors";

export function responseJson(requestId: string, body: Record<string, unknown>, status = 200, headers?: HeadersInit) {
  const merged = new Headers(headers);
  merged.set("Cache-Control", "no-store");
  merged.set("X-Request-Id", requestId);
  return Response.json({ requestId, ...body }, { status, headers: merged });
}

export function newRequestId() {
  return randomUUID();
}

export async function readJson(request: Request, limitBytes = 16_384): Promise<Record<string, unknown>> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > limitBytes) throw new HttpError(413, "BODY_TOO_LARGE", "The request body is too large.");
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > limitBytes) throw new HttpError(413, "BODY_TOO_LARGE", "The request body is too large.");
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new HttpError(400, "INVALID_JSON", "The request body must be valid JSON."); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new HttpError(400, "INVALID_BODY", "The request body must be a JSON object.");
  return parsed as Record<string, unknown>;
}

export function errorResponse(error: unknown, requestId: string) {
  if (error instanceof HttpError) {
    return responseJson(requestId, { error: { code: error.code, message: error.message, retryable: error.retryable } }, error.status);
  }
  return responseJson(requestId, { error: { code: "INTERNAL_ERROR", message: "The request could not be completed.", retryable: false } }, 500);
}

type Bucket = { count: number; expiresAt: number };
const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, limit = 60, windowMs = 60_000) {
  const now = Date.now();
  if (buckets.size > 1_000) {
    for (const [item, bucket] of buckets) if (bucket.expiresAt <= now) buckets.delete(item);
  }
  const current = buckets.get(key);
  if (!current || current.expiresAt <= now) {
    buckets.set(key, { count: 1, expiresAt: now + windowMs });
    return;
  }
  current.count += 1;
  if (current.count > limit) throw new HttpError(429, "RATE_LIMITED", "Too many requests. Wait a moment and try again.", true);
}

export function verifyBrowserOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) throw new HttpError(403, "ORIGIN_REQUIRED", "The request origin could not be verified.");
  let expected: string;
  let actual: string;
  try {
    actual = new URL(origin).origin;
    const url = new URL(request.url);
    const forwardedHost = request.headers.get("x-forwarded-host");
    const host = (forwardedHost || request.headers.get("host") || url.host).split(",")[0].trim();
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const protocol = (forwardedProto || url.protocol.replace(":", "")).split(",")[0].trim().toLowerCase();
    if (protocol !== "http" && protocol !== "https") throw new Error("Unsupported protocol");
    expected = new URL(protocol + "://" + host).origin;
  } catch {
    throw new HttpError(403, "ORIGIN_INVALID", "The request origin could not be verified.");
  }
  if (actual !== expected) throw new HttpError(403, "ORIGIN_MISMATCH", "The request origin could not be verified.");
}