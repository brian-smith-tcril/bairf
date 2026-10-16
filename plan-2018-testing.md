# #2018 — test baseline before any code changes

Companion to `plan-2018.md`. Scope: learner-facing behaviour of
`@edx/frontend-lib-special-exams` as rendered by learning. Everything here is
from reading the library at v4.1.0 and learning at the top of the running
stack, plus one verification run of `Sequence.test.jsx` (2026-10-05).

## 1. Can we mock around the installed library? Yes, at the HTTP boundary.

**Mechanism.** The library's only I/O is `getAuthenticatedHttpClient()` from
`@edx/frontend-platform/auth`, plus `getConfig()` for URLs. frontend-platform
is a peer of the library and `node_modules` holds one copy, so the library
resolves the same module learning does. `AxiosJwtAuthService` creates one
axios instance in its constructor and `getAuthenticatedHttpClient()` returns
that instance (the `useCache` variant is a second instance the library never
asks for). Anything attached to that instance sees the library's requests.
Learning's test setup already attaches `axios-mock-adapter` to it
(`src/setupTest.js:169`), which is how the library's requests reach the
catch-all today (section 3). No module aliasing, no `jest.mock` of library
internals, no webpack config.

**What HTTP mocking covers:** every exam, attempt, poll, settings, review
policy and access-token call, for both backends (`EXAMS_BASE_URL` set →
edx-exams URLs; unset → `LMS_BASE_URL/api/edx_proctoring/...`). The backend
is chosen by config, so one env toggle switches which URL family to stub.

**What it does not cover (non-HTTP side effects):**

- The proctoring desktop app **Web Worker**: `attempt.desktop_application_js_url`
  is loaded with `importScripts` into a `new Worker(blobUrl)`; start, submit
  and ping post messages to it and wait for `examAttemptStarted` /
  `examAttemptEnded` / `echo`. Stubbing it needs a tiny served worker script
  that echoes those message types (or `desktop_application_js_url: ''`,
  which takes the no-worker branch).
- The **LTI / Proctorio window messages**: `checkAppStatus` posts
  `['proctorio_status']` to `window.top` and waits for a reply from
  `EXAMS_BASE_URL`'s origin; `notifyStartExam` posts
  `['exam_state_change','exam_take']`. These only matter for LTI proctored
  exams in a proctored status; a baseline can treat them as out of scope or
  stub `window.top.postMessage` in Jest.
- `window.location.href = exam_url_path` on stop/submit from another
  sequence: assert the assignment, don't follow it.

**For manual testing in the browser**, three ways, by how much they can do:

1. *Chrome DevTools response overrides, no code.* Network → right-click →
   "Override content". The library's requests are ordinary XHRs, so this
   works. Static per URL, so it suits single-state checks (`rejected`,
   `passed_due_date`, a 500) but not the stateful flow where a POST must
   change what the next GET returns.
2. *An in-page stateful mock, a local uncommitted edit to learning
   (recommended for the matrix).* Attach `new MockAdapter(
   getAuthenticatedHttpClient(), { onNoMatch: 'passthrough' })` in the
   `APP_READY` handler in `src/index.jsx`, before the first render; the
   library calls `getAuthenticatedHttpClient()` per request, so it gets the
   wrapped instance. The mock holds a small state machine: the exam GET
   returns the current attempt; POST creates one (`started`, or `created`
   for proctored); each PUT applies its `action`; the poll GET returns the
   current status and a decreasing `time_remaining_seconds`. A `localStorage`
   key selects the scenario. Both backends by flipping `EXAMS_BASE_URL` in
   `env.config.jsx`. Same shape as the #2075 dev stub, moved from learning's
   `api.js` to the shared client so the installed library is untouched.
3. *A standalone mock edx-exams server* at `EXAMS_BASE_URL`: no app changes,
   stateful, the only way to run the edx-exams branch against something
   service-shaped; needs CORS with credentials and to ignore the JWT. Not
   needed for this baseline.

What the mock must simulate (it is the whole backend from the library's
view): the exam-for-sequence GET (`exam`, `active_attempt`); the
latest-attempt GET for the outer timer; POST create attempt; PUT with
`action` ∈ `start | stop | submit | reset_attempt | decline |
click_download_software | error`, each a transition; the poll GET every 60s;
proctoring settings, review policy and access token GETs for the proctored
and edx-exams scenarios. Keep `desktop_application_js_url` empty so the
no-worker branches run.

## 2. What the library's own suite covers

324 `it` blocks in 32 files. Two kinds:

- **Component tests seed the Redux store** (`initializeTestStore(preloaded
  State)` in `setupTest.js`) and render a component, asserting what the
  learner sees for that state. Every instruction, timer and wrapper test
  works this way. None of them mock HTTP; none drive state through the
  thunks.
- **`data/redux.test.jsx`** (109 HTTP handlers) drives each thunk against
  `axios-mock-adapter` and asserts the resulting slice, for both backends
  and the `use_legacy_attempt_api` variants.

No test goes HTTP → rendered UI. The component tests are therefore coupled to
the slice shape and are rewritten wholesale in v5; the data-layer tests'
fixtures and URL expectations are the reusable part.

Learner-facing coverage, by state (from the titles; `Instructions.test.jsx`,
`ProctoredExamInstructions.test.jsx`, `Exam.test.jsx`, `ExamWrapper.test.jsx`,
`CountDownTimer.test.jsx`, `TimerProvider.test.jsx`, `OuterExamTimer.test.jsx`):

| Area | Covered |
|---|---|
| Entrance | timed, proctored (incl. `attempt_ready_to_resume`, skip button gated on `allowProctoringOptOut`), practice, onboarding (email variants) |
| Prerequisites | failed, pending, the `are_prerequisites_satisifed` typo path |
| Download / system check | LTI (support email/phone/URL variants, launch in new window), legacy REST, RPNow; `created` and `download_software_clicked` |
| Ready to start | with and without `total_time`; review-policy fetch |
| Started | content shown, instructions hidden |
| Ready to submit | per type; continue button hidden at 00:00 and on `TIMER_REACHED_NULL`; LTI submit launch |
| Submitted | per type; timed exam past due with `hide_after_due` false shows content; `second_review_required`; the `timeIsOver` title variant (slot) |
| Verified / rejected / error | per type, footer rules |
| Expired | shown when past due with no complete attempt; not for practice |
| Unknown status | error page |
| Timer | low and critical thresholds, show/hide, show more/less, End My Exam → stop (before 00:00) vs submit (after), remaining-time correction from poll, poll every 60s, ping at half interval then every interval, `TIMER_LIMIT_REACHED` after the 5s grace |
| Outer timer | shows when an attempt is started; null when unauthenticated; API error alert |
| Wrapper / access | spinner while loading; staff bypass; masquerade alert rules (timed past due + `hide_after_due`); gated content bypass; proctored access denied when `canAccessProctoredExams` is false; timed exams unaffected |
| API error | default message, support link, HTML-bearing message suppressed |
| Data layer | every thunk, both backends, legacy flag, worker failure, LTI start notification, poll ended-in-error refresh, ping failure → error state, access token (not fetched without `EXAMS_BASE_URL`), `checkExamEntry` gating |

## 3. What learning's suite covers: nothing learner-facing, and the library runs into an error

- `Course.test.jsx` replaces the default export with a div that renders its
  children. `useExamAccess.test.jsx` replaces the three hooks. `urls.test.ts`
  asserts the `exam_access` query param from given inputs. No learning test
  renders an exam sequence (`is_time_limited: true` appears in no fixture; the
  factory default is `false`).
- Tests that pass a real store (`Sequence.test.jsx`, `Unit/index.test.jsx`,
  `CoursewareContainer.test.jsx`, the tab tests, …) do mount the real
  library. `.env.test` sets `EXAMS_BASE_URL='http://localhost:18740'`, so the
  library requests the edx-exams URL. **Observed** in the `Sequence.test.jsx`
  run: `get http://localhost:18740/api/v1/student/exam/attempt/course_id/
  …/content_id/…` logged by `logUnhandledRequests`, i.e. no handler matched
  and the catch-all answered `[200, {}]`.
- **From code:** the handler `mockCourseRequests` registers for exams
  (`setupTest.js:220`) is on `LMS_BASE_URL` with the edx-exams path shape and
  `sequenceMetadata.item_id`, where `sequenceMetadata` is the array being
  iterated, so the URL ends in `content_id/undefined`. It can match neither
  backend's request. With `{}` back, `fetchExamAttemptsData` evaluates
  `data.exam.total_time` on `undefined` and throws; `updateAttemptAfter`
  catches it into `apiErrorMsg`. `Exam` shows that error only when
  `isTimeLimited`, so the suite is green with the library in a swallowed
  TypeError on every sequence render.

Consequence: today learning has **zero** assertions on exam behaviour it
would notice breaking in v5, and one latent test-setup bug to fix before the
baseline means anything.

## 4. Baseline to build (learning repo, against installed v4.1.0)

HTTP-boundary tests that render learning's real trees with the real library
and assert what the learner sees. They are the regression net for v5: on the
upgrade only the provider mount in the test wrapper changes.

**Setup fixes first**

- `mockCourseRequests`: register the exam handler for the configured backend
  with the real URL (edx-exams: `${EXAMS_BASE_URL}/api/v1/student/exam/attempt/
  course_id/${courseId}/content_id/${sequenceId}` plus
  `${EXAMS_BASE_URL}/api/v1/exams/attempt/latest`; edx-proctoring:
  `${LMS_BASE_URL}/api/edx_proctoring/v1/proctored_exam/attempt/course_id/
  ${courseId}?content_id=${sequenceId}&is_learning_mfe=true`), default payload
  `{ exam: {}, active_attempt: {} }` as intended. Add an `exam` option to
  supply a payload per sequence.
- Fixtures: add `is_time_limited` to the sequence factory options and port
  the library's `exam`, `attempt`, `proctoringSettings`, `examAccessToken`
  factory shapes (section 5) into learning's `__factories__`.

**Scenarios** (each: render `Sequence` or `Unit` with `is_time_limited: true`,
mocked exam payload → assert; one file, `special-exams.test.jsx` or similar,
by state):

| # | State (payload) | Learner sees |
|---|---|---|
| T1 | timed, no attempt | entrance instructions with time limit; unit content not rendered |
| T2 | T1 → click start (POST attempt 200; refetch returns `started` attempt) | content rendered; timer block with exam name, End My Exam, countdown |
| T3 | `started`, `time_remaining_seconds` low / critical | alert variant warning / danger |
| T4 | T2 → End My Exam (PUT stop; refetch `ready_to_submit`) | submit instructions with continue button; timer stays, End button gone |
| T5 | `ready_to_submit` → continue (PUT start; refetch `started`) | content again |
| T6 | `ready_to_submit` → submit (PUT submit; refetch `submitted`) | "You have submitted your timed exam." |
| T7 | `submitted`, `passed_due_date`, `hide_after_due: false` | content rendered, no submitted page |
| T8 | `passed_due_date`, no attempt | expired page |
| T9 | `started` on a *different* sequence than the active attempt (`exam.attempt.attempt_id` ≠ `active_attempt.attempt_id`) → End My Exam | PUT stop then `window.location.href` set to `exam_url_path` |
| T10 | timer reaches 00:00 then grace → `TIMER_LIMIT_REACHED` | submit POST, `timeIsOver` title "The time allotted for this exam has expired…" |
| P1 | proctored, no attempt, prerequisites satisfied | proctored entrance; skip button only when `allow_proctoring_opt_out` (learning-side only: the LMS sequence metadata never sends that key, so in the app the button is unreachable; see `manual-testing-2018.md` B12) |
| P2 | proctored, prerequisites failed / pending | prerequisites page |
| P3 | `created` (LTI, `use_legacy_attempt_api: false`) | download / system-check instructions with provider contacts from settings |
| P4 | `ready_to_start` | ready-to-start instructions; review policy fetched |
| P5 | `submitted` / `second_review_required` / `verified` / `rejected` / `error` | per-type instructions |
| P6 | `canAccessProctoredExams: false` | access denied message |
| O1 | onboarding / practice entrance and submitted/error | per-type instructions and emails |
| A1 | `started`, `EXAMS_BASE_URL` set | unit iframe URL carries `exam_access=<token>` once the token GET resolves; blocked before |
| A2 | `started`, no `EXAMS_BASE_URL` | no token request; iframe not blocked |
| A3 | token GET fails | iframe unblocked, no token, `logError` |
| S1 | staff (`isStaff`) | content, no instructions |
| S2 | `originalUserIsStaff`, timed, attempt not started | masquerade "hidden from the learner" alert |
| S3 | unauthenticated | content, no library requests |
| G1 | gated sequence, timed | content path (no instructions) |
| E1 | exam GET 500 | API error alert on the exam sequence; none on a non-exam sequence |
| H1 | `TabWithTimer` with a `started` latest attempt | outer timer on the course-home tab |
| H2 | `TabWithTimer`, no attempt | nothing |
| H3 | `TabWithTimer`, latest-attempt GET 500 | API error alert |
| N1 | `is_time_limited: false` | exactly one exam GET per sequence (or none after the first, today's `isLoading` rule); no instructions ever |

Added after the manual run (2026-10-06), so that every section-B observation
in `manual-testing-2018.md` has a named automated scenario:

| # | State (payload) | Learner sees | Manual row |
|---|---|---|---|
| P3a | `created`, LTI, settings with a support URL | download page, URL contact sentence (URL preferred over email + phone) | B1 |
| P3b | `created`, LTI, settings without a URL | email + phone contact sentence | B1a |
| P3c | `created`, LTI → Start System Check | poll GET, PUT `click_download_software`, `window.location.assign(EXAMS_BASE_URL + '/lti/start_proctoring/{id}')` (assert the assignment) | B1b |
| P3d | `created` → Start Exam while poll ≠ `ready_to_start` | poll GET, no PUT, "You must complete the proctoring setup before you can start the exam." | B1c |
| P3e | `created`, legacy REST provider with `instructions` | the step list, email + phone sentence | B2 |
| P3f | legacy → Start System Check | poll, PUT, `location.assign(software_download_url)` | B2a |
| P3g | `download_software_clicked` | download page, no skip button | B3 |
| P4a | `ready_to_start`, LTI, no `postMessage` reply | after 5 s (fake timers): "Proctoring application not detected" alert, PUT `error`, error instructions with the escalation email | B4a |
| P4b | `ready_to_start`, legacy → Start Exam | PUT `start`, refetch `started`, content + timer banner | B4b |
| P4c | `ready_to_start`, LTI, `postMessage` reply `{active: true}` from the `EXAMS_BASE_URL` origin | page stays, no PUT `error` | C7 |
| P5a | `ready_to_submit`, proctored | proctored submit page, continue button (hidden at `time_remaining_seconds: 0`); timer banner without End button | B5 |
| P5b | `submitted` / `second_review_required`, proctored | submitted-for-review page | B6 |
| P5c | `verified` × proctored / practice / onboarding | per-type page; onboarding shows `integration_specific_email` | B7 |
| P5d | `rejected` × three types | per-type page; proctored has the course-team footer line, practice does not, onboarding offers retry | B8 |
| P5e | `error` × three types; click retry on practice / onboarding | per-type page; PUT `reset_attempt`, refetch with no attempt → that type's entrance | B9 |
| P5f | onboarding statuses × 4 on a proctored exam | onboarding error page; `missing` and `expired` share a body | B10 |
| P7 | `attempt_status: 'nonsense'` | unknown-status error page | B13 |
| E1a | exam GET 500 | alert heading is the error's `message` verbatim (assert the current raw-text behaviour, so v5 changing it is a deliberate choice) | B14 |
| T7a | past due, no attempt, `type: 'practice'` | entrance, not expired | B15 |
| T7b | past due, `submitted`, proctored, `hide_after_due: false` | submitted page (content rule is timed-only) | B16 |
| P6 | audit learner (`can_access_proctored_exams: false` in course metadata) | access denied | B0 |

P1's opt-out half is the only row that cannot be reached in the app today
(the LMS never sends the flag, #2162); it is asserted with mocked sequence
metadata as a learning-side unit.

Two of these (T10's grace timing, the poll cadence) and P4a's 5 s race need
fake timers; the library's `TimerProvider.test.jsx` shows the pattern. Jest
renders without `StrictMode`, so request counts in tests are the single
fetches, not the dev-mode doubles the manual run saw.

## 5. Manual testing: states, real backend setup, mock payloads

edx-proctoring is installed on every tutor: it is a pinned edx-platform
requirement and a plugin app that mounts its URLs under `api/` in the LMS
unconditionally (hence the 200 with an empty exam seen in the #2075 run).
Tutor local has no `EXAMS_BASE_URL`, so a real backend run exercises only the
edx-proctoring path; edx-exams needs a running service, so mock it.

What is off by default is `settings.ENABLE_SPECIAL_EXAMS` (edx-platform
default false, never set by tutor). It gates exam *registration* on publish
(`register_special_exams` exits early), not the API, so a "Timed" subsection
on stock tutor is never registered and the library sees `exam: {}`. One
tutor plugin patch on `openedx-common-settings` with
`ENABLE_SPECIAL_EXAMS = True` fixes that; then the course advanced setting
"Enable Timed Exams" (the Studio subsection dialog's Timed option is disabled
until it is on) and the subsection's Configure → Advanced → Timed with a time
allotted, published. No proctoring software is involved in timed exams; the
full list is in `manual-testing-2018.md` Setup. edx-proctoring also ships a `null` backend as the default
`PROCTORING_BACKENDS` entry, so proctored attempts could be created without
third-party software, but review and LTI states still need instructor
actions or edx-exams, so everything proctored is mocked here.

**Real backend, what each state needs (gating read from edx-platform
source; the Studio steps are from knowledge, confirm on first use):**

| State | Setup |
|---|---|
| Timed exam, entrance → started → submitted | `ENABLE_SPECIAL_EXAMS = True` (tutor settings patch) + course advanced setting "Enable Timed Exams"; Studio: subsection → Advanced → "Timed", time limit; publish. Learner walks it. Fully real on tutor. |
| Timed, due date passed (`expired`, `hide_after_due`) | subsection due date in the past; "Show entire section" vs "Hide" after due in the same dialog |
| `ready_to_submit` from another sequence | start a timed exam, navigate to another sequence, use the outer timer's End My Exam |
| Proctored / practice / onboarding | the flag above + `enable_proctored_exams: true`; edx-proctoring's default `null` backend needs no software; subsection "Proctored" / "Practice proctored" / "Onboarding". Mocked here anyway (review and LTI states are not reachable). |
| `verified` / `rejected` / `second_review_required` | instructor dashboard → Special Exams → review, or the provider's review callback |
| prerequisites failed / pending | credit requirements / onboarding prerequisite on the course |
| access token (`exam_access` param) | edx-exams + LTI provider; not reachable on tutor |

**Mocked (browser), via the in-page stateful mock from section 1, option 2:**
one handler set per scenario in the table above, payloads from the library's
factories:

- `exam`: `{ id, exam_name, course_id, content_id, time_limit_mins,
  total_time, is_proctored, is_practice_exam, type, due_date,
  passed_due_date, hide_after_due, prerequisite_status, attempt, backend }`
- `attempt`: `{ attempt_id, attempt_status, exam_type, exam_display_name,
  exam_url_path, time_remaining_seconds, course_id, exam_started_poll_url,
  desktop_application_js_url, attempt_code, software_download_url,
  use_legacy_attempt_api, external_id, ping_interval }`
- `proctoringSettings`: `{ exam_proctoring_backend: { download_url,
  instructions, name, rules }, provider_name, provider_tech_support_*,
  learner_notification_from_email, integration_specific_email }`
- `examAccessToken`: `{ exam_access_token, exam_access_token_expiration }`

What to watch per run, learner-facing only: which instructions page, whether
unit content is visible, timer presence/variant/countdown, End My Exam
behaviour, the outer timer on course-home tabs, the iframe `exam_access`
param, and the network panel for the request sequence (GET exam → POST/PUT
action → GET exam; poll every 60s). Record observed results in
`manual-testing-2018.md`, observed only.

## 6. Order

1. Fix the `mockCourseRequests` exam handler (section 3) and add the
   fixtures; land as a small test-hygiene layer on the stack (its own issue,
   like #2100 / #2107).
2. Write the section-4 baseline tests against v4.1.0; green on the stack.
3. The in-page stateful mock (section 1, option 2); run the section-5 matrix on tutor,
   real timed exam first, then mocked states; write `manual-testing-2018.md`.
4. Only then start the library layers in `plan-2018.md`; rerun 2 and 3 on
   each v5 prerelease.

## Layer 1 plan: the baseline tests (#2163, branch `bsmith/special-exams-baseline-tests`)

The first layer of the #2018 stack on `master`. One commit, `test:`. Green
against the installed library 4.1.0; the net the v5 swap (layer 2) is then
checked against. Nothing here changes app code.

### How the test infrastructure works today (what the layer builds on)

- `mockCourseRequests(options)` in `src/setupTest.js` attaches
  `axios-mock-adapter` to the shared authenticated client, registers the
  course page's requests from `buildSimpleCourseAndSequenceMetadata(options)`,
  and ends with `logUnhandledRequests`, a catch-all that logs and answers
  `[200, {}]`. Its exam handler (line 220) is on `LMS_BASE_URL` with the
  edx-exams path shape and `content_id/undefined`, so it never matches; the
  library's request falls to the catch-all. `.env.test` sets
  `EXAMS_BASE_URL='http://localhost:18740'`, so the library takes the
  edx-exams branch in tests by default.
- `buildSimpleCourseAndSequenceMetadata` takes `courseMetadata`,
  `sequenceMetadata`, `courseHomeMetadata` overrides (whole arrays / objects)
  and block options; `Factory.build('sequenceMetadata', { is_time_limited:
  true }, { courseId, unitBlocks, sequenceBlock })` works today since attrs
  override at build. The `courseMetadata` factory defines no `is_staff`,
  `original_user_is_staff` or `can_access_proctored_exams`; the normalizer
  reads them as `undefined`, and the library's `ExamWrapper` defaults
  `isStaff` / `originalUserIsStaff` to false and `canAccessProctoredExams` to
  true, so today's tests are "learner with proctoring access" by accident.
- `Sequence.test.jsx` renders `<Sequence>` at its course route inside
  `SidebarProvider` + `MountCourseQueryHooks` with `{ store }` passed to
  `render`, which is what reaches the real library. `Unit/index.test.jsx`
  does the same for `<Unit>`.
- The library ships its Rosie factories in `dist/data/__factories__/`
  (`exam`, `attempt`, `proctoringSettings`, `examAccessToken`,
  `specialExams`), registered on the shared `rosie` `Factory` when the index
  is required; none of those names collide with learning's sixteen
  factories. `rosie` is a learning devDependency.
- The test auth service's client is a plain `axios.create()` with no
  frontend-platform error interceptor, so a mocked 500 throws
  `Request failed with status code 500`, not the "Axios Error (Response)"
  text seen in the browser.
- Jest renders without `StrictMode`; counts are single fetches.

### Decisions

- **D-L1 Fixtures are the library's factory shapes, ported** into
  `src/tests/specialExamsFactories.ts` as `specialExam`, `specialExamAttempt`,
  `specialExamProctoringSettings`, `specialExamAccessToken`, byte-for-byte
  the attrs of the library's `src/data/__factories__/` at 4.1.0. Importing
  them from the package was tried first and is blocked twice over: the
  package's `exports` map exposes only `dist/index.js`
  (`ERR_PACKAGE_PATH_NOT_EXPORTED` for the deep path), and learning's Jest
  `moduleNameMapper` has an unanchored `@edx/frontend-lib-special-exams`
  entry that sends any specifier containing that string to the package root
  (observed: the factories silently never registered).
- **D-L2 One stateful mock helper, not per-test handler lists.**
  `src/tests/mockSpecialExams.ts` (TypeScript, beside
  `MountCourseQueryHooks.tsx`): `mockSpecialExams(axiosMock, { sequenceId,
  exam, attempt, proctoringSettings, reviewPolicy, accessToken, examGetFails,
  latestGetFails, tokenGetFails })` registers the exam URL family for both
  backends (chosen by `getConfig().EXAMS_BASE_URL` at call time) with the
  same state machine the manual run used: GET exam / latest return the
  current attempt; POST creates (`started`, `created`, or `declined` from the
  payload); PUT applies `action`; poll returns status + remaining; settings,
  review policy and token GETs. It returns `{ state, requests }` so tests can
  assert transitions and request sequences without reaching for the adapter's
  `history`. It is the Jest form of the dev mock on the #2018 comment.
- **D-L3 `mockCourseRequests` registers the helper before its catch-all and
  returns it as `specialExams`.** axios-mock-adapter matches handlers in
  registration order and `logUnhandledRequests` registers a catch-all last,
  so a handler a test added afterwards would never be reached; instead the
  handlers are registered once per course, read per-sequence state at
  request time, and a test sets that state with
  `specialExams.setExam(sequenceId, scenario)` after `mockCourseRequests`
  returns. The default is "no exam" for every sequence. The full suite ran
  the library's success path for the first time with no test changing
  behaviour (121 suites, 1197 tests green on the swap alone).
- **D-L4 Two test files, by owner page.** `src/courseware/course/sequence/
  Sequence.specialExams.test.jsx` renders `<Sequence>` the way
  `Sequence.test.jsx` does (route, `SidebarProvider`,
  `MountCourseQueryHooks`, `{ store }`) for the T, P, S, G, E and N rows and
  the access-token A rows (the Unit is inside it). `src/tab-page/
  TabWithTimer.test.tsx` renders `<TabWithTimer>` over `mockCourseRequests`
  for the H rows. Per-owner request counts (N1, H1) live with their owner
  (count-test-per-owner rule).
- **D-L5 Timer rows use fake timers with `advanceTimers` in `waitFor`**, the
  pattern from `useExamAccess.test.jsx`, and `jest.setSystemTime` so
  `timer_ends` (stamped from `Date.now()` on write) is deterministic. T3 (low
  / critical variants), T10 (limit → self-submit → overtime title) and P4a
  (5 s entry-check race) are the fake-timer cases; the poll cadence (C4) is
  not asserted here (the library's `TimerProvider.test.jsx` has it).
- **D-L6 P4c (entry check with the app replying)** answers the
  `proctorio_status` probe by dispatching a synthetic `MessageEvent` whose
  `origin` is `EXAMS_BASE_URL`: jsdom's `postMessage` never sets
  `event.origin` at all (`lib/jsdom/living/post-message.js`, a TODO), so a
  real `postMessage` reply can never pass the library's origin check.
- **D-L7 E1a asserts the mechanism, not the browser text:** the alert
  heading equals the thrown error's `message` (`Request failed with status
  code 500` under the test client), with a comment that the browser shows
  frontend-platform's wrapper text instead.
- **D-L8 P1's opt-out half** is asserted with `allow_proctoring_opt_out:
  true` in the sequence metadata fixture, documenting that the app never
  receives it (#2162) in the test's name.

### Files (as built, 2026-10-07)

- `src/setupTest.js`: the exam handler → `mockSpecialExams(axiosMock,
  courseId)` registered before the catch-all, returned as `specialExams`; a
  JSDoc type on `render`'s options so TypeScript tests can pass `store`.
- **new** `src/tests/specialExamsFactories.ts` (the four ported shapes).
- **new** `src/tests/mockSpecialExams.ts` + `mockSpecialExams.test.ts` (11
  cases: both URL families, create / transitions / poll countdown / failures).
- **new** `src/courseware/course/sequence/Sequence.specialExams.test.tsx`
  (51 cases: T1–T10 incl. T7a/T7b, P1–P7 incl. P3a–g / P4a / P4c / P5a–f,
  A1–A3, S1–S2, G1, E1 ×2, N1).
- **new** `src/tab-page/TabWithTimer.test.tsx` (5 cases: H1 ×2 families, H2,
  H3, D2).
- No existing test changed behaviour under the handler swap. S3
  (unauthenticated) is not covered: the shared `render` has no way to pass a
  null `authenticatedUser`; noted, not worked around.

### Steps

1. `mockSpecialExams.ts` + its unit test.
2. `setupTest.js` handler swap; run the full suite; fix fallout.
3. `Sequence.specialExams.test.jsx`: T1–T10, P1–P7 (+ P3a–g, P4a–c, P5a–f),
   A1–A3, S1–S3, G1, E1/E1a, N1, T7a/T7b, in that order, each against the
   installed 4.1.0.
4. `TabWithTimer.test.tsx`: H1–H3 and the stop-from-a-tab redirect.
5. `npm run types && npm run lint && npm test`; commit `test: cover the
   special-exams learner flows at the HTTP boundary`.

### Issue

#2163, a sub-issue of #1946 (filed 2026-10-06); the commit body says
`Part of #1946`, `Part of #2018`, `Closes #2163`.
