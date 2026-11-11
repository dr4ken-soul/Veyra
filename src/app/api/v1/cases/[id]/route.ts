import { errorResponse, newRequestId, responseJson } from "@/lib/api";
import { HttpError } from "@/lib/errors";
import { getCaseRecord } from "@/lib/store";
import { publicCase } from "@/lib/present";
import { routePrincipal } from "@/lib/route";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = newRequestId();
  try {
    const principal = routePrincipal(request);
    const { id } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, "CASE_NOT_FOUND", "The case was not found.");
    const record = getCaseRecord(id, principal.orgId);
    if (!record) throw new HttpError(404, "CASE_NOT_FOUND", "The case was not found.");
    return responseJson(requestId, { case: publicCase(record) });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}