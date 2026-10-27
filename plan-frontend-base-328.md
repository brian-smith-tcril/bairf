# Plan: openedx/frontend-base#328 — the skip link moves focus to the app's `<main>`

The direction settled in the issue's discussion on 2026-10-26: the skip link finds the landmark itself; apps put no id on anything; the one rule for apps is the HTML one, per route: one `<main>` around the primary content, and no other `<main>` without the `hidden` attribute (HTML Living Standard, the `main` element: "A document must not have more than one main element that does not have the hidden attribute specified."). Written 2026-10-26, revised the same day, for the PR body.

## Baseline

- `shell/header/Header.tsx` renders `<a className="sr-only sr-only-focusable" href="#main-content">`; `shell/DefaultLayout.tsx` puts `id="main-content"` on the `div.flex-grow-1` around the content slot. The shell renders no `<main>`; every app does, around what it considers its primary content: frontend-template-application (the repository an app is scaffolded from) in its `src/Main.tsx`, and profile, account, catalog, learner dashboard and Learning in theirs. frontend-template-application also renders a second `<main>` inside the first, in `src/example/ExamplePage.tsx`.
- The shell has no stylesheet rule for `main` (`shell/style.scss` is utility classes) and no development-only diagnostics beyond the React Query devtools gate in `shell/site.tsx` (`process.env.NODE_ENV === 'development'`); a development site is marked by `getSiteConfig().environment === EnvironmentTypes.DEVELOPMENT` (`site.config.dev.tsx`).
- `Shell.tsx` is where per-route hooks run (`useActiveRouteRoleWatcher`, `useTrackColorSchemeChoice`); routes are a data router (`createBrowserRouter`), and app routes may be `lazy`.

## Change

1. **`shell/header/SkipLink.tsx` (new), rendered by `Header.tsx` in place of the anchor.** The same anchor, `href="#main-content"` kept as the no-JS fallback, with a click handler: find the first `<main>` without the `hidden` attribute, else `document.getElementById('main-content')`; if neither, return and let the anchor act. Otherwise `preventDefault`, set `tabindex="-1"` on the target if it has no `tabindex`, then `focus()` and `scrollIntoView()`. Browsers scroll to a hash target but do not move focus to a non-focusable element, so the next Tab would return to the top of the page without this.
2. **`shell/style.scss`:** `main[tabindex="-1"]:focus { outline: none; }`, scoped to the programmatic case so an app's own focus styling is untouched.
3. **Page rules, in `shell/rules/`.** A new category: rules the docs state about what a route renders, judged against the rendered document on any site but a production one, each reporting a diagnostic on the console. `shell/rules/types.ts`: `Diagnostic` is `{ level: 'error' | 'warning'; message }` and `PageRule` is `(document: Document) => Diagnostic | undefined`; `shell/rules/<rule>.ts` declares one rule against that type (`const mainLandmark: PageRule = ...`) with a test each; `shell/rules/index.ts` lists them; `shell/usePageRules.ts` runs them (below); `Shell.tsx` calls it. "Page" scopes the type to this runner: a rule about site config would run once at startup against the config and be a different type. The first rule, `mainLandmark`: more than one `<main>` without `hidden` is an error (HTML allows one, and the skip target is ambiguous); none is a warning (the skip link still works through the wrapper fallback). The second candidate, for the PR description rather than this PR: `documentTitle`, from the how-to's "Set the document title on every route-level page", reporting an empty `document.title` once the page has settled (the shell's generated `index.html` sets none).

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

So the runner judges the document **whenever it settles**, not once:

- A `MutationObserver` on the document (child list, subtree, attributes, so `hidden` and the `<title>` count) restarts a short quiet timer on every change; the rules run when the timer fires. On mount the timer is started too, so a page that never changes is judged once.
- Running is gated on the two signals that exist: the router idle and no React Query fetch in flight. While either is active the timer's firing does nothing, and the gate opening re-arms it, so Learning's spinner-then-content page is judged once, with its `<main>` present.
- Each diagnostic is reported once per navigation (keyed on the location `key`, the rule and the message), so later changes that leave a violation in place do not repeat it; a violation that clears is not retracted. Later changes that introduce one, a dialog that nests a `<main>`, are reported when the document next settles.
- The quiet period is short, a few hundred milliseconds: long enough to span React's own commit sequence and a lazy chunk's render, short enough that a developer sees the diagnostic as the page appears. A page that loads data outside React Query for longer than that gets the settled-rule warning once; the warning's text names the fallback and that is the accepted residual.

With the observer the runner no longer depends on where it is mounted: a change below `SiteProvider` is a mutation like any other. `usePageRules` goes back to being called from `Shell` beside its sibling hooks, and the `PageRules` component goes.

4. **`docs/how_tos/migrate-frontend-app.md`:** a section of its own after "Set the document title on every route-level page", "Render one `<main>` landmark per route": the shell renders no `<main>`; each route renders one around its primary content and no other without `hidden`; which component renders it is the app's choice (a layout route or each page), not `Main.jsx` in particular; the skip link focuses it; the development check reports more than one as an error and none as a warning.

Not here: frontend-template-application's nested `<main>` (a one-line fix there, filed separately), focus management after client-side navigation (the issue's last paragraph; its own issue), any change to `id="main-content"` on the wrapper, which stays as the fallback target.

## Tests

- `shell/header/SkipLink.test.tsx`: renders the link with its message and `href`; click with a `<main>` in the document moves focus to it and gives it `tabindex="-1"`; a hidden `<main>` is passed over for the visible one; a `<main>` that already has a `tabindex` keeps it; with no `<main>` the wrapper with `id="main-content"` is focused; with neither, the click is not prevented. jsdom has no `scrollIntoView`, so the test defines it on `Element.prototype` and asserts the call.
- `shell/rules/mainLandmark.test.ts`: one `<main>` passes; hidden ones are not counted; two is an error; none is a warning. `shell/usePageRules.test.tsx`, on mocked rules through a memory data router under a `QueryClientProvider`, with fake timers: the rules run once the document has been quiet for the period; a page that renders its `<main>` after an effect is judged with it present; a change after the first judgement (a second `<main>` added) is judged again; a repeated diagnostic is reported once per navigation; nothing runs while a query is fetching, and the rules run when it finishes; disabled is silent; the default runs on development and test sites and not on production. A second navigation cannot be tested here: the data router builds a `Request`, which this repo's jsdom lacks (jsdom/jsdom#1724).
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## Commit and PR

One commit, `fix: move the skip link's focus to the app's main landmark` (a patch release). PR from the fork, `skip-link-main-landmark`, against `main`, "Resolves #328", with the landmark rule and the reason the id stays in the description. Manual check on the shell's dev site (`npm run dev`): Tab to the skip link, activate it, confirm focus is on the `<main>` and the next Tab lands inside the content; with the test site's nested `<main>` the warning appears in the console.

## Decisions while implementing

- The check started as a runtime hook named for its rule (`useMainLandmarkCheck`); review on 2026-10-26 asked what category it belongs to, since nothing in frontend-base inspects the rendered document. Settled as rules about the rendered page with diagnostics (TypeScript's word for a message with a severity): `PageRule` and `Diagnostic` in `shell/rules/`, run by `usePageRules`; "development" names when the runner runs, not what a rule is, so it is not in the type's name.
- Candidates from the docs: `documentTitle` (above); a check that an app chunk re-ships Paragon's `:root` declarations (ADR 0008) was rejected: it depends on the build's layer wrapping, on same-origin sheets, and jsdom cannot parse `@layer`, and ADR 0008's layering already neutralises the failure. A duplicate-id check has no sentence in the docs and would fire on third-party widgets.
- The hook is keyed on the location `key`, not the pathname, so a navigation that changes only the search re-runs the rules and resets what has been reported.
- Timing went through three shapes before the settle model above: once after `Shell`'s commit, once from a component beside the page, then the observer. The first two each picked one source of change and missed the rest; the model names every source and the two signals that exist.
