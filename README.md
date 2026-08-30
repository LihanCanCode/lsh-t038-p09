# Vehicle Service Predictor

Solution for **LofiStack Hackathon 2026 — P09**

## Project information

- **Team:** `Mrittu Machines`
- **Team ID:** `LSH26-T038`
- **Problem:** `P09 — Vehicle Service Due Predictor`
- **Live application:** <https://lsh-t038-p09.vercel.app/>
- **Demo video:** `<Optional link, maximum three minutes>`

> Judges will evaluate only the exact commit SHA entered in the Final Submission Form.

## Solution summary

The application is a smart predictive engine for car workshops in Dhaka to actively manage customer vehicles. It dynamically forecasts service due dates by analyzing a vehicle's historical daily running rate, automatically prioritizing the most overdue and highest-value follow-up calls into a daily dashboard. It features a custom-built Premium Glassmorphic UI on the landing page and global routes, powered by Framer Motion for smooth interactions.

## Requirements

| Requirement              | Status                             | Where to verify       |
| ------------------------ | ---------------------------------- | --------------------- |
| R1 — Create 40+ vehicles, 25+ owners, rules, odometers & history | Complete | Pre-loaded via `P09_vehicle_service_public.json` |
| R2 — Calculate next due date per rule (distance via daily run rate), mark status | Complete | Calculation engine in `engine.js` / Visualized via badges across all UI views in `app.jsx` |
| R3 — Daily call list sorted by most overdue and highest value | Complete | "Daily Call List" component |
| R4 — Owner vehicle page with record completed service functionality | Complete | Vehicle Detail component |

## How to test the application

1. Open the live application.
2. Observe the **Daily Call List** to see the algorithm prioritizing the most overdue and highest-value services.
3. Search for a specific vehicle (e.g., `V01`), and click into its detail page.
4. Click **Record** next to an actionable service item, enter a new date/odometer, and verify that the specific item resets instantly while sibling items remain unchanged.

### Test or sample data

The application automatically fetches the provided `P09_vehicle_service_public.json` fixture upon load. To reset any recorded services or odometer updates, simply refresh the browser page (as state is handled dynamically in-memory for the duration of the session).

## Run locally

### Requirements

- Node.js (v18+)

### Setup

```bash
git clone https://github.com/LihanCanCode/lsh-t038-p09.git
cd lsh-t038-p09
npm install
npm run dev
```
Open `http://localhost:5173` in your web browser.

## Problem-solving approach

- **Understanding:** We understood the problem required an accurate, mathematical forecasting engine that dynamically adapts to each vehicle's unique driving habits rather than relying on naive static dates.
- **Chosen solution:** A React Single Page Application built with Vite. The calculation engine lives in `engine.js` as a pure module: no DOM, no globals, and no wall clock — `today` always comes from `case.today`.
- **Most important technical decision:** We chose to overhaul the UI with a "Premium Glassmorphic" design system utilizing Tailwind CSS and Framer Motion to provide a world-class SaaS aesthetic while maintaining rigorous mathematical accuracy underneath.
- **Testing:** We verified our algorithms headlessly against the full dataset (all 25 cases, 4,188 items) to ensure correct timezone parsing and mathematical accuracy.

## Technology used

- **Frontend:** React 19, Vite, Tailwind CSS, Framer Motion
- **Backend:** None (100% Client-Side execution)
- **Database:** In-memory State Management (parsed from JSON fixture)
- **Deployment:** Vercel
- **Other material tools:** N/A

See [`LICENSES.md`](LICENSES.md) for third-party materials.

## Team contributions

| Registered member | GitHub username | Major contribution | Evidence                |
| ----------------- | --------------- | ------------------ | ----------------------- |
| Lihan             | LihanCanCode    | React UI, Vite Migration, AI Dev | `app.jsx`, UI Overhaul  |
| Istu              | IsTu25          | Edge Case Logic, Engine          | `engine.js`             |

*Commit count alone does not represent contribution.*

## AI usage

AI tools (Claude+Gemini 3.1 Pro) were used to assist with boilerplate CSS/React generation, rapid mathematical edge-case hardening (e.g., divide-by-zero protections in velocity calculations), and structuring documentation. All outputs were manually verified via isolated unit tests and cross-referenced with the JSON fixture.

## Major design decisions

- **Decision:** Vite + React Architecture. 
  - *Reason:* Required to robustly support advanced animation libraries (Framer Motion) and complex CSS imports for the Premium UI overhaul.
- **Decision:** Pure Date Arithmetic & TZ Handing. 
  - *Reason:* Dates are parsed to local midnight, never `new Date("2026-08-30")`. That constructor reads date-only strings as UTC midnight, which shifts results. Day differences are computed from `Date.UTC` triples built out of local fields, so DST cannot move a boundary either.

## Known limitations

- The application uses in-memory state mapping. Any recorded services or odometer updates will successfully dynamically update the UI and recalculate deadlines, but will not persist if the browser window is refreshed.

## Repository records

- [`EVENT.md`](EVENT.md) — event start code and pre-event-material declaration
- [`evaluation-manifest.json`](evaluation-manifest.json) — structured judging evidence
- [`LICENSES.md`](LICENSES.md) — frameworks, libraries, templates and assets
