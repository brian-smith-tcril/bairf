# Plan: openedx/frontend-base#328 — the skip link moves focus to the app's `<main>`

The direction settled in the issue's discussion on 2026-10-26: the skip link finds the landmark itself; apps put no id on anything; the one rule for apps is the HTML one, per route: one `<main>` around the primary content, and no other `<main>` without the `hidden` attribute (HTML Living Standard, the `main` element: "A document must not have more than one main element that does not have the hidden attribute specified."). Written 2026-10-26, revised the same day, for the PR body.

## Baseline

- `shell/header/Header.tsx` renders `<a className="sr-only sr-only-focusable" href="#main-content">`; `shell/DefaultLayout.tsx` puts `id="main-content"` on the `div.flex-grow-1` around the content slot. The shell renders no `<main>`; every app does, around what it considers its primary content: frontend-template-application (the repository an app is scaffolded from) in its `src/Main.tsx`, and profile, account, catalog, learner dashboard and Learning in theirs. frontend-template-application also renders a second `<main>` inside the first, in `src/example/ExamplePage.tsx`.
- The shell has no stylesheet rule for `main` (`shell/style.scss` is utility classes) and no development-only diagnostics beyond the React Query devtools gate in `shell/site.tsx` (`process.env.NODE_ENV === 'development'`); a development site is marked by `getSiteConfig().environment === EnvironmentTypes.DEVELOPMENT` (`site.config.dev.tsx`).
- `Shell.tsx` is where per-route hooks run (`useActiveRouteRoleWatcher`, `useTrackColorSchemeChoice`); routes are a data router (`createBrowserRouter`), and app routes may be `lazy`.

## Change

1. **`shell/header/SkipLink.tsx` (new), rendered by `Header.tsx` in place of the anchor.** The same anchor, `href="#main-content"` kept as the no-JS fallback, with a click handler: find the first `<main>` without the `hidden` attribute, else `document.getElementById('main-content')`; if neither, return and let the anchor act. Otherwise `preventDefault`, set `tabindex="-1"` on the target if it has no `tabindex`, then `focus()` and `scrollIntoView()`. Browsers scroll to a hash target but do not move focus to a non-focusable element, so the next Tab would return to the top of the page without this.
2. **`shell/style.scss`:** `main[tabindex="-1"]:focus { outline: none; }`, scoped to the programmatic case so an app's own focus styling is untouched.
3. **Page rules, in `shell/rules/`, run in tests.** A new category: rules the docs state about what a route renders, judged against the rendered document, each yielding a diagnostic. `shell/rules/types.ts`: `Diagnostic` is `{ level: 'error' | 'warning'; message }` and `PageRule` is `(document: Document) => Diagnostic | undefined`; `shell/rules/<rule>.ts` declares one rule against that type (`const mainLandmark: PageRule = ...`) with a test each; `shell/rules/index.ts` lists them and exports `runPageRules(document)`, the diagnostics of every rule that fails, re-exported from the package root beside `initializeMockApp`. An app asserts it in its route tests once the page has rendered: `expect(runPageRules(document)).toEqual([])`. The shell's own dev pages do the same in new tests. There is no runtime runner; the analysis below is why. The first rule, `mainLandmark`: more than one `<main>` without `hidden` is an error (HTML allows one, and the skip target is ambiguous); none is a warning (the skip link still works through the wrapper fallback). The second candidate, for the PR description rather than this PR: `documentTitle`, from the how-to's "Set the document title on every route-level page", reporting an empty `document.title` once the page has rendered (the shell's generated `index.html` sets none).

### When the document can be judged

There is no moment at which "the page has rendered". After a navigation the document goes through states, each produced by something that finishes on its own schedule:

| what changes the document | signal that it is done |
|---|---|
| the router loading a route's `lazy()` module and running loaders | `useNavigation().state === 'idle'` |
| the shell's `SiteProvider`, which renders nothing until the theme has loaded | none exposed; the children's first commit |
| the app's data loading through React Query (every converted app; Learning's tab page shows a spinner until the course metadata query resolves and only then the `<main>`) | `useIsFetching() === 0`, since the shell owns the `QueryClient` (`shell/site.tsx`) |
| a component-level `React.lazy` or `Suspense` inside the route | none |
| data loading outside React Query, user interaction (a dialog, a tab), a widget inserted into a slot later | none |

Each attempt so far picked one row and ran the rules once after it: first after `Shell`'s own commit (ran before `SiteProvider` rendered anything), then from a component beside the page (ran before the app's data arrived; Learning would warn on every tab load and never correct itself). No single signal exists for the last three rows, and a rule's outcome at one instant is not its outcome for the page.

Two kinds of rule follow from that. An **instant** rule is one whose violation at any moment is a real violation: more than one visible `<main>` is invalid HTML whenever it is observed (React commits a route change atomically, so two pages never coexist). A **settled** rule is one that is only meaningful once the page has stopped changing: no `<main>`, an empty title. For a settled rule "stopped changing" is a heuristic, and the honest one is the document itself going quiet.

A runtime runner would therefore judge the document whenever it settles (a `MutationObserver` with a quiet period, gated on the two real signals, reporting each diagnostic once per navigation), and still carry a heuristic for the settled rules. A static check cannot replace that: a lint rule sees one file, and both real cases cross files. The place where "the page has rendered" is actually known is a route test, whose author renders the route, waits for the content and then asserts. So the rules run there, and nothing in the shell guesses at timing. If a dev-site diagnostic is wanted later, it comes back for instant rules only, on any mutation, with no settle heuristic.

4. **`docs/how_tos/migrate-frontend-app.md`:** a section of its own after "Set the document title on every route-level page", "Render one `<main>` landmark per route": the shell renders no `<main>`, apps are expected to render it around primary content in each route, HTML allows no more than one without `hidden`, the skip link moves focus to it, and route tests assert it with `runPageRules`.

Not here: frontend-template-application's nested `<main>` (a one-line fix there, filed separately), focus management after client-side navigation (the issue's last paragraph; its own issue), any change to `id="main-content"` on the wrapper, which stays as the fallback target.

## Tests

- `shell/header/SkipLink.test.tsx`: renders the link with its message and `href`; click with a `<main>` in the document moves focus to it and gives it `tabindex="-1"`; a hidden `<main>` is passed over for the visible one; a `<main>` that already has a `tabindex` keeps it; with no `<main>` the wrapper with `id="main-content"` is focused; with neither, the click is not prevented. jsdom has no `scrollIntoView`, so the test defines it on `Element.prototype` and asserts the call.
- `shell/rules/mainLandmark.test.ts`: one `<main>` passes; hidden ones are not counted; two is an error; none is a warning. `shell/dev/devHome/HomePage.test.tsx` and `shell/dev/slotShowcase/SlotShowcasePage.test.tsx`: each page rendered under an intl provider and a memory router satisfies `runPageRules`.
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## Commit and PR

One commit, `fix: move the skip link's focus to the app's main landmark` (a patch release). PR from the fork, `skip-link-main-landmark`, against `main`, "Resolves #328", with the landmark rule and the reason the id stays in the description. Manual check on the shell's dev site (`npm run dev`): Tab to the skip link, activate it, confirm focus is on the `<main>` and keyboard navigation continues inside the content.

## Decisions while implementing

The log is `decisions-frontend-base-328.md`; its entry 6 is the timing story, from the first hook to the test-time rule.
