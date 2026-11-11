import { errorResponse, newRequestId, responseJson } from "@/lib/api";
import { HttpError } from "@/lib/errors";
import { publicCase } from "@/lib/present";
import { routePrincipal, verifyMutation } from "@/lib/route";
import { runFixtureEvidence } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = newRequestId();
  try {
    const principal = routePrincipal(request, 10);
    verifyMutation(request, principal);
    const { id } = await context.params;
    const record = runFixtureEvidence(principal.orgId, id);
    if (!record) throw new HttpError(500, "EVIDENCE_UNAVAILABLE", "The simulated evidence could not be loaded.");
    return responseJson(requestId, { case: publicCase(record), operationId: record.operationId, mode: "fixture", paymentState: "simulated" });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}