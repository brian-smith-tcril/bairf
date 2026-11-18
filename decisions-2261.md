# Decisions: the route wrappers (#2261)

Decisions made while building this layer of #2195. The scope, the
history of the params-only decode and the alternatives weighed are in
#2195's plan and are not repeated.

1. **The middle layer of three, one commit.** The courseware data
   module (#2260) is below it and the container with its redirects
   (#2262) above.

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
   probe.** `replacePages(routes, page)` in `tests/render.tsx` returns
   the array with every page's `element`, `lazy` and `loader`
   replaced: a route with children is a layout and stays, with the
   pages under it replaced; a route without is a page. So a test
   renders `Main`, `PathFixesProvider` and `DecodePageRoute` where the
   app has them, and no page's requests. `master`'s landing test builds
   the same thing from `DECODE_ROUTES`: the wrapper on each pattern
   around a probe, and a catch-all probe.
   - `decodeRoutes.test.tsx`: the rows are `master`'s. The harness adds
     `/learning`, as a literal, to each URL and landing. One landing
     changes: the
     row "mangled url with an encoded space" lands on
     `course-v1:edX+Demo+Run`, where `master`'s test, which mounts the
     wrapper alone, lands on the key with a space. In `master`'s app
     `PathFixesProvider` turns the `%20` into `+` first, as it does
     here.
   - `index.test.jsx`: `master`'s wrapper cases mock `../constants`,
     `matchPath` and `Navigate`, none of which describe the wrapper any
     more. Where `master` asserts on its mocked `Navigate`, the cases
     assert on a spy of the router's own `navigate`, which the real
     `Navigate` calls: not called when nothing needs decoding, called
     with the decoded pathname and `replace: true` when something
     does. `master`'s three cases keep their shape: each builds its
     `props` with `matchPath` and calls `renderPage(props)`, which
     renders at `/learning` and the props' pathname, so the cases
     change in the lines that assert and nowhere else. The new cases
     render at a full path through `renderAt`. The case "should only
     decode the url params and not the entire url" goes with the
     behavior it asserts. The `decodeUrl` cases are `master`'s.
   - `PathFixesProvider.test.jsx`: `master`'s three cases under
     `/learning`, and a fourth for an encoded space on
     `goal-unsubscribe`.

7. **A path the browser re-encodes renders nothing, here and on
   `master`.** After a `Navigate`, both `master`'s `BrowserRouter` (it
   reads `window.location`) and the shell's data router
   (`encodeLocation`) hold the pathname as the URL parser writes it,
   so a decoded character the parser escapes again leaves the pathname
   different from its decoded form, and the wrapper returns `Navigate`
   again with no page. Spaces never reach it, since `PathFixesProvider`
   runs first. A non-ASCII letter does: run once in jsdom under a
   browser router, in a case that was not kept, a course key spelled
   `course-v1:Org+Caf%C3%A9+Run` rendered nothing with this layer's
   wrapper and with `master`'s. Course keys made in Studio are ASCII.
   Not seen in a real browser, not introduced here, and no issue is
   filed for it. The package's suites run under a memory router, which
   does not re-encode, so no kept case sees it.

8. **Checks (2026-11-18).** `npm run lint` clean, with the package's
   `.jsx` files included (openedx/frontend-base#327); `npm test`, 46
   suites, 792 passed, 11 skipped (all from earlier layers); 100% of
   lines for the package. `npm run build` and `npm run build:ci` pass.
   Counted as codecov counts a patch, against #2260's head: 20 added
   lines, none missed and none partly covered.
