import type { Metadata } from "next";
import DemoPlayground from "@/components/demo-playground";
import { publicWalletPaymentsEnabled } from "@/lib/runtime-config";

export const metadata: Metadata = {
  title: "Live company lookup",
  description: "Run a live French company registry lookup and approve a capped x402 payment from your own Base wallet."
};

export default function DemoPage() {
  return <DemoPlayground liveWalletPaymentsEnabled={publicWalletPaymentsEnabled()} />;
}
