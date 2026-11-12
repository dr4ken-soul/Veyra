import { errorResponse, newRequestId, responseJson } from "@/lib/api";
import { routePrincipal } from "@/lib/route";
import { getCaseRecord, listCaseRecords } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = newRequestId();
  try {
    const principal = routePrincipal(request);
    const { id } = await context.params;
    const record = (await listCaseRecords(principal.orgId)).find((item) => item.operationId === id);
    if (!record) return responseJson(requestId, {
      error: { code: "OPERATION_NOT_FOUND", message: "No operation was found.", retryable: false }
    }, 404);
    const current = await getCaseRecord(record.id, principal.orgId);
    return responseJson(requestId, {
      operation: {
        id,
        state: current?.state || "unknown",
        mode: current?.mode || "unknown",
        paymentState: current?.payment?.state || "unknown",
        evidenceState: current?.evidence ? "received" : current?.state === "blocked" ? "unknown" : "pending"
      }
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
