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
