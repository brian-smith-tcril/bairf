# Plan: openedx/frontend-base#328 — the skip link moves focus to the app's `<main>`

The direction settled in the issue's discussion on 2026-10-26: the skip link finds the landmark itself; apps put no id on anything; the one rule for apps is "render exactly one `<main>` around the primary content". Written 2026-10-26, for the PR body.

## Baseline

- `shell/header/Header.tsx` renders `<a className="sr-only sr-only-focusable" href="#main-content">`; `shell/DefaultLayout.tsx` puts `id="main-content"` on the `div.flex-grow-1` around the content slot. The shell renders no `<main>`. The template's `src/Main.tsx` renders `<main>` around its outlet and `src/example/ExamplePage.tsx` renders another inside it (two nested landmarks); profile, account, catalog, learner dashboard and Learning's tab page each render one `<main>`.
- The shell has no stylesheet rule for `main` (`shell/style.scss` is utility classes) and no development-only diagnostics beyond the React Query devtools gate in `shell/site.tsx` (`process.env.NODE_ENV === 'development'`); a development site is also marked by `getSiteConfig().environment === EnvironmentTypes.DEVELOPMENT` (`site.config.dev.tsx`).
- `Shell.tsx` is where per-route hooks run (`useActiveRouteRoleWatcher`, `useTrackColorSchemeChoice`); routes are a data router (`createBrowserRouter`), and app routes may be `lazy`.

## Change

1. **`shell/header/SkipLink.tsx` (new), rendered by `Header.tsx` in place of the anchor.** The same anchor, `href="#main-content"` kept as the no-JS fallback, with a click handler: find `document.querySelector('main')`, else `document.getElementById('main-content')`; if neither, return and let the anchor act. Otherwise `preventDefault`, set `tabindex="-1"` on the target if it has no `tabindex`, then `focus()` and `scrollIntoView()`. Browsers scroll to a hash target but do not move focus to a non-focusable element, so the next Tab would return to the top of the page without this.
2. **`shell/style.scss`:** `main[tabindex="-1"]:focus { outline: none; }`, scoped to the programmatic case so an app's own focus styling is untouched.
3. **A development-only check for nested landmarks, in `Shell.tsx`.** After each location change, on a development site, warn when `document.querySelectorAll('main').length > 1`, naming the rule. Only "more than one" is checked: a count of zero can be a lazy route still loading, and a false warning on every navigation would teach people to ignore it. The warning goes through `console.warn` with a message that names the rule and the count.
4. **`docs/how_tos/migrate-frontend-app.md`:** one line under the app's layout: render exactly one `<main>` around the primary content; the shell's skip link focuses it.

Not here: the template's own nested `<main>` (a one-line fix in frontend-template-application, filed separately), focus management after client-side navigation (the issue's last paragraph; its own issue), any change to `id="main-content"` on the wrapper, which stays as the fallback target.

## Tests

- `shell/header/SkipLink.test.tsx`: renders the link with its message and `href`; click with a `<main>` in the document moves focus to it and gives it `tabindex="-1"`; a `<main>` that already has a `tabindex` keeps it; with no `<main>` the wrapper with `id="main-content"` is focused; with neither, the click is not prevented. jsdom has no `scrollIntoView`, so the test defines it on `Element.prototype` and asserts the call.
- The landmark check: one `<main>` is silent; two warn on a development site; two are silent on a production site. Rendered through the shell's test site config, the way `site.config.test.tsx` is used by the router tests.
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## Commit and PR

One commit, `fix: move the skip link's focus to the app's main landmark` (a patch release). PR from the fork, `skip-link-main-landmark`, against `main`, "Resolves #328", with the landmark rule and the reason the id stays in the description. Manual check on the shell's dev site (`npm run dev`): Tab to the skip link, activate it, confirm focus is on the `<main>` and the next Tab lands inside the content; with the test site's nested `<main>` the warning appears in the console.

## Open

- Whether the development check should also cover zero `<main>` once the router is idle (`useNavigation().state === 'idle'`), which still cannot see a lazy component's render. Left out here.
- Where Learning stands once this ships: the skip link lands on the tab page's `<main>`, which on `master` since openedx/frontend-app-learning#2026 wraps only the tab content on non-courseware tabs and only the sequence on courseware. The port carries #2026's landmark half and nothing else.
