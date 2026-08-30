# Edge Case Handling Document (P09 - Vehicle Service Predictor)

This document outlines the core edge cases anticipated and handled by the calculation engine and UI, directly referencing scenarios found in the live fixture dataset.

## 1. Distance-Based Items

- **1a. Already overdue by distance (negative km remaining)**  
  If a vehicle's `last_service_km` + `every_km` is already less than the current odometer, the `km_remaining` is negative. The engine explicitly flags this as `overdue` immediately, avoiding generating negative days remaining through the standard `km_remaining / daily_km` division.

- **1b. Zero daily_km / Barely Moved**  
  If consecutive odometer readings show 0 km or near-0 km traveled, `daily_km` evaluates to zero. To prevent divide-by-zero (`Infinity` days), the engine detects `rate === 0` and explicitly marks the projection as "Unknown rate," reporting the pure km remaining instead of attempting a date projection.

- **1c. Never Serviced (No baseline history)**  
  When an item has no matching entry in `service_history`, the engine gracefully falls back to the earliest known `odometer_readings.km`. A warning explicitly denotes that the baseline was estimated from the first known reading.

- **1d. `km: null` vs `km: 0` in history**  
  The engine correctly distinguishes between `null` and `0`. For distance-based items (like the Timing belt on V02), `km: 0` is treated as a valid wear reset to 0, whereas `km: null` falls back to the earliest known odometer reading.

- **1e. Only 2 Odometer Readings**  
  The `daily_km` function guarantees a stable calculation as long as a minimum of 2 valid readings exist, ensuring the formula doesn't break if the history is sparse.

- **1f. Identical Odometer Dates**  
  If multiple readings were taken on the exact same date, the engine ignores the zero-day differential and walks backward to find the most recent distinct pair of dates.

## 2. Fixed-Date Items

- **2a. Due Exactly Today**  
  Items where `due_date === case.today` are explicitly treated as `due_soon` (last day), crossing into `overdue` only when `due_date < case.today`.

- **2b. Already Overdue at Data-Load**  
  Because the engine purely diffs `case.today` against `due_date`, items overdue far in the past (e.g., V01's Battery warranty due 2026-08-25) are instantly classified as `overdue` on the first render.

## 3. Period-Months Items

- **3a. Interval Spans Month Lengths / Leap Years**  
  The engine uses native `Date.setMonth(getMonth() + every_months)` logic to ensure correct alignment across variable-length months (e.g., preserving end-of-month anchoring) rather than a naive 30-day multiplication.

- **3b. Never Serviced**  
  Similar to distance items, if no service history exists, the engine relies on the date of the very first odometer reading as the baseline, appending an "Estimated" warning.

## 4. Status Threshold Boundaries

- **4a. Due-Soon Cutoff (`<= 14 days`)**  
  The engine uses an explicitly declared boundary `daysUntil <= 14` for `due_soon`. This exact same logic maps perfectly across the call list and the 8-week forecast.

- **4b. String-formatted Cost Parsing**  
  `cost_bdt` values (like `"12000.00"`) are rigorously parsed into floats before summing to prevent string concatenation bugs. 

## 5. Ownership / Grouping Edge Cases

- **5a. One Owner, Multiple Vehicles**  
  The call list generates a separate row per vehicle that requires attention. Even if an owner has 3 vehicles, the UI displays exactly which vehicle needs calling, preserving context.

- **5b. Duplicate Owner Names**  
  The application logic heavily keys off `owner_id` (e.g., `O09` vs `O11` for "Tanvir Chowdhury"). It never merges based on string names, avoiding disastrous privacy leaks or merged logic.

- **5c. Variable Item Counts**  
  The engine dynamically loops over `vehicle.service_items` rather than hardcoding a strict set of 5 items, allowing total flexibility per vehicle.

## 6. Recording a Completed Service

- **6a. Resets One Item Only**  
  Writing to `service_history` strictly appends a new row matching the recorded `item.name`. Sister items remain completely untouched, adhering to the hackathon's strict requirement.

- **6b. Completing an Item Early**  
  The form supports logging a service regardless of its current state. The new record becomes the definitive top of the stack, projecting the next deadline forward correctly from the new date/km baseline.

- **6c. Fixed-Date Items Input**  
  *(Manual Note)* When updating a fixed date item like Insurance, users understand the record grows history, but the future due date must be manually updated (since external authorities set the new certificate date, not a fixed addition algorithm).

## 7. Call List Sorting Edge Cases

- **7a. Tiebreaker Logic**  
  If two vehicles are exactly as overdue as each other, the system sorts by `cost_bdt` descending, prioritizing the most lucrative jobs for the workshop.

- **7b. Vehicle with both Overdue & Due-Soon**  
  A vehicle's urgency score is dictated by its **most urgent** item (`maxDaysOverdue`). However, the total cost displayed on the call list sums **all** actionable items (both overdue and due soon) to give the caller the full financial picture.

## 8. Data-Integrity Edge Cases

- **8a. Decreasing Odometer Readings**  
  If user input accidentally enters a lower km reading than current history, the update form explicitly blocks submission via validation.
- **8b. 100% Fine Vehicles**  
  If a vehicle has exclusively `fine` items, it is entirely omitted from the call list to prevent dashboard bloat.
