# Phase 2 Proposal

Everything below is original to the portfolio app. Trades, rates, formulas, rules, names and data are invented. FEATURE_MAP.md was used only to choose which concepts to rebuild.

---

## 1. Names

| # | App | Fictional company | Why it works |
|---|---|---|---|
| 1 (recommended) | **Trueline** | Plumbline Renovation Co. | A "true line" is a straight, level reference line. It suggests accuracy in estimates and margins, reads clearly, and is easy to say in an interview. |
| 2 | **Ferrule** | Wren Street Painting & Floors | The ferrule is the metal band that holds a paintbrush's bristles together, a good image for a tool that holds a job together. It's memorable, but people may need it explained. |
| 3 | **Kerf** | Halfbrick Builders | A kerf is the width of a saw cut. Short and crafty, with a strong wordmark, but the meaning is less obvious. |

I'll check that the name isn't an obvious clash with a well-known product before we commit to it.

---

## 2. Visual directions

All three avoid the default SaaS look and the usual AI-generated looks. The preview page shows each one with real colors, type and a working version of its signature interaction.

### A. Cyanotype (blueprint)
- **Feel:** an architect's drawing set. Deep blueprint blue, white linework, precise and calm.
- **Type:** Instrument Serif (headings, italic), IBM Plex Sans (body), IBM Plex Mono (numbers and measurements).
- **Palette:** blueprint blue, deep navy, line white, faded line blue, pencil yellow (highlights), redline red (change orders and blocked actions).
- **Motion:** lines draw themselves and dimension callouts slide in. Slow and exact.
- **Signature interaction:** as you enter room dimensions in the estimate builder, a floor plan draws itself to scale with labeled dimensions. Change orders appear as red pencil markups over the document, using the real construction term "redline."
- **Risk:** being dark-first makes long tables harder to read, so it would need a light "white print" mode for documents.

### B. Fan Deck (paint chips)
- **Feel:** a painter's fan deck of color chips. Tactile, colorful and friendly, on a cool primer-gray base.
- **Type:** Anybody (a display face with variable width, which can animate), Hanken Grotesk (body), Martian Mono (chip codes and numbers).
- **Palette:** primer gray, ink, and a set of named chip colors (Lichen, Harbor, Marigold, Plum Wash, Signal). Each job gets its own chip color.
- **Motion:** springy and physical. Cards lift, tilt and settle.
- **Signature interaction:** Kanban cards are paint chips. Picking one up fans it out of the stack with a tilt and shadow. Dropping it on a stage it isn't allowed to enter makes it spring back, with the reason on a small tag.
- **Risk:** this many colors needs discipline, or the dashboard gets noisy.

### C. Triplicate (carbon-copy job forms), recommended
- **Feel:** the white, yellow and pink carbon-copy forms contractors have always used. Here they're reworked into a crisp modern app. The shell stays clean and quiet, and the paper metaphor appears only on documents.
- **Type:** Archivo (headings, using its expanded width), Public Sans (body), Courier Prime (form fields and amounts, like a typewriter).
- **Palette:** white copy, canary copy, pink copy, carbon blue ink, stamp red, with a neutral graphite for the app shell.
- **Motion:** paper-like. Sheets tear and slide, and stamps land with a small press-and-settle.
- **Signature interaction:** the three copies stand for the three document states. **Estimate is the white copy, Invoice is the canary copy, and Receipt is the pink copy.** Converting tears off the top sheet to show the next copy underneath. Paying in full lands a PAID stamp. Reverting slides the sheet back on.
- **Why I recommend it:** the main feature, the estimate-to-invoice-to-receipt flow, *is* the visual idea. It comes straight from the trade, it's hard to mistake for a template, and it gives the case study a clear story about how the design follows the domain.
- **Risk:** it could tip into kitsch. The fix is to keep it to document views and the signature moments only.

---

## 3. Data model

Conventions: money is always **integer cents**. IDs are strings. Dates are ISO strings. Anything that can be derived is computed by pure functions and never stored.

### Configuration (static, versioned with the code)
- **Trade:** id, name, short code, chip color, and which calculator it uses. Starting trades: **Interior Painting**, **Flooring**, **Tile Backsplash**.
- **RateCard (one per trade):** my invented unit costs (labor hours per unit, labor rate, material cost per unit, coverage rates, waste factors). Each rate also has a **separate markup**, so cost and price are never mixed together.
- **MarginTarget:** tradeId, target percent, effective-from date, note. A job's target is the targets of its trades, weighted by revenue.
- **CompanySettings:** tax rate (taxes materials only, my own rule), commission rate, deposit percent.

### Records (persisted)
- **Customer:** id, name, address, email, phone (all fake).
- **Job:** id, number (for example `TL-1042`), customerId, title, tradeIds, `stage`, assigned PM and sales rep names, scheduled start and end dates, createdAt, documentId.
- **Scope (one per trade on a job):** the raw calculator answers. For painting and flooring this is a list of **rooms** (name, length, width, height, plus options per room). Line items are recomputed from it, never stored.
- **Document (one per job; it moves from estimate to invoice):**
  - `kind`: `estimate` | `invoice`
  - estimate status: `draft` → `sent` → `signed` (or `declined`)
  - invoice number, issuedAt, dueAt, voided invoice numbers (kept on revert)
  - discount, any line items added by hand
- **ChangeOrder:** id, documentId, description, amount (positive or negative), status `proposed` → `approved` | `rejected`, createdAt, decidedAt. **Clients only ever see it labeled "Adjustment."**
- **Payment:** id, documentId, amount, method (card, check, ACH, financing), receivedAt, note.
- **ActualCost:** id, jobId, category (`material` | `labor` | `other`), amount, vendor or crew, date. This is the "actual" side of margin.
- **Event (one shared audit log):** id, jobId, at, actor (`pm` | `accounting` | `client` | `system`), type (viewed, signed, converted, payment recorded, adjustment proposed or approved, reverted, stage moved, and so on), details, **visibility** (`internal` | `client`). The client activity log shows only events marked `client`.

### Derived values (pure functions, unit-tested)
- `lineItems(scope, rateCard)`: material, labor and other lines, each with cost, price and quantity.
- `totals(document)`: subtotal by category, approved adjustments, discount, tax (materials only), total.
- `balance`, `isPaidInFull`, `displayType`: **Estimate / Invoice / Receipt**.
- `margin(job, role)`: revenue (excluding tax, including approved adjustments), forecast cost (from estimate cost lines), actual cost (from ActualCost), gross and net margin, the target for the job's trades, the variance, and what's driving it. The **PM view** labels its figure "margin before commission" and leaves commission out. The **Accounting view** shows commission and net margin.

### State machines (pure, unit-tested)
- **Document:** sign → convert to invoice → record payment → paid. **Revert invoice to estimate** is allowed only when no payments have been recorded. It needs a reason, voids the invoice number and logs an event. With payments recorded it's blocked with "Record a refund or credit first."
- **Board stages:** Lead → Estimating → Sold → Scheduled → In Progress → Punch List → Invoiced → Closed.
  - Entering Sold requires a signed estimate.
  - Entering Invoiced converts the estimate to an invoice, after you confirm.
  - Entering Closed requires a zero balance.
  - **No stage move is allowed while a change order is still proposed.**
  - Moving back one stage is allowed with a reason. Moving Invoiced → Punch List reverts the invoice, using the rule above.
  - Every check returns either `ok` or a **readable reason**, which the UI shows when it blocks a drag.

---

## 4. Stack details

- Next.js (App Router), TypeScript in strict mode, Tailwind CSS.
- **State:** Zustand with its `persist` middleware for localStorage. The stored data carries a schema version, with a migration step. Store actions are thin wrappers around the domain functions.
- **Motion:** Framer Motion, with a reduced-motion setting that every animation respects.
- **Charts:** Recharts, restyled to fit the chosen direction. If Recharts can't produce the signature look, the margin chart can fall back to plain SVG.
- **Kanban:** dnd-kit, including keyboard and screen-reader drag support.
- **PDF:** `@react-pdf/renderer`, loaded only when someone downloads a receipt.
- **Testing:** Vitest for the domain logic (the main coverage), Testing Library for key components, and one Playwright smoke test during polish.
- **Seed data:** generated with a fixed random seed and dated relative to today, so the demo always looks current. "Reset demo" rebuilds it.

---

## 5. Folder structure

```
trueline/                         its own git repo
├─ docs/                          FEATURE_MAP.md, PROPOSAL.md, architecture notes
├─ src/
│  ├─ app/
│  │  ├─ (app)/                   app shell with nav, role toggle and "Reset demo"
│  │  │  ├─ board/                Kanban
│  │  │  ├─ jobs/[jobId]/         job overview, estimate builder, invoice and payments, activity
│  │  │  └─ margins/              margin dashboard
│  │  ├─ layout.tsx
│  │  └─ page.tsx                 short intro, then into the app
│  ├─ domain/                     pure TypeScript, no React, no browser APIs
│  │  ├─ money.ts
│  │  ├─ trades/                  rate cards and one calculator per trade
│  │  ├─ estimate.ts              line items and totals
│  │  ├─ document.ts              estimate and invoice state machine, balance, display type
│  │  ├─ changeOrders.ts
│  │  ├─ margin.ts
│  │  ├─ board.ts                 stage transition rules
│  │  ├─ events.ts
│  │  ├─ seed/                    seeded random numbers and the demo company
│  │  └─ *.test.ts                tests sit next to the code they cover
│  ├─ state/                      Zustand store, selectors, persistence and migrations
│  ├─ features/                   UI for each feature: estimate/, documents/, board/, margin/
│  ├─ ui/                         design-system primitives (button, sheet, stamp, chip...)
│  ├─ lib/                        formatting, PDF receipt
│  └─ styles/                     design tokens
├─ e2e/                           Playwright smoke test
└─ README.md
```

---

## 6. Build order (one commit per step, tests run each time)

1. **Scaffold.** Next.js, TypeScript, Tailwind, Vitest, ESLint, Prettier. Design tokens and fonts for the chosen direction, the app shell and routes, and `git init`.
2. **Domain: money and trade calculators.** Three trades, rate cards with cost and markup kept separate, line items, totals. Tests.
3. **Domain: documents, change orders, payments and events.** Converting and reverting, balance, display type, the audit log and client filter. Tests.
4. **Domain: margin.** Forecast vs. actual, category breakdown, per-trade targets, role-aware output. Tests.
5. **Domain: board rules.** Every guard, each with a readable reason. Tests.
6. **Seed data, store and persistence.** A believable demo company with about 10 jobs across every stage, the "Reset demo" button, and a migration for the stored data.
7. **Estimate builder UI.** Room-by-room entry, live line items grouped by category with collapsible sections, totals.
8. **Invoice flow UI.** Convert, payments, change orders shown as adjustments, revert with a reason, activity log, receipt PDF, and the signature interaction.
9. **Kanban board.** dnd-kit drag and drop that respects the rules, blocked-drop feedback, and keyboard dragging.
10. **Margin dashboard.** Portfolio summary, a view for each job, category breakdown, targets, and the PM / Accounting toggle.
11. **Polish.** Motion, empty and loading states, accessibility check, phone layout, Playwright smoke test.
12. **Case-study page and README.** Placeholder text, screenshot placeholders, a Mermaid architecture diagram, how to run it, and how to deploy to Vercel.

---

## 7. Decisions needed from you

1. **Name:** Trueline, Ferrule, Kerf, or your own.
2. **Visual direction:** A Cyanotype, B Fan Deck, or C Triplicate (recommended). Mixing is fine, for example C's documents with B's chip-style Kanban cards.
3. **Optional extras** (not in the original brief): role-based checklists that depend on the stage, or a month calendar of scheduled jobs. My suggestion is to skip both for v1 and list them as possible extensions in the case study.
4. **Folder:** `C:\Users\natha\trueline` (or whatever name you choose).
