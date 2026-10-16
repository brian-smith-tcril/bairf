# Manual testing — dissolve the model-store normalized cache (#1977)

In-browser smoke test against a live backend (tutor local), agreed 2026-10-02
as minimal for this layer. Run by the user 2026-10-02.

What changed: the `models` reducer, the model-store module and the React
Query bridge are deleted; the app `QueryCache` loses its `onSuccess`. No
component read changed (no `useModel` reader existed), so no behaviour or
request change is intended anywhere. The one production code path that
changes shape is the `QueryCache`, which every query runs through.

Not exercised here: a timed-exam attempt. The exams library's `OuterExamTimer`,
`SequenceExamWrapper` and `useExamAccess` render for real in the unit suites
against the `specialExams`-only store (and threw, as expected, in a run with
no store), so the store wiring is covered there.

## Checks

| # | Page / action | Expect | Observed |
|---|---|---|---|
| 1 | Course home: outline, dates, progress, discussion, live tabs | each renders as before | passed — "everything seems fine from clicking around" |
| 2 | Courseware: open a unit, move between units and sequences | renders and navigates as before | passed — same pass |
| 3 | Browser console while clicking around | no new errors | not reported |
