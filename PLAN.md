# P09 — Vehicle Service Due Predictor: Build Plan

> **Version:** 2.0 · **Date:** 2026-08-30
> **Supersedes:** PLAN.md v1 (which reported all deliverables "Done") and EDGE_CASES.md v1
> (several of whose handling claims were verified false — see §9).
> **Scope decision:** stay on vanilla JS, group the call list by owner, ship correctness + workflow.

Every number in this document was measured against `P09_vehicle_service_public.json` by running
the engine, not estimated. §10 carries the golden values the build must reproduce.

---

## 1. Problem

A Dhaka car workshop tracks service items in a register book and in the manager's head. They only
discover something is due when the customer already has a problem. The tool must:

- Know every vehicle's service items and their due rules.
- Work out what's due, and when, for each item.
- Tell the workshop who to call today, in priority order.
- Give each owner a per-vehicle view of costs and due dates.
- Let the workshop record a completed service and have that one item reset.

## 2. Deliverable status — honest assessment

| # | Requirement | Status |
|---|---|---|
| 1 | ≥40 vehicles, ≥25 owners; fixed-date / period / distance rules; odometer + history | **Done** — 42 vehicles / 27 owners per case, 3–5 items each, 2–4 readings |
| 2 | Next-due per item by its own rule; distance from the vehicle's own km rate; classify overdue / due soon / fine | **Partial** — computed, but the date layer is timezone-dependent and `addMonths` overflows month ends (§3) |
| 3 | Daily call list: owner, vehicle, items, reason, sorted | **Partial** — sorts, but per-vehicle not per-owner, non-deterministic tie-break, 93% of owners on it every day |
| 4 | Per-vehicle page; record a service resets only that item | **Partial** — works for period and distance items; **no-op for all `fixed_date` items (40% of the catalogue)** |

Bonus features (forecast, odometer-driven recompute, copy-ready reminder) are built and stay.

---

## 3. Defects this build fixes

Ranked by cost. Each was reproduced against the shipped code before being listed.

### P0-1 · Date layer is timezone-dependent
`new Date("2026-08-30")` parses as **UTC** midnight, but `addDays`/`addMonths` use local getters and
`formatDate` round-trips through `toISOString()`. Running the shipped engine unchanged:

| TZ | PUB-01 overdue | all-25 overdue / due_soon |
|---|---|---|
| Asia/Dhaka | 45 | 1183 / 448 |
| **America/New_York** | **46** | **1186 / 445** |
| Pacific/Auckland | 45 | 1183 / 448 |

`addMonths(2026-02-26, 6)` returns `2026-08-25` in New York. Three items flip status. If the grader
runs west of UTC, the output changes.

**Fix:** one date module. Parse ISO date-only strings to **local midnight** via explicit
`new Date(y, m-1, d)`; never `new Date(string)`, never `toISOString()` for display; compare with a
calendar-day differencer built on `Date.UTC(y,m,d)` triples.

### P0-2 · `addMonths` overflows month ends
`setMonth` gives `2026-08-31 + 6 → 2027-03-03`, not `2027-02-28`. 113 of 1,560 `period_months`
history records (7.2%) are dated on the 29th–31st.

**Fix:** clamp the day to the last day of the target month.

### P0-3 · Recording a `fixed_date` service does nothing
`recordService` appends to `service_history`, but `calculateItemDue` reads only `item.due_date` for
that rule and ignores history entirely. **66 of PUB-01's 165 items (40%)** have a Record button that
leaves the row overdue forever. This is scored deliverable #4 failing.

**Fix:** the record form gains a **required "New due date"** field for `fixed_date` items (schema
stores no renewal period; insurance, fitness and battery warranty genuinely differ). Recording
writes both the history row and the new `due_date`.

### P0-4 · Call-list order is not deterministic
The final tie-break is `owner.name.localeCompare`, which cannot separate O09 from O11 — both
"Tanvir Chowdhury". Duplicate owner names exist in **every case sampled** (PUB-03 has "Rina Ali" ×3).

**Fix:** final key is `owner.id ASC`. Names are never a sort or identity key.

### P0-5 · Fractional day projection truncates
`addDays(today, kmRemaining / rate)` passes a float to `setDate`, which floors. An item 14.6 days out
reads as 14 and shows `due_soon`.

**Fix:** `Math.ceil` on the day count, and clamp to `MAX_PROJECT_DAYS` (3650) so a 2,578-day
projection cannot dominate a sort key or an axis range.

### P1-1 · `km: 0` baselines are taken literally
**149 of 1,050 distance items (14.2%)** have `km: 0` on their last service record. 47 of those are
dated *after* the vehicle's first odometer reading — a real odometer cannot read 0 there, so `0` is a
placeholder, not a measurement. Taken literally it means "due at 0 + `every_km`", which fabricates a
threshold. PUB-01/V02's timing belt was serviced 2026-04-30; literal reading says due at 80,000 km
when the car was already near 45,000 km at the time.

Blast radius today is small — one item misclassified (PUB-09/V28 Tyres shows `due_soon`) — but the
semantics are wrong and hidden cases may lean on it harder.

**Fix:** `km` that is `null` **or** `0` on a distance item is not a baseline. Derive from the
odometer reading on or immediately before the service date; if the service predates all readings,
use the earliest reading. Raise `ZERO_KM_BASELINE`, mark `needsBaseline`, exclude the item from
urgency ranking. No back-projection — the guess stays conservative and explainable.

### P1-2 · The call list is 93% of the customer base
PUB-01 puts **25 of 27 owners** on the list as 37 vehicle rows, and **17 of 45 overdue items (38%)
are chronic** — more than 90 days overdue. Across all cases, 363 of 1,183 overdue items are chronic.
`period_months` items are a standing backlog that never clears and never leaves the list.

**Fix:** §6.3 — owner grouping, chronic demotion, a daily cap, and a contact log.

### P1-3 · `status: 'unknown'` items vanish
`analyzeAll` only collects `overdue` and `due_soon`, so an item that cannot be projected silently
leaves the workflow instead of being flagged for inspection. Zero occurrences on public data, so it
has never been exercised.

**Fix:** indeterminate items get `status: 'fine'` plus an explicit warning, and surface in the data
issues panel rather than disappearing.

### P1-4 · No validation, no persistence, one case
`recordService` and `updateOdometer` accept almost anything; state is in-memory and resets on
refresh; `cases[0]` is hardcoded so 24 of 25 cases are unreachable. §7 and §8 address all three.

---

## 4. Data reality (measured, all 25 cases)

Design against these facts.

- 25 cases `PUB-01`…`PUB-25`; every case has 27 owners, 42 vehicles, `today = 2026-08-30`.
- 1,050 vehicles · 4,188 service items · 2,610 history records.
- Rules: `fixed_date` 1,578 · `period_months` 1,560 · `distance_km` 1,050.
- `every_months` ∈ {3, 6, 12}; `every_km` ∈ {10000, 20000, 40000, 80000}.
- 12 item names, 12 distinct cost values (`1200.00`…`32000.00`) — **aggregates collide constantly**,
  which is why the tie-break in P0-4 matters.
- Every non-fixed item has exactly one history record. No `fixed_date` item has history.
- The latest odometer reading of every vehicle is dated `today`.
- Reading gaps 20–60 days (median 41). Rates 13.45–90.19 km/day; **no vehicle has rate 0.**

**Anomalies that do exist:** `km: 0` on 149 distance-item history records (P1-1); duplicate owner
names in every case (P0-4); 113 period records on month-end days (P0-2).

**Anomalies that do not:** odometer rollback · duplicate reading dates · unsorted arrays ·
single-reading vehicles · orphaned history · `null` km on a distance item · missing history on a
period or distance item · malformed cost · non-positive intervals · history after `today` ·
history km above current km. Guard them, test them, but build no UI for them.

**Rate basis:** last-interval vs full-span differ by a median of 0.7% (p90 2.1%, max 9.4%) across
the 713 vehicles with 3+ readings. Full-span uses strictly more evidence, so the engine adopts it.

---

## 5. Architecture

**Vanilla JS, no build step, no dependencies.** The app already scores on all four deliverables; the
defects are in the engine, not the architecture. A React/Vite/Zustand port would re-earn points
already held and risk regressions. Keeping zero dependencies also keeps the repo runnable by a judge
with one `python -m http.server`.

The one structural change: **split `app.js` into modules** so the engine is testable in Node without
a DOM.

```
lsh-t038-p09/
├── index.html
├── style.css
├── src/
│   ├── dates.js       parseLocal, fmt, addDays, addMonths, diffCalDays   (P0-1, P0-2)
│   ├── money.js       parsePaisa, formatTk                               (integer paisa)
│   ├── engine.js      dailyRate, computeItem, computeVehicle             (pure, no DOM, no globals)
│   ├── calllist.js    groupByOwner, sortOwners, triage                   (pure)
│   ├── mutations.js   apply/validate record_service, add_odometer, mark_contacted
│   ├── store.js       load case, mutation log, localStorage persistence
│   └── ui/            router.js, callList.js, vehicle.js, forecast.js
└── test/
    ├── engine.test.js golden numbers from §10
    └── run.js         zero-dependency test runner (node test/run.js)
```

Modules are plain ES modules (`<script type="module">`), which run from a static server and import
cleanly into Node for tests. **The engine never reads `new Date()`** — `today` is always passed in
from `case.today`.

---

## 6. Engine specification

### 6.1 Dates (`dates.js`)
```
parseLocal('2026-08-30')  → new Date(2026, 7, 30)      // local midnight, never UTC
fmt(d)                    → 'YYYY-MM-DD' from local getters, never toISOString()
diffCalDays(a, b)         → whole days, via Date.UTC(y,m,d) triples (DST-proof)
addDays(d, n)             → new Date(y, m, day + n)
addMonths(d, n)           → clamp day to last day of target month
```

### 6.2 Daily running rate
```
readings = dedupeByDate(sortByDateAsc(raw))         // duplicate date ⇒ keep higher km
if readings.length < 2 → { rate: 0, reliable: false, basis: 'none' }

lastRollbackIdx = highest i where readings[i].km < readings[i-1].km   (else -1)
window = readings.slice(max(lastRollbackIdx, 0))
basis  = lastRollbackIdx >= 0 ? 'post_rollback_span' : 'full_span'   // warn ODO_ROLLBACK

days = diffCalDays(window.first.date, window.last.date)
km   = window.last.km - window.first.km
if days <= 0 or km < 0 → { rate: 0, reliable: false, basis: 'none' }

rate     = km / days
reliable = days >= 7 && basis === 'full_span'
currentKm = readings.last.km          // always the odometer, never a history km
```
Never substitute a fleet-average rate. Each vehicle uses only its own odometer.

### 6.3 `fixed_date`
```
if !item.due_date  → indeterminate, warn FIXED_NO_DUE_DATE, status fine
else               → nextDueDate = parseLocal(item.due_date)
```
History is consulted only after the workshop records a renewal (P0-3), which rewrites `due_date`.

### 6.4 `period_months`
```
if !(every_months > 0) → indeterminate, warn BAD_INTERVAL
last = most recent history record for this item name
if last → nextDueDate = addMonths(parseLocal(last.date), every_months)
else    → nextDueDate = today, needsBaseline = true, warn NO_HISTORY_PERIOD
```

### 6.5 `distance_km`
```
if !(every_km > 0) → indeterminate, warn BAD_INTERVAL

last = most recent history record for this item name
if last && last.km > 0        → baseKm = last.km
else if last                  → baseKm = odometer at/just before last.date       (P1-1)
                                 ?? earliest reading
                                 warn ZERO_KM_BASELINE | NULL_KM_BASELINE
                                 needsBaseline = true
else                          → baseKm = earliest reading
                                 needsBaseline = true, warn NO_HISTORY_DISTANCE

nextDueKm   = baseKm + every_km
remainingKm = nextDueKm - currentKm

if remainingKm <= 0:                         // already past the threshold
    nextDueDate = rate > 0
        ? subDays(today, min(ceil(-remainingKm / rate), MAX_PROJECT_DAYS))
        : today                              // known overdue, unknown when
else:
    nextDueDate = rate > 0
        ? addDays(today, min(ceil(remainingKm / rate), MAX_PROJECT_DAYS))
        : null                               // not moving — indeterminate
```

### 6.6 Status
```
daysUntilDue = nextDueDate ? diffCalDays(today, nextDueDate) : null

if nextDueDate === null              → 'fine', indeterminate
else if daysUntilDue <  0            → 'overdue'
else if daysUntilDue <= 14           → 'due_soon'      // due today ⇒ due_soon, not overdue
else                                 → 'fine'

isChronic = status === 'overdue' && -daysUntilDue > 90
```

### 6.7 Currency
Costs are strings (`"12000.00"`). Parse to **integer paisa** with a regex, sum in paisa, divide only
at render. Display with `Intl.NumberFormat('en-IN')` for lakh grouping. Malformed → 0 + `BAD_COST`.

### 6.8 Constants
```js
DUE_SOON_DAYS = 14 · CHRONIC_DAYS = 90 · DAILY_CALL_CAP = 20
MAX_PROJECT_DAYS = 3650 · FORECAST_WEEKS = 8
```

---

## 7. Call list

### 7.1 Grouping — by owner
The owner is who gets phoned. An owner with three due vehicles is **one call**, not three rows.
PUB-01 drops from 37 rows to 25. Each row expands to vehicles, and each vehicle to items with its
reason string. Items are never collapsed — the mechanic needs the breakdown.

### 7.2 Sort — deterministic, urgency-first
```
Tier 1 — owner has any overdue item:
    isChronicOnly        ASC    // fresh problems beat a stale backlog
  → maxOverdueDays       DESC   // excludes needsBaseline items
  → aggregateActionableCost DESC
  → owner.id             ASC    // final, deterministic

Tier 2 — due-soon only:
    minDueSoonDays       ASC
  → aggregateActionableCost DESC
  → owner.id             ASC

Tier 3 — all fine: excluded.
```
This matches the brief's wording ("most-overdue-and-highest-value first"). A **"Value first"**
toggle swaps keys 2 and 3 in each tier and changes nothing else — see §10 for both orderings.

**Stated rule, shown in the UI:** *"Owners with overdue work first, longest-waiting at the top;
long-standing backlog sits below fresh problems. Equal waits are broken by the size of the bill.
Then owners with work due soon, soonest first."*

### 7.3 Triage
1. **Split the view.** *Today's Calls* = top 20 owners. *Full Backlog* = the rest, one click away.
   Same sort, same rendering.
2. **Mark chronic.** Overdue > 90 days renders muted rather than alarm-red, and `isChronicOnly`
   owners sort below owners with fresh overdue work inside Tier 1.
3. **Track contact.** `mark_contacted` mutation + a "Called today" button, so an owner phoned this
   morning drops off tomorrow's list. This is the only state not derivable from the case JSON, and
   it is what turns a report into a workflow.

### 7.4 Reason strings
Generated from the rule that produced the item:
- `fixed_date` → "Insurance expired 21 days ago (due 2026-08-09)"
- `period_months` → "Air filter last done 2026-02-26, due every 6 months — 115 days overdue"
- `distance_km` → "Brake pads due at 60,835 km, now at 62,190 km — about 19 days ago at 72 km/day"

Always name the rate in distance reasons. It is the number the workshop will challenge.

---

## 8. Mutations and validation

All writes go through an append-only **mutation log**; the raw case is never edited in place.
Effective case = `applyMutations(rawCase, log)`, memoised. Undo = pop. Revert = clear.

```js
{ kind: 'record_service', vehicleId, item, date, km, costBdt, newDueDate?, ts }
{ kind: 'add_odometer',   vehicleId, date, km, ts }
{ kind: 'mark_contacted', ownerId, date, ts }
```

### 8.1 Record a service
Form: Date (default `today`), KM (default `currentKm`; hidden for period and fixed items), Cost
(default item cost, editable), and for `fixed_date` a **required New due date** (pre-filled `+1 year`
as a suggestion only — never guessed silently).

| Check | Rule | Message |
|---|---|---|
| Future date | reject `date > today` | "Service date cannot be in the future." |
| Predates history | reject `date < last history date for this item` | "A later service is already recorded for this item." |
| km regression | reject `km < last service km for this item` | "Service km cannot be below the previous service km." |
| km vs odometer | reject `km > currentKm` | "Service km cannot exceed the current odometer reading ({currentKm})." |
| Missing new due date | reject empty for `fixed_date` | "Enter the new due date." |
| New due date sanity | reject `newDueDate <= date` | "New due date must be after the service date." |

Two write paths: period and distance append history only; **`fixed_date` appends history *and*
rewrites `service_items[].due_date`** (P0-3). Recording early is allowed — preventive maintenance is
normal. Only the recorded item changes, which is automatic because everything is derived.

### 8.2 Add an odometer reading

| Check | Rule | Message |
|---|---|---|
| km regression | reject `km < currentKm` | "Odometer cannot decrease. Current reading is {currentKm} km." |
| Date order | reject `date < last reading date` | "Date must be on or after the last reading ({lastDate})." |
| After `today` | reject `date > case.today` | "Cannot add a reading dated after {today}." |
| Same date | if `date === last reading date`, **replace** that reading | — |

The last two matter because `format_note` guarantees the latest reading is already dated `today`:
without them every update appends a duplicate-date row, and a future-dated reading would raise
`currentKm` while §6 still projects from `today`. Advancing the clock is a separate explicit action,
deliberately not built (§12).

Validation surfaces inline under the field, not via `alert()`.

---

## 9. Edge cases — supersedes EDGE_CASES.md

EDGE_CASES.md v1 claimed several behaviours that testing disproved. Corrections:

| Old claim | Reality |
|---|---|
| 3a "preserves end-of-month anchoring" | `setMonth` overflows; `2026-08-31 + 6 → 2027-03-03`. Fixed in P0-2. |
| 5b "never merges on names" | True for lookups, but the sort's final tie-break *was* `owner.name`. Fixed in P0-4. |
| 6a/6c "record resets one item" | True for period/distance; a no-op for all `fixed_date` items. Fixed in P0-3. |
| 1b "rate 0 → reports km remaining" | Item fell to `status: 'unknown'` and silently left the call list. Fixed in P1-3. |
| 1d "`km: 0` is a valid wear reset" | `0` is a placeholder in 47 provable cases. Re-specified in P1-1. |
| 4b "parsed into floats" | Replaced with integer paisa; no float in money math. |

**Live — present in the data, must work:** `km: null` on period history · `km: 0` on distance history
(149) · 2–4 readings per vehicle · fixed dates up to 40 days past · period items up to 306 days past ·
distance items due within 1 day · projections up to 2,578 days · aggregate cost ties · duplicate
owner names · owners with 5 vehicles · owners with nothing due · month-end period arithmetic ·
25 cases in one file.

**Defensive — zero occurrences, guard + unit test only, no UI:** odometer rollback · duplicate
reading dates · unsorted arrays · single-reading vehicle · rate 0 · orphaned history · missing
history on a period or distance item · malformed cost · non-positive intervals · missing `due_date` ·
history after `today` · history km above current km · duplicate item names · unknown `owner_id`.

Every guard raises a `DataWarning` collected into one **"Data issues (n)"** panel — one place, not
scattered badges. Expected on public data: `ZERO_KM_BASELINE × 149`, nothing else.

---

## 10. Golden numbers

Derived by running the corrected engine over the shipped file. **Verified byte-identical under
Asia/Dhaka, America/New_York and Pacific/Auckland** — that invariance is itself a test.

| Assertion | Expected |
|---|---|
| Cases parsed | 25 (`PUB-01`…`PUB-25`) |
| Owners / vehicles per case | 27 / 42 |
| Items across all cases | 4,188 |
| **All-cases status split** | **1,183 overdue · 432 due_soon · 2,573 fine** |
| **PUB-01 status split** | **45 overdue · 16 due_soon · 104 fine** (165 items) |
| PUB-01 call list | 25 of 27 owners |
| Chronic overdue, all cases | 363 of 1,183 |
| Warnings, all cases | `ZERO_KM_BASELINE` × 149, nothing else |
| **PUB-01 forecast (Tk)** | `[467800, 121700, 111500, 69800, 53500, 10200, 28700, 10800]` |
| **All-cases forecast (Tk)** | `[9536600, 2199500, 2543900, 1437500, 1125000, 639600, 609100, 569400]` |

**PUB-01 call list, urgency-first (default):**
`O20 Shirin Ali` (Tk 5,900 / 220d) → `O16 Mahbub Khan` (35,500 / 209d) → `O03 Habib Ali`
(38,300 / 195d) → `O22 Nasrin Rahman` (67,500 / 193d) → `O06 Rina Chowdhury` (35,500 / 193d) →
`O14 Rina Ali` (10,700 / 159d)

**PUB-01 call list, value-first (toggle):**
`O22` (67,500) → `O01 Salma Ahmed` (54,700) → `O07 Munni Khan` (45,500) → `O15 Mahbub Begum`
(44,500) → `O03` (38,300) → `O16` (35,500)

O22/O06 both sit at 193 max overdue days and O16/O06 both at Tk 35,500 — exactly the collisions
that make `owner.id ASC` load-bearing.

### 10.1 Unit tests (`node test/run.js`, no dependencies)
- **Dates:** `addMonths(2026-08-31, 6) → 2027-02-28`; `addMonths(2026-02-26, 6) → 2026-08-26` under
  a forced `TZ=America/New_York`; `diffCalDays` across a DST boundary.
- **Rate:** PUB-01/V01 `(101743 − 93612) / 112 = 72.5982`; rollback → `post_rollback_span` + warning;
  single reading → rate 0, `basis 'none'`; duplicate date → higher km wins; span < 7 → `reliable false`.
- **Rules:** fixed due yesterday → overdue −1; due today → `due_soon`; period month-end;
  period with no history → `needsBaseline`; distance overdue / upcoming / rate-0 both branches;
  `km: 0` baseline resolves from the odometer, **not** to `0 + every_km`; projection clamps at 3650.
- **Money:** `"12000.00"` → 1200000 paisa; `"1,200.50"` → 120050; `"N/A"` → 0 + warning.
- **Sort:** both toggle states reproduce the §10 orderings exactly; `isChronicOnly` demotes in Tier 1.
- **Mutations:** every row of the §8.1 and §8.2 tables.

### 10.2 Integration
Run over the shipped file, assert the §10 table. Then: record a service on PUB-01/V01 → that item's
status changes and **no other item moves**; record a `fixed_date` renewal → the row actually clears
(the P0-3 regression guard); add an odometer reading → distance items shift, period and fixed do not.

**Determinism guard:** serialise the full call list for all 25 cases and assert the hash is stable
across runs *and* across `TZ=Asia/Dhaka`, `TZ=America/New_York`, `TZ=Pacific/Auckland`. This is the
P0-1 regression test.

---

## 11. Build order

Each step ends green before the next starts.

1. **`dates.js` + `money.js` + their tests.** Smallest surface, biggest correctness win (P0-1, P0-2).
2. **`engine.js` extracted from `app.js`, made pure, + golden-number tests** (P0-5, P1-1, P1-3).
   The §10 table must go green here, before any UI work.
3. **`calllist.js`** — owner grouping, deterministic sort, chronic + cap (P0-4, P1-2).
4. **`mutations.js` + `store.js`** — validation tables, mutation log, `localStorage` persistence,
   undo/revert, case switcher (P0-3, P1-4).
5. **UI rewire** — call list to owner-grouped with Today/Backlog split; record form gains the
   `fixed_date` due-date field and inline validation; data issues panel.
6. **Forecast** — cost buckets, "This week + backlog" labelling for week 0.

Steps 1–5 are the graded path. Step 6 is polish on a bonus that already works.

---

## 12. Deliberately not built

- **React/TS port.** §5.
- **Export to schema-2.1 JSON.** Useful, not scored; the mutation log makes it a later add.
- **Advance `case.today`.** Would make the tool usable beyond one day, but breaks reproducibility
  against the graded fixture. `case.today` stays the only clock.
- **Responsive + print stylesheets, accessibility pass.** Real gaps (`style.css` has zero media
  queries; `index.html` has no `<label>` or `aria-*`), tracked but below the correctness work.
- **Multi-case merging.** Cases stay isolated; the switcher only switches.
