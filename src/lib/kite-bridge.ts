import "server-only";
import { HttpError } from "@/lib/errors";
import type { PassportSessionRecord } from "@/lib/store";
import type { SirenicQuote } from "@/lib/sirenic";

function config() {
  if (process.env.PASSPORT_LIVE_ENABLED !== "true") throw new HttpError(503, "PASSPORT_DISABLED", "Passport live payments are disabled. Set up the Kite worker and verify its session-only controls before enabling them.");
  if (process.env.PASSPORT_SESSION_ONLY_VERIFIED !== "true") throw new HttpError(503, "PASSPORT_SESSION_ONLY_NOT_VERIFIED", "Keep live payments disabled until the separate-session and explicit-session-ID controls are verified against Passport.");
  const base = process.env.KITE_WORKER_URL?.trim();
  const token = process.env.KITE_WORKER_TOKEN?.trim();
  if (!base || !token) throw new HttpError(503, "KITE_WORKER_NOT_CONFIGURED", "Set KITE_WORKER_URL and KITE_WORKER_TOKEN for the Passport worker.");
  let url: URL;
  try { url = new URL(base); } catch { throw new HttpError(503, "KITE_WORKER_CONFIG_INVALID", "The Kite worker URL is invalid."); }
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) throw new HttpError(503, "KITE_WORKER_HTTPS_REQUIRED", "The Kite worker must use HTTPS outside local development.");
  return { base: url.toString().replace(/\/$/, ""), token };
}

async function request(path: string, body?: Record<string, unknown>) {
  const { base, token } = config();
  let response: Response;
  try {
    response = await fetch(new URL(path, base + "/"), {
      method: body ? "POST" : "GET",
      headers: { Authorization: "Bearer " + token, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(path === "v1/execute" ? 300_000 : 60_000)
    });
  } catch {
    throw new HttpError(503, "KITE_WORKER_UNAVAILABLE", "The Kite Passport worker could not be reached.", true);
  }
  const result = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || !result || result.ok !== true) {
    const code = typeof result?.code === "string" ? result.code : "KITE_WORKER_ERROR";
    const message = typeof result?.message === "string" ? result.message : "The Kite Passport worker could not complete the request.";
    throw new HttpError(response.status >= 400 && response.status < 600 ? response.status : 502, code, message, response.status >= 500);
  }
  return result;
}

function stringValue(value: unknown) { return typeof value === "string" && value.length <= 500 ? value : null; }

export async function createPassportSession(args: {
  caseId: string;
  taskSummary: string;
  quote: SirenicQuote;
}): Promise<PassportSessionRecord> {
  const result = await request("v1/sessions", {
    idempotencyKey: args.caseId,
    taskSummary: args.taskSummary,
    url: args.quote.url,
    maxPerTransaction: args.quote.amount,
    maxTotal: args.quote.amount,
    ttl: process.env.KITE_SESSION_TTL || "20m"
  });
  const requestId = stringValue(result.requestId);
  const approvalUrl = stringValue(result.approvalUrl);
  if (!requestId || !approvalUrl) throw new HttpError(502, "KITE_SESSION_RESPONSE_INVALID", "Kite did not return a request identifier and approval URL.");
  let approval: URL;
  try { approval = new URL(approvalUrl); } catch { throw new HttpError(502, "KITE_APPROVAL_URL_INVALID", "Kite returned an invalid approval link."); }
  if (approval.protocol !== "https:" || !["agentpassport.ai", "www.agentpassport.ai"].includes(approval.hostname)) {
    throw new HttpError(502, "KITE_APPROVAL_ORIGIN_INVALID", "Kite returned an approval link outside the official Passport domain.");
  }
  return {
    requestId,
    sessionId: stringValue(result.sessionId),
    approvalUrl: approval.toString(),
    state: result.state === "active" ? "active" : "approval_required",
    maxPerTransaction: args.quote.amount,
    maxTotal: args.quote.amount,
    expiresAt: stringValue(result.expiresAt),
    quote: { amount: args.quote.amount, asset: args.quote.asset, network: args.quote.network, recipient: args.quote.recipient }
  };
}

export async function readPassportSession(requestId: string) {
  const result = await request("v1/sessions/status?requestId=" + encodeURIComponent(requestId));
  const state = result.state === "active" ? "active" : result.state === "expired" ? "expired" : result.state === "rejected" ? "rejected" : "approval_required";
  return {
    state,
    sessionId: stringValue(result.sessionId),
    expiresAt: stringValue(result.expiresAt)
  } as const;
}

export async function executePassportQuery(args: {
  caseId: string;
  requestId: string;
  sessionId: string;
  url: string;
}) {
  return request("v1/execute", {
    idempotencyKey: args.caseId,
    requestId: args.requestId,
    sessionId: args.sessionId,
    url: args.url,
    method: "GET"
  });
}
