## Summary

The shell's "skip to main content" link pointed at the shell's own content wrapper, a `<div id="main-content">`, while every app renders its primary content in a `<main>` of its own below it. Activating the link left focus above the app's landmark, so the next Tab went back to the top of the page. The link now finds the page's `<main>` at click time, makes it focusable and moves focus to it, with the hash `href` kept as the no-JavaScript fallback and the wrapper as the fallback target for a page without a `<main>`. **No app needs to change**: every converted app already renders a `<main>`, and the rule they follow is HTML's own, one `<main>` per route with no other that is not `hidden`.

Alongside it, a new kind of thing for the shell: **page rules**, run against the rendered page after each navigation on any site but a production one, each reporting a diagnostic on the console. The first rule reports more than one visible `<main>` as an error and none as a warning. The shape is meant to take more rules from the migration how-to; the next candidate is the document title (see Decisions, entry 7).

Resolves #328.

## What changed

- `shell/header/SkipLink.tsx` (new), rendered by `Header.tsx` in place of the anchor: same `href`, plus a click handler that focuses the first `<main>` without `hidden`, else the `main-content` wrapper, setting `tabindex="-1"` when the target has no tabindex and calling `scrollIntoView`; with neither present the anchor acts as before.
- `shell/style.scss`: `main[tabindex="-1"]:focus { outline: none; }`.
- `shell/rules/`: `types.ts` (`Diagnostic`, `PageRule`), `mainLandmark.ts` (the rule, with the HTML spec URL), `index.ts` (the list).
- `shell/usePageRules.ts`, called from `Shell.tsx`: runs the list when the location key changes and the data router's navigation is idle; `enabled` is a parameter defaulting to `getSiteConfig().environment !== EnvironmentTypes.PRODUCTION`; errors go to `console.error`, warnings to `console.warn`.
- `docs/how_tos/migrate-frontend-app.md`: a section, "Render one `<main>` landmark per route", after the document-title section.
- `shell/dev/devHome/HomePage.tsx`, `shell/dev/slotShowcase/SlotShowcasePage.tsx`: the dev site's pages render their container `as="main"`, so the dev site follows the rule it reports on. The runtime's `NotFoundPage` and `ErrorPage` render no `<main>` and warn on a development site; whether they should is a review question.
- Tests: `SkipLink.test.tsx` (render; focus and tabindex; a hidden `<main>` passed over; an existing tabindex kept; the wrapper fallback; no target), `rules/mainLandmark.test.ts` (one passes; hidden not counted; two is an error; none is a warning), `usePageRules.test.tsx` on mocked rules (every rule called with the document; diagnostics by level; disabled; the default per environment).

Not here: frontend-template-application's own nested `<main>` (`src/Main.tsx` around `src/example/ExamplePage.tsx`), which this rule reports and which is a one-line fix there; focus after client-side navigation, the issue's last paragraph, which is its own issue.

## Testing

`npm run lint`, `npm run typecheck`, `npm test` (550 tests, 60 suites) and `npm run build` pass, with the test site installed from the packed tarball as CI does. Manual check on the shell's dev site (`npm run dev`): the record below; results pending.

## Decisions

Why the id stays, why the rule is "should", what a page rule is and why it is named that, what the runner does and does not gate on, which rules were considered and left out.

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
   The warning level also covers a component-level `React.lazy` that
   renders its `<main>` after the rule has run.

5. **Page rules are a new category, named for what they are.** Nothing in
   frontend-base inspected the rendered document before this: the runtime
   throws on misconfiguration at startup and reports failures through the
   logging service, and nothing is gated on the site's environment except
   the devtools import. The first draft was one runtime hook named for its
   rule (`useMainLandmarkCheck`); review asked what category it belongs
   to. Settled: rules about what a route renders, each yielding a
   diagnostic (TypeScript's and the language servers' word for a message
   with a severity). `shell/rules/types.ts` defines `Diagnostic`
   (`level: 'error' | 'warning'`, `message`) and `PageRule`
   (`(document: Document) => Diagnostic | undefined`); each rule is a file
   declared against that type (`const mainLandmark: PageRule = ...`) with
   its own test; `shell/rules/index.ts` lists them. "Page" scopes the type
   to this runner, which hands a rule the document after a route renders;
   a rule about site config would run once at startup against the config
   and be a different type with a different runner. "Development" is not
   in the type's name because when rules run is the runner's decision, not
   a property of a rule. Rejected names: "check" (says nothing about the
   output), "audit" (in accessibility tooling it names a whole run, and
   not every rule is an accessibility one). The level union stays inline:
   the repository has no severity or log-level type to reuse (the logging
   service encodes levels as two methods, `logError` and `logInfo`).

6. **The runner: `usePageRules(enabled = environment !== PRODUCTION)`.**
   `shell/usePageRules.ts` runs the list in an effect keyed on the
   location `key` (so a navigation that changes only the search re-runs
   it) and the data router's navigation state, and reports each
   diagnostic with `console.error` or `console.warn`; `Shell.tsx` calls
   it with no argument. Whether rules run on a site is policy, so it is a
   parameter with a default rather than a constant in the effect; the
   default is every environment but production, not development only, so
   test sites see the diagnostics too: under a console-strict test setup
   (the kind that fails a test on unexpected console output) a page with
   no `<main>` fails the test, which is the rule enforced where it can be.
   The navigation-idle gate is a separate early return: it is about
   timing (a route's `lazy()` has resolved, so the document is worth
   inspecting), not policy. The console is the channel because the
   audience is the developer looking at it; the logging service reports
   to production monitoring, which is the wrong place for conformance
   notes.

7. **Rules considered and not included.** `documentTitle`, from the
   how-to's "Set the document title on every route-level page": an empty
   `document.title` after the route rendered would be the finding, since
   the shell's generated `index.html` sets no title; left for a later PR
   as the second rule, noted in this PR's description. A rule that an app
   chunk re-ships Paragon's `:root` declarations (ADR 0008, the how-to's
   "must NOT import" box): rejected, because the signal depends on the
   build's cascade-layer wrapping being present and on same-origin
   stylesheets, jsdom cannot parse `@layer` so its test would run against
   hand-built sheets, and ADR 0008's layering already neutralises the
   failure. A duplicate-id rule: no sentence in the docs asks for it, and a
   third-party widget is the likeliest thing to trip it.

8. **Tests.** The rule is tested alone on document markup
   (`shell/rules/mainLandmark.test.ts`: one passes, hidden ones are not
   counted, two is an error, none is a warning). The runner is tested on
   mocked rules (`shell/usePageRules.test.tsx`): `jest.mock('./rules')`
   returns three `jest.fn()`s whose return values are declared in the
   factory, so the file reads as "the rules are these three"; the test
   imports the mocked list through the same swap and names them with
   `jest.mocked`; `jest.clearAllMocks` between tests clears call records
   and keeps those implementations. Cases: every rule is called with the
   document; diagnostics reach the console by level; disabled runs no
   rule; the default runs on a development site, runs on a test site and
   does not run on a production site, with the environment restored after
   each. A second navigation cannot be tested in this repository: the
   data router builds a `Request`, which its jsdom lacks (jsdom/jsdom#1724),
   so the re-run on navigation is covered by the effect's dependency list
   only.

9. **The how-to gets a section of its own.** The rule first went into the
   `Main.jsx` bullet of the file layout, which implied `Main.jsx` renders
   the `<main>`; it does not have to. "Render one `<main>` landmark per
   route" now follows "Set the document title on every route-level page":
   the shell renders no `<main>`, apps are expected to render it around
   primary content in each route, HTML allows no more than one without
   `hidden`, and the skip link moves focus to it. The page rules are not
   mentioned there.

10. **Left for their own changes.** frontend-template-application renders
    a second `<main>` inside the first (`src/Main.tsx` and
    `src/example/ExamplePage.tsx`), which this rule would report; a
    one-line fix there. Focus after client-side navigation, which the
    skip link does not address, is the issue's last paragraph and its own
    issue.

11. **The shell's dev pages render a `<main>`; the runtime's error pages
    are an open question.** Preparing the manual pass showed that the
    dev site's own pages (`/dev`, `/slots`) rendered no `<main>`, so every
    page on it would carry the warning and the skip link would only ever
    reach the fallback. Both pages' Paragon `Container` now renders
    `as="main"`. The runtime's not-found and error pages (`NotFoundPage`,
    `ErrorPage`) have no `<main>` either; when they render as the root
    route's `errorElement` (a path no route matches) they replace `Shell`
    entirely, so no header, no skip link and no rule run there, which is
    pre-existing and its own question; when an app's own route tree
    renders them inside the shell, the warning applies. Whether they
    should render a `<main>` is left to the PR review.
</details>

<details>
<summary>Manual testing</summary>

# Manual testing — the skip link and page rules (openedx/frontend-base#328)

What the automated suite cannot show: where focus actually lands in a browser, what the console shows on real navigations, and what a keyboard user sees.

## Environment

- The frontend-base checkout on `skip-link-main-landmark`, `npm run dev` (builds, then serves the shell's dev site at `http://apps.local.openedx.io:8080`). The dev site config sets `environment: DEVELOPMENT`, so the page rules run.
- A browser with its developer console open. On the first load of a page every diagnostic appears twice: the dev site renders under `StrictMode`, which runs each effect twice on mount in development; a client-side navigation runs it once. Pages used: `/dev` (the dev home, renders a `<main>` as of this branch) and `/slots` (the slot showcase, likewise). A path no route matches (`/nope`) is no use here: the root route's `errorElement` renders the not-found page in place of `Shell`, so there is no header, no skip link and no rule run on it (pre-existing, see results).

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
</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
