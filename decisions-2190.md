# Decisions — port the progress tab (#2190)

Decisions made while implementing. The scope, the import and config
mapping, the role links, the entrance exam fix and the test changes are
in #2190's plan and are not repeated.

1. **Findings before the first commit (2026-11-10).** Read on `master` at
   `363bc1e4`, with the package at `c78935cc`:
   - `GetCourseExitNavigation` throws without courseware metadata. Its
     first statement destructures `entranceExamData: { entranceExamPassed }`
     from `useCoursewareMetadata(courseId, { enabled: false }).data ?? {}`,
     and the nested pattern reads a property of `undefined` when the data
     is missing. `master` calls it only from the unit navigation, under
     the courseware container that loaded the query. The plan's test case
     for it, "no courseware data: inactive, default text", describes a
     result the function cannot return, so the case is not written in
     the shared-modules commit, where both courseware hooks are stubs
     returning no data.
   - Three rules of `master`'s `src/index.scss` style the progress tab
     and are in no partial: `.greyed-out` (a subsection title without a
     link), `.locked-overlay` with its `.grades` variant (the grade
     breakdown of a fully locked course: dimmed, `pointer-events: none`,
     capped height) and `.raised-card` (the completion, certificate,
     grade and breakdown cards). The plan's Styles line names only the
     two partials.
   - Four components set `defaultProps` on a function component
     (`AssignmentTypeCell`, `CurrentGradeTooltip`, `GradeRangeTooltip`,
     `PassingGradeTooltip`), which React 18.3 warns about and the
     package's console hook fails on, as it did for the dates tab's
     `Day` and `UpgradeToCompleteAlert`.
