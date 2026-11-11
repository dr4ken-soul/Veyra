import type { Metadata } from "next";
import Link from "next/link";
import CaseForm from "@/components/case-form";
import { liveModeReady, testModeReady } from "@/lib/runtime-config";
import { SCENARIOS } from "@/lib/domain";

export const metadata: Metadata = { title: "New case" };

export default function NewCasePage() {
  return (
    <>
      <header className="page-heading">
        <div>
          <p className="eyebrow">Cases / New</p>
          <h1>New case</h1>
          <p>Choose the decision you need evidence for.</p>
        </div>
        <Link className="button button-secondary" href="/app/cases">Back to cases</Link>
      </header>
      <CaseForm
        liveScenarios={SCENARIOS.filter((scenario) => liveModeReady(scenario))}
        testShipmentEnabled={testModeReady("shipment")}
      />
    </>
  );
}
