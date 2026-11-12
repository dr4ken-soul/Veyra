import { errorResponse, newRequestId, responseJson } from "@/lib/api";
import { HttpError } from "@/lib/errors";
import { executePassportQuery } from "@/lib/kite-bridge";
import { EASYPOST_LIMITATIONS, retrieveEasyPostTracker } from "@/lib/easypost";
import { liveModeReady, testModeReady } from "@/lib/runtime-config";
import { publicCase } from "@/lib/present";
import { routePrincipal, verifyMutation } from "@/lib/route";
import { claimProviderOperation, completeProviderOperation, getCaseRecord, markProviderOperationUnknown, runFixtureEvidence, type PaymentRecord } from "@/lib/store";
import { preflightSirenic, sirenicUrl, SIRENIC_LIMITATIONS, sanitizeSirenicResult, validateSirenicResult } from "@/lib/sirenic";

export const runtime = "nodejs";
export const maxDuration = 300;

function sameQuote(left: { amount: string; asset: string; network: string; recipient: string | null }, right: { amount: string; asset: string; network: string; recipient: string | null }) {
  return left.amount === right.amount && left.asset.toLowerCase() === right.asset.toLowerCase() && left.network === right.network && left.recipient?.toLowerCase() === right.recipient?.toLowerCase();
}

function paymentRecord(value: unknown, quote: { amount: string; asset: string; network: string }): PaymentRecord {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const allowed = new Set<PaymentRecord["state"]>(["confirmed", "pending", "unknown"]);
  const state = typeof raw.state === "string" && allowed.has(raw.state as PaymentRecord["state"]) ? raw.state as PaymentRecord["state"] : "unknown";
  const asString = (item: unknown) => typeof item === "string" && item.length <= 200 ? item : null;
  return {
    state,
    amountMinor: quote.amount,
    asset: quote.asset,
    network: quote.network,
    transactionRef: state === "confirmed" ? asString(raw.transactionRef) : null,
    confirmationRef: state === "confirmed" ? asString(raw.confirmationRef) : null,
    confirmedAt: state === "confirmed" ? asString(raw.confirmedAt) : null
  };
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = newRequestId();
  let claimed: { orgId: string; caseId: string; operationId: string; mode: "test" | "live" } | null = null;
  try {
    const principal = routePrincipal(request, 10);
    verifyMutation(request, principal);
    const { id } = await context.params;
    const record = await getCaseRecord(id, principal.orgId);
    if (!record) throw new HttpError(404, "CASE_NOT_FOUND", "The case was not found.");
    if (record.mode === "fixture") {
      const result = await runFixtureEvidence(principal.orgId, id);
      if (!result) throw new HttpError(500, "EVIDENCE_UNAVAILABLE", "The simulated evidence could not be loaded.");
      return responseJson(requestId, { case: publicCase(result), operationId: result.operationId, mode: "fixture", paymentState: "simulated" });
    }
    if (record.mode === "test" && !testModeReady(record.scenario)) throw new HttpError(503, "TEST_MODE_NOT_CONFIGURED", "Configure SERV and the EasyPost test key before running a test shipment query.");
    if (record.mode === "live" && !liveModeReady(record.scenario)) throw new HttpError(503, "LIVE_MODE_NOT_CONFIGURED", "Live provider settings changed after this case was created. Check the integration settings before running it.");
    if (!record.plan || record.planMode !== "serv") throw new HttpError(409, "SERV_PLAN_REQUIRED", "Create a real SERV plan before retrieving provider evidence.");
    if (record.evidence) return responseJson(requestId, { case: publicCase(record), operationId: record.operationId, mode: record.mode, paymentState: record.payment?.state || "unknown", replayed: true });

    if (record.scenario === "shipment") {
      const mode = record.mode;
      if (mode !== "test" && mode !== "live") throw new HttpError(403, "MODE_BLOCKED", "Choose a configured shipment mode.");
      const operation = await claimProviderOperation(principal.orgId, id, mode);
      if (!operation.operationId || !operation.claimed) {
        if (operation.record?.evidence) return responseJson(requestId, { case: publicCase(operation.record), operationId: operation.operationId, mode, paymentState: operation.record.payment?.state || "unknown", replayed: true });
        throw new HttpError(409, "OPERATION_ALREADY_STARTED", "A provider request already started for this case. Check its status; do not retry it.");
      }
      claimed = { orgId: principal.orgId, caseId: id, operationId: operation.operationId, mode };
      const tracker = await retrieveEasyPostTracker(record, mode);
      const completed = await completeProviderOperation({
        orgId: principal.orgId, caseId: id, operationId: operation.operationId, mode,
        sourceName: "EasyPost tracking record",
        operatorName: "EasyPost API",
        upstreamName: tracker.payload.carrier as string,
        sourceTimestamp: tracker.sourceTimestamp,
        matchedSubject: tracker.matchedSubject,
        payload: tracker.payload,
        limitations: EASYPOST_LIMITATIONS,
        payment: tracker.payment
      });
      claimed = null;
      if (!completed) throw new HttpError(500, "STORE_ERROR", "The tracking result could not be saved. Check EasyPost activity before any further request.");
      return responseJson(requestId, { case: publicCase(completed), operationId: operation.operationId, mode, paymentState: tracker.payment.state });
    }

    if (record.mode !== "live") throw new HttpError(403, "MODE_BLOCKED", "Company registry checks require a Live Passport session.");
    if (!record.passportSession || record.passportSession.state !== "active" || !record.passportSession.sessionId) {
      throw new HttpError(409, "ACTIVE_SESSION_REQUIRED", "Approve the task-specific Passport session and check its status before running the provider query.");
    }
    const quote = await preflightSirenic(record);
    if (!sameQuote(quote, record.passportSession.quote)) throw new HttpError(409, "QUOTE_CHANGED", "Sirenic's payment quote changed since approval. Request a fresh Passport session; no payment was attempted.");
    const operation = await claimProviderOperation(principal.orgId, id, "live");
    if (!operation.operationId || !operation.claimed) {
      if (operation.record?.evidence) return responseJson(requestId, { case: publicCase(operation.record), operationId: operation.operationId, mode: "live", paymentState: operation.record.payment?.state || "unknown", replayed: true });
      throw new HttpError(409, "OPERATION_ALREADY_STARTED", "A live provider call was already started for this case. Check its status; do not retry it.");
    }
    claimed = { orgId: principal.orgId, caseId: id, operationId: operation.operationId, mode: "live" };
    const result = await executePassportQuery({
      caseId: id,
      requestId: record.passportSession.requestId,
      sessionId: record.passportSession.sessionId,
      url: sirenicUrl(record).toString()
    });
    const providerResponse = result.providerResponse;
    const subject = validateSirenicResult(record.scenario, record.input.registrationNumber, providerResponse);
    const payment = paymentRecord(result.payment, quote);
    const upstream = record.input.jurisdiction.toUpperCase().startsWith("F") ? "INSEE / INPI French company registers" : "Companies House (United Kingdom)";
    const completed = await completeProviderOperation({
      orgId: principal.orgId, caseId: id, operationId: operation.operationId, mode: "live",
      sourceName: "Sirenic European company profile",
      operatorName: "Sirenic API via Kite Passport",
      upstreamName: upstream,
      sourceTimestamp: null,
      matchedSubject: subject.denomination,
      payload: sanitizeSirenicResult(record, providerResponse),
      limitations: SIRENIC_LIMITATIONS,
      payment
    });
    claimed = null;
    if (!completed) throw new HttpError(500, "STORE_ERROR", "The live evidence result could not be saved. Check the Passport activity before any further action.");
    return responseJson(requestId, { case: publicCase(completed), operationId: operation.operationId, mode: "live", paymentState: payment.state });
  } catch (error) {
    if (claimed) {
      try {
        await markProviderOperationUnknown(claimed.orgId, claimed.caseId, claimed.operationId, claimed.mode);
      } catch (storeError) {
        return errorResponse(storeError, requestId);
      }
    }
    return errorResponse(error, requestId);
  }
}
