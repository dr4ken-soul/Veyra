import type { Metadata } from "next";
import Link from "next/link";
import { SCENARIOS, SCENARIO_LABELS, validateScenario } from "@/lib/domain";
import { requirePageSession } from "@/lib/auth";
import { listCaseRecords } from "@/lib/store";

export const metadata: Metadata = { title: "Cases" };
export const dynamic = "force-dynamic";

function statusLabel(state: string) {
  if (state === "needs_review") return "Review required";
  if (state === "insufficient_evidence") return "Insufficient evidence";
  if (state === "planned") return "Plan ready";
  return "Draft";
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }).format(new Date(value));
}

export default async function CasesPage({ searchParams }: { searchParams: Promise<{ scenario?: string; state?: string; mode?: string }> }) {
  const session = await requirePageSession();
  if (!session) return null;
  const params = await searchParams;
  const scenario = params.scenario && validateScenario(params.scenario) ? params.scenario : undefined;
  const state = params.state || undefined;
  const mode = params.mode === "fixture" ? "fixture" : undefined;
  const records = await listCaseRecords(session.orgId, { scenario, state, mode });

  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Cases</h1>
          <p>Review evidence gaps and the limits of each result.</p>
        </div>
        <Link className="button button-primary" href="/app/cases/new">New case</Link>
      </header>
      <form className="case-filters" action="/app/cases" method="get">
        <label className="sr-only" htmlFor="filter-scenario">Scenario filter</label>
        <select className="text-input filter-select" id="filter-scenario" name="scenario" defaultValue={scenario || ""}>
          <option value="">All scenarios</option>
          {SCENARIOS.map((item) => <option key={item} value={item}>{SCENARIO_LABELS[item]}</option>)}
        </select>
        <label className="sr-only" htmlFor="filter-state">Status filter</label>
        <select className="text-input filter-select" id="filter-state" name="state" defaultValue={state || ""}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="planned">Plan ready</option>
          <option value="needs_review">Review required</option>
          <option value="insufficient_evidence">Insufficient evidence</option>
        </select>
        <label className="sr-only" htmlFor="filter-mode">Mode filter</label>
        <select className="text-input filter-select" id="filter-mode" name="mode" defaultValue={mode || ""}>
          <option value="">All modes</option>
          <option value="fixture">Simulated</option>
        </select>
        <button className="button button-secondary" type="submit">Apply filters</button>
      </form>

      {records.length === 0 ? (
        <section className="empty-state">
          <h2>No cases yet</h2>
          <p>Create a case to investigate a specific evidence gap.</p>
          <Link className="button button-primary" href="/app/cases/new">New case</Link>
        </section>
      ) : (
        <>
          <div className="case-table-wrap">
            <table className="case-table">
              <thead><tr><th scope="col">Case</th><th scope="col">Scenario</th><th scope="col">Status</th><th scope="col">Mode</th><th scope="col">Updated</th></tr></thead>
              <tbody>
                {records.map((item) => (
                  <tr key={item.id}>
                    <td><Link href={"/app/cases/" + item.id}>{item.question}</Link></td>
                    <td>{SCENARIO_LABELS[item.scenario]}</td>
                    <td>{statusLabel(item.state)}</td>
                    <td>Simulated</td>
                    <td><time dateTime={item.updatedAt}>{dateLabel(item.updatedAt)}</time></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="case-mobile-list">
            {records.map((item) => (
              <article className="mobile-list-card" key={item.id}>
                <h2><Link href={"/app/cases/" + item.id}>{SCENARIO_LABELS[item.scenario]}</Link></h2>
                <p>{statusLabel(item.state)} · Simulated</p>
                <p><time dateTime={item.updatedAt}>{dateLabel(item.updatedAt)}</time></p>
              </article>
            ))}
          </div>
        </>
      )}
    </>
  );
}
