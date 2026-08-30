# Third-Party Material and AI Disclosure

Every third-party item used in this repository is listed below. All are MIT or SIL OFL.
**No AGPL, GPL, SSPL or non-commercial-licensed material is used anywhere in this project.**

## Frameworks, libraries and assets

| Name | Version or source URL | Licence | Used for |
|---|---|---|---|
| React | 18.3.1 — <https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js> | MIT | UI component rendering (`app.jsx`) |
| React DOM | 18.3.1 — <https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js> | MIT | DOM renderer for React |
| Babel Standalone | 7.26.4 — <https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.26.4/babel.min.js> | MIT | In-browser JSX transform, so the project needs no build step |
| Tailwind CSS (Play CDN) | 3.x — <https://cdn.tailwindcss.com> | MIT | Utility-first styling |
| Inter | <https://fonts.google.com/specimen/Inter> (loaded from Google Fonts at runtime) | SIL Open Font License 1.1 | Interface typeface |

Every library is loaded from a public CDN at runtime. Nothing is vendored into this repository:
there is no `package.json`, no `node_modules`, no lockfile and no build output. The stylesheet
falls back to the system sans-serif stack if the font request fails.

**No starter, template, boilerplate or UI kit was used.** No component library, admin dashboard
theme or scaffolding tool contributed to this repository.

## Supplied data

| Name | Source | Used for |
|---|---|---|
| `P09_vehicle_service_public.json` | LofiStack Hackathon 2026 Submission Kit v2.2, `fixtures/` | Sample data. Included unmodified; not the team's work. |

## Icons and images

None. Every icon in the interface is inline SVG drawn by the team; every status indicator is
CSS-styled text and a coloured dot. No icon font or icon library is used.

## AI tools

| Tool | Used for | How the output was verified |
|---|---|---|
| Claude (Claude Code, Opus) | Pair-programming the calculation engine and React interface; drafting documentation | Every calculation rule was checked against the published fixture rather than accepted on trust. A headless Node harness runs the engine over all 25 cases and asserts a fixed expected result (1,183 overdue / 432 due soon / 2,573 fine across 4,188 items; 45 / 16 / 104 on `PUB-01`), and the same harness is re-run under three timezones to prove the output does not shift. Interactive behaviour — recording a service, updating an odometer, rejecting invalid input, loading an uploaded dataset — was driven in a real headless browser and asserted, not eyeballed. Several defects the AI introduced or missed were caught this way and fixed; they are listed under "Known limitations" and in the manifest. |

Full detail of AI usage is recorded in [`evaluation-manifest.json`](evaluation-manifest.json).

## Original-work statement

Everything not declared in this file or in [`EVENT.md`](EVENT.md) was created by the registered team
during the event window. The service-due calculation rules, the daily-rate estimation, the call-list
ranking, the data model and every screen are the team's own work. No pre-existing application or
codebase implementing vehicle servicing, maintenance scheduling or any part of this problem's domain
was used.
