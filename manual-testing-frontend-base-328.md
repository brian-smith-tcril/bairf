# Manual testing — the skip link and page rules (openedx/frontend-base#328)

What the automated suite cannot show: where focus actually lands in a browser, what the console shows on real navigations, and what a keyboard user sees.

## Environment

- The frontend-base checkout on `skip-link-main-landmark`, `npm run dev` (builds, then serves the shell's dev site at `http://apps.local.openedx.io:8080`). The dev site config sets `environment: DEVELOPMENT`, so the page rules run.
- A browser with its developer console open. Pages used: `/dev` (the dev home, renders a `<main>` as of this branch) and `/slots` (the slot showcase, likewise). A path no route matches (`/nope`) is no use here: the root route's `errorElement` renders the not-found page in place of `Shell`, so there is no header, no skip link and no rule run on it (pre-existing, see results).

## Verify by hand

- [x] **The skip link appears on focus** — load `/dev`, press Tab: "Skip to main content." appears at the top of the page as the focused element (it is visually hidden until focused).
- [x] **Activating it focuses the `<main>`** — press Enter on the link: in the console, `document.activeElement.tagName` is `MAIN`; the URL did not gain `#main-content`; no focus ring is drawn on the `<main>`.
- [x] **Keyboard navigation continues inside the content** — press Tab once more: focus is on the first link inside the page content ("Go to ... page"), not on anything in the header.
- [ ] **A page with no `<main>` falls back to the wrapper** — temporarily remove `as="main"` from `HomePage.tsx`, let the dev server rebuild, reload `/dev`: the console shows the warning "The page has no <main> element. ..."; Tab to the skip link, Enter: `document.activeElement.id` is `main-content`. Revert the edit.
- [ ] **One `<main>` is silent** — on `/dev` and `/slots`, the console shows no "<main> element" diagnostic after load.
- [ ] **Rules re-run on client-side navigation** — from `/dev`, follow "Go to slot showcase page", then the browser's back button: no page reload (the console keeps its earlier lines), and no diagnostic appears on either page.
- [ ] **More than one `<main>` is an error** — temporarily wrap the `<ul>` in `HomePage.tsx` in a second `<main>`, let the dev server rebuild, reload `/dev`: the console shows the error "The page has 2 <main> elements without the hidden attribute; ...". Revert the edit.
- [ ] **A hidden `<main>` is not counted** — in the same temporary edit, give the inner `<main>` the `hidden` attribute: no diagnostic. Revert the edit.

## Left to the automated suite

- The handler's cases (target found, hidden passed over, existing tabindex kept, wrapper fallback, no target): `shell/header/SkipLink.test.tsx`.
- The rule's outcomes and the runner's gating by `enabled` and environment: `shell/rules/mainLandmark.test.ts`, `shell/usePageRules.test.tsx`.

## Results

**First pass, 2026-10-26, Brian.** `/nope` showed the not-found page with no header or footer and no diagnostic: the root route's `errorElement` renders it in place of `Shell`, so nothing in this branch runs there (pre-existing; the record's step 4 was rewritten to use a temporary edit instead). The rest of the boxes are not yet recorded.
