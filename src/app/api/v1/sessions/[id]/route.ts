import { errorResponse, newRequestId, responseJson } from "@/lib/api";
import { routePrincipal } from "@/lib/route";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = newRequestId();
  try {
    routePrincipal(request);
    const { id } = await context.params;
    return responseJson(requestId, {
      session: {
        id,
        state: "unavailable",
        verified: false,
        reason: "No session exists. Live Passport execution is disabled."
      }
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}