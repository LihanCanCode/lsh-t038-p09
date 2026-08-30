# Edge Case Handling (P09 — Vehicle Service Due Predictor)

Every behaviour below was verified against the shipped fixture by running the engine over all
25 cases (4,188 service items), not assumed. Where an earlier revision of this document claimed a
behaviour the code did not actually have, the correction is marked **[FIXED]**.

---

## 1. Date arithmetic

**1a. Timezone independence [FIXED]**
Date-only strings like `"2026-08-30"` are parsed to **local midnight** via explicit
`new Date(y, m-1, d)`. The obvious `new Date(str)` parses them as *UTC* midnight, which combined
with local `getDate()`/`setMonth()` shifts every result by a day west of UTC — the same data
previously gave 45 overdue items in Dhaka and 46 in New York. Day gaps are computed from
`Date.UTC` triples built out of local fields, so DST cannot move a boundary either.
Output is now byte-identical under `Asia/Dhaka`, `America/New_York` and `America/Los_Angeles`.

**1b. Month-end and leap years [FIXED]**
`addMonths` clamps to the last day of the target month. Plain `setMonth` overflows:
`2026-08-31 + 6` would give `2027-03-03` instead of `2027-02-28`. 113 of the 1,560
`period_months` history records fall on the 29th–31st, so this was live, not theoretical.
Checked: `2026-08-31 +6 → 2027-02-28`, `2024-02-29 +12 → 2025-02-28`.

**1c. Fractional day projections [FIXED]**
`kmRemaining / rate` is rarely a whole number. It is rounded **away from today** with `Math.ceil`
rather than truncated, so an item 14.6 days out does not read as 14 and flip from `fine` to
`due soon`. Projections are clamped at 3,650 days so a 2,578-day estimate cannot dominate a sort.

---

## 2. Distance-based items

**2a. Already past the threshold (negative km remaining)**
Flagged `overdue` directly. Days overdue are back-calculated from the vehicle's own rate, so the
call list can say *how long* it has been due rather than just that it is.

**2b. Zero or unknown daily rate**
If consecutive readings show no movement, `rate` is 0 and no date can be projected. The engine
does not divide — it reports the km remaining and the reason string says "daily rate unknown".
Zero occurrences in the public data; the guard exists for hidden cases.

**2c. Never serviced (no baseline)**
Falls back to the earliest known odometer reading and labels the reason "Estimated from first
reading". Zero occurrences in the public data — every non-fixed item has exactly one history row.

**2d. `km: null` vs `km: 0`**
`null` (used on every `period_months` history row) falls back to the earliest odometer reading.
`km: 0` is currently taken literally as a baseline of zero.
**Known limitation:** `km: 0` appears on 149 of 1,050 distance items, and in at least 47 of them
the record is dated *after* the vehicle's first odometer reading — where a real odometer could not
read zero, so the value is a placeholder rather than a measurement. Measured impact today is one
item misclassified across all 25 cases (PUB-09/V28 Tyres). Treating it as a missing baseline is
listed in the README's "what is next".

**2e. Sparse odometer history**
Two readings are enough. If the two most recent readings share a date, the engine walks back to the
most recent pair with a non-zero day gap rather than dividing by zero.

---

## 3. Fixed-date items

**3a. Due exactly today**
`due_date === case.today` is `due_soon` — the last usable day — and becomes `overdue` only once the
date has passed.

**3b. Recording a renewal [FIXED]**
Previously the Record button was a **no-op** for every `fixed_date` item: it appended a history row,
but due dates for this rule are read from `service_items[].due_date`, which was never rewritten, so
the row stayed overdue forever. That affected 66 of PUB-01's 165 items. The form now requires a
**new due date** (prefilled one year ahead as a suggestion), and saving writes both the history row
and the item's `due_date`. The field is required rather than calculated because the schema stores no
renewal period, and insurance, fitness and battery warranty genuinely differ.

---

## 4. Recording a service

**4a. Resets exactly one item**
A recorded service appends one history row keyed to that item's name. Verified: recording the
Battery warranty renewal on V01 moved it from `overdue/-5 days` to `fine/365 days` while all four
sibling items held their status and day counts exactly.

**4b. Recording early**
Allowed — preventive maintenance is normal. The new record becomes the baseline and the next
deadline projects forward from it.

**4c. Validation [FIXED]** — all inline, no `alert()` anywhere in the codebase:

| Rejected | Message names the offending value |
|---|---|
| Service date after `case.today` | "Service date cannot be after 2026-08-30." |
| Service date before this item's last history row | "A later service is already recorded for this item (…)." |
| Service km above the current odometer | "Service km cannot exceed the current odometer reading (…)." |
| Service km below the previous service km | "Service km cannot be below the previous service km (…)." |
| Missing new due date on a `fixed_date` item | "Enter the new due date." |
| New due date on or before the service date | "New due date must be after the service date." |

**4d. Odometer field scoping**
The km input is shown only for `distance_km` items. It was previously shown for every rule and
prefilled with the current odometer, which wrote meaningless km values onto period and fixed rows.

---

## 5. Odometer updates

Rejected inline: non-numeric input, any value **below** the current reading ("Odometer cannot
decrease. Current reading is 101,743 km."), and a value equal to the current reading. Accepting an
update re-projects every distance-based item on that vehicle; period and fixed items are untouched.

---

## 6. Ownership and grouping

**6a. Duplicate owner names [FIXED]**
Owners are keyed on `owner_id` throughout. This matters: `O09` and `O11` are both "Tanvir
Chowdhury" in PUB-01, and duplicate names occur in every case (PUB-03 has three "Rina Ali").
The call-list sort previously used `owner.name` as its final tie-break, which cannot separate two
owners with the same name and left their relative order undefined between renders.

**6b. One owner, multiple vehicles**
The list shows one row per vehicle so the caller knows which car needs what. An owner with three
due vehicles therefore appears three times — a deliberate trade-off, noted in the README as work to
do next.

**6c. Variable item counts**
The engine iterates `vehicle.service_items`; nothing assumes a fixed set. Vehicles carry 3 to 5
items in this data.

---

## 7. Presentation and empty states

- Vehicles with no actionable work are excluded from the call list; a list with nothing on it shows
  "All caught up" rather than an empty table.
- Vehicle search with no matches, and vehicles with no service history, both have explicit states.
- Below 768px every table reflows into labelled stacked cards. Measured in headless Chrome:
  `scrollWidth === clientWidth === 390` on the call list and vehicle routes — no horizontal
  overflow at phone width.
- Unknown routes fall back to the call list instead of rendering blank; a failed data load renders
  an explicit error explaining the `file://` vs HTTP cause.

---

## 8. Items that cannot be dated

An item with no computable due date — a `fixed_date` row with no `due_date`, or a period item with
no baseline at all — is **not** treated as `fine`. It is carried onto the call list in its own
bucket, badged "needs review", ranked below every item that has a real date, and counted in the
summary bar. Silently classifying it as fine would hide real work from the workshop.

## 9. Guarded but not present in this data

Verified against synthetic fixtures, no dedicated UI: odometer rollback (rate never goes negative),
unsorted `service_history` / `odometer_readings` (sorted on load), single-reading and
identical-date-reading vehicles (rate is `null`, no divide-by-zero), orphaned history rows naming an
item that is not in `service_items` (ignored), malformed `cost_bdt` (parses to 0, never `NaN`),
history dated after `case.today`, and history km above the current odometer.
