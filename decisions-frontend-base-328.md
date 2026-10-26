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
