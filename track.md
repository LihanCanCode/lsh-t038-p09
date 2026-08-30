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

### T1 · Deploy, and keep a live URL from here on — **20 min** 🔴 EXISTENTIAL — ⏳ AWAITING USER
- [x] Add `.nojekyll`, push (done — commit `47f461a`)
- [ ] **USER: enable GitHub Pages** → Settings ▸ Pages ▸ Source: `main` / root
- [ ] Verify the live URL loads and `P09_vehicle_service_public.json` fetches (no 404/CORS)
- [ ] Confirm the call list renders on the deployed build, not just locally
- [ ] Paste URL into the Discord team channel
> Nothing else matters if the 22:00 health check finds nothing. Do this first, re-verify after every push.

### T2 · Fix the `fixed_date` record no-op — ✅ **DONE** 🔴 MVP BULLET 4
- [x] Required **New due date** field, shown only for `fixed_date` items, prefilled +1 year
- [x] On save: append the history row **and** write `item.due_date`
- [x] Verified: V01 Battery warranty `overdue/-5` → `fine/365`, history 3 → 4 rows
- [x] Verified: **no other item on that vehicle moved**
- [x] Odometer km field now hidden for period/fixed items (it was never meaningful there)
> `calculateItemDue` reads only `item.due_date` for this rule, so today the Record button does
> nothing for 66 of PUB-01's 165 items. A judge clicking Record on Insurance sees a dead button.

### T3 · Responsive + real empty/loading/error states — ✅ **DONE** 🟠 UI/UX
- [x] Media queries at 900 / 768 / 480px
- [x] All three tables reflow to labelled stacked cards below 768px (`data-label` + `table.stacked`)
- [x] `.table-wrap` scroll containers; forecast bars scroll instead of crushing
- [x] Empty states: "All caught up" call list, no-match vehicle search, no service history
- [x] `overflow-wrap` so long plates/reasons wrap instead of widening the page
- [x] Visible keyboard focus rings
- [x] **Verified in headless Chrome: `scrollWidth === clientWidth === 390` on both
      `/#/call-list` and `/#/vehicle/V01`** — zero horizontal overflow. Desktop unchanged.
> The judge screenshots the live URL. `style.css` currently has **zero** media queries, which is
> named explicitly in the Weak band.

### T4 · Engine correctness — ✅ **DONE** 🟠 TECHNICAL EXECUTION
- [x] `parseLocalDate` / `fmtISO`; every `new Date(str)` and display `toISOString()` removed
- [x] `addMonths` clamps to month end (`2026-08-31 + 6 → 2027-02-28`, `2024-02-29 + 12 → 2025-02-28`)
- [x] `dateDiffDays` compares UTC triples built from local fields — DST-proof
- [x] `Math.ceil` on the projection, clamped at `MAX_PROJECT_DAYS`
- [x] Verified **1183 / 432 / 2573** all cases, **45 / 16 / 104** PUB-01 — matches PLAN.md §10
- [x] Verified **identical fingerprint** under Asia/Dhaka, America/New_York, America/Los_Angeles
> Output is currently timezone-dependent (45 overdue in Dhaka, 46 in New York). Judging runs off
> an archived capture on someone else's infrastructure.

### T5 · Form validation — ✅ **DONE** (landed with T2/T3) 🟡 FUNCTIONALITY EDGES
- [x] Record service: future date · date before this item's last history · km above current
      odometer · km below previous service km · missing or non-advancing new due date
- [x] Odometer: non-numeric · decrease · unchanged value
- [x] **All `alert()` calls removed** — every rejection is an inline message naming the value
> "Edge cases handled without being asked" is the Exceptional band's wording.

### T6 · Docs — ✅ **DONE** 🟡 DEMO & DOCS (6 + 4 + 2 marks)
- [x] README rewritten: what it does · how to run · **what is mocked** · what is next, plus the
      live URL and the verified status table. Stale `p09-app` path fixed.
- [x] LICENSES.md: explicit "no third-party code", Inter/OFL with why it is linked not vendored,
      fixture attribution, and an explicit no-AGPL/GPL/SSPL compliance line
- [x] EDGE_CASES.md rewritten against measured behaviour — every claim the old version made that
      testing disproved is now marked **[FIXED]** with the reason it was wrong

### T7 · Demo video — **10 min** 🔴 8 MARKS, HIGHEST RATE ON THE BOARD
- [ ] 60+ seconds, screen recording of the **live URL**
- [ ] Show all 4 MVP bullets explicitly: dataset scale → due computation → call list sort →
      record a service and watch that one item reset
- [ ] Show the 3 bonuses: forecast, odometer recompute, copy reminder
- [ ] Every claim in the video must be reproducible live — a polished video of something that
      does not work scores nothing

### T8 · Call list summary + backlog marking — ✅ **DONE**
- [x] Summary bar: vehicles to call · owners · items overdue · due-soon · estimated value
- [x] `BACKLOG` tag on vehicles whose overdue work is *all* older than 90 days (9 of 37 in PUB-01)

### T9 · Load any dataset — ✅ **DONE** 🟢 USER REQUEST
- [x] **Load JSON** button + whole-window drag-and-drop
- [x] Accepts `{cases:[...]}`, a bare array of cases, or a single case object
- [x] **Case switcher** — all 25 cases now reachable (was hardcoded to `cases[0]`)
- [x] Data bar shows active source, vehicle/owner counts and the case's `today`
- [x] Schema validation with specific messages (bad rule name, no cases, malformed JSON)
- [x] Unknown `owner_id` synthesises a placeholder + warning instead of blanking the dashboard
- [x] "Use bundled data" to revert
- [x] Verified: 25-case file, single-case file, bare array, 3 malformed files, ghost owner_id

### T10 · Stretch — ⚪ SKIP WITHOUT REGRET
- [ ] Split `engine.js` out of `app.js`
- [ ] `km: 0` baseline fix (149 items, 1 misclassification today)

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
- 20:15 — T1 pushed, Pages needs one click from the user; started T2
- 20:18 — **T2 + T4 done and verified headlessly.** Engine now TZ-invariant and matches
  PLAN.md's golden numbers exactly.
- 20:22 — **T3 + T5 done.** Stacked mobile cards, empty states, inline validation, zero
  horizontal overflow confirmed by measurement.
- 20:28 — **T6 done.** README / LICENSES / EDGE_CASES all rewritten against measured behaviour.
- 20:28 — ⚠️ Pages still returning 404.
- 20:40 — **T8 + T9 done.** Dataset is no longer hardcoded: upload any same-schema JSON,
  switch between cases, with validation and graceful failure. All 25 cases now reachable.
- ⚠️ **T1 (enable Pages) and T7 (record video) are the only things left, and both need the user.**
