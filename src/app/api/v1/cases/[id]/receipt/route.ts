import { errorResponse, newRequestId, responseJson } from "@/lib/api";
import { getReceipt } from "@/lib/store";
import { routePrincipal } from "@/lib/route";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = newRequestId();
  try {
    const principal = routePrincipal(request);
    const { id } = await context.params;
    const receipt = await getReceipt(principal.orgId, id);
    return responseJson(requestId, { receipt }, 200, { "Content-Disposition": "attachment; filename=veyra-receipt-" + id + ".json" });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
