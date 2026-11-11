import { errorResponse, newRequestId, readJson, responseJson } from "@/lib/api";
import { caseQuestion, validateMode, validateScenario, validateScenarioInput } from "@/lib/domain";
import { HttpError } from "@/lib/errors";
import { createCaseRecord, listCaseRecords } from "@/lib/store";
import { publicCase } from "@/lib/present";
import { routePrincipal, verifyMutation } from "@/lib/route";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = newRequestId();
  try {
    const principal = routePrincipal(request);
    const url = new URL(request.url);
    const scenario = url.searchParams.get("scenario") || undefined;
    const state = url.searchParams.get("state") || undefined;
    const mode = url.searchParams.get("mode") || undefined;
    if (scenario && !validateScenario(scenario)) throw new HttpError(422, "INVALID_SCENARIO", "Choose a supported scenario.");
    if (mode && mode !== "fixture") throw new HttpError(422, "INVALID_MODE", "Only fixture mode is available.");
    const allowedStates = new Set(["draft", "planned", "needs_review", "insufficient_evidence"]);
    if (state && !allowedStates.has(state)) throw new HttpError(422, "INVALID_STATE", "Choose a supported case state.");
    const items = listCaseRecords(principal.orgId, { scenario, state, mode });
    return responseJson(requestId, { items: items.map(publicCase), nextCursor: null });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = newRequestId();
  try {
    const principal = routePrincipal(request, 30);
    verifyMutation(request, principal);
    const body = await readJson(request);
    const allowed = new Set(["scenario", "mode", "input", "externalRef", "idempotencyKey"]);
    if (Object.keys(body).some((key) => !allowed.has(key))) {
      throw new HttpError(422, "UNKNOWN_FIELD", "The request contains a field this endpoint does not accept.");
    }
    if (!validateScenario(body.scenario)) throw new HttpError(422, "INVALID_SCENARIO", "Choose a supported scenario.");
    const mode = body.mode === undefined ? "fixture" : body.mode;
    if (!validateMode(mode)) throw new HttpError(422, "INVALID_MODE", "Choose Simulated mode.");
    if (mode !== "fixture") throw new HttpError(403, "MODE_BLOCKED", "Test and live cases are disabled until their providers and payment controls are verified.");
    const validated = validateScenarioInput(body.scenario, body.input);
    if (!validated.ok) throw new HttpError(422, "INVALID_INPUT", "Check the highlighted fields before continuing.");
    const externalRef = body.externalRef === undefined ? null : body.externalRef;
    if (externalRef !== null && (typeof externalRef !== "string" || externalRef.length > 128 || /[\u0000-\u001f]/.test(externalRef))) {
      throw new HttpError(422, "INVALID_EXTERNAL_REF", "The external reference must be plain text with 128 characters or fewer.");
    }
    const headerKey = request.headers.get("idempotency-key");
    const bodyKey = body.idempotencyKey;
    const idempotencyKey = headerKey || (typeof bodyKey === "string" ? bodyKey : null);
    if (idempotencyKey && (idempotencyKey.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(idempotencyKey))) {
      throw new HttpError(422, "INVALID_IDEMPOTENCY_KEY", "The idempotency key contains unsupported characters.");
    }
    const result = createCaseRecord({
      orgId: principal.orgId,
      scenario: body.scenario,
      input: validated.input,
      question: caseQuestion(body.scenario, validated.input),
      externalRef,
      idempotencyKey
    });
    return responseJson(requestId, { case: publicCase(result.record), replayed: result.replayed }, result.replayed ? 200 : 201);
  } catch (error) {
    return errorResponse(error, requestId);
  }
}