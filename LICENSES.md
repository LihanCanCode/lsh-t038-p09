# Licenses

## Third-party code
**None.** This project uses no open-source libraries, frameworks or build tooling. All logic,
styling and DOM handling is written from scratch in vanilla HTML, CSS and JavaScript. There is no
`package.json` and no dependency tree.

## Fonts
| Asset | Source | License |
|---|---|---|
| Inter | [Google Fonts](https://fonts.google.com/specimen/Inter) (`fonts.googleapis.com`, loaded at runtime) | [SIL Open Font License 1.1](https://openfontlicense.org/) — permits commercial use, redistribution and embedding |

The font is linked from Google Fonts rather than vendored, so no font binary is redistributed in
this repository. The stylesheet falls back to the system sans-serif stack if the request fails.

## Data
`P09_vehicle_service_public.json` is the fixture supplied by the organisers for problem P09. It is
included unmodified and is not the team's work.

## Icons and images
None. All status indicators are CSS-styled text.

## Compliance
No AGPL, GPL, SSPL or non-commercial-licensed material is used anywhere in this project.
