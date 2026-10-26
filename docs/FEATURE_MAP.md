# Feature Map — Reference System (Plain English)

Purpose: a read-only description of what the reference system does and how its pieces fit together, used only to choose which *concepts* to rebuild from scratch in a portfolio app. It contains no code, no field or object names, no rates, formulas, or markup values, no client data, no branding, and no people's names. Third-party tools are described by role only.

---

## 1. The big picture

The reference system is a CRM-based operations backbone for a home-improvement company. It follows a job across its whole life:

**Lead / appointment → sale → estimate → client signs → client pays → project is produced → project is closed out financially.**

Three internal "desks" share the same project record and pass it along:

- **Sales desk**: owns the job from first appointment until the paperwork and deposit are clean.
- **Production desk**: project managers plan, schedule, and run the physical work.
- **Accounting desk**: invoicing, collections, and final margin reconciliation.

A project's *phase* tells you which desk it's on. Inside each phase there is an ordered list of *stages*, and some production stages have a finer *sub-status*. So it's a three-level pipeline: phase → stage → sub-status.

---

## 2. Features

### 2.1 Trade routing at estimate creation
- A sale records which trades the customer is buying (for example flooring, interior painting, roofing). One sale can include several.
- When a rep clicks "create estimate," the system looks up each trade in a **configuration table** (not hard-coded logic) and sends it to the right pricing path:
  - **Interior trades** are priced in-house with a guided calculator.
  - **Exterior trades** are priced by an outside 3D-measurement service after a field scan, which takes some time to come back.
  - Some trades are marked unsupported.
- If a sale mixes paths, records for every path are created and the rep lands on the highest-priority one.
- **Design takeaway:** adding a trade, or changing where it goes, is a configuration change, not a code change.

### 2.2 Estimate builder (guided trade calculator)
- A **schema-driven question flow**: each trade has a definition of the questions to ask (room counts, square footage, material choices, finish levels, and so on), including images for some choices.
- Some questions **repeat per instance** (for example once per room) and the results are added up. Per-room input was found to matter for accuracy. A single whole-house number gave worse estimates than room-by-room answers.
- Answers feed a **calculation engine** that:
  - evaluates named calculations in dependency order (one result can feed another),
  - emits **line items**, each tagged as **Material, Labor, or Fee/Other**,
  - adds up a subtotal, applies adjustments and tax, and produces a total.
- Answers are saved separately from the computed line items, so an estimate can be recalculated without re-entering the scope.
- The internal view shows a **cost table** (line items by category, collapsible) and a **quantities table**.
- An important architectural lesson from the reference: the original calculators **baked markup into prices**, so the true cost was never stored. That made margin reporting impossible until cost and markup were separated. **Keeping cost and price as separate values from the start is a core design principle to carry forward.**
- **Scope and money are separate records.** A "job" holds the scope (measurements, notes, room count). An "estimate" holds the money (totals, tax, markup, financing, locked/unlocked). That lets a price be revised without touching the scope.

### 2.3 Client signing
- Before any payment, the client reviews and e-signs the proposal through an outside signing service, launched from inside the system.
- The signed PDF is attached back to the sale and the estimate.
- Signing moves the estimate to a "signed" state, and that **automatically creates the project record**. Nobody has to create it by hand.

### 2.4 Payment and balance
- Payments are collected through an outside accounting/payments system. This is where the interior and exterior paths merge. From here on, every job looks the same no matter which trade or pricing path it came from.
- The estimate tracks a **deposit amount and date**. **Remaining balance** is always *derived* (total minus payments), never stored and synced by hand.
- "Paid in full" is also derived: the balance is zero or less and the total is above zero.

### 2.5 Client-facing estimate / invoice / receipt page
A public page (no login, reached by a link with an opaque ID) that shows the client their job:
- **Header:** document type label, client name and trade, short ID, status badge, signed date.
- **Client information.**
- **Breakdown:** line items grouped into Labor, Materials, and Fees in one collapsible section.
- **Attached contracts:** downloadable signed documents.
- **Completion photos:** gallery with click-to-preview (lightbox).
- **Balance card:** deposit statement and remaining balance. When paid in full it changes to "Paid in Full" with a **Download Receipt (PDF)** button. The receipt is generated on demand, not stored.
- **Totals:** subtotal → adjustments (if any) → tax → total.
- **Document-type logic.** The page title changes with the document's state:
  - draft → **Estimate**
  - signed/paid but balance remaining → **Invoice**
  - fully paid → **Receipt**. Being fully paid wins even if the status field hasn't been updated yet. A signed job can be paid off before someone flips the status.
- **Naming rule:** internally these changes are called "change orders," but **clients only ever see the word "Adjustment"**, both in the totals and in the activity log.
- **Client activity log:** a client-safe subset of the internal audit trail. It shows only payment events and adjustment events, plus "estimate viewed" and "estimate signed."

### 2.6 Change orders (adjustments)
- A change order is a price or scope change that belongs to a project and, more specifically, to one work order.
- States: **pending → approved or rejected.** Only approved ones count toward the client total and revenue.
- **Business rule:** a project **cannot move to another stage while any change order is pending.** This is enforced, not just advised. It's a good example of a pure state-transition guard.
- Positive approved adjustments raise the amount the client owes after the original total.

### 2.7 Reverting an invoice ("send back to punchlist")
- If a job billed as complete turns out not to be done, the action is "send back to production and notify the project manager." It goes backward from the invoicing stage to the production punchlist.
- Pipelines were originally built to only move forward, so going backward needed to be designed explicitly. It is a deliberate, logged transition with a reason, not a free-form status edit.
- When sent back, project managers can **add their own custom checklist items** that must be checked off before the job can move forward again.

### 2.8 Stage-scoped checklists (audit, check-in, punchlist)
- Each project has checklist items in groups: **Audit**, **early check-in** (shortly after kickoff), and **Punchlist**.
- **Only the group for the current stage is shown.** Items persist underneath, so coming back to a stage shows its checklist exactly as it was left.
- **Who can do what depends on role:**
  - During the audit, a project manager can **Verify**, **Fail** (with a reason), or **Mark Fixed**.
  - If the audit fails, the job goes back to the sales rep, who can only **Mark Fixed**. Reps never approve their own work, and un-reviewed items read "not reviewed yet."
  - Punchlist failures just mean "needs more work." They do **not** push the project back to Sales the way an audit failure does.
- **Pipeline reactions:** failing an audit item can automatically move the project back. Other groups never trigger automatic moves.
- A project cannot be marked complete until completion photos exist (hard block).

### 2.9 Project history / audit trail
- One chronological, newest-first feed that combines:
  - every phase, stage, and sub-status move,
  - every checklist fail, fix, and verify (with the reason),
  - signing events (viewed, signed, declined).
- Read-only, because it's built from system history nobody can edit. The panel shows the latest handful of entries, is collapsible, and names are clickable.
- The client activity log (2.5) is a filtered view of this same feed.

### 2.10 Stage path with desk handoffs
- Two stacked progress bars: the current phase's stages, and under them the current stage's sub-statuses (hidden when a stage has none).
- **Clicking a step only selects it. A separate "Mark as Current" button commits the change.** This two-step pattern prevents accidental moves.
- **Handoff buttons** ("Send to Production," "Send to Accounting") appear at the end of each lane.
- When a guard rule blocks a move (pending change order, missing photos), the real reason is shown, not a generic error.

### 2.11 Work orders (units of physical work)
- A project contains one or more **work orders**. Each is a discrete piece of work assigned to one known contractor, with its own stage pipeline (scheduling → materials ordered → in progress → punch list → QC → completed → invoice approved → closed).
- A work order holds client price, deposit, final price, install start and end, job address, details, and internal notes. It links directly to its estimate, so project managers can see the materials list, labor list, and signed proposal in one place. The business called this the most important project-manager need.
- Contractors are **assigned directly**. Open bidding was intentionally left out as a different business model.

### 2.12 Contractor invoices
- A contractor bills against a work order. States: **submitted → approved or rejected → paid (or canceled)**, with dates for each step and a rejection reason.
- Paid contractor invoices roll up into the work order's "total invoiced."

### 2.13 Project workspace panels
The project page is a set of focused panels:
- **Schedule:** a real month-grid calendar where multi-day work orders show as bars across days. Bars split at week boundaries, and overlapping jobs stack in separate lanes. Clicking a bar opens a slide-out detail panel.
- **Materials:** materials list, which can be filtered by work order.
- **Estimates / jobs / work orders:** linked records at a glance.
- **Overview rollups:** revenue, materials cost, work-order cost, profit, budget.

### 2.14 Margin widget (forecast vs. actual)
Shown on the project during the production and accounting phases.
- **Revenue** = contract value **excluding sales tax** (tax is passed through, not earned) **plus approved change orders** (tracked as a separate number).
- **Cost** is split into **Materials, Labor, and Other** (fees like permits, delivery, disposal are Other and are no longer mixed into Labor). Cost can come from:
  - exact cost calculated from the estimate's line items (best case),
  - synced cost from the outside exterior-pricing service (read-only),
  - manual entry in the widget when no automatic source exists.
- **Adjustments after pricing:** sales commission and discounts.
- **Margins shown:**
  - *Gross / pre-adjustment margin* = revenue − cost. This is the fair comparison against the target, because the target is a **pricing** margin set before commission or discount.
  - *Net margin* = gross − commission − discount.
  - *Forecasted margin* = what the job would earn at the target margin. The widget shows the **variance** ("$X under/over forecast").
- **Per-trade margin targets** live in a configuration table with an effective date and a source note, so targets can change over time without code.
- **Explaining why:** when a job is below target, the widget says whether **pricing/costs** are the problem (gross already short) or **commission/discount** pulled an otherwise healthy price under target.
- **Chart:** a pie/donut of where revenue goes (materials, labor, other, commission, discount, profit). Picking a category **dims** the other slices rather than removing them, so the total never looks smaller than it is. A before/after-tax toggle is included.
- **Role-based visibility:** commission is permission-gated. Users without permission don't just have it hidden. **It isn't subtracted at all**, and the explanatory text is reworded so it never implies commission is zero. (Showing "$0.00" for a hidden value would be misleading.)
- Each calculation is saved as a snapshot (with a last-calculated date) for reporting.

### 2.15 Supporting areas (outside the portfolio scope)
Appointment booking and self-scheduling, sales rep availability and time off, call-center queues and dispositions, commission analysis and clawbacks, payment reporting, and a read-only bridge to a legacy project-management tool that is being phased out. These are mentioned for completeness only.

---

## 3. Workflow between features

1. **Sale created** with one or more trades.
2. **Create estimate** → routed by trade configuration → interior trades open the guided calculator.
3. **Calculator answers** → line items (material, labor, other) → estimate totals. Answers and scope are kept so the estimate can be recalculated.
4. **Client views the estimate** (logged) → **signs** (logged) → estimate becomes *signed* → **project created automatically** in the sales phase.
5. **Deposit received** → balance updates (derived) → client page title changes Estimate → Invoice.
6. **Sales stages** clear the paperwork, deposit, financing, and HOA issues → **handoff to Production.**
7. **Audit stage:** the project manager works the audit checklist. A failure sends the job back to the sales rep to fix. A pass moves it to planning.
8. **Planning:** early check-in checklist, work orders created and scheduled on the calendar, materials ordered.
9. **Execution:** contractors do the work. **Change orders** may come up and must be approved or rejected before the project can move stages.
10. **Completion photos** uploaded (required) → project ready to invoice → **handoff to Accounting.**
11. **Invoice sent** to the client (and/or a financing partner). Collections stages handle overdue payments.
12. If a problem is found → **send back to punchlist** (reverse transition, project manager notified, custom punchlist items added) → fixed → forward again.
13. **Paid in full** → client page becomes a **Receipt** with a PDF download.
14. **Contractor invoices** approved and paid → **margin reconciled** (forecast vs. actual) → **closed.**

Every stage move, checklist action, and signing event is written to the **project history** throughout. Payment and adjustment events also show up in the **client activity log.**

---

## 4. Data relationships

- **Customer** has many **sales**.
- **Sale** lists one or more **trades** and leads to one or more **jobs** (scope).
- **Job (scope)** has one current **estimate (money)**.
- **Estimate** has many **line items** (each tagged material, labor, or other), stored **answers**, attached **documents**, and **payments** (deposit, then later payments).
- **Estimate** (once signed) creates exactly one **project**.
- **Project** has:
  - a phase → stage → sub-status position,
  - many **work orders**,
  - many **change orders** (each also tied to a specific work order),
  - many **checklist items** (grouped by audit / check-in / punchlist),
  - many **completion photos**,
  - many **other charges** (extra cost lines),
  - one or more **margin snapshots**,
  - one **history feed** (stage moves + checklist actions + signing events).
- **Work order** belongs to a project, is assigned to one **contractor**, links to the estimate, and has many **contractor invoices**.
- **Configuration tables** (read-only, change over time): trade → pricing path; trade → target margin (with effective date); trade → calculator definition (versioned, with only one active version at a time and inactive drafts for testing).
- **People / roles:** sales rep, project manager, accounting, contractor, client (public, read-only). Role decides which checklist actions are available and whether commission is visible.

---

## 5. Lessons worth carrying into a from-scratch rebuild (concepts only)

1. **Store cost and price separately.** Markup is a step in the calculation, not something baked into a number.
2. **Derive, don't sync.** Balance, paid-in-full, document type, and margins are computed from source facts.
3. **State transitions are explicit and guarded.** That includes legal backward moves (revert to punchlist) and blocking rules (pending change order, missing photos). They belong in pure, testable functions.
4. **Configuration over code** for trade routing, margin targets, and calculator definitions.
5. **Use one shared event log** with filtered views per audience (internal trail vs. client activity log).
6. **Show the words each audience expects.** "Change order" internally, "Adjustment" to clients.
7. **When a role hides a value, the math has to change too**, and the copy must never imply a hidden number is zero.
8. **Use a two-step commit for consequential actions** (select, then confirm) to prevent accidental stage moves.

---

## 6. How the requested portfolio features map to the reference

| Requested feature | Present in reference? | Notes for the rebuild |
|---|---|---|
| Estimate builder with categories and collapsible breakdowns | Yes (2.2, 2.5) | Invent my own trades, questions, rates, and formulas; add per-room repeat groups. |
| Estimate → invoice, payments, balance, receipt states | Yes (2.4, 2.5) | Document type derived from state + balance. |
| Revert invoice to estimate | Partly (2.7) | Reference goes back to the production punchlist. The portfolio can model a general "revert" transition with a reason. |
| Change-order adjustments | Yes (2.6) | Include the pending-blocks-stage-move guard. |
| Client audit log | Yes (2.9, 2.5) | Filtered view of one event log. |
| PDF receipt download | Yes (2.5) | Generated on demand in the browser. |
| Margin dashboard, forecast vs. actual, by category | Yes (2.14) | My own targets and numbers. |
| Per-trade margin targets | Yes (2.14) | Config with effective dates. |
| Role toggle that hides commission | Yes (2.14) | Hidden commission changes the math, not just the display. |
| Kanban project board with drag and drop | Pipeline exists (1, 2.10); no Kanban UI was built | New UI. Drag-drop must still respect transition guards. |
| Seeded demo data + reset | No | New. |

**Reference features not in the original request but worth considering in Phase 2:** stage-scoped checklists with role permissions (2.8), the two-step stage commit with desk handoffs (2.10), the month-grid schedule with lane-stacked bars (2.13), and work orders with contractor invoices (2.11, 2.12).
