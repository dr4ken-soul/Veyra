# Veyra | Frontend Specification

Status: design source of truth. The local application code has been built to this specification; no production deployment or live integration is implied.

## 0. Identity and confirmed decisions

- Product: API-first evidence procurement through SERV Reasoning and a user-approved Kite Passport session.
- Name: Veyra. Name, domain and trademark availability have not been verified.
- Gate 1: bento grid operational.
- Gate 2: A2 scroll-morph landing navigation. App: desktop sidebar and mobile menu.
- Gate 3: static atmospheric background, one pinned storytelling section. Non-essential motion respects reduced-motion preferences.
- Gate 4: Manrope and IBM Plex Mono.
- Gate 5: cool-neutral and deep copper-orange palette.
- Gate 6: top-left lead, product receipt anchored lower-right.
- Gate 7: hero, problem, pinned journey, integration explorer, spending and safety, final action, footer.
- Fingerprint: top-left lead and bottom-right support / Swiss rational / monochrome and one pop / solid plus inline product visual / editorial stagger / scroll-driven narrative.
- Dials, landing: DESIGN_VARIANCE 5, MOTION_INTENSITY 5, VISUAL_DENSITY 4. App: 3, 2, 7.
- Trend influences: precision of a blueprint only where diagrams convey real information, plus restrained operational evidence labels. No decorative surveillance interface.

**Design read:** A measured B2B product that makes an agent's evidence, spending authority and uncertainty visible. The landing page has a controlled narrative; the app favours direct action and legibility.

## 1. Global visual system

### 1.1 Typography

- Load [Manrope 400, 500, 600, 700 and IBM Plex Mono 400, 500, 600](https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap). Use `font-display: swap`; self-host permitted licensed files for network-isolated deployments. Fallbacks: `Manrope, sans-serif` and `IBM Plex Mono, monospace`.
- Alias `font-sans` to Manrope and `font-mono` to IBM Plex Mono. Body is 16px minimum except metadata, which is 12px or larger. Limit long text to 65ch. Headings use balanced wrapping; paragraphs use pretty wrapping.
- Hero headline: `font-sans text-[clamp(2.6rem,6.2vw,5.6rem)] font-semibold leading-[0.98] tracking-[-0.045em] text-[var(--text-primary)]`.
- Section heading: `font-sans text-3xl sm:text-4xl lg:text-[3.25rem] font-semibold leading-[1.05] tracking-[-0.035em] text-[var(--text-primary)]`.
- Body: `font-sans text-base leading-7 text-[var(--text-secondary)]`.
- Metadata: `font-mono text-xs leading-5 tracking-[0.01em] text-[var(--text-secondary)]`. Case identifiers use `tabular-nums`.

### 1.2 Confirmed tokens

| Token | Value |
|---|---|
| `--bg-primary` | `#f2f3ef` |
| `--bg-secondary` | `#e7e9e4` |
| `--bg-surface` | `#fafbf7` |
| `--bg-elevated` | `#fdfefa` |
| `--text-primary` | `#1c2521` |
| `--text-secondary` | `#535c56` |
| `--text-muted` | `#68706b` |
| `--accent` | `#934c12` |
| `--accent-hover` | `#86410b` |
| `--border-default` | `#c9cfca` |
| `--success` | `#206047` |
| `--error` | `#a62e36` |

Additional functional tokens, proposed for implementation consistency: `--border-strong: #8b948e`, `--focus: #263d73`, `--on-accent: #fafbf7`, `--scrim: rgba(28,37,33,0.62)`. Their role is functional, not an additional decorative palette. Recheck all foreground/background combinations at build time: normal text 4.5:1, large text 3:1, focus and required non-text boundaries 3:1. Do not use `--text-muted` on `--bg-secondary` as normal text without verifying contrast. Prefer `--text-secondary` for explanatory text.

### 1.3 Layout, controls and semantics

- Outer section: `relative w-full` with a plain inner layout container `mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-14`.
- Landing spacing: `py-20 md:py-28 lg:py-32`. App spacing: `px-5 py-6 sm:px-8 lg:px-10`.
- Grid: `grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8`. Do not use percentage-based flex arithmetic.
- Primary button: `inline-flex min-h-11 items-center justify-center gap-3 rounded-lg bg-[var(--accent)] px-5 py-3 font-sans text-sm font-semibold text-[var(--on-accent)] transition-colors duration-200 hover:bg-[var(--accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-50`.
- Secondary button: `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--border-strong)] bg-transparent px-5 py-3 font-sans text-sm font-semibold text-[var(--text-primary)] transition-colors duration-200 hover:bg-[var(--bg-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-50`.
- Text link: `inline-flex min-h-11 items-center gap-2 font-sans text-sm font-semibold text-[var(--accent)] underline decoration-[var(--border-strong)] underline-offset-4 transition-colors duration-200 hover:text-[var(--accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]`.
- Input: `min-h-11 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2.5 font-sans text-base text-[var(--text-primary)] outline-none transition-colors duration-200 placeholder:text-[var(--text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]`.
- Field label: `mb-2 block font-sans text-sm font-semibold text-[var(--text-primary)]`. Field help/error: `mt-2 font-sans text-sm leading-6 text-[var(--text-secondary)]`, with error text `text-[var(--error)]` and `aria-describedby`.
- Panel: `rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6`. Dividers, not separate cards, separate dense app rows.
- A status is text plus a small shape, never colour alone. Modes: `Illustrative`, `Simulated`, `Test` and `Live` are explicit text, not implied by colour.
- All icons are non-brand functional inline SVG with accessible names where needed. No emoji, icon library or brand symbol is introduced by default. Use the word `Veyra` as plain type, not a constructed logo. Ask before adding a logo, favicon, sponsor symbol or other brand mark.
- No fake activity, customer logo, unsupported metric, assurance or settlement. Demo/example UI is labelled as such. No CSS `backdrop-filter` on scrolling cards. No em dashes in generated UI or spec copy.

### 1.4 Layer stack

Named global levels: page background `z-0`; section texture `z-[1]`; section visual `z-[5]`; content `z-10`; in-section interaction `z-20`; dropdown `z-[100]`; sticky app/landing navigation `z-[200]`; modal scrim `z-[300]`; modal `z-[400]`; toast `z-[500]`; tooltip `z-[600]`. Portals and native top-layer dialogs escape clipped ancestors. Each section below repeats its local stack. Modal must sit above its scrim. A fixed grain layer is never placed above interactive content.

### 1.5 Motion and texture

- Base section reveal: initial `{ opacity: 0, y: 16, filter: 'blur(6px)' }`; visible `{ opacity: 1, y: 0, filter: 'blur(0px)' }`; duration `0.55s`; easing `[0.16,1,0.3,1]`; base delay `0s`; grouped delays `0s, 0.05s, 0.10s, 0.15s`.
- Scroll-triggered reveals use `viewport: { once: false, amount: 0.1 }`; replay on entry in both scroll directions. Set final visible state if JavaScript is unavailable. Never animate live transaction amounts or conceal an error while scrolling.
- Hero entrance: same base states, `0.6s`, easing `[0.16,1,0.3,1]`; headline delay `0.1s`, subheading `0.2s`, primary action `0.3s`, receipt `0.4s`.
- Nav morph: max-width, padding and border changes should be implemented as a transform/opacity-based compact variant over `240ms`, easing `[0.16,1,0.3,1]`, no focus loss. Both variants remain reachable by keyboard.
- In-app state change: opacity `0.7 -> 1`, duration `160ms`, easing `[0.16,1,0.3,1]`, delay `0s`. Buttons use CSS colour transitions only. Do not animate focus, spending totals or security-critical warnings.
- `prefers-reduced-motion: reduce`: remove pinning, transitions and blur, show content immediately in normal document order, keep every control and message available. No autoplay video or WebGL.
- Static fine noise: inline SVG fractal-noise texture over the landing surface only, `absolute inset-0 z-[1] pointer-events-none opacity-[0.025]`, 128px tile. Noise never carries meaning. No texture over app tables or receipts.
- Scrollbar: per reference, hide the visual scrollbar using `scrollbar-width: none` on the document and `display: none` on the WebKit scrollbar pseudo-element, while preserving keyboard, wheel and touch scrolling. Honour reduced-motion preferences instead of forcing smooth scrolling.

## 2. Landing navigation

**Pattern:** A2 scroll-morph, bespoke, adapted to the approved product. **Stack:** page `z-0`, content `z-10`, fixed navigation `z-[200]`, dropdown `z-[100]` within portal layer, modal `z-[400]`.

- Fixed wrapper: `fixed inset-x-0 top-3 z-[200] px-4 sm:top-4 sm:px-8 lg:px-14`.
- Wide shell: `mx-auto flex min-h-14 max-w-[1440px] items-center justify-between gap-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2 sm:px-5`.
- Compact shell after 80px scroll: `mx-auto flex min-h-12 max-w-[780px] items-center justify-between gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2`. Transform-based 240ms morph per section 1.5; no fragile hover-only links.
- Brand text: `font-sans text-lg font-bold tracking-[-0.04em] text-[var(--text-primary)]`. Label: `Veyra`.
- Desktop links: `hidden items-center gap-6 md:flex`; each `inline-flex min-h-11 items-center font-sans text-sm font-medium text-[var(--text-secondary)] transition-colors duration-200 hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]`. Labels: `How it works`, `Integration`, `Safety`.
- Primary action: shared button class, label `Explore the demo`. Route to the case demo. If access is not ready, show a truthful recovery state, not a dead link.
- Mobile trigger: `inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-primary)] md:hidden`; accessible label `Open navigation`, `aria-expanded`, `aria-controls`. The compact scroll state must still expose this trigger.
- Mobile menu: portal/dialog, `fixed inset-x-4 top-20 z-[400] rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5`; scrim `fixed inset-0 z-[300] bg-[var(--scrim)]`. Open state `{opacity:0,y:-8,filter:'blur(4px)'} -> {opacity:1,y:0,filter:'blur(0px)'}`, 200ms, easing `[0.16,1,0.3,1]`, delay 0. Close 130ms, reverse. Focus trap, Escape, close button and focus return are mandatory.

## 3. Hero

**Recipe reference:** `product-mockup-hero`, structurally reinterpreted as an asymmetric top-left lead with a lower-right receipt. No centred dashboard screenshot, gradient text or copied reference artwork. **Stack:** surface `z-0`, texture `z-[1]`, receipt visual `z-[5]`, copy and action `z-10`, nav `z-[200]`.

- Section: `relative min-h-[100dvh] w-full overflow-hidden bg-[var(--bg-primary)]`.
- Container: `relative z-10 mx-auto grid min-h-[100dvh] w-full max-w-[1440px] grid-cols-1 gap-10 px-5 pb-16 pt-28 sm:px-8 md:pt-32 lg:grid-cols-12 lg:gap-8 lg:px-14 lg:pb-20`.
- Copy group: `flex flex-col items-start lg:col-span-7 lg:max-w-[760px]`.
- Headline: global hero class, max two desktop lines; text `Buy the proof before you decide`.
- Subheading: `mt-5 max-w-[45ch] font-sans text-base leading-7 text-[var(--text-secondary)] sm:text-lg sm:leading-8`; text `Veyra finds missing evidence and pays for supported checks within a budget you approve.`
- CTA: primary button after `mt-7`; text `Explore the demo`. Gap from preceding copy is 28px, not more than 40px.
- Receipt zone: `relative w-full lg:col-span-5 lg:self-end`; receipt shell `w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-5 sm:p-6`.
- Receipt header: `flex items-start justify-between gap-4 border-b border-[var(--border-default)] pb-4`; title `font-sans text-base font-semibold text-[var(--text-primary)]`, text `Evidence receipt`; mode `rounded-md border border-[var(--border-default)] px-2 py-1 font-mono text-xs text-[var(--text-secondary)]`, text `Illustrative`.
- Receipt rows: `grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4 border-b border-[var(--border-default)] py-3 last:border-0`. Labels `font-sans text-sm text-[var(--text-secondary)]`; values `font-mono text-sm leading-6 text-[var(--text-primary)]`.
- Rows: `Question | Is the company registered?`; `Source | Registry record`; `Outcome | Further review required`. Caption `mt-4 font-sans text-xs leading-5 text-[var(--text-secondary)]`: `Example only. It is not a live result or a payment receipt.` Do not depict an actual paid amount or transaction ID in this illustration.
- Entrance: hero stagger per section 1.5. At 1280 x 800 the entire copy and CTA remain visible with first text above 220px. At 320px the column is stacked, no clipped text or horizontal scroll.

**Asset brief:** Bespoke receipt is a semantic, coded UI specimen, not an image or logo. No external asset needed. Build the visual only after approval of code. No brand symbol or generated decorative placeholder.

## 4. Problem statement

**Recipe reference:** `full-width-statement`, adapted. **Stack:** base `z-0`, texture `z-[1]`, statement `z-10`, fixed nav `z-[200]`.

- Section `relative w-full bg-[var(--bg-secondary)] py-20 md:py-28`.
- Inner `relative z-10 mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-14`.
- Statement `max-w-[20ch] font-sans text-[clamp(2rem,4.2vw,4rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-[var(--text-primary)]`.
- Copy: `A decision is only as useful as the evidence behind it.`
- No statistic, decorative eyebrow or CTA. Base reveal, delay 0s; replay on re-entry.

## 5. Pinned evidence journey

**Recipe reference:** bespoke operational adaptation informed by the pinned-storytelling guidance, not a copied recipe. One pinned section only. **Stack:** section base `z-0`, texture `z-[1]`, progress line `z-[5]`, content `z-10`, active phase `z-20`, nav `z-[200]`.

- Outer section: `relative w-full bg-[var(--bg-primary)]`; desktop pin container uses a measured scroll range equivalent to `240vh`, not a fixed mobile height. Sticky viewport `sticky top-0 min-h-[100dvh] overflow-hidden` on supported desktop, otherwise normal flow.
- Container `relative z-10 mx-auto grid min-h-[100dvh] w-full max-w-[1440px] grid-cols-1 items-center gap-10 px-5 py-20 sm:px-8 lg:grid-cols-12 lg:px-14`.
- Intro `lg:col-span-4`; heading global section class, copy `From uncertainty to evidence`. Supporting copy `mt-5 max-w-[38ch] font-sans text-base leading-7 text-[var(--text-secondary)]`, text `Each step has a purpose, a spending boundary and a record.`
- Phase area `lg:col-span-8`; one visible phase panel `rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 sm:p-8 lg:p-10`. Phase label `font-mono text-xs text-[var(--text-secondary)]`; phase title `mt-3 font-sans text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]`; body `mt-4 max-w-[48ch] font-sans text-base leading-7 text-[var(--text-secondary)]`.
- Phase content in DOM and accessible in order:
  1. `Identify` / `Name the missing evidence` / `SERV proposes the specific question a source needs to answer.`
  2. `Authorise` / `Set the spending boundary` / `You approve a task-specific Passport session before an eligible paid query.`
  3. `Review` / `See what the evidence supports` / `Veyra records the source, payment status and limitations, then asks for review when the evidence is incomplete.`
- Phase indicator list `mt-8 flex flex-wrap gap-3`; each `rounded-md border border-[var(--border-default)] px-3 py-2 font-mono text-xs text-[var(--text-secondary)]`; active state adds `border-[var(--accent)] text-[var(--text-primary)]` and `aria-current=step`.
- Desktop scroll progress maps 0.00 to 0.33, 0.34 to 0.66 and 0.67 to 1.00 to phases. Phase exit `{opacity:1,y:0,filter:'blur(0px)'} -> {opacity:0,y:-8,filter:'blur(4px)'}`, 180ms; enter `{opacity:0,y:12,filter:'blur(6px)'} -> {opacity:1,y:0,filter:'blur(0px)'}`, 300ms; both ease `[0.16,1,0.3,1]`, delay 0. Sequence reverses when scrolling up. Avoid changing content while a keyboard user is focused inside it; phases are informational, not required controls.
- Below `lg`, no pin: phases stack as ordinary semantic articles, `grid grid-cols-1 gap-4`. Reduced motion also stacks. Section title uses base reveal 0s; stacked phase reveals delays `0s,0.05s,0.10s` and replay on re-entry, except reduced motion.

**Asset brief:** No video or external art. The visual is the text and a small, accurate three-state evidence record. Do not use a background schematic implying an actual completed transaction.

## 6. Integration explorer

**Recipe reference:** `tabbed-feature-explorer`, adapted to a working API-first product. **Stack:** surface `z-0`, tab content `z-10`, tab focus `z-20`, nav `z-[200]`.

- Section `relative w-full bg-[var(--bg-surface)] py-20 md:py-28`. Inner standard container.
- Heading global section class, text `Evidence belongs in your workflow`.
- Intro `mt-4 max-w-[55ch] font-sans text-base leading-7 text-[var(--text-secondary)]`, text `Send a case, receive a sourced result and keep the final decision in your own system.`
- Tabs `mt-10 flex gap-1 overflow-x-auto border-b border-[var(--border-default)]`. Tab `min-h-11 whitespace-nowrap px-4 py-3 font-sans text-sm font-semibold text-[var(--text-secondary)] transition-colors duration-200 hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)]`; selected adds `border-b-2 border-[var(--accent)] text-[var(--text-primary)]`. Labels `Send a case`, `Receive evidence`, `Handle uncertainty`.
- Panel `mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8`. Text `lg:col-span-5`; visual `lg:col-span-7 rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-5 sm:p-6`.
- Tab explanations: `Send a case`: `Submit a scenario and only the fields needed for the question.` `Receive evidence`: `Read the source, retrieval time, result and payment status together.` `Handle uncertainty`: `Route incomplete or conflicting evidence to a person.`
- Visual is an illustrative, non-executable contract diagram: field labels `scenario`, `question`, `status`, `evidence` in `font-mono text-xs leading-6 text-[var(--text-primary)]`. Mark `Illustrative` using the mode label style from the hero. Do not show a fabricated endpoint result as live.
- Proper `tablist`, `tab`, `tabpanel`, roving tabindex, arrows/Home/End, Enter/Space and focus persistence. Switching: `{opacity:0,y:8,filter:'blur(4px)'} -> {opacity:1,y:0,filter:'blur(0px)'}`, 180ms, easing `[0.16,1,0.3,1]`, delay 0. Section title uses base scroll reveal 0s, panel 0.05s; replays.

**Asset brief:** No external imagery. The contract diagram is a labelled product explanation, not executable code or a brand mark.

## 7. Spending and safety

**Recipe reference:** `asymmetric-bento-grid`, adapted to four unequal content cells and no stock images. **Stack:** background `z-0`, texture `z-[1]`, content `z-10`, nav `z-[200]`.

- Section `relative w-full bg-[var(--bg-secondary)] py-20 md:py-28`; standard container.
- Heading global section class `A boundary around every purchase`.
- Grid `mt-10 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-12 lg:gap-4`.
- Cell base `rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6`; title `font-sans text-lg font-semibold tracking-[-0.02em] text-[var(--text-primary)]`; copy `mt-3 font-sans text-sm leading-6 text-[var(--text-secondary)]`.
- `lg:col-span-7`: `You approve the session` / `Passport asks you to approve the task, spending limits and expiry with your passkey.`
- `lg:col-span-5`: `Providers are explicit` / `A provider must be supported and permitted. An adapter may be needed.`
- `lg:col-span-5`: `Evidence has limits` / `A company record does not prove a bank account belongs to that company.`
- `lg:col-span-7`: `Uncertainty stops the flow` / `If payment status or evidence is unclear, Veyra pauses for review.`
- Each cell uses base scroll reveal with respective delays `0s,0.05s,0.10s,0.15s`. Hover changes border colour only over 200ms, no fake glow or tilt. Do not claim the app policy replaces Passport limits.

## 8. Final action and footer

**Final action recipe:** bespoke conversion band. **Stack:** background `z-0`, texture `z-[1]`, content `z-10`, nav `z-[200]`.
- Section `relative w-full bg-[var(--bg-primary)] py-24 md:py-32`; inner standard container.
- Content `relative z-10 flex max-w-[760px] flex-col items-start`.
- Heading global section class: `See how Veyra finds the missing proof`.
- Copy `mt-5 max-w-[48ch] font-sans text-base leading-7 text-[var(--text-secondary)]`: `Explore an illustrative case, then connect a supported spending session when you are ready.`
- Primary button shared style with `mt-7`, label `Explore the demo`. Base reveal delays heading 0s, body 0.05s, action 0.10s; replay.

**Footer stack:** background `z-0`, content `z-10`, nav `z-[200]`.
- Section `relative w-full border-t border-[var(--border-default)] bg-[var(--bg-surface)] py-10`.
- Container `mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-5 sm:px-8 md:flex-row md:items-end md:justify-between lg:px-14`.
- Name `font-sans text-lg font-bold tracking-[-0.04em] text-[var(--text-primary)]`; supporting text `mt-2 font-sans text-sm leading-6 text-[var(--text-secondary)]`: `Built for SERV Hackathon Edition 02`.
- Link row `flex flex-wrap gap-x-6 gap-y-2`. Only display `Documentation`, `Repository` and `Submission` when real URLs exist. Use shared link style. No manufactured social proof or placeholder href.

## 9. App shell and routes

Use actual verified user authentication for private app data. A public illustrated demo can be accessed without auth only when it contains no real tenant or financial data. Do not gate the whole app on a generic EVM wallet: Passport passkey authorisation and application login are different concepts.

- Public routes: `/` and `/demo` (illustrative or user-selected labelled fixture). Private routes: `/app/cases`, `/app/cases/new`, `/app/cases/[id]`, `/app/activity`, `/app/settings`, `/app/sessions/[id]`. Every route has a meaningful direct URL and clear recovery state.
- App root `min-h-[100dvh] bg-[var(--bg-primary)] text-[var(--text-primary)]`.
- Desktop sidebar `fixed inset-y-0 left-0 z-[200] hidden w-60 flex-col border-r border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-6 lg:flex`. Main content `min-w-0 lg:pl-60`.
- Sidebar brand `px-3 font-sans text-lg font-bold tracking-[-0.04em]`; nav group `mt-10 flex flex-col gap-1`; nav item `flex min-h-11 items-center rounded-lg px-3 font-sans text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus)]`; active `bg-[var(--bg-secondary)] font-semibold text-[var(--text-primary)]`, plus `aria-current=page`. Labels `Cases`, `Activity`, `Settings`.
- App topbar `sticky top-0 z-[200] flex min-h-16 items-center justify-between gap-4 border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-5 sm:px-8 lg:px-10`. App mobile menu button opens an accessible drawer; drawer uses the same modal stack and dismissal rules as landing nav, `lg:hidden`.
- Main `mx-auto w-full max-w-[1280px] px-5 py-6 sm:px-8 lg:px-10 lg:py-8`. Add `Skip to main content` as first focusable link. Focus the main heading after navigation, preserve back navigation and URL filters. Breadcrumbs for three or more levels.
- Root error boundary shows `This page could not load` and `Try again` plus `Return to cases`. Never display a stack trace. If auth is hydrating, show `Checking your session` with a static skeleton and keep the requested URL. If confirmed signed out, redirect to the actual sign-in route with a safe return URL. If auth provider errors, show a retry, not a false sign-out. For Next.js, deployment must serve nested routes; test real host behaviour, not an SPA rewrite copied from an unrelated Vite project.

## 10. App screens and states

All app screens use the global button, label, input, panel and motion classes from sections 1.3 and 1.5. Stack: app surface `z-0`, content `z-10`, action menu `z-[100]`, sidebar/topbar `z-[200]`, scrim `z-[300]`, dialog `z-[400]`, toast `z-[500]`, tooltip `z-[600]`.

### 10.1 Cases

- Header `flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between`; h1 `font-sans text-3xl font-semibold tracking-[-0.035em]`, text `Cases`; action `New case` uses primary button.
- Filters `mt-8 flex flex-wrap items-center gap-3`; buttons use secondary style, visible text `All scenarios`, `All statuses`, `All modes`. Filters are reflected in query parameters.
- Table container `mt-6 overflow-x-auto rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]`; table `w-full min-w-[680px] border-collapse text-left`; headers `border-b border-[var(--border-default)] px-4 py-3 font-sans text-xs font-semibold text-[var(--text-secondary)]`; rows `border-b border-[var(--border-default)] last:border-0`; cells `px-4 py-4 font-sans text-sm text-[var(--text-primary)]`. Columns `Case`, `Scenario`, `Status`, `Mode`, `Updated`.
- On narrow screens use the same records as stacked articles `grid grid-cols-1 gap-3 lg:hidden`, not a clipped table; desktop table `hidden lg:block`.
- Empty `rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-8`; title `No cases yet`; body `Create a case to investigate a specific evidence gap.`; action `New case`.
- Loading skeleton `h-14 animate-pulse rounded-lg bg-[var(--bg-secondary)]`, 4 rows, with live region text `Loading cases`. For reduced motion remove pulse. Error: `Cases could not be loaded. Check your connection and try again.` with `Try again`.

### 10.2 New case

- Heading `New case`; intro `Choose the decision you need evidence for.`
- Scenario group `mt-8 grid grid-cols-1 gap-3 md:grid-cols-3`; label and radio each use `rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5`; selected adds `border-[var(--accent)] ring-2 ring-[var(--accent)]`. Labels `Supplier change`, `Shipment status`, `Business registration`.
- Main form `mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12`; form column `lg:col-span-7`, guidance `lg:col-span-5`.
- Scenario fields, all visibly labelled: supplier: `Supplier name`, `Company registration number`, `Jurisdiction`, `What changed?`; shipment: `Carrier`, `Tracking reference`, `Claimed status`; registration: `Company registration number`, `Jurisdiction`. Do not ask for full bank-account details for a registry lookup.
- Mode selector label `Environment`, options `Simulated`, `Test`, `Live`; `Test` and `Live` disabled with an explanation until preflight confirms support. A disabled option must not imply it has been tested.
- Submit `Create case`. Validation occurs on blur and submit, focuses first invalid field. Required-field error `Enter a value before continuing.` A live context data notice must disclose source and operator before transmission.
- Case creation loading: button `Creating case` plus a reserved-height skeleton, not a fake progress percentage. Error `The case was not created. Check the fields and try again.`

### 10.3 Case detail and evidence plan

- Heading region `flex flex-col gap-3 md:flex-row md:items-start md:justify-between`; title `Case details`; case ID `font-mono text-xs text-[var(--text-secondary)]`; mode badge and status are visible text.
- Layout `mt-8 grid grid-cols-1 gap-6 xl:grid-cols-12`; primary `xl:col-span-8`, supporting `xl:col-span-4`. Use panel base.
- Section order: `Question`, `Evidence plan`, `Spending session`, `Evidence`, `Decision`. Each section heading `font-sans text-lg font-semibold`; rows `grid grid-cols-1 gap-1 border-b border-[var(--border-default)] py-4 sm:grid-cols-[12rem_1fr] sm:gap-6`.
- Plan fields `Missing question`, `Proposed source`, `Why this source`, `Expected cost`, `Limitations`. No source, price or provider is shown unless actually known. Unknown value text `Not confirmed`.
- Action before planning `Create evidence plan`. Pending `Preparing the evidence plan`. Error `The evidence plan could not be validated. No payment was made.` Action `Try again`.
- No evidence state `No evidence has been retrieved for this case.` Action `Review spending session` only after a valid plan exists.
- Receipt `mt-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5`. Rows: source operator; upstream source; retrieval time; source time if known; matched subject; payment amount, asset and network; payment state; transaction reference if confirmed; evidence limitations; environment. Link is present only when the true explorer destination is verified.
- Decision banner `mt-5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-secondary)] p-4`; status text `Review required`, `Evidence supports the narrow question`, `Insufficient evidence` or `Blocked`. Body must explain scope. For changed supplier bank details: `The company record does not establish who owns the bank account. Review the change before paying the invoice.`
- Human review action `Record review` opens a dialog asking for an action and optional note. This only records review; it does not release an invoice.

### 10.4 Spending session and Passport approval

- Page heading `Spending session`; helper `Approve a task-specific limit with Kite Passport. Veyra cannot raise it.`
- Session summary panel includes `Task`, `Provider`, `Maximum per payment`, `Total limit`, `Asset`, `Network`, `Expires`, `Status`. Values come from verified data, not UI estimates. Application-specific allowed-provider policy is identified as Veyra's control, not a claim that Passport enforces it.
- Form uses labelled numeric inputs for limits and an expiry control, with a visible currency/network label. Validate using integer minor units on the server. Action `Request session`.
- States: `Not requested`; `Approval required`; `Checking approval`; `Active`; `Expired`; `Exhausted`; `Approval failed`; `Unavailable`. Status has text and non-colour cue.
- `Approval required` shows verified external destination, task, limits and `Open Passport approval`. Open the real provider approval URL in a new tab with safe link attributes; never implement a fake passkey modal. Tell user `Your passkey approval happens in Kite Passport.` Provide `Check approval` and `Cancel`.
- No-session/expired state: `This session cannot pay for a query. Request a new session.` Do not fall back to allowance. If the underlying integration cannot guarantee session binding, show `Live payments are unavailable until session controls are verified.`
- Confirmation dialog shell `fixed inset-x-4 top-1/2 z-[400] mx-auto w-[calc(100%-2rem)] max-w-lg -translate-y-1/2 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-6`; scrim `fixed inset-0 z-[300] bg-[var(--scrim)]`. Focus trap, Escape when safe, labelled title and focus return. Enter `{opacity:0,y:12,filter:'blur(4px)'} -> {opacity:1,y:0,filter:'blur(0px)'}`, 200ms; exit reverse 130ms; ease `[0.16,1,0.3,1]`, delay 0. During an irreversible payment, do not imply closing cancels it.
- Execution status: `Checking policy`, `Payment in progress`, `Payment confirmed`, `Payment status unknown`, `Evidence received`, `Evidence unavailable`. `Payment status unknown` copy: `Do not repeat this payment. Check Passport activity or contact the operator before trying again.` No retry button for an unresolved payment.

### 10.5 Activity

- Header `Activity`; copy `Payment and evidence events for your organisation.`
- Filter controls use Cases styles. Rows `grid grid-cols-1 gap-2 border-b border-[var(--border-default)] py-4 sm:grid-cols-[10rem_1fr_auto] sm:items-start sm:gap-4`.
- Fields: recorded time, event description, explicit `Simulated`, `Test` or `Live`, payment state and case link. A transaction link only appears when verified. No fabricated live feed.
- Empty `No activity yet`; supporting `Events appear here after a case begins.` Error `Activity could not be loaded. Try again.` Use skeleton treatment from Cases.

### 10.6 Settings

- Heading `Settings`. Sections use `space-y-6` and the panel base.
- `Evidence providers`: read-only names, operator, upstream source, supported scenario, environment, approval and last verified time. Provider URLs are administrative configuration only, not free-form model/user URLs.
- `Integration`: show API key prefix only, scopes, creation/revocation actions, webhook delivery state. Never render saved secrets or signed payment headers. A newly generated secret, if supported, is shown once with an explicit warning.
- `Data handling`: show actual retention and deletion controls only when implemented. Otherwise display `Data retention policy not configured` and no false promise.
- Destructive controls separated from primary actions and use `text-[var(--error)]`; focus and confirmation required. Mobile forms stay single-column.

## 11. Accessibility, security and acceptance checks

- Keyboard and screen reader: logical heading order, labels for every field and icon-only button, skip link, tab semantics, modal focus trap and restoration. Status text is announced via a polite live region; errors use appropriate alert semantics without repeated announcements.
- Mobile: 320px, 375px and 768px; no horizontal page overflow, touch targets at least 44px, card alternative for tables, no fixed viewport pinning. Desktop: 1280x800 hero fit plus 1440px.
- Contrast: validate each actual pairing, including muted metadata, controls and focus. Do not rely on translucent layers for legibility.
- Motion: scroll reveals replay in both directions; pinned timeline reverses; reduced motion shows static content. No animation blocks payment, input or access to errors.
- Session safety: clearly distinguish app sign-in from Passport passkey approval. Never expose real transaction identifiers unless independently verified. Expired sessions, allowance fallback, wrong token, unknown settlement and rejected passkey have visible safe outcomes.
- Deep links: test direct access and refresh of `/app/cases/[id]` with authenticated, unauthenticated, hydrating and auth-error states. Test deployed host, back navigation and mobile. Show error boundary recovery, never platform 404 or raw exception.
- Production gating: all live controls remain disabled until provider eligibility, source terms, actual session binding, no allowance fallback and quote integrity are verified. Screens must show current mode and test/demo limitations.
- The reference material contains a wallet dropdown pattern, but this project uses Passport rather than automatically assuming wagmi or wallet auth. If a separate wallet connection is later added, specify its modal states, network/address menu, copy and explorer actions, Escape/outside dismissal, disconnect behaviour and refresh tests before building it.

## 12. Asset inventory and self-check

### Section reference images

These separate generated images are loose layout references only, not approved copy, feature claims, implementation assets or complete specifications. Their palettes, fonts and layouts are approximations; where they differ, this Markdown specification and the approved gates always prevail. In particular the hero image has unapproved supporting text and CTA, the problem image includes an unapproved eyebrow, and the final-action image has unapproved supporting text. Use the exact copy specified above. The footer attribution was corrected after generation. The image-generation limit prevented an additional generated revision of the footer, so the attribution correction was made directly to the reference image.

1. [Hero](design-references/01-hero.png)
2. [Problem statement](design-references/02-problem.png)
3. [Evidence journey](design-references/03-journey.png)
4. [Integration explorer](design-references/04-integration.png)
5. [Spending and safety](design-references/05-safety.png)
6. [Final action](design-references/06-final-action.png)
7. [Footer](design-references/07-footer.png)

| Asset | Need | Status and brief |
|---|---|---|
| Product evidence receipt | Hero and demo | Coded semantic UI. Clearly marked illustrative until backed by real data. |
| Integration visual | Integration explorer | Coded, static contract diagram. No executable code, logo or fake response. |
| Texture | Landing only | Subtle inline noise, non-semantic. |
| Brand logo/favicon | None required | No hardcoded or generated brand mark. Ask the user before introducing one. |
| Photography/video/3D | None selected | Not required by the approved direction. |

**Specification check:** All seven design gates are confirmed. Major sections and screens define responsive classes, stacking, motion and real-vs-illustrative behaviour. Common elements use exact shared classes from section 1.3. Bespoke sections are used where reference recipes would compromise the approved product. No application code is included as a deliverable.
