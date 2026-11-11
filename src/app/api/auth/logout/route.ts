import { errorResponse, newRequestId, responseJson, verifyBrowserOrigin } from "@/lib/api";
import { clearSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = newRequestId();
  try {
    verifyBrowserOrigin(request);
    const secure = new URL(request.url).protocol === "https:";
    return responseJson(requestId, { authenticated: false }, 200, { "Set-Cookie": clearSessionCookie(secure) });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}