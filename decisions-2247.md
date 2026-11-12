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
      component alone: the complete segment's dividers, and `CertificateStatus` without
      course metadata. That last state cannot occur on the page, since the frame loads
      the metadata first, but its `?? {}` changes the outcome (no card, a
      `certificate_status_disabled` event), so the line stays and gets the case.
    - Without this commit the package is still above its bar (98.31% of lines). Without
      the nineteen cases alone, the layer's patch, counted as Codecov counts it, was
      about 90%.

18. **Coverage at this layer.** 100% of lines for the package. One line of the layer's
    patch keeps a branch no test here takes: `CertificateStatus.jsx` line 108, taken
    when a learner has not passed the entrance exam, which the next layer tests.

19. **The manual pass asks only for what the layer changes and a test cannot see.** The
    page and its styles in the shell, the console, the two tooltips, the dates link, and
    the subsection titles and outline link, with one enrolled learner and no faked
    responses. States that need faked data, a config edit or a special course are left
    to the suite, and the record names the test for each. The console held nothing from
    the tab's own code; one of its third-party warnings had no issue and is now
    openedx/frontend-base#350.
