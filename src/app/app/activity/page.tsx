import type { Metadata } from "next";
import Link from "next/link";
import { requirePageSession } from "@/lib/auth";
import { listActivity } from "@/lib/store";

export const metadata: Metadata = { title: "Activity" };
export const dynamic = "force-dynamic";

function eventLabel(value: string) {
  const labels: Record<string, string> = {
    "case.created": "Case created",
    "plan.validated": "Evidence plan validated",
    "fixture.evidence_returned": "Simulated evidence returned",
    "human.review_recorded": "Human review recorded"
  };
  return labels[value] || "Case event";
}

export default async function ActivityPage() {
  const session = await requirePageSession();
  if (!session) return null;
  const events = listActivity(session.orgId);
  return (
    <>
      <header className="page-heading">
        <div><h1>Activity</h1><p>Payment and evidence events for this workspace.</p></div>
      </header>
      <section className="panel settings-stack" aria-label="Activity events">
        {events.length === 0 ? (
          <div className="empty-inline">No activity yet. Events appear here after a case begins.</div>
        ) : events.map((event) => (
          <div className="list-row" key={event.id}>
            <time dateTime={event.occurredAt}>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }).format(new Date(event.occurredAt))}</time>
            <span>{eventLabel(event.eventType)} <span className="mode-label">Simulated</span></span>
            <Link href={"/app/cases/" + event.caseId}>Open case</Link>
          </div>
        ))}
      </section>
    </>
  );
}