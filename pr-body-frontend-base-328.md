## Summary

The shell's "skip to main content" link pointed at the shell's own content wrapper, a `<div id="main-content">`, while every app renders its primary content in a `<main>` of its own below it. Activating the link left focus above the app's landmark, so the next Tab went back to the top of the page. The link now finds the page's `<main>` at click time, makes it focusable and moves focus to it, with the hash `href` kept as the no-JavaScript fallback and the wrapper as the fallback target for a page without a `<main>`. **No app needs to change**: every converted app already renders a `<main>`, and the rule they follow is HTML's own, one `<main>` per route with no other that is not `hidden`.

Alongside it, a new kind of thing: **page rules**, functions from a rendered document to a diagnostic, which an app asserts in its route tests once a page has rendered (`expect(runPageRules(document)).toEqual([])`). The first rule reports more than one visible `<main>` as an error and none as a warning. The rules have no runtime part: there is no moment at which a page "has rendered" that the shell can see (the decision log's entry 6 walks through the three runtime shapes that were tried and why each guessed wrong), while a route test's author knows exactly when. The shape is meant to take more rules from the migration how-to; the next candidate is the document title (Decisions, entry 7).

Resolves #328.

## What changed

- `shell/header/SkipLink.tsx` (new), rendered by `Header.tsx` in place of the anchor: same `href`, plus a click handler that focuses the first `<main>` without `hidden`, else the `main-content` wrapper, setting `tabindex="-1"` when the target has no tabindex and calling `scrollIntoView`; with neither present the anchor acts as before.
- `shell/style.scss`: `main[tabindex="-1"]:focus { outline: none; }`.
- `shell/rules/`: `types.ts` (`Diagnostic`, `PageRule`), `mainLandmark.ts` (the rule, with the HTML spec URL), `index.ts` (the list and `runPageRules`), exported from the package root.
- `shell/dev/devHome/HomePage.tsx`, `shell/dev/slotShowcase/SlotShowcasePage.tsx`: the dev site's pages render their container `as="main"`, and each gets a test asserting the rule.
- `docs/how_tos/migrate-frontend-app.md`: a section, "Render one `<main>` landmark per route", after the document-title section, ending with the assertion for route tests.
- Tests: `SkipLink.test.tsx` (render; focus and tabindex; a hidden `<main>` passed over; an existing tabindex kept; the wrapper fallback; no target), `rules/mainLandmark.test.ts` (one passes; hidden not counted; two is an error; none is a warning), `rules/index.test.ts` (`runPageRules` on a mocked rule: each rule gets the document, `[]` when all pass, the failing rules' diagnostics otherwise), the two dev-page tests.

Not here: frontend-template-application's own nested `<main>` (`src/Main.tsx` around `src/example/ExamplePage.tsx`), which this rule reports and which is a one-line fix there; the test-site's pages, which also render no `<main>` and are scoped narrowly on purpose; the runtime's not-found and error pages, which replace `Shell` entirely on an unmatched path (pre-existing); focus after client-side navigation, the issue's last paragraph, which is its own issue.

## Testing

`npm run lint`, `npm run typecheck`, `npm test` (551 tests, 62 suites) and `npm run build` pass, with the test site installed from the packed tarball as CI does. Manual check on the shell's dev site (`npm run dev`): the record below, every box checked.

## Decisions

Why the id stays, why the rule is "should", what a page rule is and why it is named that, why the rules run in tests and not on the dev site, which rules were considered and left out.

<details>
<summary>Full decision log</summary>

# Decisions — the skip link and page rules (openedx/frontend-base#328)

Decisions made while implementing, 2026-10-26. The direction the issue's discussion settled (the skip link finds the landmark itself; no app puts an id on anything) is the starting point and is not re-argued.

1. **The skip link finds the `<main>` at click time; the wrapper's id stays.**
   `shell/header/SkipLink.tsx` keeps `href="#main-content"` and handles the
   click: the first `<main>` without the `hidden` attribute, else the
   element with `id="main-content"`, else nothing. The id stays on the
   shell's content wrapper in `DefaultLayout.tsx` for two reasons: it is
   the no-JavaScript target, and it is the fallback for a page that
   renders no `<main>`. The shell does not render `<main>` itself: the
   ARIA Authoring Practices Guide asks for one main landmark per page,
   top-level, and every app already renders its own.

2. **The handler prevents the default only when it has a target.** With a
   target it calls `preventDefault`, so the URL gains no hash, sets
   `tabindex="-1"` only when the element has no `tabindex` (an app's own
   value is kept), then `focus()` and `scrollIntoView()`. Browsers scroll
   to a hash target but do not reliably move focus to a non-focusable
   element, so without this the next Tab returns to the top of the page.
   With no target the click falls through to the anchor, the same as any
   skip link whose target is missing. The handler is typed as React's
   `MouseEvent`: a link activated with Enter dispatches `click`, so one
   handler covers keyboard users.

3. **One focus style, scoped.** `main[tabindex="-1"]:focus { outline: none }`
   in `shell/style.scss`, scoped to the programmatically focusable case so
   an app's own focus styling on a `<main>` is untouched.

4. **The rule is HTML's, per route, and phrased as "should".** The HTML
   Living Standard: "A document must not have more than one main element
   that does not have the hidden attribute specified." So a hidden second
   `<main>` is allowed, and the rule is per rendered route, not per app:
   which component renders the `<main>` (a layout route, or each page) is
   the app's choice. Having one is "should", since the skip link still
   works through the wrapper fallback without it; the "no more than one
   visible" part is HTML's "must". That split gives the rule its two
   levels: more than one visible `<main>` is an error, none is a warning.

5. **Page rules are a new category, named for what they are.** Nothing in
   frontend-base judged the rendered document before this: the runtime
   throws on misconfiguration at startup and reports failures through the
   logging service. The first draft was one hook named for its rule
   (`useMainLandmarkCheck`); review asked what category it belongs to.
   Settled: rules about what a route renders, each yielding a diagnostic
   (TypeScript's and the language servers' word for a message with a
   severity). `shell/rules/types.ts` defines `Diagnostic`
   (`level: 'error' | 'warning'`, `message`) and `PageRule`
   (`(document: Document) => Diagnostic | undefined`); each rule is a file
   declared against that type (`const mainLandmark: PageRule = ...`) with
   its own test; `shell/rules/index.ts` lists them and exports
   `runPageRules(document)`, which returns the diagnostics of every rule
   that fails. "Page" scopes the type to a rendered route's document; a
   rule about site config would take the config and be a different type.
   Rejected names: "check" (says nothing about the output), "audit" (in
   accessibility tooling it names a whole run, and not every rule is an
   accessibility one). The level union stays inline: the repository has
   no severity or log-level type to reuse (the logging service encodes
   levels as two methods, `logError` and `logInfo`), and in a test any
   diagnostic fails the assertion while a suite that wants to tolerate
   warnings can filter on `level`.

6. **The rules run in tests, not on the dev site.** Three runtime shapes
   were built and each was wrong about *when*: a hook called from `Shell`
   after its own commit (`SiteProvider` renders nothing until the theme
   has loaded, so the page was not there yet); a component mounted beside
   the page inside the provider (a page that renders its `<main>` once
   its data arrives, as Learning's tab page does after the course
   metadata query, would warn on every load and never correct itself);
   then a `MutationObserver` with a quiet period gated on the router
   being idle and React Query having no fetch in flight. The plan's
   "When the document can be judged" lists every source of change in the
   document after a navigation and shows that only two of them expose a
   signal; the rest (the provider's gate, component-level lazy loading,
   data loading outside React Query, later interaction) leave "the page
   has rendered" a heuristic. A static check cannot replace it either: a
   lint rule sees one file, and both real cases cross files
   (frontend-template-application's `Main.tsx` around
   `ExamplePage.tsx`, Learning's `LoadedTabPage` under `TabPage`). The
   place where "the page has rendered" is actually known is a route test:
   its author renders the route, waits for the content and then asserts.
   So the rules run there: `runPageRules` is exported from the package
   root beside `initializeMockApp`, the how-to says to assert
   `expect(runPageRules(document)).toEqual([])` once the page has
   rendered, and nothing in the shell guesses at timing. Lost: a
   developer who writes no route test gets no diagnostic. If a dev-site
   diagnostic is wanted later it comes back for instant rules only (more
   than one visible `<main>` is a violation whenever observed) on any
   mutation, with no settle heuristic, as its own change.

7. **Rules considered and not included.** `documentTitle`, from the
   how-to's "Set the document title on every route-level page": an empty
   `document.title` once the page has rendered would be the finding,
   since the shell's generated `index.html` sets no title; left for a
   later PR as the second rule, noted in this PR's description. A rule
   that an app chunk re-ships Paragon's `:root` declarations (ADR 0008,
   the how-to's "must NOT import" box): rejected, because the signal
   depends on the build's cascade-layer wrapping being present and on
   same-origin stylesheets, jsdom cannot parse `@layer` so its test would
   run against hand-built sheets, and ADR 0008's layering already
   neutralises the failure. A duplicate-id rule: no sentence in the docs
   asks for it, and a third-party widget is the likeliest thing to trip
   it.

8. **Tests.** The rule is tested alone on document markup
   (`shell/rules/mainLandmark.test.ts`: one passes, hidden ones are not
   counted, two is an error, none is a warning). `runPageRules` is tested
   on a mocked rule (`shell/rules/index.test.ts`): it calls each rule with
   the document, returns nothing when every rule passes, and returns the
   diagnostics of the rules that fail, which is the shape an app's
   assertion relies on. The shell's dev pages,
   `HomePage` and `SlotShowcasePage`, each get a test that renders the
   page under an intl provider and a memory router and asserts
   `runPageRules(document)` is empty: the shell asserting its own rule
   the way the how-to tells apps to, and what fails if the `<main>` is
   dropped again. The skip link's tests are the handler's cases (target
   found, a hidden `<main>` passed over, an existing tabindex kept, the
   wrapper fallback, no target).

9. **The how-to gets a section of its own.** The rule first went into the
   `Main.jsx` bullet of the file layout, which implied `Main.jsx` renders
   the `<main>`; it does not have to. "Render one `<main>` landmark per
   route" now follows "Set the document title on every route-level page":
   the shell renders no `<main>`, apps are expected to render it around
   primary content in each route, HTML allows no more than one without
   `hidden`, the skip link moves focus to it, and route tests assert it
   with `runPageRules`.

10. **Left for their own changes.** frontend-template-application renders
    a second `<main>` inside the first (`src/Main.tsx` and
    `src/example/ExamplePage.tsx`), which this rule reports; a one-line
    fix there, with the assertion in its route test. The test-site's
    `ExamplePage` and `AuthenticatedPage` render a `Container` without
    `<main>` and have no page tests; the test-site is scoped narrowly on
    purpose, so that is left alone here. Focus after client-side
    navigation, which the skip link does not address, is the issue's last
    paragraph and its own issue.

11. **The shell's dev pages render a `<main>`.** Preparing the manual pass
    showed that the dev site's own pages (`/dev`, `/slots`) rendered no
    `<main>`, so the skip link only ever reached the fallback there. Both
    pages' Paragon `Container` now renders `as="main"`, and their new
    tests (entry 8) hold it. The runtime's `NotFoundPage` and `ErrorPage`
    have no `<main>` either; when they render as the root route's
    `errorElement` (a path no route matches) they replace `Shell`
    entirely, so there is no header and no skip link there, which is
    pre-existing and its own question.
</details>

<details>
<summary>Manual testing</summary>

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

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
