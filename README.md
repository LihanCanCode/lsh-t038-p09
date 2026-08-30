# Vehicle Service Due Predictor (P09)

## What it does
- **Smart Estimation Engine**: Calculates service due dates based on fixed dates, time periods, and dynamic distance based on the vehicle's unique daily running average.
- **Daily Call List**: Provides the workshop with a sorted list of calls to make today, prioritizing the most overdue and highest-value services.
- **Service Recording**: Allows the workshop to record completed services and update odometer readings, instantly recalculating upcoming deadlines for that specific item only.

## How to run it
This project is built using pure Vanilla JS with no build steps or dependencies. 
Because it uses the `fetch` API to load the data file (`P09_vehicle_service_public.json`), it needs to be served over HTTP, not directly via `file://`.

1. Open your terminal in the `p09-app` directory.
2. Run a local web server, for example:
   ```bash
   python -m http.server 8000
   ```
   Or using Node.js:
   ```bash
   npx serve
   ```
3. Open `http://localhost:8000` in your browser.

## What is mocked
- **Persistent Storage**: All state changes (recording services, updating odometers) are stored in memory. They will reset when the page is refreshed. For production, this would be wired to a database.
- **Single Case Load**: The app is hardcoded to load `cases[0]` (PUB-01) from the JSON file to keep the demo straightforward.

## What is next
- Add persistent storage via `localStorage` or a backend API.
- Add support for switching between multiple data cases dynamically.
- Integrate with WhatsApp API or Twilio for automated message delivery instead of just copy-pasting the generated reminder text.
