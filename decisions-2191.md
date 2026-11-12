# Decisions — port the outline tab (#2191)

The effort's working log for #2191: what was settled and done, in order.
Each layer's own decisions are in its `decisions-<pr>.md`, embedded in
its PR.

1. **The plan is settled and posted (2026-11-12).** `plan-2191.md`,
   written and settled with Brian in one session; #2191's body was
   updated from `issue-body-outline-tab.md` in one edit and matches it.
   What was settled on the way: two layers on the running stack; the
   dates links read `useDatesTabUrl()`, with the `master` behavior filed
   as openedx/frontend-app-learning#2250 (no status line until the
   outline layer's PR exists); the goal card's flags as images under
   `widgets/assets/` (`decisions-1905.md` 40); the handouts iframe's
   three rules inline (`decisions-1905.md` 41).
   - A statement of mine to Brian was wrong and is corrected in the
     plan: "today the dates link always renders". The cases where
     `tabs` has no dates tab are a hidden Dates tab and a learner gated
     by the entrance exam, and they differ on `master`.

2. **The shared-modules layer is up as a draft: #2251 (2026-11-12).**
   Built on `bsmith/outline-shared-modules`, added to the stack above
   `bsmith/progress-entrance-exam` with `gh stack add`. Brian read the
   layer in the diff viewer (served from a commit object built off the
   working tree, on no branch) and asked about the two new alert tests,
   the placement of the four modal names under openedx/paragon#3043
   (they are function components declared in Paragon's `src/Modal/`,
   none importing react-bootstrap) and `EffortEstimate`'s class name
   (read once, by `classNames`, which gives the same string for `null`
   and absent). He took the layer as it stood. Commit `d09cf170`, whose
   tree is the tree he read. `gh stack submit --auto --remote upstream`
   pushed the branch and opened #2251 on #2249's branch; GitHub's
   stack #2248 now holds #2246, #2247, #2249 and #2251. The body was
   set from `pr-body-2251.md` in one `gh pr edit` and matches it; the
   commit's authors on GitHub are Brian and Claude. The three lower
   branches were not moved by the submit.
   - The project checkout is on `bsmith/outline-shared-modules` with
     only the local lint change uncommitted.
   - CI on #2251 has not been read here; Brian watches CI.
   - Next: the outline tab layer, `bsmith/outline-tab`, on Brian's go.

3. **#2251's two partially covered lines (Brian, from codecov,
   2026-11-12).** They are the `?? {}` after the metadata read in
   `CourseStartAlert.jsx` and `CourseStartMasqueradeBanner.jsx`. Each
   was rendered alone with no course metadata in the cache, in a
   throwaway test, to see what the fallback does:
   - The banner renders "This learner does not yet have access to this
     course. The course starts on" followed by today's date:
     `FormattedDate` formats the current time for an undefined value.
     The fallback changes the outcome, so it keeps its line and gets a
     case.
   - The alert throws either way. With the fallback the start date is
     undefined, the distance is `NaN`, and `FormattedRelativeTime`
     raises React's "Too many re-renders"; without it the destructure
     throws. The fallback only moves the throw, so it is dropped, as
     #2234 did in `Timeline` and `UpgradeToCompleteAlert` and #2246 in
     `GetCourseExitNavigation`.
   - On the working tree with both changes: the directory is at 100% of
     branches; lint clean; 39 suites, 433 passed, 7 skipped; `build`
     and `build:ci` pass. Not yet amended into the layer's commit or
     pushed; that waits for Brian's word.
