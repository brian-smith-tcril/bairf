# Manual testing — the progress tab (#2190)

One section per layer of the stack. A layer's section asks only for what that layer changes
and a test cannot see, and says what each step needs beyond the page itself.

## Shared modules (#2246)

Nothing to do. No route renders these modules until the next layer.

## The progress tab layer

What needs eyes is small: the page in the real shell with real data, its styles, the
in-page links navigating inside the site, and a real browser's console. Everything that
depends on particular data (certificate states, credit, locked content, right-to-left) is
left to the suite, listed at the end with where it is tested.

### Setup

The same as for the dates tab; nothing new.

- The package's dev site on `bsmith/progress-tab`: `cd frontend-base && nvm use && npm ci &&
  npm run dev`, served at `http://apps.local.openedx.io:2000/learning/`, with tutor dev's
  `mfe` service stopped so the port is free.
- Tutor dev with `LEARNING_MICROFRONTEND_URL` pointing at
  `apps.local.openedx.io:2000/learning`, as for #2189.
- One user: a learner enrolled in the demo course, `course-v1:OpenedX+DemoX+DemoCourse`.
  No grades, staff user, faked responses or config edits are needed.

### One page, five looks

Open `http://apps.local.openedx.io:2000/learning/course/course-v1:OpenedX+DemoX+DemoCourse/progress`
as the enrolled learner and stay on it.

- [x] **1. The page and its styles** — the progress page renders inside the shell
      with the Progress tab selected. The cards have a soft shadow and no border. The
      completion chart is a ring with a percentage in the middle. The grade bar has its
      passing-grade marker.
      *Why here:* the route now loads the real page; `style.scss` gains the chart and
      grade bar partials and the three rules copied from `master`'s `index.scss`.
- [x] **2. The console** — open DevTools, Console, reload. No errors or warnings
      from Learning's code. One warning is expected and is not Learning's:
      `findDOMNode is deprecated in StrictMode`, with `RefHolder` and react-bootstrap's
      `OverlayTrigger` in its stack. react-bootstrap raises it for an overlay trigger
      whose child is a plain element, here the chart's and grade bar's `<rect>` anchors;
      openedx/paragon#3425 tracks it, and `master`, which also renders in `StrictMode`,
      has the same components.
      *Why here:* the port fixes the warnings `master` raises on this page.
- [x] **3. Two tooltips** — hover the info icon beside "Grade summary", and the one
      in the grade summary table's footer row. Each shows its tooltip.
      *Why here:* both lose their `trigger="hover"` for the default.
- [x] **4. The dates link** — under "Related links", click "Dates". The dates tab
      opens without the page reloading (the header does not flash; with Network filtered
      to **Doc**, no new entry). Go back.
      *Why here:* the in-page links are route links now; on `master` they are full page
      loads.
- [x] **5. Subsection titles and the outline link** — in "Detailed grades", the
      subsection titles read as small muted links, and a long title that wraps still
      looks right. Click one: it lands on the placeholder "courseware: not yet ported"
      with that subsection's id. Go back. Click "Course outline" in the sentence above the
      table: it lands on "outline: not yet ported". Go back.
      *Why here:* the title is a Paragon `Hyperlink` to the sequence's route.

### Only if it costs you nothing

- [x] **A staff view** (needs a staff session and a learner's user id) —
      `…/progress/<userId>` shows "Course progress for <that learner>". The suite covers
      the heading and the request; this only adds the real route.

### Checked without you

- **The lock icon with `viewBox` removed** — the icon's `<g>`, with and without the
  attribute, was rendered in headless Chrome 157 at the chart's `viewBox`: the two
  screenshots are byte-identical, lock icon in place on the segment.
- **Lint, tests and both builds** at the layer's head (`42d7c7f0`) and at its port commit
  alone (`ca1189eb`), 2026-11-11: all pass. Head: 35 suites, 402 passed, 7 skipped, 100%
  of lines. Port commit: 33 suites, 364 passed, 7 skipped, 98.31% of lines.

### Left to the suite, not asked of you

Each of these needs faked responses, a config edit or a special course to see by hand, and
has a test that asserts it:

- Certificate states, their events, and the card moving between columns:
  `ProgressTab.test.jsx`, "Certificate Status" and "Certificate status card".
- Credit requirements and the help link from the app config: "Credit Information",
  "Credit requirements".
- Locked and partly locked grades, hidden grades, overrides, droppable footnotes: "Course
  Grade", "Grade Summary", "Grade summary percentages".
- `SHOW_UNGRADED_ASSIGNMENT_PROGRESS` on and off: "Course Grade", `utils.test.ts`.
- The 404 redirect to the Django template progress page: "when the progress request 404s".
- The completion chart's segments and popovers: "Course completion",
  `ProgressTabComponents.test.tsx`.
- A right-to-left locale: "in a right-to-left locale".
- The dashboard and profile links: `shared/links.test.tsx` (#2246). They show only on a
  downloadable certificate, and the dev site declares neither role.
- No page-rule diagnostics at both progress paths: "page rules".

### Not this layer

The frame, toasts, the course bar and the access redirects were checked for #2234. The
entrance exam status is the next layer's section.

### Results

**2026-11-11, Brian, on the dev site, `bsmith/progress-tab` at `42d7c7f0`.**

- Brian ticked steps 2, 3, 4 and 5 and the optional staff view. Step 1, the page and its
  styles, is not ticked; whether it was not looked at or something looked off has not
  been said yet.
- Not recorded for step 5: whether the demo course has a subsection title long enough to
  wrap.

- Step 2: Brian saved the console of the progress page to a log; it holds 31 distinct
  entries, each once. None comes from the progress tab's own code, and none is a warning
  the port fixed (no failed prop type, no "Cannot update a component while rendering", no
  hover-only trigger warning, no `defaultProps` warning naming a Learning component).
  By source:
  - The browser and the dev tooling: five `Error with Permissions-Policy header:
    Unrecognized feature` lines, webpack-dev-server's and HMR's start-up lines, the React
    DevTools hint.
  - frontend-base: `userId 4`, printed by its `NewRelicLoggingService`; React Router's
    `v7_startTransition` future-flag warning (openedx/frontend-base#325); `defaultProps`
    warnings for `Nav`, `Navbar`, `NavbarToggle`, `NavbarCollapse`, `NavItem` and
    `NavLink`, from the shell header's `PrimaryNavLinks`.
  - Paragon and react-bootstrap, under the page's components: `defaultProps` warnings for
    `OverlayTrigger` and `Overlay` (openedx/paragon#4523) and for `PopoverContent`,
    `DataTable`, `DataTableLayout`, `Table`, `TableFooter`, `CollapsibleTrigger`,
    `CollapsibleVisible` and `CollapsibleBody` (openedx/paragon#3043), the same names the
    test setup silences; three `findDOMNode` warnings from react-bootstrap's overlay and
    its transition (openedx/paragon#3425), one of them the `RefHolder` one with `rect` in
    its stack.
  - react-helmet: `Using UNSAFE_componentWillMount in strict mode … SideEffect(NullComponent)`.
    Learning renders `Helmet` in `Main.tsx` and `tab-page/LoadedTabPage.tsx`, both from
    earlier layers, and `master`'s `LoadedTabPage` does too. Not this layer's; filed as
    openedx/frontend-base#350.

## The entrance exam layer

Written when that layer is made.
