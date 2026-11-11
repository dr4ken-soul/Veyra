import { checkRateLimit, verifyBrowserOrigin } from "@/lib/api";
import { requirePrincipal, type Principal } from "@/lib/auth";
import { HttpError } from "@/lib/errors";

export function routePrincipal(request: Request, limit = 60): Principal {
  const principal = requirePrincipal(request);
  checkRateLimit(principal.orgId + ":" + principal.subject, limit);
  return principal;
}

export function verifyMutation(request: Request, principal: Principal) {
  if (principal.via === "session") verifyBrowserOrigin(request);
}

export function rejectUnavailableLive() {
  throw new HttpError(503, "LIVE_PAYMENTS_DISABLED", "Live payments are unavailable until a provider and session-only Passport controls are verified.");
}