# Manual testing — the skip link (openedx/frontend-base#328)

What the automated suite cannot show: where focus actually lands in a browser and what a keyboard user sees. The page rule has no runtime part; it runs in tests.

## Environment

- The frontend-base checkout on `skip-link-main-landmark`, `npm run dev` (builds, then serves the shell's dev site at `http://apps.local.openedx.io:8080`).
- A browser. Pages used: `/dev` (the dev home) and `/slots` (the slot showcase), both of which render a `<main>` as of this branch. A path no route matches (`/nope`) is no use: the root route's `errorElement` renders the not-found page in place of `Shell`, so there is no header and no skip link on it (pre-existing).

## Verify by hand

- [x] **The skip link appears on focus** — load `/dev`, press Tab: "Skip to main content." appears at the top of the page as the focused element (it is visually hidden until focused).
- [x] **Activating it focuses the `<main>`** — press Enter on the link: in the console, `document.activeElement.tagName` is `MAIN`; the URL did not gain `#main-content`; no focus ring is drawn on the `<main>`.
- [x] **Keyboard navigation continues inside the content** — press Tab once more: focus is on the first link inside the page content ("Go to ... page"), not on anything in the header.
- [x] **A page with no `<main>` falls back to the wrapper** — temporarily remove `as="main"` from `HomePage.tsx`, let the dev server rebuild, reload `/dev`; Tab to the skip link, Enter: `document.activeElement.id` is `main-content`. Revert the edit.

## Left to the automated suite

- The handler's cases (target found, hidden passed over, existing tabindex kept, wrapper fallback, no target): `shell/header/SkipLink.test.tsx`.
- The rule's outcomes: `shell/rules/mainLandmark.test.ts`; the dev pages satisfying it: `shell/dev/devHome/HomePage.test.tsx`, `shell/dev/slotShowcase/SlotShowcasePage.test.tsx`.

## Results

**2026-10-26, Brian.** All four boxes passed on the dev site. `/nope` showed the not-found page with no header or footer: the root route's `errorElement` renders it in place of `Shell` (pre-existing). Earlier passes on the same day exercised a runtime version of the rule (console diagnostics on reload and navigation, the error for two `<main>` elements, the hidden exception); that version was removed in favour of running the rule in tests (decision 6), and those observations no longer apply to the branch.
