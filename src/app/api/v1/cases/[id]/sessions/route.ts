import { errorResponse, newRequestId, responseJson } from "@/lib/api";
import { HttpError } from "@/lib/errors";
import { createPassportSession, readPassportSession } from "@/lib/kite-bridge";
import { liveModeReady } from "@/lib/runtime-config";
import { getCaseRecord, savePassportSession, updatePassportSession } from "@/lib/store";
import { preflightSirenic } from "@/lib/sirenic";
import { routePrincipal, verifyMutation } from "@/lib/route";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = newRequestId();
  try {
    const principal = routePrincipal(request);
    const { id } = await context.params;
    const record = getCaseRecord(id, principal.orgId);
    if (!record) throw new HttpError(404, "CASE_NOT_FOUND", "The case was not found.");
    if (!record.passportSession) return responseJson(requestId, { session: null });
    const status = await readPassportSession(record.passportSession.requestId);
    const updated = updatePassportSession({ orgId: principal.orgId, caseId: id, session: status });
    return responseJson(requestId, { session: updated?.passportSession || null });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = newRequestId();
  try {
    const principal = routePrincipal(request, 10);
    verifyMutation(request, principal);
    const { id } = await context.params;
    const record = getCaseRecord(id, principal.orgId);
    if (!record) throw new HttpError(404, "CASE_NOT_FOUND", "The case was not found.");
    if (record.mode !== "live") throw new HttpError(409, "LIVE_MODE_REQUIRED", "Create a Live case before requesting a Passport session.");
    if (!record.plan || record.planMode !== "serv") throw new HttpError(409, "SERV_PLAN_REQUIRED", "Create a real SERV plan before requesting a paid evidence check.");
    if (record.scenario === "shipment") throw new HttpError(422, "PASSPORT_NOT_REQUIRED", "Shipment evidence uses the configured EasyPost account and does not create a Kite Passport session.");
    if (!liveModeReady(record.scenario)) throw new HttpError(503, "LIVE_MODE_NOT_CONFIGURED", "Live mode is not fully configured. Check SERV, the Kite worker, and the session-only guard.");
    if (record.passportSession && ["approval_required", "active"].includes(record.passportSession.state)) {
      return responseJson(requestId, { session: record.passportSession, replayed: true });
    }
    const quote = await preflightSirenic(record);
    const session = await createPassportSession({
      caseId: id,
      taskSummary: `One Sirenic registry lookup for ${record.input.jurisdiction} company ${record.input.registrationNumber}`,
      quote
    });
    const saved = savePassportSession({ orgId: principal.orgId, caseId: id, session });
    return responseJson(requestId, { session: saved?.passportSession || session, quote }, 201);
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
