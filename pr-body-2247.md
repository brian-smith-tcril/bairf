## Summary

The Progress tab now runs in Learning's frontend-base package. At `/learning/course/:courseId/progress` a learner sees their completion, grades and certificate status, and at `…/progress/:targetUserId` staff see another learner's, inside the tab-page frame from #2234. **No user-facing change on `master`**: the legacy tree under `src/` is untouched.

Part of #1905. Part of #2190. Stacked above #2246.

> [!NOTE]
> **For reviewers:** two commits, meant to be read apart. The first is the port, with `master`'s tests adapted. The second only adds tests, for code `master`'s own suite leaves unrun. The ported files are added under `frontend-base/src/` as new files, so this diff cannot show what changed from `master`; the `port-diff` script in #2234's description prints that diff, from `frontend-base/manifest.tsv`.

## What changed

- **The progress tab.** `course-home/progress-tab/` moves to the same path under `frontend-base/src/`, and both progress routes load it lazily in place of their stubs, in the `learning-progress` chunk. Platform imports become `@openedx/frontend-base` ones; `LMS_BASE_URL` reads become `getSiteConfig().lmsBaseUrl`, and `CREDIT_HELP_LINK_URL` and `SHOW_UNGRADED_ASSIGNMENT_PROGRESS` are read from the app config (#2246 added the keys).
- **In-page links navigate inside the site.** The related links and the detailed-grades outline link render the URLs the course-tabs hooks resolve (#2246) through `getLinkProps`. A subsection title is a Paragon `Hyperlink` to `getSequenceUrl(courseId, blockKey)`; the progress response's `url` still decides whether the title is a link.
- **The seven progress slots are placeholders** that render their default content until #2185. Their READMEs and images are dropped with the plugin-framework contract they document.
- **Warnings `master` raises on this page are fixed in the components**, since the package's suite fails on console output:
  - the two grade summary overlay triggers drop `trigger="hover"` for the default of hover and focus;
  - `AssignmentTypeCell`, `CurrentGradeTooltip`, `GradeRangeTooltip` and `PassingGradeTooltip` lose their `defaultProps`, and the last two build their class list with `classNames` so an absent class name is skipped;
  - `GradeSummaryTable` sets its parent's state in an effect, not while rendering;
  - `NoticeRow`'s `message` prop type is `node`, and `GradeRangeTooltip`'s popover has an `id`.
- **Paragon's own `defaultProps` warnings** from the components this page mounts are silenced in the test setup by exact pattern, under openedx/paragon#3043.
- **Lint.** `LockedDonutSegment` drops a `viewBox` from a `<g>`, where it is not a valid attribute; one credit message gains a `description`; `eslint-disable` comments the package's lint does not know or no longer needs go.
- **Styles.** `style.scss` loads the donut chart and grade bar partials and takes the three rules of `master`'s `index.scss` that style this tab: `.greyed-out`, `.locked-overlay` and `.raised-card`.
- **Tests.** `ProgressTab.test.jsx` reaches the page through the exported route array and asserts the page rules there. Its fixtures are completed where the components' prop types require it. `hooks.test.jsx` ports whole. The second commit adds the coverage cases, `progress-tab/utils.test.ts` and `ProgressTabComponents.test.tsx`.

## Known differences from `master`

- **The outline links and subsection titles land on placeholders.** They navigate inside the site to Learning's outline and courseware routes, which are stubs until #2191 and #2195. The dates link reaches the ported dates tab.
- **Subsection titles carry Paragon's link classes.** `master`'s bare anchor has `muted-link small`; the `Hyperlink` renders those plus `pgn__hyperlink standalone-link`.
- **No masquerade banners or instructor toolbar on this page yet.** The toolbar is a stub until #2194, so six of `master`'s cases are kept as `it.skip` under that issue.
- **Plugins do not apply to the progress slots yet.** The slots are placeholders until #2185, and the two plugin cases are commented out under that issue.
- **`useExamsData` is not exported from the package index.** The index exports the app and the routes; the hook is for widgets in the progress slots, so its export is decided with #2185.
- **The dashboard and profile links show only when the site declares their roles** (#2246). They appear on a downloadable certificate.

## Testing

At the layer's head and at the port commit alone, in `frontend-base/`: lint, the tests, `build` and `build:ci` pass. Lint ran with the package's `.jsx` files included (openedx/frontend-base#327).

- **Head:** 35 suites, 403 tests passed and 7 skipped (the six named above, and the streak-celebration case kept as `it.skip` under #2201).
- **Port commit alone:** 33 suites, 364 passed, 7 skipped.

**Coverage.** The package is at 100% of lines at the head, against its 96.15% bar, and at 98.31% at the port commit alone. Counted from the local coverage report the way Codecov counts a patch, this layer adds 470 lines with none missed or partly covered. Codecov's first report on this PR listed one partial line, `CertificateStatus.jsx` line 108, whose other branch is taken when a learner has not passed the entrance exam; it has a case now (decision log entry 17).

**Manual testing** on the package's dev site against tutor dev, with one enrolled learner in the demo course: the page and its styles in the shell, the console, the two grade summary tooltips, the dates link, the subsection titles and the outline link, and a staff view of another learner's progress. The record is below.

## Decisions

What was decided while building this layer; the scope and the import and config mapping are in #2190, and the role links are decided in #2246.

<details>
<summary>Full decision log</summary>

# Decisions: the progress tab (#2247)

Decisions made while building this layer of #2190. The scope and the import and config
mapping are in #2190's plan. The role links, the course-tabs hooks and `getSequenceUrl`
are decided in #2246, the layer below.

1. **Two commits: the port, then tests that add coverage.** The port commit holds the
   tab, `master`'s tests adapted, and new cases only for what the port changes: the page
   rules, where the in-page links go, and the credit help link read from the app config.
   The second commit holds tests for code `master`'s own suite leaves unrun (entry 17).
   Kept apart so the port's diff shows only what the port changes. Both are squashed on
   merge.

2. **The in-page links navigate inside the site, and two of them land on placeholders
   for now.** The related links and the detailed-grades outline link render the URLs the
   course-tabs hooks resolve (#2246) through `getLinkProps`, so a click is a client-side
   navigation where `master` loads a page. The dates link reaches the ported dates tab.
   The outline links reach the outline placeholder until #2191, and the subsection titles
   the courseware placeholder until #2195.

3. **A subsection title is a Paragon `Hyperlink` to `getSequenceUrl(courseId, blockKey)`.**
   `master` renders a bare `<a href>` to the `jump_to` URL in the progress response. The
   response's `url` still decides whether the title is a link, since the progress
   serializer withholds it for a subsection a learner may no longer open.
   - A first version kept the bare anchor and picked its element by hand from
     `getLinkProps`, with an `'a'` fallback that never ran. Every other navigating link
     of the tab is a `Hyperlink` on `master`, so the title is one too:
     `variant="muted"` and `className="small"` give `master`'s `muted-link small`
     classes, beside Paragon's own.
   - `Hyperlink` is `display: inline-flex`; a long title edited into the page wraps fine
     (manual pass).

4. **The seven progress slots are placeholders until #2185.** Each keeps its file and
   component name and renders its default content with no plugin-framework import.
   `ProgressCertificateStatusSlot` passed plugins `courseId` and
   `ProgressTabCourseCompletionSlot` passed `enableProgressGraph`; the other five passed
   nothing. `enableProgressGraph` stays a prop, since it also gates the chart, and the
   main-body and side-panel slots keep their window-width gates. Their READMEs and
   images get `dropped` manifest lines: they document the plugin-framework contract.

5. **Four components lose their `defaultProps` and get no defaults in their place.** React
   warns about `defaultProps` on a function component. Default parameters were the first
   replacement, and every caller in the tab passes these props, so each default needed a
   standalone test to be reached.
   - Removing all four defaults and running those tests showed two of them could not
     fail. `CurrentGradeTooltip` hands `className={tooltipClassName}` straight on, and
     `AssignmentTypeCell` only tests `footnoteId`, `footnoteMarker` and `locked` for
     truthiness, so an absent value behaves as the old default did.
   - `PassingGradeTooltip` and `GradeRangeTooltip` wrote the class name into a template
     string, where an absent one reads `undefined`. They build the class list with
     `classNames`, already a dependency, which skips it. The rendered classes are
     `master`'s.

6. **The two grade summary overlay triggers drop `trigger="hover"`.** react-bootstrap
   warns that a hover-only trigger shuts out keyboard and touch users, and with
   `master`'s value nine grade summary cases fail on it. The default of Paragon's
   `OverlayTrigger` is `['hover', 'focus']`, so the prop goes.
   - Both lines came in with #1558, which replaced a click-triggered `IconButton` popover
     in the header with a hover `Tooltip` on a bare `Icon`; its description and review
     give no reason for hover-only.
   - A bare `Icon` cannot take keyboard focus, so the tooltips still open on hover only.
     Making them keyboard-reachable is a component change, not part of the port.

7. **`GradeSummaryTable` changes only where it set its parent's state.** `master` calls
   `setAllOfSomeAssignmentTypeIsLocked(true)` from a helper that runs while the table
   renders (since #561), and React reports "Cannot update a component (`GradeSummary`)
   while rendering a different component (`GradeSummaryTable`)"; with `master`'s
   component, `master`'s own "renders limited feature preview with upgrade button…" case
   fails on it. The helper keeps its shape: that line sets a local variable, and an
   effect after the rows are built passes it to the parent. As on `master`, the flag is
   only ever set to `true`. A version that made the helper pure and rediscovered its
   answer from the rows was a partial cleanup of the file and was not kept.

8. **Two prop types are corrected.** `NoticeRow`'s `message` is `node`, not `string`:
   `CourseGradeFooter` passes it an element (wrong since #1797 added the component).
   `GradeRangeTooltip`'s `Popover` gets an `id`, `grade-range-tooltip`, which Paragon's
   `Popover` requires and the tab's six other popovers have.

9. **One more pattern of Paragon warnings is silenced, under openedx/paragon#3043.** The
   tab mounts Paragon components that still set `defaultProps` on a function component:
   `Collapsible`'s parts, `DataTable`'s parts and `PopoverContent`. Each name was checked
   against where its `defaultProps` is set: all are in Paragon's own source, so they sit
   under #3043, and the react-bootstrap pattern under openedx/paragon#4523 is untouched.
   A browser console on the page shows exactly these names.

10. **Lint.**
    - `LockedDonutSegment` drops `viewBox` from the lock icon's `<g>`
      (`react/no-unknown-property`: the attribute is only allowed on `marker`, `pattern`,
      `svg`, `symbol` and `view`). It has been there since the chart's first commit
      (#407). Rendered with and without it in headless Chrome, the icon is
      byte-identical.
    - `credit-information/messages.ts`'s `minimumGrade` gains the `description` the
      package's lint requires, written for translators.
    - `eslint-disable` comments go where the package's lint does not know the rule
      (`import/prefer-default-export` in `utils.ts`, an error) or no longer reports it
      (four `react/prop-types` ones in `GradeSummaryTable.jsx`, flagged as unused).
    - Re-indented lines are the autofixer's (`@stylistic/indent`,
      `@stylistic/indent-binary-ops`).

11. **Styles.** `style.scss` loads the donut chart and grade bar partials, both ported
    unchanged, and takes the three rules of `master`'s `src/index.scss` that style this
    tab and sit in no partial, copied as they are: `.greyed-out`, `.locked-overlay` and
    `.raised-card`.

12. **The README and the exams hook.** The progress README ports with its plugin example
    replaced by a line pointing at #2185, which writes the widget example. `useExamsData`
    ports with its test and is not exported from the package index: the index exports
    the app and the routes, and the hook is for widgets in the progress slots, so the
    export is decided with #2185.

13. **`master`'s suite reaches the page through the route array.** `fetchAndRender`
    renders the exported routes at `/learning/course/<id>/progress`, waits for the page's
    level-one heading and then for loading to end; a `beforeAll` imports the tab's
    module, since the lazy route's first load can outlast a `findBy`. The
    `courseware-search/hooks` mock and `logUnhandledRequests` go: the first had no reader
    left after #2234, and under the request mock an unanswered request now rejects,
    which is the better signal. The two stub cases for the progress paths leave
    `routes.test.tsx`, and their page-rule check runs in the progress test.

14. **Fixtures are completed in two places.** `SubsectionTitleCell` requires `blockKey`,
    `learnerHasAccess` and `problemScores`, and a prop-type warning fails the suite.
    - The factory's second subsection gains a `block_key` (made up, on the first one's
      pattern) and `learner_has_access: false`. `false`, because two `api.test.js` cases
      for the locked-grades logic rely on it being falsy, as it was when absent.
    - The subsections `master`'s cases write out stay as they are: the test's
      `setTabData` helper gives each a `block_key` and an empty `problem_scores` when
      the case leaves them out. Adding the fields to each fixture made 12 one-line hunks
      across the file.

15. **A case about a click handler stops the navigation; where a link goes has its own
    case.** With route links and the real route array, clicking the dates, outline or
    subsection link in `master`'s four "sends event on click" cases navigates, and the
    case ends mid-navigation on React's `act` warning. Those cases keep `master`'s bodies
    plus `preventNavigation(link)`, which cancels the click's default action; the event
    handler still runs. Destinations are asserted in "Related links and subsection
    titles": the hrefs, and one case that follows the dates link to the dates tab.

16. **Cases kept but not run.** Five masquerade-banner cases and the "with the instructor
    toolbar mounted" request-count case are `it.skip` under #2194's URL: they need the
    real toolbar. The two "exam attempt data for plugins" cases mount a plugin through
    the plugin framework and cannot compile without it; they sit in a block comment
    under #2185's URL.

17. **The coverage commit.** `master`'s progress tests never run 24 lines of the tab's
    files and leave a branch untaken on about 45 more (its coverage report of
    2026-10-29). The package holds what it ports to tests beside it.
    - Each new case in `ProgressTab.test.jsx` was measured by rerunning the suites that
      load the tab with that one case left out and comparing coverage. Nineteen are the
      only test of some line or branch and are in this commit: the Studio link for an
      administrator; the chart's popovers, all-complete and none-complete forms and thin
      locked segment; practice scores; the credit eligibility and requirement statuses;
      four grade summary cases; the tooltip closing on blur; four certificate states;
      two right-to-left cases.
    - Nine added no coverage and asserted behaviour the port does not change; they were
      dropped.
    - `utils.test.ts` is new, for `showUngradedAssignments` and
      `getLatestDueDateInFuture`. `ProgressTabComponents.test.tsx` is new and renders one
      component alone: the complete segment's dividers, and two `CertificateStatus`
      cases. Without course metadata: that state cannot occur on the page, since the
      frame loads the metadata first, but its `?? {}` changes the outcome (no card, a
      `certificate_status_disabled` event), so the line stays and gets the case. For a
      learner who has not passed the entrance exam: nothing on the tab loads that result
      in this layer (#2243), so the case mocks the courseware hook; Codecov's first
      report on this PR listed that branch of `CertificateStatus.jsx` line 108 as the
      patch's one partial line.
    - Without this commit the package is still above its bar (98.31% of lines). Without
      the nineteen cases alone, the layer's patch, counted as Codecov counts it, was
      about 90%.

18. **Coverage at this layer.** 100% of lines for the package, and no line of the layer's
    patch is missed or partly covered.

19. **The manual pass asks only for what the layer changes and a test cannot see.** The
    page and its styles in the shell, the console, the two tooltips, the dates link, and
    the subsection titles and outline link, with one enrolled learner and no faked
    responses. States that need faked data, a config edit or a special course are left
    to the suite, and the record names the test for each. The console held nothing from
    the tab's own code; one of its third-party warnings had no issue and is now
    openedx/frontend-base#350.

</details>

<details>
<summary>Manual testing</summary>

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

### Optional

- [x] **A staff view** (needs a staff session and a learner's user id) —
      `…/progress/<userId>` shows "Course progress for <that learner>". The suite covers
      the heading and the request; this only adds the real route.

### Checked outside the app

- **The lock icon with `viewBox` removed** — the icon's `<g>`, with and without the
  attribute, was rendered in headless Chrome 157 at the chart's `viewBox`: the two
  screenshots are byte-identical, lock icon in place on the segment.
- **Lint, tests and both builds** at the layer's head and at its port commit alone
  (`ca1189eb`), 2026-11-11: all pass. Head: 35 suites, 402 passed, 7 skipped, 100% of
  lines. Port commit: 33 suites, 364 passed, 7 skipped, 98.31% of lines. One test case
  was added to the head afterwards (`bf89cde5`: 403 passed), with lint, the suite and
  `build:ci` rerun.

### Left to the suite

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

**2026-11-11, Brian, on the dev site, on `bsmith/progress-tab`.** The pass ran on the
layer's code as it stands at `bf89cde5`, before one test case was added and a commit
message rewritten; no component changed since.

- Brian ticked all five steps and the optional staff view.
- Step 5, wrapping: Brian edited a subsection title's text in the page to be long, and it
  wrapped fine. The demo course's own titles were not what was tested for this.

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

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
