import "./worker-env.mjs";
import { createHash, timingSafeEqual } from "node:crypto";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const PORT = Number(process.env.KITE_WORKER_PORT || 8787);
const HOST = process.env.KITE_WORKER_HOST || "127.0.0.1";
const TOKEN = process.env.KITE_WORKER_TOKEN || "";
const CLI = process.env.KITE_CLI_PATH || "kpass";
const DATA_DIR = path.resolve(process.env.KITE_WORKER_DATA_DIR || ".kite-worker-data");
const REQUEST_ID_PATTERN = /^(?:req_|agent_session_req_)[A-Za-z0-9._:-]{1,196}$/;
const SESSION_ID_PATTERN = /^(?:session_|agent_session_)[A-Za-z0-9._:-]{1,191}$/;
let serial = Promise.resolve();

await mkdir(DATA_DIR, { recursive: true });

function safeEqual(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function idKey(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(value)) throw new Error("Invalid request identifier.");
  return createHash("sha256").update(value).digest("hex");
}

function parseJson(output) {
  try { return JSON.parse(output.trim()); }
  catch { throw new Error("Passport CLI did not return valid JSON."); }
}

async function runCli(args, timeout = 60_000) {
  try {
    const { stdout } = await exec(CLI, [...args, "--no-interactive", "--output", "json"], {
      timeout,
      maxBuffer: 2 * 1024 * 1024,
      windowsHide: true,
      env: process.env
    });
    return parseJson(stdout);
  } catch {
    throw new Error("The Kite Passport CLI command failed. Check its login and status on the worker host.");
  }
}

function normalizeStatus(result) {
  const session = result?.session && typeof result.session === "object" ? result.session : {};
  const request = result?.request && typeof result.request === "object" ? result.request : {};
  const candidates = [session.status, result.request_status, request.status, result.session_status, result.state, result.status]
    .filter((value) => typeof value === "string")
    .map((value) => value.toLowerCase());
  if (candidates.some((value) => ["active", "approved", "open"].includes(value))) return "active";
  if (candidates.some((value) => ["expired", "exhausted", "revoked"].includes(value))) return "expired";
  if (candidates.some((value) => ["rejected", "declined", "denied", "cancelled", "canceled"].includes(value))) return "rejected";
  return "approval_required";
}

function sessionInfo(result) {
  const session = result?.session && typeof result.session === "object" ? result.session : {};
  return {
    state: normalizeStatus(result),
    requestId: result?.request_id || result?.requestId || result?.session_request_id || null,
    sessionId: result?.session_id || result?.sessionId || session.id || result?.current_session_id || null,
    approvalUrl: result?.approval_url || result?.approvalUrl || result?.approve_url || null,
    expiresAt: result?.expires_at || result?.expiresAt || session.expires_at || session.expiresAt || null
  };
}

function ttlSeconds(value) {
  const match = typeof value === "string" && /^(\d{1,2})(m|h)$/.exec(value);
  const seconds = match ? Number(match[1]) * (match[2] === "h" ? 3600 : 60) : 1200;
  if (!Number.isInteger(seconds) || seconds < 300 || seconds > 3600) throw new Error("KITE_SESSION_TTL must be between 5m and 1h.");
  return seconds;
}

function providerUrl(value) {
  if (typeof value !== "string" || value.length > 500) throw new Error("Invalid provider URL.");
  let url;
  try { url = new URL(value); } catch { throw new Error("Invalid provider URL."); }
  const allowedPath = /^\/v1\/(?:eu\/entreprise\/GB\/[A-Za-z0-9]{6,8}|entreprise\/\d{9})$/;
  if (url.protocol !== "https:" || url.hostname !== "api.sirenic.eu" || url.port || url.username || url.password || url.search || url.hash || !allowedPath.test(url.pathname)) {
    throw new Error("Only approved Sirenic company profile endpoints are allowed.");
  }
  return url.toString();
}

async function readBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 16_384) throw new Error("Request body is too large.");
  }
  return JSON.parse(body || "{}");
}

async function cachedResult(key) {
  try { return JSON.parse(await readFile(path.join(DATA_DIR, key + ".json"), "utf8")); }
  catch { return null; }
}

async function storeResult(key, result) {
  const temporary = path.join(DATA_DIR, key + ".tmp");
  const finalPath = path.join(DATA_DIR, key + ".json");
  await writeFile(temporary, JSON.stringify(result), { mode: 0o600 });
  await rename(temporary, finalPath);
}

function serialized(task) {
  const next = serial.then(task, task);
  serial = next.catch(() => undefined);
  return next;
}

function providerBody(result) {
  const x402 = result?.x402 && typeof result.x402 === "object" ? result.x402 : {};
  const candidates = [x402.parsed_response_body, x402.response_body, result?.body, result?.data, result?.response?.body, result?.response?.data, result?.result?.body, result?.result?.data];
  for (const value of candidates) {
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
      } catch { /* do not persist non-JSON provider output */ }
    }
  }
  return null;
}

function paymentInfo(result) {
  const payment = result?.payment && typeof result.payment === "object" ? result.payment :
    result?.settlement && typeof result.settlement === "object" ? result.settlement :
    result?.payment_requirement && typeof result.payment_requirement === "object" ? result.payment_requirement : null;
  if (!payment) return { state: "unknown", amount: null, asset: null, network: null, transactionRef: null, confirmationRef: null, confirmedAt: null };
  const tx = payment.transactionHash || payment.transaction_hash || payment.txHash || payment.tx_hash || null;
  const status = String(payment.state || payment.status || payment.settlementStatus || payment.settlement_status || "").toLowerCase();
  const amount = payment.amount || payment.amountUsd || payment.amount_usd || null;
  const asset = payment.asset || payment.token || null;
  const network = payment.network || payment.chain || result?.x402?.chain_id || null;
  const confirmed = Boolean(tx && ["confirmed", "settled", "success", "completed"].includes(status));
  return {
    state: confirmed ? "confirmed" : tx ? "pending" : "unknown",
    amount: amount && amount.length <= 100 ? amount : null,
    asset: asset && asset.length <= 100 ? asset : null,
    network: network && network.length <= 100 ? network : null,
    transactionRef: confirmed && /^0x[a-fA-F0-9]{64}$/.test(tx || "") ? tx : null,
    confirmationRef: confirmed && /^0x[a-fA-F0-9]{64}$/.test(tx || "") ? tx : null,
    confirmedAt: confirmed ? new Date().toISOString() : null
  };
}

async function paymentInfoForSession(result, sessionId) {
  const payment = paymentInfo(result);
  try {
    const activity = await runCli(["activity", "--kind", "x402_payment", "--limit", "50"]);
    const event = Array.isArray(activity?.events) ? activity.events.find((item) =>
      item?.kind === "x402_payment" && item?.status === "completed" &&
      item?.details?.transaction?.session_id === sessionId
    ) : null;
    const transaction = event?.details?.transaction;
    const tx = typeof transaction?.tx_hash === "string" ? transaction.tx_hash : "";
    if (!event || !/^0x[a-fA-F0-9]{64}$/.test(tx)) return payment;
    return {
      ...payment,
      state: "confirmed",
      transactionRef: tx,
      confirmationRef: tx,
      confirmedAt: typeof event.occurred_at === "string" ? event.occurred_at : new Date().toISOString()
    };
  } catch {
    return payment;
  }
}

function json(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  response.end(JSON.stringify(body));
}

async function handle(request, response) {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  if (request.method === "GET" && url.pathname === "/health") return json(response, 200, { ok: true, service: "veyra-kite-worker" });
  const auth = request.headers.authorization || "";
  if (!TOKEN || !auth.startsWith("Bearer ") || !safeEqual(auth.slice(7), TOKEN)) return json(response, 401, { ok: false, code: "UNAUTHORIZED", message: "Worker authentication failed." });

  try {
    if (request.method === "POST" && url.pathname === "/v1/sessions") {
      const body = await readBody(request);
      const key = idKey(body.idempotencyKey);
      return await serialized(async () => {
        const prior = await cachedResult("session-" + key);
        if (prior) return json(response, 200, prior);
        const target = providerUrl(body.url);
        const maxPer = Number(body.maxPerTransaction);
        const maxTotal = Number(body.maxTotal);
        const task = typeof body.taskSummary === "string" ? body.taskSummary.slice(0, 300) : "One Veyra company registry lookup";
        if (!Number.isFinite(maxPer) || !Number.isFinite(maxTotal) || maxPer <= 0 || maxPer > 0.05 || maxTotal < maxPer || maxTotal > 0.05) throw new Error("The session cap is invalid or exceeds Veyra's $0.05 limit.");
        const delegation = {
          task: { summary: `${task}. One GET request to ${target}.` },
          payment_policy: { currency: "USD", max_amount_per_tx: String(maxPer), max_total_amount: String(maxTotal), ttl_seconds: ttlSeconds(process.env.KITE_SESSION_TTL) },
          routing_enabled: false
        };
        const raw = await runCli(["session", "create", "--delegation", JSON.stringify(delegation), "--separate", "--no-reuse", "--no-browser"]);
        const info = sessionInfo(raw);
        const requestId = info.requestId;
        if (!requestId || !REQUEST_ID_PATTERN.test(requestId) || !info.approvalUrl) throw new Error("Passport did not return a session request identifier and approval URL.");
        let approval;
        try { approval = new URL(info.approvalUrl); } catch { throw new Error("Passport returned an invalid approval URL."); }
        if (approval.protocol !== "https:" || !["agentpassport.ai", "www.agentpassport.ai"].includes(approval.hostname)) throw new Error("Passport returned a non-official approval URL.");
        const result = { ok: true, requestId, sessionId: info.sessionId, approvalUrl: approval.toString(), state: info.state, expiresAt: info.expiresAt };
        await storeResult("session-" + key, result);
        return json(response, 201, result);
      });
    }

    if (request.method === "GET" && url.pathname === "/v1/sessions/status") {
      const requestId = url.searchParams.get("requestId") || "";
      if (!REQUEST_ID_PATTERN.test(requestId)) throw new Error("Invalid session request identifier.");
      const raw = await runCli(["session", "status", "--request-id", requestId]);
      const info = sessionInfo(raw);
      if ((info.requestId && info.requestId !== requestId) || (!info.requestId && !info.sessionId)) throw new Error("Passport did not return status for this request identifier.");
      return json(response, 200, { ok: true, requestId, state: info.state, sessionId: info.sessionId, expiresAt: info.expiresAt });
    }

    if (request.method === "POST" && url.pathname === "/v1/execute") {
      const body = await readBody(request);
      const key = idKey(body.idempotencyKey);
      const prior = await cachedResult("execute-" + key);
      if (prior) return json(response, 200, prior);
      const target = providerUrl(body.url);
      const requestId = typeof body.requestId === "string" ? body.requestId : "";
      const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
      if (!REQUEST_ID_PATTERN.test(requestId) || !SESSION_ID_PATTERN.test(sessionId) || body.method !== "GET") throw new Error("The approved Passport session or request method is invalid.");
      return await serialized(async () => {
        const cached = await cachedResult("execute-" + key);
        if (cached) return json(response, 200, cached);
        const statusRaw = await runCli(["session", "status", "--request-id", requestId]);
        const active = sessionInfo(statusRaw);
        if (active.state !== "active" || active.sessionId !== sessionId) throw new Error("The approved task session is not active or does not match this operation. No request was sent.");
        const raw = await runCli(["session", "execute", "--url", target, "--method", "GET", "--session-id", sessionId, "--idempotency-key", key, "--no-browser"], 300_000);
        const httpStatus = Number(raw?.x402?.status_code);
        if (raw?.status !== "success" || !Number.isInteger(httpStatus) || httpStatus < 200 || httpStatus >= 300) throw new Error("Passport did not confirm a successful Sirenic response. Check Passport activity before taking further action.");
        const providerResponse = providerBody(raw);
        if (!providerResponse) throw new Error("The Passport response did not contain a JSON provider result. Check Passport activity before taking any further action.");
        const result = { ok: true, state: "complete", providerResponse, payment: await paymentInfoForSession(raw, sessionId) };
        await storeResult("execute-" + key, result);
        return json(response, 200, result);
      });
    }

    json(response, 404, { ok: false, code: "NOT_FOUND", message: "Worker route not found." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The Kite worker could not complete the request.";
    json(response, 502, { ok: false, code: "KITE_OPERATION_FAILED", message: message.slice(0, 500) });
  }
}

if (!TOKEN || TOKEN.length < 32) {
  console.error("KITE_WORKER_TOKEN must contain at least 32 characters.");
  process.exit(1);
}

const server = createServer((request, response) => { void handle(request, response); });
server.listen(PORT, HOST, () => console.log(`Veyra Kite worker listening on ${HOST}:${PORT}`));
