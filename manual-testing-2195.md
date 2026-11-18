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

- [ ] **1. An encoded course key** — paste
      `http://apps.local.openedx.io:2000/learning/course/course-v1%3AOpenedX%2BDemoX%2BDemoCourse/home`
      into the address bar. The address becomes
      `…/learning/course/course-v1:OpenedX+DemoX+DemoCourse/home` and the outline tab
      renders.
      *Why here:* `DecodePageRoute` is back, as the layout route of the course routes. It
      now decodes every segment of the path.
- [ ] **2. A space in the course key** — paste
      `http://apps.local.openedx.io:2000/learning/course/course-v1:OpenedX DemoX DemoCourse/dates`.
      The address becomes `…/course/course-v1:OpenedX+DemoX+DemoCourse/dates` and the dates
      tab renders.
      *Why here:* `PathFixesProvider` is back, as a layout route around all of Learning's
      routes.
- [ ] **3. The course bar** — from that page, click the Course, Progress and Dates tabs in
      turn. Each opens with no page load (the Network tab shows no document request), and
      the course bar stays in place.
      *Why here:* the route tree gained a pathless route and the two course routes render
      a wrapper where they rendered a bare outlet; the shell reads the course from the
      matched routes, which no test of Learning's renders.
- [ ] **4. The console** — DevTools, Console, reload on any of the three tabs. No errors or
      warnings from Learning's code.

### Record

Not yet run.

### Checked without you

- **The wrappers under a browser router**, 2026-11-18, in a throwaway case run and deleted:
  jsdom's browser router, which encodes an address as a browser does, started at an encoded
  course key, at a key with spaces, and at `c%6Furse`. Each settled on the clean address and
  rendered the page. Steps 1 and 2 are the same thing in a real browser.
- **A course key with a non-ASCII letter does not render, here or on `master`.** In the same
  throwaway case, started at `…/course-v1:Org+Caf%C3%A9+Run/home`, nothing rendered: the
  browser holds the address encoded, the wrapper decodes it to `é`, the two never match, and
  the wrapper keeps redirecting. `master`'s wrapper under `BrowserRouter` in jsdom did the
  same, so this layer does not introduce it. Not seen in a real browser. Put to Brian as a
  possible discovery issue.
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

- [ ] **1. The course root** — open
      `http://apps.local.openedx.io:2000/learning/course/course-v1:OpenedX+DemoX+DemoCourse`.
      The address settles on `…/course/<course>/<sequence>/<unit>` and the stub matches.
      *Why here:* the container and its redirects replace the stub page on the courseware
      routes; this is the resume lookup and the outline for real.
- [ ] **2. A sequence alone** — delete the last segment of that address, the unit, and press
      Enter. The address goes back to a unit of that sequence and the stub matches.
- [ ] **3. A unit alone** — from the address in step 1, delete the sequence segment so the
      unit follows the course key, and press Enter. The address settles on
      `…/<sequence>/<unit>` again and the stub matches.
      *Why here:* the sequence endpoint's real answer to a unit id, and the lookup of the
      unit's parent, both of which the suite stands in for.
- [ ] **4. An id that is nothing** — open
      `…/learning/course/course-v1:OpenedX+DemoX+DemoCourse/block-v1:OpenedX+DemoX+DemoCourse+type@sequential+block@nothing`.
      The address goes to the course root and on to where step 1 settled.
      *Why here:* the sequence endpoint's real answer to an id it does not know.
- [ ] **5. A preview address as the learner** — in the address from step 1, insert `/preview`
      after `/learning` and press Enter. The address loses `/preview` and the stub matches.
      *Why here:* `useIsPreview` now compares against `/learning/preview`.
- [ ] **6. The course bar on a unit** — on the page from step 1, note which tab the course bar
      shows as selected, if any, and click Progress and then back: each opens with no page
      load.
      *Why here:* the shell picks the selected tab from the address, and this is the first
      Learning page whose address is under none of the tabs' own. Nothing is expected
      here; what shows is recorded.
- [ ] **7. The earlier tabs' links** — on the Course tab, expand a section and click a
      sequence title; on the Progress tab, click a subsection's title. Each lands on a unit
      with the stub matching, with no page load.
      *Why here:* those links landed on the stub page of #2188 until now.
- [ ] **8. The console** — DevTools, Console, reload on a unit. No errors or warnings from
      Learning's code.

### Record

Not yet run.

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
