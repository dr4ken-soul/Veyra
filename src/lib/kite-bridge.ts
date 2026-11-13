import "server-only";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Sandbox } from "@vercel/sandbox";
import { HttpError } from "@/lib/errors";
import type { PassportSessionRecord } from "@/lib/store";
import type { SirenicQuote } from "@/lib/sirenic";

function config() {
  if (process.env.PASSPORT_LIVE_ENABLED !== "true") throw new HttpError(503, "PASSPORT_DISABLED", "Passport live payments are disabled. Set up the Kite worker and verify its session-only controls before enabling them.");
  if (process.env.PASSPORT_SESSION_ONLY_VERIFIED !== "true") throw new HttpError(503, "PASSPORT_SESSION_ONLY_NOT_VERIFIED", "Keep live payments disabled until the separate-session and explicit-session-ID controls are verified against Passport.");
  if (process.env.VERCEL) {
    const name = process.env.KITE_SANDBOX_NAME?.trim();
    if (!name) throw new HttpError(503, "KITE_SANDBOX_NOT_CONFIGURED", "Set KITE_SANDBOX_NAME to the persistent Vercel Sandbox running the Kite CLI.");
    return { sandboxName: name } as const;
  }
  const base = process.env.KITE_WORKER_URL?.trim();
  const token = process.env.KITE_WORKER_TOKEN?.trim();
  if (!base || !token) throw new HttpError(503, "KITE_WORKER_NOT_CONFIGURED", "Set KITE_WORKER_URL and KITE_WORKER_TOKEN for the Passport worker.");
  let url: URL;
  try { url = new URL(base); } catch { throw new HttpError(503, "KITE_WORKER_CONFIG_INVALID", "The Kite worker URL is invalid."); }
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) throw new HttpError(503, "KITE_WORKER_HTTPS_REQUIRED", "The Kite worker must use HTTPS outside local development.");
  return { base: url.toString().replace(/\/$/, ""), token } as const;
}

const WORKER_DIR = "/vercel/sandbox/veyra-kite-worker";
const SANDBOX_TIMEOUT_MS = 5 * 60 * 1000;
const WORKER_REQUEST_RUNNER = String.raw`
const { spawn } = require("node:child_process");
const { mkdir, readFile, rm, stat, writeFile } = require("node:fs/promises");
const { setTimeout: delay } = require("node:timers/promises");
const workerDir = process.env.VEYRA_WORKER_DIR;
const lockPath = "/tmp/veyra-kite-worker.lock";
let child;
let stopped = false;
let lockOwned = false;
async function acquireLock() {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try {
      await mkdir(lockPath);
      try {
        await writeFile(lockPath + "/owner.json", JSON.stringify({ parent: process.pid, child: null }), { flag: "wx" });
        lockOwned = true;
        return;
      } catch (error) {
        await rm(lockPath, { recursive: true, force: true });
        throw error;
      }
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      let owner = null;
      try { owner = JSON.parse(await readFile(lockPath + "/owner.json", "utf8")); } catch {}
      if (owner) {
        const pids = [owner.parent, owner.child].filter(Number.isInteger);
        let alive = false;
        for (const pid of pids) {
          try { process.kill(pid, 0); alive = true; }
          catch (probeError) { if (probeError?.code === "EPERM") alive = true; }
        }
        if (!alive) { await rm(lockPath, { recursive: true, force: true }); continue; }
      } else {
        try {
          const lockStat = await stat(lockPath);
          if (Date.now() - lockStat.mtimeMs > 5000) await rm(lockPath, { recursive: true, force: true });
        } catch {}
      }
      await delay(150);
    }
  }
  throw new Error("Timed out waiting for the hosted Passport worker lock.");
}
async function releaseLock() {
  if (lockOwned) await rm(lockPath, { recursive: true, force: true });
  lockOwned = false;
}
async function stop() {
  if (stopped) return;
  stopped = true;
  if (!child) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    delay(1500)
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}
async function main() {
try {
  await acquireLock();
  child = spawn(process.execPath, ["server.mjs"], {
    cwd: workerDir,
    env: process.env,
    stdio: "ignore"
  });
  await writeFile(lockPath + "/owner.json", JSON.stringify({ parent: process.pid, child: child.pid }));
  const base = "http://127.0.0.1:" + process.env.KITE_WORKER_PORT;
  let healthy = false;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (child.exitCode !== null) throw new Error("worker exited");
    try {
      const health = await fetch(base + "/health", { signal: AbortSignal.timeout(1000) });
      if (health.ok) { healthy = true; break; }
    } catch {}
    await delay(250);
  }
  if (!healthy) throw new Error("worker did not become ready");
  const payload = process.env.VEYRA_REQUEST_BODY;
  const response = await fetch(base + process.env.VEYRA_REQUEST_PATH, {
    method: payload === "" ? "GET" : "POST",
    headers: {
      Authorization: "Bearer " + process.env.KITE_WORKER_TOKEN,
      ...(payload === "" ? {} : { "Content-Type": "application/json" })
    },
    body: payload === "" ? undefined : payload,
    signal: AbortSignal.timeout(process.env.VEYRA_REQUEST_PATH === "/v1/execute" ? 290000 : 55000)
  });
  const result = await response.json();
  process.stdout.write(JSON.stringify({ status: response.status, result }));
} catch {
  process.stderr.write("Kite worker command failed.");
  process.exitCode = 1;
} finally {
  await stop();
  await releaseLock();
}
}
main().catch(() => { process.stderr.write("Kite worker command failed."); process.exitCode = 1; });
`;

async function sandboxRequest(pathname: string, body?: Record<string, unknown>) {
  const { sandboxName } = config();
  let sandbox: Sandbox | undefined;
  try {
    sandbox = await Sandbox.getOrCreate({
      name: sandboxName,
      image: "vercel/sandbox/universal",
      region: "iad1",
      resources: { vcpus: 1 },
      timeout: SANDBOX_TIMEOUT_MS,
      persistent: true,
      snapshotExpiration: 7 * 24 * 60 * 60 * 1000,
      keepLastSnapshots: { count: 1, expiration: 7 * 24 * 60 * 60 * 1000, deleteEvicted: true },
      tags: { app: "veyra", purpose: "passport-worker" }
    });
    const workerSource = await readFile(path.join(process.cwd(), "kite-worker", "server.mjs"));
    await sandbox.runCommand("mkdir", ["-p", WORKER_DIR]);
    await sandbox.writeFiles([
      { path: `${WORKER_DIR}/server.mjs`, content: workerSource },
      { path: `${WORKER_DIR}/worker-env.mjs`, content: Buffer.from("// Runtime environment is injected by the Veyra API.\n") }
    ]);

    const install = await sandbox.runCommand({
      cmd: "bash",
      args: ["-lc", "set -eu; if ! command -v kpass >/dev/null 2>&1; then curl -fsSL https://cli.gokite.ai/install.sh | bash; fi; command -v kpass"],
      timeoutMs: 120_000
    });
    const installOutput = (await install.stdout()).trim().split(/\r?\n/).filter(Boolean);
    const cliPath = installOutput.at(-1);
    if (install.exitCode !== 0 || !cliPath?.startsWith("/")) {
      throw new Error("The Kite CLI is not installed in the hosted Passport sandbox.");
    }

    const command = await sandbox.runCommand({
      cmd: "node",
      args: ["-e", WORKER_REQUEST_RUNNER],
      cwd: WORKER_DIR,
      timeoutMs: SANDBOX_TIMEOUT_MS,
      env: {
        KITE_CLI_PATH: cliPath,
        KITE_WORKER_HOST: "127.0.0.1",
        KITE_WORKER_PORT: "8787",
        KITE_WORKER_DATA_DIR: "/vercel/sandbox/veyra-kite-worker-data",
        KITE_WORKER_TOKEN: randomBytes(32).toString("hex"),
        KITE_SESSION_TTL: process.env.KITE_SESSION_TTL || "20m",
        VEYRA_WORKER_DIR: WORKER_DIR,
        VEYRA_REQUEST_PATH: pathname.startsWith("/") ? pathname : `/${pathname}`,
        VEYRA_REQUEST_BODY: body ? JSON.stringify(body) : ""
      }
    });
    const output = (await command.stdout()).trim();
    let envelope: { status?: number; result?: Record<string, unknown> };
    try { envelope = JSON.parse(output); }
    catch { throw new Error("The hosted Kite worker returned an unreadable response."); }
    if (command.exitCode !== 0 || !Number.isInteger(envelope.status) || !envelope.result) {
      throw new Error("The hosted Kite worker did not complete the request.");
    }
    return { status: envelope.status as number, result: envelope.result };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(503, "KITE_SANDBOX_UNAVAILABLE", "The hosted Kite Passport sandbox could not run. Check its Vercel Sandbox configuration and Passport CLI login.", true);
  } finally {
    if (sandbox?.status === "running") await sandbox.stop().catch(() => undefined);
  }
}

async function request(path: string, body?: Record<string, unknown>) {
  const workerConfig = config();
  if ("sandboxName" in workerConfig) {
    const remote = await sandboxRequest(path, body);
    const result = remote.result;
    if (remote.status < 200 || remote.status >= 300 || result.ok !== true) {
      const code = typeof result.code === "string" ? result.code : "KITE_WORKER_ERROR";
      const message = typeof result.message === "string" ? result.message : "The Kite Passport worker could not complete the request.";
      throw new HttpError(remote.status >= 400 && remote.status < 600 ? remote.status : 502, code, message, remote.status >= 500);
    }
    return result;
  }
  const { base, token } = workerConfig;
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
