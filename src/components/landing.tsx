"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const tabs = [
  {
    label: "Send a case",
    text: "Submit a scenario and only the fields needed for the question.",
    rows: [["scenario", "supplier"], ["question", "narrow"], ["mode", "fixture"]]
  },
  {
    label: "Receive evidence",
    text: "Read the source, retrieval time, result and payment status together.",
    rows: [["evidence", "source + time"], ["payment", "simulated"], ["receipt", "limitations"]]
  },
  {
    label: "Handle uncertainty",
    text: "Route incomplete or conflicting evidence to a person.",
    rows: [["decision", "needs_review"], ["action", "human review"], ["invoice", "not released"]]
  }
];

const phases = [
  ["01 / Identify", "Name the missing evidence", "SERV proposes the specific question a source needs to answer."],
  ["02 / Authorise", "Set the spending boundary", "You approve a task-specific Passport session before an eligible paid query."],
  ["03 / Review", "See what the evidence supports", "Veyra records the source, payment status and limitations, then asks for review when the evidence is incomplete."]
];

function MobileDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog ref={ref} className="mobile-nav-dialog" aria-label="Site navigation" onClose={onClose}>
      <div className="dialog-head">
        <span className="brand-word">Veyra</span>
        <button className="icon-button" type="button" aria-label="Close navigation" onClick={onClose}>Close</button>
      </div>
      <nav className="mobile-nav-links">
        <a href="#journey" onClick={onClose}>How it works</a>
        <a href="#integration" onClick={onClose}>Integration</a>
        <a href="#safety" onClick={onClose}>Safety</a>
        <Link className="button button-primary" href="/demo" onClick={onClose}>Explore the demo</Link>
      </nav>
    </dialog>
  );
}

function SiteNav() {
  const [compact, setCompact] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const update = () => setCompact(window.scrollY > 80);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return (
    <>
      <div className="site-nav-wrap">
        <div className={"site-nav " + (compact ? "is-compact" : "")}>
          <Link className="brand-word" href="/" aria-label="Veyra home">Veyra</Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            <a href="#journey">How it works</a>
            <a href="#integration">Integration</a>
            <a href="#safety">Safety</a>
          </nav>
          <Link className="button button-primary nav-cta" href="/demo">Explore the demo</Link>
          <button
            className="menu-trigger"
            type="button"
            aria-label="Open navigation"
            aria-expanded={menuOpen}
            aria-controls="site-mobile-navigation"
            onClick={() => setMenuOpen(true)}
          >Menu</button>
        </div>
      </div>
      <MobileDialog open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

function IntegrationTabs() {
  const [active, setActive] = useState(0);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  function keyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    setActive(next);
    refs.current[next]?.focus();
  }
  return (
    <div className="integration-explorer">
      <div className="tablist" role="tablist" aria-label="Evidence workflow">
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            ref={(element) => { refs.current[index] = element; }}
            id={"integration-tab-" + index}
            type="button"
            role="tab"
            aria-selected={active === index}
            aria-controls="integration-panel"
            tabIndex={active === index ? 0 : -1}
            className={"tab-button " + (active === index ? "is-active" : "")}
            onClick={() => setActive(index)}
            onKeyDown={(event) => keyDown(event, index)}
          >{tab.label}</button>
        ))}
      </div>
      <div className="integration-panel" id="integration-panel" role="tabpanel" tabIndex={0} aria-labelledby={"integration-tab-" + active}>
        <div className="integration-copy">
          <p className="eyebrow">A shared contract</p>
          <p>{tabs[active].text}</p>
        </div>
        <div className="contract-card" aria-label="Illustrative integration contract">
          <div className="contract-head">
            <span>Case response</span>
            <span className="mode-label">Illustrative</span>
          </div>
          <dl className="contract-rows">
            {tabs[active].rows.map(([label, value]) => (
              <div className="contract-row" key={label}>
                <dt>{label}</dt><dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="caption">Static contract diagram. No provider response is represented.</p>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("motion-ready");
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return () => root.classList.remove("motion-ready");
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) entry.target.classList.add("is-visible");
        else entry.target.classList.remove("is-visible");
      }
    }, { threshold: 0.1 });
    nodes.forEach((node) => observer.observe(node));
    return () => {
      observer.disconnect();
      root.classList.remove("motion-ready");
    };
  }, []);

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <SiteNav />
      <main id="main-content">
        <section className="hero section-texture" id="top">
          <div className="container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow reveal">Evidence procurement for business workflows</p>
              <h1 className="hero-title reveal">Buy the proof<br className="desktop-break" /> before you decide</h1>
              <p className="hero-subtitle reveal">Veyra finds missing evidence and pays for supported checks within a budget you approve.</p>
              <div className="hero-actions reveal">
                <Link className="button button-primary" href="/demo">Explore the demo <span aria-hidden="true">↗</span></Link>
              </div>
            </div>
            <div className="hero-receipt-wrap reveal">
              <article className="receipt-card">
                <div className="receipt-header">
                  <h2>Evidence receipt</h2>
                  <span className="mode-label">Illustrative</span>
                </div>
                <dl className="receipt-rows">
                  <div><dt>Question</dt><dd>Is the company registered?</dd></div>
                  <div><dt>Source</dt><dd>Registry record</dd></div>
                  <div><dt>Outcome</dt><dd>Further review required</dd></div>
                </dl>
                <p className="caption">Example only. It is not a live result or a payment receipt.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="problem-section">
          <div className="container">
            <h2 className="statement reveal">A decision is only as useful as the evidence behind it.</h2>
          </div>
        </section>

        <section className="journey-section section-texture" id="journey">
          <div className="journey-track">
            <div className="container journey-sticky">
              <div className="journey-intro reveal">
                <p className="eyebrow">A bounded workflow</p>
                <h2 className="section-title">From uncertainty to evidence</h2>
                <p className="body-copy">Each step has a purpose, a spending boundary and a record.</p>
              </div>
              <div className="journey-panel reveal">
                <ol className="journey-list">
                  {phases.map(([label, title, description]) => (
                    <li className="journey-phase" key={label}>
                      <span className="phase-label">{label}</span>
                      <h3>{title}</h3>
                      <p>{description}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        <section className="integration-section" id="integration">
          <div className="container">
            <div className="section-intro reveal">
              <p className="eyebrow">Built to connect</p>
              <h2 className="section-title">Evidence belongs in your workflow</h2>
              <p className="body-copy">Send a case, receive a sourced result and keep the final decision in your own system.</p>
            </div>
            <div className="reveal"><IntegrationTabs /></div>
          </div>
        </section>

        <section className="safety-section section-texture" id="safety">
          <div className="container">
            <div className="section-intro reveal">
              <p className="eyebrow">Clear limits</p>
              <h2 className="section-title">A boundary around every purchase</h2>
            </div>
            <div className="safety-grid">
              <article className="safety-card safety-wide reveal">
                <span className="safety-index">01</span>
                <h3>You approve the session</h3>
                <p>Passport asks you to approve the task, spending limits and expiry with your passkey.</p>
              </article>
              <article className="safety-card reveal">
                <span className="safety-index">02</span>
                <h3>Providers are explicit</h3>
                <p>A provider must be supported and permitted. An adapter may be needed.</p>
              </article>
              <article className="safety-card reveal">
                <span className="safety-index">03</span>
                <h3>Evidence has limits</h3>
                <p>A company record does not prove a bank account belongs to that company.</p>
              </article>
              <article className="safety-card safety-wide reveal">
                <span className="safety-index">04</span>
                <h3>Uncertainty stops the flow</h3>
                <p>If payment status or evidence is unclear, Veyra pauses for review.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="final-section">
          <div className="container">
            <div className="final-copy reveal">
              <p className="eyebrow">See the evidence boundary</p>
              <h2 className="section-title">See how Veyra finds the missing proof</h2>
              <p className="body-copy">Explore an illustrative case, then connect a supported spending session when you are ready.</p>
              <Link className="button button-primary" href="/demo">Explore the demo <span aria-hidden="true">↗</span></Link>
            </div>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <div>
            <p className="brand-word">Veyra</p>
            <p className="footer-copy">Built for SERV Hackathon Edition 02</p>
          </div>
          <nav aria-label="Footer">
            <a href="https://docs.openserv.ai/serv-reasoning/introduction.md" target="_blank" rel="noreferrer">Documentation</a>
            <a href="https://github.com/dr4ken-soul/Veyra" target="_blank" rel="noreferrer">Repository</a>
            <a href="https://openserv.typeform.com/submissions02" target="_blank" rel="noreferrer">Submission</a>
          </nav>
        </div>
      </footer>
    </>
  );
}