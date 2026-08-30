# Licenses

All third-party code is MIT or OFL. **No AGPL, GPL, SSPL or non-commercial-licensed material is
used anywhere in this project.**

## Runtime libraries

Every library is loaded from a CDN at runtime; none is vendored into this repository, and there is
no `package.json`, `node_modules`, or build step.

| Library | Version | Purpose | License |
|---|---|---|---|
| [React](https://react.dev) | 18.3.1 | UI component rendering | [MIT](https://github.com/facebook/react/blob/main/LICENSE) |
| [React DOM](https://react.dev) | 18.3.1 | DOM renderer for React | [MIT](https://github.com/facebook/react/blob/main/LICENSE) |
| [Babel Standalone](https://babeljs.io) | 7.26.4 | In-browser JSX transform (no build step) | [MIT](https://github.com/babel/babel/blob/main/LICENSE) |
| [Tailwind CSS](https://tailwindcss.com) (Play CDN) | 3.x | Utility-first styling | [MIT](https://github.com/tailwindlabs/tailwindcss/blob/master/LICENSE) |

React and React DOM are served from cdnjs; Tailwind from its official Play CDN.

## Fonts

| Asset | Source | License |
|---|---|---|
| Inter | [Google Fonts](https://fonts.google.com/specimen/Inter) — linked at runtime, not vendored | [SIL Open Font License 1.1](https://openfontlicense.org/) |

The stylesheet falls back to the system sans-serif stack if the font request fails.

## First-party code

`engine.js` (all service-due calculation), `app.jsx` (all UI components), and the `classic.*`
fallback build are written from scratch by the team. No template, boilerplate or starter kit was
used — see `Events.md`.

## Data

`P09_vehicle_service_public.json` is the fixture supplied by the organisers for problem P09. It is
included unmodified and is not the team's work.

## Icons and images

None. All status indicators are CSS-styled text and coloured dots.
