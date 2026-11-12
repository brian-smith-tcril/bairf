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
     and `build:ci` pass. Brian: amend and push. The commit was amended to
     `47f5333b` (its message gains the sentence about the dropped
     default) and `gh stack push --remote upstream` updated the branch;
     the three lower branches kept their tips. #2251's body was set
     again from `pr-body-2251.md` and matches it; `decisions-2251.md`
     carries the change as entry 9.

4. **The outline tab layer is up as a draft: #2252 (2026-11-12).**
   Built on `bsmith/outline-tab`, added to the stack above
   `bsmith/outline-shared-modules`. The working notes of the build are
   `notes-outline-tab-layer.md`; the PR's decision log is
   `decisions-2252.md`.
   - Settled with Brian on the way: the two unused builders of
     `courseBlocks.factory.js` commented out until #2195; the handouts
     stylesheet `dropped` in the manifest (the posted plan gave it a
     line pointing at the component, which stops `port-diff`); the
     `start_course` effect's dependencies added, no suppression; the
     welcome message descriptions in Learning's words, not "course
     update"; no `!` in `SequenceTitle.tsx`; the lines the lint fixer
     left behind deleted, one of them a bare `{ }` he caught; the card
     footer line left as `master` has it; `HTMLElement` for the welcome
     message's ref, after reading #1580's history.
   - Brian read both diffs in the viewer, the port and the coverage
     cases, served from two commit objects built off the working tree,
     and took them. The two commits, `c2315c2d` and `2a1a017b`, hold
     exactly those trees.
   - `gh stack submit --auto --remote upstream` pushed the branch and
     opened #2252 on #2251's branch; GitHub's stack #2248 holds #2246,
     #2247, #2249, #2251 and #2252. The four lower branches were not
     moved. The body was set from `pr-body-2252.md` in one edit and
     matches it; the commits' authors on GitHub are Brian and Claude.
   - With two commits on the branch, `--auto` titled the PR from the
     branch name ("bsmith/outline tab"). The title was set to the
     port commit's subject in a second edit, as #2247's is.
   - Not done, each waits for Brian's word: #2191's live body (the
     `dropped` line; the mirror is one sentence ahead); #2250's status
     line naming #2252; the manual pass, which Brian runs on the draft
     (`manual-testing-2191.md`, embedded in the PR body with every box
     unticked).
   - CI on #2252 has not been read here; Brian watches CI.

5. **The outline tab layer's manual pass (2026-11-12).** Brian ran it on
   the dev site on `bsmith/outline-tab` and ticked steps 1 to 4, 7 and
   8; step 5 (the goal card's flags) was not run, and step 6 was run
   for the welcome message only. He is not running the rest, so both
   stand as gaps in the record, as do three details I asked about and
   he did not note (`manual-testing-2191.md`).
   - I asked him to run the skipped steps and to answer three follow-up
     questions before doing what I could do without him. The flags'
     image form was then compared with `master`'s inline form in
     headless Chrome, outside the app: byte-identical screenshots,
     recorded under "Checked outside the app".
   - #2252's body was set again from `pr-body-2252.md` with the record
     and matches it.

6. **#2191's and #2250's bodies updated (Brian, 2026-11-12).** #2191:
   the handouts stylesheet's manifest line reads `dropped`, the one
   sentence the mirror was ahead by. #2250: the status line, naming
   #2252 as the fix in the frontend-base version, in #2243's words.
   One edit each; each live body matches its mirror apart from a
   trailing newline.

7. **#2252's patch has 45 partial lines; codecov's patch check fails
   (Brian, from codecov, 2026-11-12).** Codecov: patch 92.88%, "37
   lines missing coverage", project 96.60%. Counted locally the way
   codecov counts a patch (`bin/patch-coverage`, new): 529 lines, none
   missed, 45 partial. Codecov's per-file reports for `OutlineTab.jsx`,
   `WeeklyLearningGoalCard.jsx` and `LmsHtmlFragment.jsx` name the same
   lines; its four "missed" lines are lines whose only coverage is a
   default value never used.
   - My miss: #2247's record counts its patch this way before the
     layer went up ("none missed or partly covered"). For this layer I
     reported line coverage only, and the PR went up with the check
     failing.
   - The 45, by kind:
     - 13 are `?? {}` after a cache read that the tab's gate never
       lets be empty. About eight only move a throw (the next
       statement destructures or reads through the result); five change
       what renders.
     - 4 are defaults never used: the three default parameters this
       port wrote in place of `defaultProps` (`LmsHtmlFragment`'s
       class name, the goal card's two props, each always passed), and
       `master`'s `courseGoals = {}` in `OutlineTab.jsx`.
     - 21 are states no case renders: a date with a linked title, a
       description, or a link that is not the upgrade link; a frame in
       a document without `dir`, and a message of another type; an
       anonymous and an enterprise learner; time zones present or
       absent in three alerts; a null `certData`; an anonymous private
       course alert; an outline without `enrollAlert`; a completed
       sequence and one without a link; an unknown proctoring status;
       changing an existing goal, and the reminder switch while
       masquerading.
     - 5 are branches no input takes, in `master`'s code: two
       `else if` in `ProctoringInfoPanel.jsx` whose condition is always
       true where they stand, and in `CertificateStatusAlert.jsx` the
       `else if` for the third of three statuses, the `default` arm's
       `if`, and `if (buttonAction)`.
     - 2 are the course blocks factory's single-block arm.
   - Not yet decided or changed; put to Brian.

8. **The partial lines, worked through (2026-11-12); on the working
   tree, not yet amended or pushed.** Brian took kinds 1 to 3 of entry
   7 and, for kind 4, ruled that `if (x) {} else if (!x) {}` becomes
   `if (x) {} else {}`. Counted again with `bin/patch-coverage` against
   the working tree: 527 lines, none missed, 4 partial.
   - Nine `?? {}` that only moved a throw are dropped: both in
     `OutlineTab.jsx` (its content component is not exported, and the
     tab renders it only with both queries loaded), and the outline
     read in the certificate, course end and scheduled content hooks,
     `CourseDates`, `StartOrResumeCourseCard`, `CourseTools` and
     `WelcomeMessage`, each of which destructures or reads through the
     result on the same or the next statement.
   - Four `?? {}` change what renders and are kept, each with a case
     that renders the component alone: the certificate hook's metadata
     read (no alert), `PrivateCourseAlert` (a welcome with no title),
     `CourseHandouts` (nothing), the goal card (it renders).
   - The two redundant `else if` in `ProctoringInfoPanel.jsx` are
     `else`.
   - `OutlineTabComponents.test.tsx`, new, ten cases, as
     `ProgressTabComponents.test.tsx` is for the progress tab: the four
     above; the three default parameters and `document`'s missing
     `dir`; and three states only a payload reaches (an unknown
     certificate status that is not failing, and a time zone in the
     certificate and course end alerts).
   - Fifteen cases added to `OutlineTab.test.jsx` for the states no
     case rendered.
   - **Found on the way:** the certificate and course end alerts never
     get the learner's time zone. Their hooks read `userTimezone` from
     the outline data, and the outline normalizer returns no such
     field; the course metadata and the response's `dates_widget` carry
     it. `master` has the same read. The two components' time zone
     branch is therefore reached only by a payload given directly, which
     is how the new cases reach it. Put to Brian.
   - Checks on the working tree: lint clean; 42 suites, 568 passed, 11
     skipped; lines 100.
   - Left, awaiting Brian: `CertificateStatusAlert.jsx` lines 84
     (`else if` for the third of three statuses) and 173
     (`if (buttonAction)`), and the factory's single-block arm (two
     lines).

   - **Line 84, Brian's ruling (2026-11-12):** "let's do the inner
     switch". `renderCertAwardedStatus`'s `if`/`else if` chain is a
     `switch (certStatus)` with the three statuses as cases and no
     `default`. Early returns would not have cleared the line: the
     instrumenter counts both sides of every `if`, and one branch per
     written `case` of a `switch` with none for "no case matched"
     (`coverSwitchCase`, `istanbul-lib-instrument/src/visitor.js`).
     Lint is clean without a `default`. The first arm's body moved in
     two spaces, which adds two spaces inside its two-line
     `defaultMessage` literal; the webpack bundle and the test
     transformer collapse that break to one space, and only the
     per-file compiled output keeps it.
   - Checks after the switch: lint clean; 42 suites, 568 passed, 11
     skipped; lines 100; patch 528 lines, none missed, 3 partial
     (`CertificateStatusAlert.jsx` 178, which is `if (buttonAction)`,
     and the factory's 11 and 17). Those three still await Brian.
