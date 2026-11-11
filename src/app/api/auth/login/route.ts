import { checkRateLimit, errorResponse, newRequestId, readJson, responseJson, verifyBrowserOrigin } from "@/lib/api";
import { createSessionToken, loginPasswordMatches, sessionCookie } from "@/lib/auth";
import { HttpError } from "@/lib/errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = newRequestId();
  try {
    checkRateLimit("login:" + (request.headers.get("x-forwarded-for") || "local"), 10, 10 * 60_000);
    verifyBrowserOrigin(request);
    const body = await readJson(request, 2_048);
    if (!loginPasswordMatches(body.password)) throw new HttpError(401, "LOGIN_FAILED", "The access code was not accepted.");
    const secure = new URL(request.url).protocol === "https:";
    return responseJson(requestId, { authenticated: true }, 200, { "Set-Cookie": sessionCookie(createSessionToken(), secure) });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}