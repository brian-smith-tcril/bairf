# Manual testing — progress-tab exam attempts → React Query hook (#2075)

In-browser verification for the exam-attempts layer, run against a live
backend (tutor local). This layer claims **one user-visible change and one
contract change**: attempt requests no longer fire on the progress tab unless a
plugin asks for the data, and plugins read that data through `useExamsData()`
instead of `state.courseHome.examsData`. Nothing rendered by the app itself
changes. The acceptance test is the same `env.config.jsx` probe used to record
the Redux baseline (issue comment on #2075), with its one `useSelector` line
swapped for the hook.

## Setup (DemoX on tutor local)

Course id: `course-v1:OpenedX+DemoX+DemoCourse`; base
`http://apps.local.openedx.io:2000/learning`. Progress tab:
`/course/course-v1:OpenedX+DemoX+DemoCourse/progress`.

- DemoX has no proctored exams. Tutor local has no `EXAMS_BASE_URL`, so the
  requests go to the LMS `edx_proctoring` attempt endpoint, which answers each
  subsection with a 200 and `{"exam": {}, "active_attempt": {}}`, so every
  entry is `{}` (the api's 404 → `{}` mapping is the other route to the same
  value; a first draft attributed the 200 to edx-exams — the observed URL was
  the LMS one). To see content, apply the dev-only stub to `getExamsData`
  in `course-home/data/api.js` (kept as `exams-dev-stub.patch` in the session
  scratchpad and reproduced in the #2075 issue comment). **Never commit it.**
- Attempt requests show in the Network tab as GETs to
  `/api/edx_proctoring/v1/proctored_exam/attempt/course_id/...` (or
  `/api/v1/student/exam/attempt/...` with `EXAMS_BASE_URL`), one per
  subsection (17 on DemoX). **The stub returns before any request is made**,
  so request counts can only be checked with the stub OFF; with it on, the
  only exam-related GETs on the page are the special-exams library's own
  timer calls.

## Verify by hand

**A. No plugin (plain `env.config.jsx`, no progress-tab slot config; stub OFF):**

- [x] **Zero attempt requests** — load the progress tab: the Network tab shows
      no attempt GETs at all (baseline made 17); grades, certificate status,
      related links render as before; no console errors.

**B. Probe plugin on the Redux read (the baseline `env.config.jsx`):**

- [x] **Fails as expected** — the probe's `useSelector(state =>
      state.courseHome.examsData)` now reads `undefined`. The probe guards
      only `=== null` (the store's one pre-load value), so `.length` throws
      `TypeError: Cannot read properties of undefined (reading 'length')`.
      (Confirms the break is real and visible to a plugin author, not a
      silent no-op. A plugin guarding with `if (!examsData)` would render
      nothing instead.)

**C. Probe plugin on the hook (swap two lines):**

```jsx
import { useExamsData } from './src/course-home/progress-tab/hooks';
// ...
const examsData = useExamsData();
```

- [x] **Same six boxes, same array** — `course_completion`,
      `certificate_status_main_body`, `course_grade`, `grade_breakdown`,
      `certificate_status_side_panel`, `related_links` each show 17 entries;
      without the stub all `{}`, with the stub 17 stub exams in the same
      subsection order as the baseline capture.
- [x] **One fan-out for six readers** (stub OFF) — exactly 17 attempt GETs,
      not 6 × 17.
- [x] **`null` before load** — on a hard reload the boxes briefly show
      `null (not fetched yet)` before filling in (throttle the network if it
      is too fast to see).
- [x] **`pluginProps` unchanged** — each box still shows only `id` (plus
      `enableProgressGraph` on course completion); exam data is not in any
      slot's props.

## Left to the automated suite (not re-done by hand)

- Fan-out semantics — `apiHooks.test.tsx` (`useExamAttemptsData`): positional
  order, `{}` for a 404, `{}` + one `logError` for a 500 with the rest
  resolving, `[]` for no ids, idle until ids are known.
- Id derivation from `sectionScores`, `null` before the progress data, and
  re-fetch on a changed subsection list — `hooks.test.jsx` (`useExamsData`).
- A real configured `DIRECT_PLUGIN` reading the hook inside `ProgressTab`, and
  zero attempt requests with no plugin — `ProgressTab.test.jsx`
  (`exam attempt data for plugins`).
- The iframe `POST_EVENT` guard after `eventTypes` moved —
  `useIFrameBehavior.test.js`.

## Results

Env: tutor local, DemoX, local branch @ `cada4495` (no PR yet). Dev stub ON
for the box-content checks, OFF for the request counts (the stub returns
before any request is made).

- **C, same six boxes** — passed: identical to the baseline capture (17
  entries / 17 exams per box, same order, nested certificate slot absent,
  `pluginProps` unchanged). Recorded on the issue.
- **README example** — passed: the one-widget course-grade example renders the
  17 stub exams.
- **C, one fan-out for six readers** — passed, stub OFF: 19 exam-related GETs
  on the page = 17 attempt requests (one per subsection) + 2 special-exams
  timer calls; not 6 × 17. Each box read 17 entries / 0 exams (the LMS attempt endpoint
  answers 200 + empty `exam`, not 404 — corrected in the issue comments).
  With the stub ON there are no attempt GETs at all (the stub returns before
  the request); a first draft of the issue comment claimed 17 under the stub
  and was corrected.
- **A, zero requests with no plugin** — passed, stub OFF: with the slot
  config removed from `env.config.jsx`, only the 2 special-exams timer calls
  remain on the page; no attempt GETs.
- **B, old Redux probe fails** — passed (it fails): the dev server reports
  `TypeError: Cannot read properties of undefined (reading 'length')` from the
  probe's `examsData.length`, because the slice no longer has the field and
  the probe guarded only `=== null`. Contained per slot: behind the dev
  overlay the page renders the "Your progress" header and six copies of
  frontend-platform's error fallback ("An unexpected error occurred. Please
  click the button below to refresh the page."), one per probe slot — the
  plugin framework wraps each direct plugin in an `ErrorBoundary`
  (`PluginContainer.js`). My pre-run prediction ("boxes render 0 entries")
  was wrong: the probe never handled `undefined`.
- **C, `null` before load** — passed.
