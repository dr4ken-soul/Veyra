import { errorResponse, newRequestId, responseJson } from "@/lib/api";
import { HttpError } from "@/lib/errors";
import { publicCase } from "@/lib/present";
import { routePrincipal, verifyMutation } from "@/lib/route";
import { getCaseRecord, saveEvidencePlan } from "@/lib/store";
import { createPlan } from "@/lib/serv";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = newRequestId();
  try {
    const principal = routePrincipal(request);
    const { id } = await context.params;
    const record = getCaseRecord(id, principal.orgId);
    if (!record) throw new HttpError(404, "CASE_NOT_FOUND", "The case was not found.");
    return responseJson(requestId, {
      plan: record.plan,
      reasoningMode: record.planMode,
      requestId: record.servRequestId,
      model: record.model
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = newRequestId();
  try {
    const principal = routePrincipal(request, 20);
    verifyMutation(request, principal);
    const { id } = await context.params;
    const record = getCaseRecord(id, principal.orgId);
    if (!record) throw new HttpError(404, "CASE_NOT_FOUND", "The case was not found.");
    if (record.evidence) throw new HttpError(409, "CASE_HAS_EVIDENCE", "This case already has evidence. No additional query was run.");
    const planned = await createPlan(record);
    const saved = saveEvidencePlan({
      orgId: principal.orgId,
      caseId: id,
      plan: planned.plan,
      reasoningMode: planned.reasoningMode,
      requestId: planned.requestId,
      model: planned.model
    });
    if (!saved) throw new HttpError(500, "STORE_ERROR", "The evidence plan could not be saved.");
    return responseJson(requestId, { case: publicCase(saved), planMode: planned.reasoningMode });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}