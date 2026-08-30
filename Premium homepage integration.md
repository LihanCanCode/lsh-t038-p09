# Premium homepage integration

The provided `Home.jsx` is a drop-in replacement for the existing `Home` component in `pasted_content.txt`. It preserves the same props and existing application behavior: dataset upload, dataset reset, case selection, error display, and navigation to the daily call list.

## 1. Replace the existing Home component

In your current file, replace the complete `Home` function beginning around the `/* ---------- home ---------- */` section with the contents of `Home.jsx`.

Because the new component is exported as a default export, either import it into the existing app file:

```jsx
import Home from './Home.jsx';
```

and remove the old `Home` function, or rename the component export to match the structure of your current file.

## 2. Add the stylesheet

Import the CSS once from your application entry file or from the file containing `Home`:

```jsx
import './premium-home.css';
```

Place `premium-home.css` beside `Home.jsx`, or update the import path if you keep styles in a separate directory.

## 3. Dependencies

The component uses only React and `framer-motion`, both of which are already present in the supplied code. No new package is required.

## 4. Background image

The stylesheet uses a remote Unsplash image for the automotive atmosphere. For production, download an approved image into `public/images/workshop-hero.jpg` and replace the `url(...)` value in `.premium-home__image` with:

```css
url('/images/workshop-hero.jpg') center / cover;
```

The layered gradients remain important because they create a text-safe dark area on the left and preserve legibility over the image.

## 5. Existing app shell

The current app shell can remain unchanged. Its existing `<Home ... />` invocation already passes all required props:

```jsx
<Home
  ds={ds}
  cases={cases}
  caseIndex={caseIndex}
  source={source}
  error={error}
  onPick={i => activate(cases, i, source)}
  onUpload={onUpload}
  onReset={...}
/>
```

The redesign is intentionally scoped to the homepage rather than the vehicles, forecast, or daily call list routes.
