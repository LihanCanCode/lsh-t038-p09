# Third-Party Material and AI Disclosure

List material frameworks, libraries, starters, templates, UI kits, fonts, icons and assets used in this repository.

| Name | Version or source URL | Licence | Used for |
|---|---|---|---|
| React | v19.2.8 (npm) | MIT | Core UI Framework |
| Vite | v8.2.2 (npm) | MIT | Development Server and Build Tool |
| Tailwind CSS | cdn.tailwindcss.com | MIT | Application Styling |
| Framer Motion | v13.1.1 (npm) | MIT | UI Animations and Transitions |
| Google Fonts (Inter) | fonts.googleapis.com | SIL OFL 1.1 | Typography |
| SVG Icons | Embedded in `app.jsx` | MIT | Feature/UI indicators |

## AI tools

List each AI tool in `evaluation-manifest.json`, what it was used for and how the output was verified. Write `None` if no AI tool was used.

- **Gemini Pro 3.1**: Used for rapid UI iteration, implementing the Premium Glassmorphic design, and debugging Vite build/deployment issues. Output verified by local testing and manual code review.
- **Claude Code**: Used for boilerplate generation and core mathematical logic implementation (e.g., `engine.js` algorithms). Output verified via local headless testing against the JSON fixture.
- **Manus AI**: Used for architectural planning and structuring documentation (READMEs, EDGE_CASES, etc.). Output verified by team review.

## Original-work statement

Everything not declared in this file or `EVENT.md` was created by the registered team during the event window.
