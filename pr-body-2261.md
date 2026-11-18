## Summary

Learning's two route wrappers now run in its frontend-base package, as layout routes: `PathFixesProvider`, which turns spaces in a course URL into plus signs, around every Learning route, and `DecodePageRoute`, which decodes a percent-encoded course URL, around the course routes. With `DecodePageRoute` comes its `PageWrap`, so the dates, progress and outline tabs send the page event again. **No user-facing change on `master`**: the legacy tree under `src/` is untouched.

Part of #1905. Part of #2195. Stacked above #2260; the container with its redirects (#2262) follows.

> [!NOTE]
> **For reviewers:** the ported files are added under `frontend-base/src/` as new files, so this diff cannot show what changed from `master`. The `port-diff` script in #2234's description prints that diff, from `frontend-base/manifest.tsv`. `generic/path-fixes/index.js` is identical to `master`'s, and `PathFixesProvider.jsx` differs in one import line.

## What changed

- **Both wrappers are layout routes in `routes.tsx`.** `PathFixesProvider` is the element of a new pathless route, `org.openedx.frontend.route.learning.pathFixes`, holding every child of the `learning` route, since `master` wraps all of its routes with it. `DecodePageRoute` is the element of the `course/:courseId` and `preview/course/:courseId` routes, which rendered a bare `<Outlet />`. Both keep their `children` prop and are given an `<Outlet />`.
- **`DecodePageRoute` decodes every segment of the pathname and reads no route list.** `master` matches the pathname against `DECODE_ROUTES`, the list its router is also built from, decodes the matched params and rebuilds the path with `generatePath`. The package's router is built from the route array, so the port has to find the params another way either way; splitting the pathname on `/` and passing each segment through `decodeUrl`, which is unchanged, needs no second list of the course routes. `DECODE_ROUTES` is not ported. The alternatives weighed and the history of decoding only the params are in #2195.
- **The page event is back on the course routes.** The wrapper keeps `PageWrap`, now frontend-base's: one event for each pathname of a course route. The three tabs ported so far sent none.
- **`tests/render.tsx` gains `replacePages(routes, page)`**, which returns the route array with each page replaced, so a test renders the real layout routes and no page's requests.
- **Manifest.** Six lines for the ported files.

## Known differences from `master`

Both are in how an oddly spelled course URL is tidied in the address bar; the same page renders either way.

- **An escaped character in a fixed segment of the path is decoded too.** `/learning/c%6Furse/…` is rewritten to `/learning/course/…`, where `master` leaves the address as typed.
- **A trailing slash on a course URL is left as it is.** `master` redirects to the form without it, a side effect of rebuilding the path from its params.

## Testing

In `frontend-base/`: lint, the tests, `build` and `build:ci` pass. 46 suites, 792 tests passed and 11 skipped (all skipped in earlier layers). Lint ran with the package's `.jsx` files included (openedx/frontend-base#327).

**`master`'s tests**, rendered through the route array under `/learning` with each page swapped for a probe that prints the pathname:

- `decodeRoutes.test.tsx`: `master`'s table of thirteen route templates against ten spellings of the course key, and its four other rows. All 134 rows land where `master` lands them. One row's landing is written differently: an encoded space lands on the plus-signed key, since `PathFixesProvider` is in the tree here as it is in `master`'s app, where `master`'s test mounts the decode wrapper alone.
- `decode-page-route/index.test.jsx`: `master`'s three wrapper cases keep their shape and assert on a spy of the router's `navigate` where `master` asserts on a mocked `Navigate`. The case "should only decode the url params and not the entire url" goes with the behavior it asserts. The `decodeUrl` cases are `master`'s.
- `PathFixesProvider.test.jsx`: `master`'s three cases.

**New cases:** a preview URL decoded; an escaped character in each of `learning`, `course`, `preview` and `home`; a trailing slash left as it is; a route outside the course routes fixed for a space, not decoded, and sending no page event; one page event for each pathname of a course route.

**Coverage.** The package is at 100% of lines at this layer, against its 96.15% bar. Counted as codecov counts a patch, against #2260's head, the layer adds 20 lines with none missed and none partly covered.

**Manual testing** on the package's dev site against tutor dev, with one enrolled learner in the demo course: a course URL with an encoded course key and one with spaces in the key, each pasted into the address bar, settle on the clean address with the page rendered; the course bar's tabs switch pages; the console. The page event is left to the suite, since seeing it by hand needs an analytics key on the site. The record is below, in the section "The route wrappers".

## Decisions

What was decided while building this layer; the scope, the alternatives weighed for the decode and its history are in #2195.

<details>
<summary>Full decision log</summary>

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
   wrapper and with `master`'s. Course keys made in Studio are ASCII
   by default: Studio rejects other characters unless
   `ALLOW_UNICODE_COURSE_ID` is set
   ([`course.py`](https://github.com/openedx/openedx-platform/blob/46c8c9b4c86e9f7ec02d31293b2d0bb3f3638114/cms/djangoapps/contentstore/views/course.py#L1131-L1137)),
   and the setting is `False` in
   [`cms/envs/common.py`](https://github.com/openedx/openedx-platform/blob/46c8c9b4c86e9f7ec02d31293b2d0bb3f3638114/cms/envs/common.py#L118-L119).
   Not seen in a real browser here, and not introduced here. The
   package's suites run under a memory router, which does not
   re-encode, so no kept case sees it.

8. **Checks (2026-11-18).** `npm run lint` clean, with the package's
   `.jsx` files included (openedx/frontend-base#327); `npm test`, 46
   suites, 792 passed, 11 skipped (all from earlier layers); 100% of
   lines for the package. `npm run build` and `npm run build:ci` pass.
   Counted as codecov counts a patch, against #2260's head: 20 added
   lines, none missed and none partly covered.

</details>

<details>
<summary>Manual testing</summary>

# Manual testing — the courseware container and redirects (#2195)

One section per layer of the stack. A layer's section asks only for what that layer changes
and a test cannot see, and says what each step needs beyond the page itself.

Drafted 2026-11-18 before the pass. The boxes are Brian's ticks; what was and was not
observed goes under each section's Record.

## Setup, for both sections

The same as for the outline tab; nothing new.

- The package's dev site: `cd frontend-base && nvm use && npm ci && npm run dev`, served at
  `http://apps.local.openedx.io:2000/learning/`, with tutor dev's `mfe` service stopped so
  the port is free.
- Tutor dev with `LEARNING_MICROFRONTEND_URL` pointing at
  `apps.local.openedx.io:2000/learning`, as for #2189.
- One user: a learner enrolled in the demo course, `course-v1:OpenedX+DemoX+DemoCourse`.

## The courseware data module

Nothing to do. No route renders this layer's code until the container layer.

## The route wrappers

On `bsmith/courseware-route-wrappers`.

What needs eyes: a real browser's address bar going through the two redirects and the page
rendering after them, the shell's course bar with the two new layout routes in the tree,
and a real browser's console. The suite runs the wrappers in jsdom.

- [x] **1. An encoded course key** — paste
      `http://apps.local.openedx.io:2000/learning/course/course-v1%3AOpenedX%2BDemoX%2BDemoCourse/home`
      into the address bar. The address becomes
      `…/learning/course/course-v1:OpenedX+DemoX+DemoCourse/home` and the outline tab
      renders.
      *Why here:* `DecodePageRoute` is back, as the layout route of the course routes. It
      now decodes every segment of the path.
- [x] **2. A space in the course key** — paste
      `http://apps.local.openedx.io:2000/learning/course/course-v1:OpenedX DemoX DemoCourse/dates`.
      The address becomes `…/course/course-v1:OpenedX+DemoX+DemoCourse/dates` and the dates
      tab renders.
      *Why here:* `PathFixesProvider` is back, as a layout route around all of Learning's
      routes.
- [x] **3. The course bar** — from that page, click the Course, Progress and Dates tabs in
      turn. Each opens with no page load (the Network tab shows no document request), and
      the course bar stays in place.
      *Why here:* the route tree gained a pathless route and the two course routes render
      a wrapper where they rendered a bare outlet; the shell reads the course from the
      matched routes, which no test of Learning's renders.
- [x] **4. The console** — DevTools, Console, reload on any of the three tabs. No errors or
      warnings from Learning's code.

### Record

**2026-11-18, Brian, on the dev site, on `bsmith/courseware-route-wrappers` (`e0cef2b8`).**

- Brian ticked steps 1, 2, 3 and 4, with no notes on any of them.
- Two details those steps ask about were not noted and stay unrecorded: whether the
  Network tab was watched for a document request on each tab click (step 3), and
  whether the console held warnings that are not Learning's (step 4).

### Checked without you

- **The wrappers under a browser router**, 2026-11-18, in a throwaway case run and deleted:
  jsdom's browser router, which encodes an address as a browser does, started at an encoded
  course key, at a key with spaces, and at `c%6Furse`. Each settled on the clean address and
  rendered the page. Steps 1 and 2 are the same thing in a real browser.
- **A course key with a non-ASCII letter does not render, here or on `master`.** In the same
  throwaway case, started at `…/course-v1:Org+Caf%C3%A9+Run/home`, nothing rendered: the
  browser holds the address encoded, the wrapper decodes it to `é`, the two never match, and
  the wrapper keeps redirecting. `master`'s wrapper under `BrowserRouter` in jsdom did the
  same, so this layer does not introduce it. Not seen in a real browser.
- **Lint, tests and both builds** at the layer's head, on its own commit: all pass.

### Left to the suite

| State | Test |
|---|---|
| Every spelling of the course key on every course route (134 rows) | `decodeRoutes.test.tsx` |
| An escaped character in `learning`, `course`, `preview` or `home` | `decode-page-route/index.test.jsx`, "should decode an escaped character in the fixed segment" |
| A trailing slash left as typed | `index.test.jsx`, "should leave a trailing slash as it is" |
| A preview address decoded | `index.test.jsx`, "should decode a preview url" |
| A route outside the course routes: fixed for a space, not decoded | `PathFixesProvider.test.jsx`, `index.test.jsx` |
| One page event for each pathname of a course route | `index.test.jsx`, "should send one page event for each pathname of a course route". Seeing it by hand needs an analytics key on the site. |

## The container and redirects

On `bsmith/courseware-container`.

What needs eyes: the redirect rules against the real responses (the resume position, the
sequence, the error a unit id draws from the sequence endpoint, the outline), the course bar
on a courseware page, the earlier tabs' links reaching a unit, and a real browser's console.
The suite answers every request itself.

The page is a stub until #2196: it reads "course: not yet ported" and lists `courseId=…`,
`sequenceId=…` and `unitId=…`. "The stub matches" below means those three equal the ids in
the address.

- [x] **1. The course root** — open
      `http://apps.local.openedx.io:2000/learning/course/course-v1:OpenedX+DemoX+DemoCourse`.
      The address settles on `…/course/<course>/<sequence>/<unit>` and the stub matches.
      *Why here:* the container and its redirects replace the stub page on the courseware
      routes; this is the resume lookup and the outline for real.
- [x] **2. A sequence alone** — delete the last segment of that address, the unit, and press
      Enter. The address goes back to a unit of that sequence and the stub matches.
- [x] **3. A unit alone** — from the address in step 1, delete the sequence segment so the
      unit follows the course key, and press Enter. The address settles on
      `…/<sequence>/<unit>` again and the stub matches.
      *Why here:* the sequence endpoint's real answer to a unit id, and the lookup of the
      unit's parent, both of which the suite stands in for.
- [x] **4. An id that is nothing** — open
      `…/learning/course/course-v1:OpenedX+DemoX+DemoCourse/block-v1:OpenedX+DemoX+DemoCourse+type@sequential+block@nothing`.
      The address goes to the course root and on to where step 1 settled.
      *Why here:* the sequence endpoint's real answer to an id it does not know.
- [x] **5. A preview address as the learner** — in the address from step 1, insert `/preview`
      after `/learning` and press Enter. The address loses `/preview` and the stub matches.
      *Why here:* `useIsPreview` now compares against `/learning/preview`.
- [x] **6. The course bar's tabs from a unit** — on the page from step 1, click Progress and
      then go back: each opens with no page load.
      *Why here:* the shell picks the selected tab from the address, and this is the first
      Learning page whose address is under none of the tabs' own.
- **To note, not to tick: which tab the course bar shows as selected on a unit page, if
  any.** Nothing is expected here; what shows is recorded below.
  - Brian: "no tab highlighted/selected"
- [x] **7. The earlier tabs' links** — on the Course tab, expand a section and click a
      sequence title; on the Progress tab, click a subsection's title. Each lands on a unit
      with the stub matching, with no page load.
      *Why here:* those links landed on the stub page of #2188 until now.
- [x] **8. The console** — DevTools, Console, reload on a unit. No errors or warnings from
      Learning's code.

### Record

**2026-11-18, Brian, on the dev site, on `bsmith/courseware-container` (`53eaf560`).**

- Brian ticked steps 1 to 8, with no notes on any of them.
- On a unit page the course bar shows no tab as selected: "no tab highlighted/selected".
  On `master` the Course tab is selected there: the container renders the tab page with
  `activeTabSlug="courseware"`, the Course tab's id from the `course_metadata` response is
  `courseware`, and `isActiveTab` selects the tab whose id equals the slug. The shell's
  course bar does not take a slug from the page: it selects the tab whose URL is the
  longest prefix of the address (`findActiveTab`), the Course tab's URL ends in `/home`,
  and a unit's address is `…/course/<course>/<sequence>/<unit>`, under none of the tabs'.
  So this is the shell's rule and not something this layer's code sets; it is a difference
  from `master` that a learner sees.
- Details the steps ask about that were not noted and stay unrecorded: whether the Network
  tab was watched for a document request (steps 6 and 7), which sequence and subsection
  were clicked (step 7), and whether the console held warnings that are not Learning's
  (step 8).

### Checked without you

- **Lint, tests and both builds** at the layer's head, on its own commit: all pass.

### Left to the suite

| State | Test |
|---|---|
| A section id, with and without a unit; an empty section | `CoursewareContainer.test.jsx`, "when the URL contains a section ID…" (needs a section's id, which no page shows) |
| A sequence with no units; the `first` and `last` markers | `CoursewareContainer.test.jsx`, "when the sequence has no units", "when the URL contains a unit marker" |
| A preview address as staff | `CoursewareContainer.test.jsx`, "when the URL has the /preview prefix" (needs a staff user) |
| The outline failing to load | `CoursewareContainer.test.jsx`, "when the learning-sequences outline fails" |
| A learner without access | `CoursewareContainer.test.jsx`, "when receiving a course_access error_code" |
| Every address a multi-hop redirect passes through | `CoursewareContainer.test.jsx`, "the addresses a redirect passes through" |
| The position saved on moving to another unit | `CoursewareContainer.test.jsx`, "the position save" (the stub has no navigation to move with) |
| The three handlers the container passes down | `CoursewareContainerHandlers.test.tsx` |

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
