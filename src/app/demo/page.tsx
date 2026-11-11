import type { Metadata } from "next";
import DemoPlayground from "@/components/demo-playground";

export const metadata: Metadata = { title: "Illustrative demo" };

export default function DemoPage() {
  return <DemoPlayground />;
}