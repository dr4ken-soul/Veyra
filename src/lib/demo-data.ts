import type { Scenario } from "@/lib/domain";

export const DEMO_SCENARIOS: Record<Scenario, {
  subject: string;
  evidence: string;
  verdict: string;
  limitation: string;
}> = {
  supplier: {
    subject: "Northstar Components Ltd",
    evidence: "Simulated registry-style record",
    verdict: "Review required",
    limitation: "A company record does not establish who owns the bank account."
  },
  shipment: {
    subject: "Synthetic Parcel PX-2048",
    evidence: "Simulated carrier event",
    verdict: "Review required",
    limitation: "A delivered status does not prove package contents or condition."
  },
  registration: {
    subject: "Example registration 00000000",
    evidence: "Simulated registration-style record",
    verdict: "Insufficient evidence",
    limitation: "This is not an official registry result or a check of identity, sanctions or solvency."
  }
};