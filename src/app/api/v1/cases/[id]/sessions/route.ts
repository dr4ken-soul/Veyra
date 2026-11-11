import { errorResponse, newRequestId, responseJson } from "@/lib/api";
import { routePrincipal, verifyMutation } from "@/lib/route";
import { rejectUnavailableLive } from "@/lib/route";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = newRequestId();
  try {
    const principal = routePrincipal(request, 10);
    verifyMutation(request, principal);
    rejectUnavailableLive();
  } catch (error) {
    return errorResponse(error, requestId);
  }
  return responseJson(requestId, { state: "unavailable" }, 503);
}