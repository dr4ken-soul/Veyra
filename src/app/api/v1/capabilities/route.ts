export const runtime = "nodejs";
import { easyPostConfigured, kiteWorkerConfigured, liveModeReady, servConfigured, testModeReady } from "@/lib/runtime-config";

export function GET() {
  const serv = servConfigured();
  const passport = liveModeReady("registration");
  const shipmentTest = testModeReady("shipment");
  const shipmentLive = liveModeReady("shipment");
  return Response.json({
    mode: process.env.APP_MODE || "fixture",
    serv: { configured: serv, state: serv ? "configured" : "simulated" },
    evidenceProviders: {
      verified: [],
      configured: { sirenic: passport, easypostTest: easyPostConfigured("test"), easypostProduction: easyPostConfigured("live") },
      availableModes: { sirenicLive: passport, shipmentTest, shipmentLive },
      supported: ["Sirenic company profiles (GB, FR); provider terms and live response still require verification", "EasyPost tracking (test and production API modes)"]
    },
    passport: { workerConfigured: kiteWorkerConfigured(), available: passport, livePaymentsEnabled: passport, reason: passport ? "The separate-session worker and explicit session ID are configured; verify approval and settlement independently." : "Configure SERV and the Kite CLI worker, then verify a fresh approved session and explicit-session execution before enabling live mode." },
    updatedAt: new Date().toISOString()
  }, { headers: { "Cache-Control": "no-store" } });
}
