# Vehicle Service Due Predictor

Solution for **LofiStack Hackathon 2026 — P09**

## Project information

- **Team:** `LihanCanCode`
- **Team ID:** `LSH26-T038`
- **Problem:** `P09 — Vehicle Service Due Predictor`
- **Live application:** <!-- FILL --> `<https://lihancancode.github.io/lsh26-t038-p09/>` *(enable GitHub Pages, then replace this line with the real URL)*
- **Demo video:** *(optional, maximum three minutes)*

> Judges will evaluate only the exact commit SHA entered in the Final Submission Form.

## Solution summary

A Dhaka servicing workshop tracks a few hundred vehicles in a register book, so it only learns that
something was due when the customer turns up with a problem. This application reads the workshop's
fleet data, works out a next due date for every service item using that item's own rule, and answers
the question the manager actually has each morning: **who do I call today, and what do I tell them.**
Distance-based items are projected from each vehicle's own daily running rate, so a car doing 90 km a
day is called far sooner than one doing 13.

## Requirements

| Requirement | Status | Where to verify |
|---|---|---|
| R1 — ≥40 vehicles, ≥25 owners, items on fixed-date / period / distance rules, odometer readings and past service records | **Complete** | `#/vehicles` — 42 vehicles, 27 owners, 3–5 items each. Any vehicle page shows all three rule types, its readings and its history. |
| R2 — Next due date per item by its own rule, distance estimated from the vehicle's own daily running, marked overdue / due soon / fine | **Complete** | Any vehicle page. Each item shows its rule, its next due date and the reason. `engine.js` → `calculateItemDue()` and `getDailyKm()`. |
| R3 — Daily call list: owner, vehicle, items due and why, sorted most-overdue and highest-value first | **Complete** | `#/call-list` — the landing route. The sort rule is stated on the page. |
| R4 — Vehicle page with every item, next due date and cost; recording a service resets that one item and grows the history | **Complete** | `#/vehicle/V01` → **Record** on any item. Watch that row change and every sibling stay put. |

### Bonus features

| Bonus | Status | Where to verify |
|---|---|---|
| 8-week workload forecast | **Complete** | `#/forecast` |
| New odometer reading updates every distance estimate | **Complete** | Vehicle page → *Update odometer* |
| Copy-ready reminder message per owner | **Complete** | `#/call-list` → **Copy reminder** |

## How to test the application

1. Open the live application. It loads the published fixture automatically and lands on the **Daily Call List**.
2. Read any row: the owner, the phone number, the vehicle, and each due item with a plain-language
   reason — *"19 days overdue · 986 km past due at 51.9 km/day"*.
3. Click a vehicle name to open its page. It shows the current odometer, that vehicle's own daily
   running rate, and every item with its rule, next due date, status and cost.
4. Press **Record** on *Battery warranty*, enter a new due date, and save. **Expected result:** that
   row changes from *Overdue* to *Fine*, a row appears in the service history, and every other item on
   the vehicle is unchanged.
5. Enter a larger number under *Update odometer* and press **Update**. **Expected result:** the
   distance-based items re-project; the period and fixed-date items do not move. Entering a smaller
   number is refused with a message naming the current reading.
6. Open **Forecast** for the 8-week workload, and **Copy reminder** on any call-list row for the
   customer message.

### Test or sample data

The published fixture `P09_vehicle_service_public.json` is bundled and loads on open, so no setup is
needed to see the sample data.

To test another dataset, click **Load JSON** in the bar under the header, or drag a `.json` file
anywhere onto the page. It accepts three shapes: an object with a `cases` array, a bare array of
cases, or a single case object. A file that does not match the schema is refused with a message
naming the actual problem, and the previous dataset stays loaded.

The **Case** selector switches between all 25 cases in the loaded file.

**To reset:** click **Use bundled** (shown whenever an uploaded file is active), or reload the page.
All edits are held in memory for the session and never modify the bundled file.

## Run locally

### Requirements

- Any modern browser
- Any static file server — Python 3 or Node, both shown below

There is nothing to install: no `package.json`, no dependencies, no build step.

### Setup

```bash
git clone https://github.com/LihanCanCode/lsh26-t038-p09
cd lsh26-t038-p09
python3 -m http.server 8000      # or:  npx serve
```

Then open <http://localhost:8000>.

The page reads its data with `fetch`, which browsers block on `file://`, so it must be served over
HTTP rather than opened from disk. If you do open it from disk, the app says so and offers
**Load JSON** as a way in.

There are no environment variables, no `.env` file, no API keys and no accounts.

## Problem-solving approach

**How we understood the problem.** The brief is a scheduling problem wearing a dashboard. The hard
part is not drawing the list, it is that three different rules produce a due date in three different
units — a calendar date, a number of months, and a distance — and only one of them can be answered
without knowing how the individual vehicle is driven.

**The chosen solution.** We started from the data, not the screens. Before writing interface code we
ran the fixture through a script to establish what was actually in it and to find what would break a
naive implementation. That audit shaped the product: period-based items turned out to be a standing
backlog with a median of 115 days overdue, which would otherwise dominate the call list forever;
149 distance items carry a placeholder odometer value; and duplicate owner names occur in *every*
case, so nothing may be keyed on a name.

**The most important technical decision.** The calculation engine is a pure module —
[`engine.js`](engine.js) — with no DOM, no globals and no wall clock: `today` always comes from
`case.today`. That let us test every rule headlessly before any component existed, and it is why the
same engine drives both the React build and the fallback build.

**The most important product decision.** An item we cannot date is *not* filed as "fine". It stays on
the call list, ranked below everything with a real date and badged *needs review* — because silently
classifying unmeasured work as fine hides it from the workshop, which is the exact failure the brief
describes.

**How it was tested.** The engine runs over all 25 cases and is asserted against fixed expected
totals — 1,183 overdue, 432 due soon, 2,573 fine across 4,188 items, and 45 / 16 / 104 on `PUB-01`.
The same run is repeated under Asia/Dhaka, America/New_York and America/Los_Angeles and must produce
an identical result, because an early version of the date layer gave 45 overdue in Dhaka and 46 in
New York. 56 behavioural checks cover each rule, the status boundaries, every validation message, and
edge cases absent from the published data — odometer rollback, orphaned history rows, malformed
costs, single-reading vehicles. Recording a service, updating an odometer and uploading a dataset
were driven in a real headless browser and asserted, not eyeballed.

## Technology used

- **Frontend:** React 18 + Tailwind CSS, with **no build step** — React, Babel (in-browser JSX
  transform) and Tailwind all load from public CDNs
- **Backend:** None. The application is entirely client-side.
- **Database:** None. Data comes from the fixture JSON; session edits are held in memory.
- **Deployment:** GitHub Pages (static)
- **Other material tools:** None — no starter, template, UI kit or icon library. Every icon is inline
  SVG written by the team.

```
index.html     CDN tags and mount point
engine.js      all service-due calculation — pure, no DOM, no wall clock
app.jsx        all React components
classic.html   zero-dependency vanilla build, kept as a CDN-outage fallback
```

See [`LICENSES.md`](LICENSES.md) for third-party materials.

## Team contributions

| Registered member | GitHub username | Major contribution | Evidence |
|---|---|---|---|
| <!-- FILL: registered name --> | `LihanCanCode` | <!-- FILL --> | `engine.js`, `app.jsx` |
| <!-- FILL: one row per registered member --> | `<username>` | <!-- FILL --> | |

Commit count alone does not represent contribution.

## AI usage

**Claude (Claude Code, Opus)** — used for pair-programming the calculation engine and the React
interface, auditing the fixture for edge cases, and drafting this documentation.

Nothing was accepted on trust. Every calculation rule was checked against the published fixture, and
the verification described under *How it was tested* is what caught real defects in AI-written code:
a date layer whose output changed with the machine's timezone, a **Record** button that silently did
nothing for 40% of items, a route handler that redirected every deep link to the call list, and
undated items vanishing from the call list entirely. Each was fixed and re-verified. Full disclosure
is in [`evaluation-manifest.json`](evaluation-manifest.json).

## Major design decisions

- **A pure engine, separate from the interface.** `engine.js` has no DOM, no globals and no wall
  clock, so every rule is testable in Node before a component exists.
- **Date-only strings are parsed to local midnight**, never `new Date("2026-08-30")` — that
  constructor reads them as *UTC* midnight, which combined with local getters shifted every result by
  a day west of UTC. Day gaps are compared as `Date.UTC` triples so daylight saving cannot move a
  boundary.
- **`addMonths` clamps to the end of the target month.** Plain `setMonth` turns `2026-08-31 + 6` into
  `2027-03-03`; 113 of the 1,560 period-based history records sit on the 29th–31st, so this was live,
  not theoretical.
- **The call list's final tie-break is `owner.id`, never `owner.name`** — `PUB-01` has two people
  called Tanvir Chowdhury and `PUB-03` has three called Rina Ali.
- **Undated items stay on the call list**, ranked last and badged *needs review*, rather than being
  filed as fine.
- **"Backlog" needs *every* overdue item to be older than 90 days**, deliberately not *any* — a
  vehicle with a 220-day item beside a 12-day item still has a fresh problem.
- **No build step**, so the repository is served exactly as it sits and a judge has nothing to compile.

## Known limitations

- **State is in memory for the session.** Recorded services and odometer updates survive navigation
  but are lost on reload, which restores the bundled fixture. No persistence, undo or export.
- **The call list is per vehicle, not per owner**, so an owner with three vehicles needing attention
  appears three times. Grouping by owner is the first change we would make.
- **A history record with `km: 0` is taken literally** as a baseline of zero. It appears on 149 of the
  1,050 distance items, and in at least 47 of those the record is dated *after* the vehicle's first
  odometer reading — where a real odometer could not read zero — so it is a placeholder. Measured
  impact: one item misclassified across all 25 cases (`PUB-09` / `V28`, Tyres).
- **The daily rate uses the most recent usable pair of readings**, not the full span. Across the 713
  vehicles with 3+ readings the two differ by a median of 0.7%.
- **No settings screen**, so the 14-day due-soon window and 90-day backlog threshold are constants.
- **The automated checks are not committed**, so they cannot be re-run from a clone.
- **The React build depends on three public CDNs** and compiles JSX in the browser.
  [`classic.html`](classic.html) is the dependency-free fallback.

## Repository records

- [`EVENT.md`](EVENT.md) — event start code and pre-event-material declaration
- [`evaluation-manifest.json`](evaluation-manifest.json) — structured judging evidence
- [`LICENSES.md`](LICENSES.md) — frameworks, libraries, templates and assets
