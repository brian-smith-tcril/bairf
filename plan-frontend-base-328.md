# Plan: openedx/frontend-base#328 — the skip link moves focus to the app's `<main>`

The direction settled in the issue's discussion on 2026-10-26: the skip link finds the landmark itself; apps put no id on anything; the one rule for apps is the HTML one, per route: one `<main>` around the primary content, and no other `<main>` without the `hidden` attribute (HTML Living Standard, the `main` element: "A document must not have more than one main element that does not have the hidden attribute specified."). Written 2026-10-26, revised the same day, for the PR body.

## Baseline

- `shell/header/Header.tsx` renders `<a className="sr-only sr-only-focusable" href="#main-content">`; `shell/DefaultLayout.tsx` puts `id="main-content"` on the `div.flex-grow-1` around the content slot. The shell renders no `<main>`; every app does, around what it considers its primary content: frontend-template-application (the repository an app is scaffolded from) in its `src/Main.tsx`, and profile, account, catalog, learner dashboard and Learning in theirs. frontend-template-application also renders a second `<main>` inside the first, in `src/example/ExamplePage.tsx`.
- The shell has no stylesheet rule for `main` (`shell/style.scss` is utility classes) and no development-only diagnostics beyond the React Query devtools gate in `shell/site.tsx` (`process.env.NODE_ENV === 'development'`); a development site is marked by `getSiteConfig().environment === EnvironmentTypes.DEVELOPMENT` (`site.config.dev.tsx`).
- `Shell.tsx` is where per-route hooks run (`useActiveRouteRoleWatcher`, `useTrackColorSchemeChoice`); routes are a data router (`createBrowserRouter`), and app routes may be `lazy`.

## Change

1. **`shell/header/SkipLink.tsx` (new), rendered by `Header.tsx` in place of the anchor.** The same anchor, `href="#main-content"` kept as the no-JS fallback, with a click handler: find the first `<main>` without the `hidden` attribute, else `document.getElementById('main-content')`; if neither, return and let the anchor act. Otherwise `preventDefault`, set `tabindex="-1"` on the target if it has no `tabindex`, then `focus()` and `scrollIntoView()`. Browsers scroll to a hash target but do not move focus to a non-focusable element, so the next Tab would return to the top of the page without this.
2. **`shell/style.scss`:** `main[tabindex="-1"]:focus { outline: none; }`, scoped to the programmatic case so an app's own focus styling is untouched.
3. **Development checks on the rendered page, in `shell/checks/`.** A new category: rules the docs state about what a route renders, checked after the route has rendered on a development site, reported on the console. `shell/checks/<rule>.ts` exports `(document: Document) => { level: 'error' | 'warning'; message } | undefined` with a test each; `shell/checks/index.ts` lists them; `shell/useDevelopmentChecks.ts` runs the list when the location changes and the data router's navigation is idle (so a route's `lazy()` has resolved) and `getSiteConfig().environment` is development, routing errors to `console.error` and warnings to `console.warn`; `Shell.tsx` calls it. The first rule, `mainLandmark`: more than one `<main>` without `hidden` is an error (invalid HTML, and the skip target is ambiguous); none is a warning (the skip link still works through the wrapper fallback, and a component-level `React.lazy` can produce it transiently). The second candidate, for the PR description rather than this PR: `documentTitle`, from the how-to's "Set the document title on every route-level page", reporting an empty `document.title` after the route rendered (the shell's generated `index.html` sets none).
4. **`docs/how_tos/migrate-frontend-app.md`:** one line under the app's layout: each route renders one `<main>` around its primary content and no other without `hidden`; the shell's skip link focuses it.

Not here: frontend-template-application's nested `<main>` (a one-line fix there, filed separately), focus management after client-side navigation (the issue's last paragraph; its own issue), any change to `id="main-content"` on the wrapper, which stays as the fallback target.

## Tests

- `shell/header/SkipLink.test.tsx`: renders the link with its message and `href`; click with a `<main>` in the document moves focus to it and gives it `tabindex="-1"`; a hidden `<main>` is passed over for the visible one; a `<main>` that already has a `tabindex` keeps it; with no `<main>` the wrapper with `id="main-content"` is focused; with neither, the click is not prevented. jsdom has no `scrollIntoView`, so the test defines it on `Element.prototype` and asserts the call.
- `shell/checks/mainLandmark.test.ts`: one `<main>` passes; hidden ones are not counted; two is an error; none is a warning. `shell/useDevelopmentChecks.test.tsx`, through a memory data router: an error-level result reaches `console.error`, a warning-level one `console.warn`, a pass is silent, a production site is silent. A second navigation cannot be tested here: the data router builds a `Request`, which this repo's jsdom lacks (jsdom/jsdom#1724).
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## Commit and PR

One commit, `fix: move the skip link's focus to the app's main landmark` (a patch release). PR from the fork, `skip-link-main-landmark`, against `main`, "Resolves #328", with the landmark rule and the reason the id stays in the description. Manual check on the shell's dev site (`npm run dev`): Tab to the skip link, activate it, confirm focus is on the `<main>` and the next Tab lands inside the content; with the test site's nested `<main>` the warning appears in the console.

## Decisions while implementing

- The check started as a runtime hook named for its rule (`useMainLandmarkCheck`); review on 2026-10-26 asked what category it belongs to, since nothing in frontend-base inspects the rendered document. The category is development checks on the rendered page, so the rules live in `shell/checks/` and one hook runs them.
- Candidates from the docs: `documentTitle` (above); a check that an app chunk re-ships Paragon's `:root` declarations (ADR 0008) was rejected: it depends on the build's layer wrapping, on same-origin sheets, and jsdom cannot parse `@layer`, and ADR 0008's layering already neutralises the failure. A duplicate-id check has no sentence in the docs and would fire on third-party widgets.
- The hook is keyed on the location `key`, not the pathname, so a navigation that changes only the search re-runs the checks.
