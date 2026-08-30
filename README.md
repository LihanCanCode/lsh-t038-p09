# Vehicle Service Predictor

Solution for **LofiStack Hackathon 2026 — P09**

## Project information

- **Team:** `<TEAM NAME>`
- **Team ID:** `LSH26-T038`
- **Problem:** `P09 — Vehicle Service Due Predictor`
- **Live application:** `<https://example.com>`
- **Demo video:** `<Optional link, maximum three minutes>`

> Judges will evaluate only the exact commit SHA entered in the Final Submission Form.

## Solution summary

The application is a smart predictive engine for car workshops in Dhaka to actively manage customer vehicles. It dynamically forecasts service due dates by analyzing a vehicle's historical daily running rate, automatically prioritizing the most overdue and highest-value follow-up calls into a daily dashboard.

## Requirements

| Requirement              | Status                             | Where to verify       |
| ------------------------ | ---------------------------------- | --------------------- |
| R1 — Create 40+ vehicles, 25+ owners, rules, odometers & history | Complete | Pre-loaded via `P09_vehicle_service_public.json` |
| R2 — Calculate next due date per rule (distance via daily run rate), mark status | Complete | Calculation engine in `app.js` / Visualized via badges across all UI views |
| R3 — Daily call list sorted by most overdue and highest value | Complete | "Daily Call List" page (`#/call-list` route) |
| R4 — Owner vehicle page with record completed service functionality | Complete | "All Vehicles" -> Vehicle Detail page (`#/vehicle/:id` route) |

## How to test the application

1. Open the live application.
2. Observe the **Daily Call List** to see the algorithm prioritizing the most overdue and highest-value services.
3. Navigate to **All Vehicles**, search for a specific vehicle (e.g., `V01`), and click into its detail page.
4. Click **Record** next to an actionable service item, enter a new date/odometer, and verify that the specific item resets instantly while sibling items remain unchanged.

### Test or sample data

The application automatically fetches the provided `P09_vehicle_service_public.json` fixture upon load. To reset any recorded services or odometer updates, simply refresh the browser page (as state is handled dynamically in-memory for the duration of the session).

## Run locally

### Requirements

- A basic local web server (Python, Node.js `serve`, or VS Code Live Server)
- No build tools or databases required.

### Setup

```bash
git clone https://github.com/LihanCanCode/lsh-t038-p09.git
cd lsh-t038-p09
# Using Python
python -m http.server 8000
# OR using Node.js
npx serve
```
Open `http://localhost:8000` in your web browser.

## Problem-solving approach

- **Understanding:** We understood the problem required an accurate, mathematical forecasting engine that dynamically adapts to each vehicle's unique driving habits rather than relying on naive static dates.
- **Chosen solution:** A completely serverless, Pure Vanilla JS Single-Page Application (SPA).
- **Most important technical decision:** We chose to avoid all external frameworks (React/Vue/Tailwind) entirely to completely eliminate any risk of bundler or build-step failures at the 10:00 PM deadline, ensuring our app runs flawlessly out-of-the-box.
- **Testing:** We verified our algorithms by creating standalone Node.js test scripts to manually evaluate edge cases (e.g., negative km remaining, leap years, missing data) against the exact JSON fixture.

## Technology used

- **Frontend:** Vanilla HTML5, Vanilla CSS3 (Custom Variables/Grid), Vanilla JS (ES6+)
- **Backend:** None (100% Client-Side execution)
- **Database:** In-memory State Management (parsed from JSON fixture)
- **Deployment:** `<DEPLOYMENT PROVIDER>`
- **Other material tools:** None

See [`LICENSES.md`](LICENSES.md) for third-party materials.

## Team contributions

| Registered member | GitHub username | Major contribution | Evidence                |
| ----------------- | --------------- | ------------------ | ----------------------- |
| `<Name>`          | `<username>`    | UI Design & Engine | `app.js`, `style.css`   |
| `<Name>`          | `<username>`    | Edge Case Logic    | `EDGE_CASES.md`, Github Commits |

*Commit count alone does not represent contribution.*

## AI usage

AI tools (Claude/ChatGPT) were used to assist with boilerplate CSS generation, rapid mathematical edge-case hardening (e.g., divide-by-zero protections in velocity calculations), and structuring documentation. All outputs were manually verified via isolated unit tests and cross-referenced with the JSON fixture.

## Major design decisions

- **Decision:** Zero Framework Architecture. 
  - *Reason:* Guaranteed 100% runtime stability for the judges and extremely fast page loads without the need for Node modules.
- **Decision:** Safe Negative Distance Projection. 
  - *Reason:* If a vehicle is mathematically already past its km threshold, projecting a "future date" creates a negative time paradox. We decided to explicitly intercept this and back-calculate exactly how many *days* they are overdue based on their unique velocity.

## Known limitations

- The application uses in-memory state mapping. Any recorded services or odometer updates will successfully dynamically update the UI and recalculate deadlines, but will not persist if the browser window is refreshed.

## Repository records

- [`EVENT.md`](EVENT.md) — event start code and pre-event-material declaration
- [`evaluation-manifest.json`](evaluation-manifest.json) — structured judging evidence
- [`LICENSES.md`](LICENSES.md) — frameworks, libraries, templates and assets
