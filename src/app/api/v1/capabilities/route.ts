export const runtime = "nodejs";

export function GET() {
  const servConfigured = Boolean((process.env.SERV_REASONING_API_KEY || process.env.SERV_API_KEY) && process.env.SERV_MODEL);
  return Response.json({
    mode: "fixture",
    serv: { configured: servConfigured, state: servConfigured ? "configured" : "simulated" },
    evidenceProviders: { live: false, verified: [] },
    passport: { available: false, livePaymentsEnabled: false, reason: "Session binding, no-allowance-fallback behaviour and quote integrity have not been verified." },
    updatedAt: new Date().toISOString()
  }, { headers: { "Cache-Control": "no-store" } });
}