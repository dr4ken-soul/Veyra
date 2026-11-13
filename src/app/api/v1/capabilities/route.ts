export const runtime = "nodejs";
import { easyPostConfigured, kiteWorkerConfigured, liveModeReady, publicWalletPaymentsEnabled, servConfigured, testModeReady } from "@/lib/runtime-config";

export function GET() {
  const serv = servConfigured();
  const passport = liveModeReady("registration");
  const shipmentTest = testModeReady("shipment");
  const shipmentLive = liveModeReady("shipment");
  return Response.json({
    mode: process.env.APP_MODE || "fixture",
    serv: { configured: serv, state: serv ? "configured" : "simulated" },
    evidenceProviders: {
      verified: [
        "Sirenic French profile through the hosted Passport flow: one successful $0.005 Base settlement",
        "Public Sirenic x402 quote, recipient, CORS headers and signing-key document; visitor-funded settlement awaits its first browser run"
      ],
      configured: { sirenic: passport, sirenicVisitorWallet: publicWalletPaymentsEnabled(), easypostTest: easyPostConfigured("test"), easypostProduction: easyPostConfigured("live") },
      availableModes: { sirenicLive: passport, sirenicVisitorWallet: publicWalletPaymentsEnabled(), shipmentTest, shipmentLive },
      supported: ["Public Sirenic visitor-wallet lookup: French SIREN profile, Base Mainnet USDC, maximum $0.005 per lookup", "Private operator Sirenic profile flow (GB, FR) through separately approved Kite Passport session; broader coverage and terms require review", "EasyPost tracking (test and production API modes)"]
    },
    publicWalletPayments: {
      enabled: publicWalletPaymentsEnabled(),
      provider: "Sirenic",
      product: "French company profile",
      network: "Base Mainnet",
      asset: "USDC",
      maxPerLookupUsd: "0.005",
      payer: "visitor-owned wallet; separate one-time wallet approval",
      passportWalletUsed: false
    },
    passport: { workerConfigured: kiteWorkerConfigured(), available: passport, livePaymentsEnabled: passport, reason: passport ? "The separate-session worker and explicit session ID are configured; verify approval and settlement independently." : "Configure SERV and the Kite CLI worker, then verify a fresh approved session and explicit-session execution before enabling live mode." },
    updatedAt: new Date().toISOString()
  }, { headers: { "Cache-Control": "no-store" } });
}
