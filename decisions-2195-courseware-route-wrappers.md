# Decisions: the route wrappers (layer 2 of #2195)

Decisions made while building this layer. The scope, the history of the
params-only decode and the alternatives weighed are in #2195's plan and
are not repeated. Renamed to `decisions-<pr>.md` once the PR has a
number.

1. **The middle layer of three, one commit.** The courseware data
   module is below it and the container with its redirects above.

2. **Both wrappers keep their `children` prop.** `routes.tsx` gives each
   an `<Outlet />`: `<PathFixesProvider><Outlet /></PathFixesProvider>`
   and `<DecodePageRoute><Outlet /></DecodePageRoute>`. The components
   stay what they are on `master`, a wrapper around whatever they are
   given, and `PathFixesProvider.jsx` changes in one import only.

3. **`PathFixesProvider` is a pathless layout route around every child
   of `learning`.** `master` wraps all of its routes with it, the three
   outside the course routes included. The route has the id
   `org.openedx.frontend.route.learning.pathFixes`, as the `course` and
   `preview` layout routes have theirs. It sits inside the providers
   `Main` renders, where `master` has it outside `NoticesProvider`; a
   fixed path replaces the location under providers that stay mounted,
   so nothing is requested twice. `app.test.ts` reads the course and
   preview routes through the new route.

4. **`DecodePageRoute` splits the pathname on `/`, passes each segment
   through `decodeUrl` and rejoins.** `decodeUrl` is unchanged. The
   wrapper reads no route list, so `DECODE_ROUTES` is not ported.
   - Every row of `master`'s landing table lands where `master` lands
     it. The table (thirteen route templates, ten spellings of the
     course key, four more rows) runs through the route array under
     `/learning`, 134 cases.
   - An escaped character in a fixed segment is decoded and redirected.
     Four cases: `l%65arning`, `c%6Furse`, `pr%65view`, `h%6Fme`.
     By reading `master`'s wrapper, not by running it: it leaves the
     first three as typed, and already decodes the fourth through its
     `:sequenceId` pattern.
   - A trailing slash is left as it is, and the page renders.
   - The redirect drops the query string, as `master`'s does:
     `<Navigate to={newUrl}>` is given a pathname.

5. **`PageWrap` is frontend-base's, and the page event is back on the
   course routes.** One event for each pathname: none for the encoded
   address a redirect leaves, none for a change of query string, one
   more on moving to another tab. The dates, progress and outline tabs
   sent none before this layer. On `master` the routes outside the
   course routes (`goal-unsubscribe`, `redirect`,
   `preferences-unsubscribe`) are wrapped in `PageWrap` in `index.jsx`
   itself; those pages are stubs here, and their ports (#2205, #2206,
   #2207) bring the event with them. A case pins that a route outside
   the course routes sends none and is not decoded.

6. **The tests render the route array with each page swapped for a
   probe.** `withPages(routes, page)` in `tests/render.tsx` returns the
   array with every leaf route's `element`, `lazy` and `loader`
   replaced, so a test renders `Main`, `PathFixesProvider` and
   `DecodePageRoute` where the app has them and no page's requests.
   `master`'s landing test builds the same thing from `DECODE_ROUTES`:
   the wrapper on each pattern around a probe, and a catch-all probe.
   - `decodeRoutes.test.tsx`: the rows are `master`'s. The harness adds
     `/learning` to each URL and landing. One landing changes: the row
     "mangled url with an encoded space" lands on
     `course-v1:edX+Demo+Run`, where `master`'s test, which mounts the
     wrapper alone, lands on the key with a space. In `master`'s app
     `PathFixesProvider` turns the `%20` into `+` first, as it does
     here.
   - `index.test.jsx`: `master`'s wrapper cases mock `../constants`,
     `matchPath` and `Navigate`, none of which describe the wrapper any
     more. They assert the router's location and its history action
     (`REPLACE` after a decode, `POP` when nothing moved). `master`'s
     three cases keep their shape: each builds its `props` with
     `matchPath` and calls `renderPage(props)`, which renders at
     `/learning` and the props' pathname, so the cases change in the
     lines that assert and nowhere else (from Brian's review,
     2026-11-17: without the prop bag "the diff seem[s] bigger"). The
     new cases render at a full path through `renderAt`. The case
     "should only decode the url params and not the entire url" goes
     with the behavior it asserts. The `decodeUrl` cases are
     `master`'s.
   - `PathFixesProvider.test.jsx`: `master`'s three cases under
     `/learning`, and a fourth for an encoded space on
     `goal-unsubscribe`.

7. **Read while porting, not run, and the same on `master`: a path
   the browser re-encodes.** After a `Navigate`, both `master`'s
   `BrowserRouter` (it reads `window.location`) and the shell's data
   router (`encodeLocation`) hold the pathname as the URL parser writes
   it, so a decoded character the parser escapes again (a space, a
   non-ASCII letter) would leave the pathname different from its
   decoded form and the wrapper returning `Navigate` with no page.
   Spaces never reach it, since `PathFixesProvider` runs first; course
   keys made in Studio are ASCII. jsdom's memory router does not
   re-encode, so no test here sees it. Noted for the manual pass.

8. **Checks at this layer (2026-11-17).** Lint clean with the local
   `.jsx` block in place; 46 suites, 792 passed, 11 skipped; 100% of
   lines; `build` and `build:ci` pass. The patch counted as codecov
   counts it: 20 lines, none missed, none partial. Local commit
   `639af3be` on `bsmith/courseware-route-wrappers`, not pushed.
