# P09 Build Track — Final Sprint

**Clock:** started 20:12 · hard stop 22:00 · **107 minutes**
**Repo:** `lsh26-t038-p09` · **Deployed:** ❌ not yet — this is the existential risk

---

## Why this order (not PLAN.md's order)

PLAN.md v2 specifies a full module refactor, mutation log, persistence and a test suite.
That is the right plan with a day. With **107 minutes** it is the wrong plan — it spends the
whole clock on Technical Execution (15 marks, one band's worth of movement) while leaving
Deployment (existential), Functionality (25) and Demo (20) untouched.

This track is ordered by **marks per minute against the published rubric**, not by architecture.

| Rubric category | Marks | Where we stand | What moves it |
|---|---|---|---|
| Screen stage | gate | **No live URL = whole problem screened out** | T1 |
| Functionality | 25 | MVP bullet 4 fails for `fixed_date` items (40% of catalogue) | T2, T5 |
| Difficulty | 15 | scaled by bullets working ÷ 4 — bullet 4 failing costs ~1.9 | T2 |
| UI / UX | 15 | zero media queries → rubric puts "broken on narrow screens" in **Weak (3–6)** | T3 |
| Demo & docs | 20 | **video not recorded (8 marks)**; README/LICENSES exist | T6, T7 |
| Technical execution | 15 | single 522-line `app.js`, global state | T4, T8 |
| Early submission | 10 | 3 blocks now (3.75). Working to ~21:40 costs ~2.5 | accepted — see below |

**Speed-bonus decision: keep working.** Stopping now banks 3.75 marks. Finishing T1–T7 is worth
roughly +19 raw on this problem (~+9.5 to the team total, since judged categories are averaged
across both problems) against ~2.5 of bonus given up. Not close.

---

## Tasks — one at a time, each fully finished before the next

### T1 · Deploy, and keep a live URL from here on — **20 min** 🔴 EXISTENTIAL
- [ ] Add `.nojekyll`, push, enable GitHub Pages on `main` (fallback: Vercel static)
- [ ] Verify the live URL loads and `P09_vehicle_service_public.json` fetches (no 404/CORS)
- [ ] Confirm the call list renders on the deployed build, not just locally
- [ ] Paste URL into the Discord team channel
> Nothing else matters if the 22:00 health check finds nothing. Do this first, re-verify after every push.

### T2 · Fix the `fixed_date` record no-op — **15 min** 🔴 MVP BULLET 4
- [ ] Add a required **New due date** field to the record form, shown only for `fixed_date` items
- [ ] On save: append the history row **and** write `item.due_date`
- [ ] Verify: record Insurance on a vehicle → row leaves `overdue`, history gains the entry
- [ ] Verify: no other item on that vehicle moves
> `calculateItemDue` reads only `item.due_date` for this rule, so today the Record button does
> nothing for 66 of PUB-01's 165 items. A judge clicking Record on Insurance sees a dead button.

### T3 · Responsive + real empty/loading/error states — **20 min** 🟠 UI/UX
- [ ] Media queries at 768px / 480px; tables reflow to stacked cards on narrow screens
- [ ] Horizontal scroll containers so no table can break the page layout
- [ ] Empty state on the call list ("All caught up"), vehicle search with no matches
- [ ] Replace `alert()` validation with inline field errors
> The judge screenshots the live URL. `style.css` currently has **zero** media queries, which is
> named explicitly in the Weak band.

### T4 · Engine correctness — **15 min** 🟠 TECHNICAL EXECUTION
- [ ] Parse ISO dates to **local midnight**; drop `new Date(str)` and `toISOString()` for display
- [ ] Clamp `addMonths` to the last day of the target month (`2026-08-31 + 6 → 2027-02-28`)
- [ ] `Math.ceil` the fractional day projection; clamp at 3650 days
- [ ] Re-verify PUB-01 still reads **45 overdue / 16 due_soon / 104 fine**
> Output is currently timezone-dependent (45 overdue in Dhaka, 46 in New York). Judging runs off
> an archived capture on someone else's infrastructure.

### T5 · Form validation — **10 min** 🟡 FUNCTIONALITY EDGES
- [ ] Record service: reject future date, date before last history, km above current odometer
- [ ] Odometer: reject decrease, reject date after `case.today`, replace on same-date
- [ ] Every rejection shows an inline message naming the offending value
> "Edge cases handled without being asked" is the Exceptional band's wording.

### T6 · Docs — **10 min** 🟡 DEMO & DOCS (6 + 4 + 2 marks)
- [ ] README: fix the stale `p09-app` directory reference, add the live URL, state what is mocked
- [ ] LICENSES.md: confirm Inter/OFL entry is accurate and complete
- [ ] Final `track.md` + `EDGE_CASES.md` reconciled with what actually shipped

### T7 · Demo video — **10 min** 🔴 8 MARKS, HIGHEST RATE ON THE BOARD
- [ ] 60+ seconds, screen recording of the **live URL**
- [ ] Show all 4 MVP bullets explicitly: dataset scale → due computation → call list sort →
      record a service and watch that one item reset
- [ ] Show the 3 bonuses: forecast, odometer recompute, copy reminder
- [ ] Every claim in the video must be reproducible live — a polished video of something that
      does not work scores nothing

### T8 · Stretch, only if the clock allows — ⚪ SKIP WITHOUT REGRET
- [ ] Split `engine.js` out of `app.js` (plain second `<script>`, no bundler)
- [ ] `km: 0` baseline fix (149 items, but only 1 misclassification today)
- [ ] Chronic (>90d) muting + daily cap on the call list

---

## Cut from PLAN.md — deliberate, with reasons

| Dropped | Why |
|---|---|
| Owner-grouped call list | 20+ min and a regression risk; per-vehicle already satisfies the MVP bullet |
| Module split / `src/` tree | Moves one band on a 15-mark category; costs more than T1+T2 combined |
| Mutation log, undo, localStorage | Not in any MVP bullet; README already documents in-memory as the tradeoff |
| Multi-case switcher | Bullet asks for one workshop's data |
| Zero-dependency test suite | Real value, zero marks, and the clock is the binding constraint |
| Export round-trip, a11y pass | Below the cut line |

---

## Log
- 20:12 — clock check: 107 min left, no live URL, track written, starting T1
