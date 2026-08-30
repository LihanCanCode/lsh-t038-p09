# P09 — Vehicle Service Due Predictor: Project Plan

## 1. Problem

A Dhaka car workshop tracks service items in a register book and in the
manager's head. They only discover something is due when the customer
already has a problem. Build a tool that:

- Knows every vehicle's service items and their due rules.
- Works out what's due, and when, for each item.
- Tells the workshop who to call today, in priority order.
- Gives each owner a per-vehicle view of costs and due dates.
- Lets the workshop record a completed service and have that one item reset.

## 2. Required Deliverables (all four scored)

| # | Requirement | Status |
|---|---|---|
| 1 | ≥40 vehicles, ≥25 owners; each vehicle has service items with fixed-date, period, and distance rules; odometer readings + service history | Done — 42 vehicles / 27 owners, 3–5 items each, 2–4 odometer readings |
| 2 | Compute next-due date per item using its own rule; distance items estimated from the vehicle's own daily km rate; classify as overdue / due soon / fine | Done |
| 3 | Daily call list: owner, vehicle, items due, reason why, sorted by most-overdue-and-highest-value first | Done |
| 4 | Per-vehicle owner page: every item, due date, cost; record a completed service resets only that item and appends to history | Done |

## 3. Data Model

Source: `P09_vehicle_service_public.json` → `cases[0]`

```
case
├── today                     // reference date, never wall-clock
├── owners[]                  // id, name, phone
└── vehicles[]
    ├── id, owner_id, model, plate
    ├── odometer_readings[]   // {date, km} — latest reading == today
    ├── service_items[]       // {name, rule, cost_bdt, + rule-specific field}
    │     rule = fixed_date    → due_date
    │     rule = period_months → every_months
    │     rule = distance_km   → every_km
    └── service_history[]     // {item, date, km|null, cost_bdt}
```

## 4. Due-Date Engine (`calculateItemDue`)

- **fixed_date** → due date is the literal date on the item.
- **period_months** → base date = last matching service (fallback: earliest
  odometer reading, flagged as estimated) + `every_months`.
- **distance_km** → base km = last matching service's km (fallback: earliest
  odometer reading) + `every_km`. Convert remaining km to a date using the
  vehicle's own **daily running rate**, derived from its own odometer
  history (`getDailyKm`) — never a fixed interval for every vehicle.
- **Status**: `overdue` (due date in the past), `due_soon` (due within 14
  days), `fine` (otherwise), `unknown` (insufficient data, e.g. no daily
  rate and km target not yet reached).

## 5. Call List Ranking (`analyzeAll`)

Explainable, deterministic sort:

1. Vehicles with **any overdue item** rank above vehicles with only
   due-soon items.
2. Within overdue vehicles, sort by the **worst (most-days-overdue) item**.
3. Within due-soon-only vehicles, sort by **soonest due date**.
4. Tie-break by **total estimated cost** (highest value first).
5. Final tie-break: owner name, alphabetical.

## 6. Screens

| Route | Purpose |
|---|---|
| `#/call-list` | Daily call list — owner, vehicle, items + reasons, cost, copy-ready SMS |
| `#/vehicles` | Searchable grid of all vehicles |
| `#/vehicle/:id` | Owner + vehicle info, odometer update, per-item due/cost/status table, record-service action, service history |
| `#/forecast` | 8-week bonus forecast of volume + revenue |

Unknown routes fall back to the call list rather than rendering blank.

## 7. Interactions & State Changes

- **Update odometer**: append a new `{date: today, km}` reading; rejects
  non-numeric or non-increasing values. All distance-based due dates for
  that vehicle recompute on next render (bonus #2).
- **Record service**: append one `service_history` entry for that item
  only; requires km for distance-based items. Resets just that item's
  due-date baseline — other items are untouched.
- **Copy SMS**: builds a plain-text reminder per owner listing overdue +
  due-soon items and total cost (bonus #3); only reports success after the
  clipboard write actually resolves.

State lives in memory (`STATE` object) for the demo; a refresh reloads the
JSON from scratch. Noted in README as the persistence tradeoff for a
future backend.

## 8. Bonus Features

| Bonus | Status |
|---|---|
| 8-week forward workload/revenue forecast | Done (`#/forecast`) |
| Odometer entry updates all distance estimates | Done |
| Copy-ready reminder message per owner | Done |

## 9. Constraints Honored

- Distance items use each vehicle's own daily running average, not a
  shared fixed interval.
- Recording a service resets exactly one item, never the whole vehicle.
- Call list sort rule is explicit and explainable (Section 5), not an
  unsorted dump of "everything not fine."

## 10. Testing Performed

- Headless Chrome (puppeteer-core) driving every route, including invalid
  vehicle IDs and unknown hashes.
- Data-integrity script over the full JSON: owner references, odometer
  monotonicity, required fields per rule type, history-item consistency.
- Interaction tests: search/filter, odometer update (valid + invalid),
  service recording, clipboard copy success/failure paths.
- Console/page-error capture on every pass — zero errors on final run.

## 11. Known Tradeoffs / Next Steps

- In-memory state only (resets on refresh) — would move to a backend/DB
  for a real deployment.
- Single hardcoded case (`cases[0]`) loaded — multi-case switching not
  built since the brief only requires one workshop's data.
- No automated test suite checked into the repo (manual/scripted browser
  verification only); could add a lightweight Jest/unit layer around the
  due-date engine if the project grows.
