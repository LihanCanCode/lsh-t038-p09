# Premium Daily Call List integration

This redesign is built to match the previously created premium homepage. It uses the same dark navy, cyan, indigo, glass, glow, and atmospheric automotive-image language while keeping the existing `Engine.buildCallList`, `Engine.tk`, `Chip`, and `Empty` helpers.

## Replace the existing components

In the current application file, replace the existing `CallRow` and `CallList` functions with the equivalent exports from `PremiumCallList.jsx`.

The simplest integration is:

```jsx
import PremiumCallList from './PremiumCallList.jsx';
import './premium-call-list.css';
```

Then update the route branch around the current `#/call-list` section:

```jsx
} else {
  title = 'Daily Call List';
  subtitle = 'Most overdue first, then highest value.';
  view = <PremiumCallList ds={ds} />;
  rightElement = (
    // keep your existing dataset and case selector controls here
  );
}
```

If you prefer to keep the route file unchanged, rename the imported component:

```jsx
import PremiumCallList from './PremiumCallList.jsx';

// Existing route branch
view = <PremiumCallList ds={ds} />;
```

## Required existing symbols

`PremiumCallList.jsx` expects these symbols to remain available in the same module scope or to be imported from your existing component utilities:

```jsx
Engine
Chip
Empty
```

It does not change the underlying sorting or calculations. It still derives rows from `Engine.buildCallList`, preserves the overdue / due-soon / needs-review breakdown, and generates the same clipboard reminder text.

## Import order

Add the stylesheet once, after your Tailwind/global stylesheet if possible:

```jsx
import './premium-home.css';
import './premium-call-list.css';
```

The homepage CSS remains responsible for the homepage hero. The call-list CSS is scoped with `premium-call-list__*`, `premium-call-card*`, and `premium-copy-button*` names to minimize collisions.

## Dataset and case controls

The existing app-shell header can remain as-is. The dataset name, vehicle count, owner count, date, and case selector shown in the screenshot are still controlled by the current `rightElement` block in `App`; the redesign only changes the content area below that header.

## Background image

The summary panel reuses the same Unsplash automotive image as the homepage. For production, replace both remote URLs with a local licensed asset such as `/images/workshop-hero.jpg` so the visual stays stable and avoids third-party image requests.
