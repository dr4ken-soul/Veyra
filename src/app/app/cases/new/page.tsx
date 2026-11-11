import type { Metadata } from "next";
import Link from "next/link";
import CaseForm from "@/components/case-form";

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
      <CaseForm />
    </>
  );
}