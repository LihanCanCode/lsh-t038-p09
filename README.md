# Vehicle Service Due Predictor (P09)

**Live:** https://lihancancode.github.io/lsh-t038-p09/
**Team:** LSH26-T038 · **Problem:** P09

A Dhaka car workshop tracks service items in a register book and in the manager's head, so they
only find out something is due once the customer already has a problem. This tool reads the
workshop's fleet data and answers one question every morning: **who do we call today, and why.**

---

## What it does

**Predicts the next due date for every service item, using that item's own rule.**
- `fixed_date` — a literal expiry (insurance, fitness certificate, tax token).
- `period_months` — the last service date plus the interval, with correct month-end anchoring
  (`2026-08-31` + 6 months is `2027-02-28`, not `2027-03-03`).
- `distance_km` — the last service odometer plus the interval, converted to a *date* using that
  **vehicle's own daily running rate**, computed from its own odometer history. No shared
  fleet-wide assumption: a car doing 90 km/day is called far sooner than one doing 13.

Each item is then classified **overdue / due soon (≤14 days) / fine**.

**Daily call list.** Every vehicle with actionable work, sorted most-overdue first and then by
value, with the owner's name and a tap-to-dial phone number. Every line states its own reason in
plain language — "Threshold passed by 727 km at 62.4 km/day" — because that is the number the
workshop will challenge.

**Per-vehicle page.** Owner, current odometer, every service item with its due date, cost and
status, and the full service history.

**Record a completed service.** Resets exactly that one item and appends to history; every other
item on the vehicle is untouched. For `fixed_date` items the form asks for the **new due date**,
because the schema stores no renewal period and the issuing authority — not an algorithm — decides
when insurance or a fitness certificate next expires.

### Bonus features
- **8-week forecast** of upcoming work volume and revenue.
- **Odometer update** that immediately re-projects every distance-based item on that vehicle.
- **Copy-ready SMS reminder** per owner, listing the due items and the estimated total.

---

## Tech stack

React 18 + Tailwind CSS, with **no build step** — React, Babel (for the in-browser JSX transform)
and Tailwind all load from CDNs, so the repository is served as static files exactly as it sits.

The calculation engine lives in [`engine.js`](engine.js) as a pure module: no DOM, no globals, and
no wall clock — `today` always comes from `case.today`. That separation is deliberate, so the engine
can be unit-tested headlessly in Node independently of the UI. [`app.jsx`](app.jsx) contains only
React components.

```
index.html    CDN tags + mount point
engine.js     all service-due calculation, pure and testable
app.jsx       all UI components
classic.html  zero-dependency vanilla fallback build
```

## How to run it

It loads `P09_vehicle_service_public.json` with `fetch`, so it needs to be served over HTTP —
opening `index.html` from `file://` will be blocked by the browser.

```bash
cd lsh-t038-p09
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static host works (GitHub Pages, Vercel, Netlify) — there is nothing to compile.

`classic.html` is a dependency-free vanilla build of the same app, kept as a fallback in case the
CDNs are unreachable.

---

## What is mocked

- **Persistence.** Recorded services and odometer updates live in memory for the session. A refresh
  reloads the original JSON. In production this would be a write to a real datastore; the app is
  already structured so that every view is derived from the case data, so swapping the source is a
  contained change.
- **Nothing is hardcoded to the fixture.** The app opens `cases[0]` of the bundled file by default,
  but **Load JSON** (or dragging a file onto the page) accepts any dataset of the same shape —
  `{cases:[...]}`, a bare array of cases, or a single case object — and a case switcher reaches all
  25 cases. Invalid files are rejected with a message naming the actual problem.
- **Messaging.** The reminder is generated and copied to the clipboard. Nothing is sent.
- **No authentication** — a workshop-floor tool, assumed to run on a trusted machine.

---

## Engineering notes

**Dates are parsed to local midnight, never `new Date("2026-08-30")`.** That constructor reads
date-only strings as *UTC* midnight, which combined with local getters shifts every result by a day
in any negative-offset timezone. Before this was fixed the same data gave 45 overdue items in Dhaka
and 46 in New York. Day differences are computed from `Date.UTC` triples built out of local fields,
so DST cannot move a boundary either.

**Verified against the full dataset**, identically under `Asia/Dhaka`, `America/New_York` and
`America/Los_Angeles`:

| | overdue | due soon | fine |
|---|---|---|---|
| PUB-01 (165 items) | 45 | 16 | 104 |
| all 25 cases (4,188 items) | 1,183 | 432 | 2,573 |

**Edge cases** are documented in [EDGE_CASES.md](EDGE_CASES.md); the full defect audit and the
reasoning behind each rule is in [PLAN.md](PLAN.md).

---

## What is next

- Persist the mutation log to `localStorage` or a backend, with undo and revert-to-original.
- Group the call list by **owner** rather than by vehicle, so an owner with three due vehicles is
  one phone call instead of three rows.
- Triage the list: it currently surfaces 25 of 27 owners every day because `period_months` items
  form a standing backlog (38% of overdue items are more than 90 days old). A chronic/fresh split
  and a "called today" marker would turn the report into a workflow.
- Treat `km: 0` in service history as a missing baseline rather than a literal odometer reading —
  it appears on 149 distance items and is a placeholder in at least 47 of them.
- Automated test suite around the engine (the golden numbers above are currently verified by a
  headless harness, not a checked-in runner).
