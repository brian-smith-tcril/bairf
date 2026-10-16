# Manual testing — special-exams baseline on v4.1.0, before any change (#2018)

In-browser record of what `@edx/frontend-lib-special-exams` 4.1.0 does today
for a learner, run against tutor local with learning at the top of the running
stack. This is not a layer's verification: nothing has changed yet. The point
is to have observed, learner-facing behaviour written down per exam state so
that the v5 upgrade (openedx/frontend-lib-special-exams#175) can be checked
against it rather than against memory. The automated counterpart is the
HTTP-boundary test file in `plan-2018-testing.md` section 4; the states and
numbering below match that table so the two can be read together.

**What this baseline must capture.**
- *Which page the learner sees per attempt status* (entrance, download,
  ready to start, content, submit, submitted, verified, rejected, error,
  expired, unknown), and whether the unit content is visible.
- *The timer:* when it appears, its alert variant as time runs low, End My
  Exam → stop before 00:00 and submit after, what happens at the limit.
- *The outer timer on course-home tabs* while an attempt is running.
- *The access token on the unit iframe URL* (edx-exams only).
- *The request sequence* for each action, since v5 replaces the data layer.

## Setup (tutor local)

Course: DemoX, `course-v1:OpenedX+DemoX+DemoCourse`, base
`http://apps.local.openedx.io:2000/learning`. A learner account and a staff
account. Devtools Network filtered to `proctoring|exams|attempt|access_tokens`,
Console open.

**What section A needs in tutor, and nothing else.** edx-proctoring is already
installed on every tutor (a pinned edx-platform requirement, mounted as a
plugin app under `api/` in the LMS), so the library's legacy endpoints are
live; that is the 200 with `exam: {}` seen in the #2075 run. What is off is
the feature flag that makes Studio *register* a timed subsection as an exam
on publish (`cms/djangoapps/contentstore/proctoring.py`,
`register_special_exams` exits early unless `settings.ENABLE_SPECIAL_EXAMS`;
edx-platform defaults it to false and tutor never sets it). Four steps, no
proctoring provider, no edx-exams, nothing installed:

1. A tutor plugin (one YAML file in `$(tutor plugins printroot)`) with a patch
   on `openedx-common-settings` containing `ENABLE_SPECIAL_EXAMS = True`;
   `tutor plugins enable <name>`, `tutor config save`, restart `lms`, `cms`
   and `cms-worker` (the registration runs as a CMS celery task on publish).
2. Studio → the course → Settings → Advanced Settings → **Enable Timed
   Exams** = true. The subsection dialog's "Timed" option is disabled until
   this is on (frontend-app-authoring `AdvancedTab.tsx`). Leave "Enable
   Proctored Exams" off; the proctored options then never appear.
3. Studio → a DemoX subsection → Configure → Advanced → **Timed**, time
   allotted `00:02` (short enough to reach the low, critical and expired
   states by waiting) → Save → **Publish**. Publishing is what registers the
   exam. Two more copies for A8 and A9: one with a past due date and "Show
   entire section" after due, one with "Hide" after due.
4. A learner enrolled in the course. Confirm the setup took by opening the
   subsection as the learner and seeing its attempt GET return a populated
   `exam` instead of `{}`.

**Backend URL family.** Tutor local has no `EXAMS_BASE_URL`, so the library
uses the LMS `edx_proctoring` endpoints throughout. Section C needs the
edx-exams family: set `EXAMS_BASE_URL: 'http://localhost:18740'` (any origin;
the mock answers) in the untracked `env.config.jsx` for those checks and
remove it afterwards.

**Mocked states (sections B–E).** `src/examMock.dev.ts`, a local, uncommitted
file, plus a two-line hook in `src/index.jsx` that calls `installExamMock()`
at the top of the `APP_READY` handler in development (patches saved as
`exam-mock-index.patch` / `exam-mock-file.patch` in the session scratchpad).
**Never commit either.** It attaches `new MockAdapter(getAuthenticatedHttpClient(),
{ onNoMatch: 'passthrough' })` and registers handlers for the exam URL family
only, so the installed library is untouched and everything else on the page
hits tutor. It is a state machine: the exam GET returns the current attempt,
POST creates one, each PUT applies its `action`, the poll GET returns the
current status and a live `time_remaining_seconds`; each handler logs to the
console as `[examMock] …`. It answers for one subsection,
`localStorage.examSequenceId` (default: the Studio-timed DemoX subsection from
section A), and `{ exam: {} }` for every other. The URL family follows
`EXAMS_BASE_URL` (unset → LMS `edx_proctoring`; set → edx-exams).

**Enrollment for the proctored rows.** The LMS sets learning's
`can_access_proctored_exams` to `enrollment is active and
CourseMode.is_eligible_for_certificate(mode)`
(`openedx/core/djangoapps/courseware_api/views.py`), so an audit learner is
refused every proctored, practice and onboarding exam before the instructions
render (the "You do not have access to proctored exams with your current
enrollment" page). Timed exams are not subject to it. For sections B and C
the learner needs a certificate-eligible mode on DemoX, via the LMS Django
admin (`http://local.openedx.io:8000/admin/`): (1) Waffle → Switches → add
`student.courseenrollment_admin`, active, since `CourseEnrollmentAdmin` is
read-only without it (`DisableEnrollmentAdminMixin` in
`common/djangoapps/student/admin.py`); (2) Course modes → add an `honor` mode
for `course-v1:OpenedX+DemoX+DemoCourse` if it has only `audit`; (3) Student →
Course enrollments → the learner's DemoX row → Mode `honor`. The next course
metadata request picks it up.

Driving it, in the browser console:

```js
examMock.list();                          // scenario names
examMock.set('proctored-created-lti');    // then reload the page
examMock.clear();                         // back to the real backend; reload
```

Payloads follow the library's Rosie factories. `desktop_application_js_url`
is empty in every attempt so the no-worker branches run. Nothing else is
mocked: course metadata, sequence metadata, outline and completion go to
tutor as usual, so the page around the exam is real. One consequence: the
sequence's `is_time_limited` and `allow_proctoring_opt_out` come from the
real LMS sequence metadata, so the mocked exam only takes effect on the
Studio-timed subsection, and B12's skip button is unreachable in the MFE regardless (the LMS sequence
metadata never carries `allow_proctoring_opt_out`; see B12).

## Checks

Each row: do the thing, record what the learner sees, and note the requests.
Request counts are taken under `npm run dev`, where `StrictMode` double-runs
mount effects. A fetch whose inputs are present on first mount
(`ExamWrapper`'s exam GET, `OuterExamTimer`'s latest-attempt GET) shows as
two identical requests. A fetch keyed on data that arrives later is single:
`Exam`'s proctoring-settings GET waits for `examId`, which is empty on the
double mount (*observed 2026-10-06*: 2 exam GETs, 1 settings GET on B1).
Action-driven requests (a click's POST/PUT and its follow-up GET) are single.
Observed results go in the Results section, dated; a row is checked only when
it was run.

### A. Timed exam against the real LMS and Studio (Setup steps 1–4; nothing mocked in this section)

- [x] **A1 Entrance.** Open the timed subsection as the learner → the timed
  exam entrance page with the time limit; unit content not rendered. Network:
  **two identical** GETs `edx_proctoring/v1/proctored_exam/attempt/course_id/
  {id}?content_id=…&is_learning_mfe=true` under `npm run dev`. *Observed
  2026-10-06:* both URLs byte-identical. Cause: `src/index.jsx` wraps the app
  in `StrictMode`, which in development mounts, unmounts and remounts each
  component once; `ExamWrapper` fetches from a `useEffect(…, [])` with no
  guard, and a thunk has nothing to dedupe the second call. Dev-only; one
  GET expected in a production build (not observed). v5 will show one GET in
  dev too, since React Query dedupes the in-flight query across the remount,
  so this 2 is the number that drop should be read against.
- [x] **A2 Start.** Click the start button → unit content renders; timer block
  shows the exam name, "End My Exam", a countdown from the limit. Network: POST
  `proctored_exam/attempt` then one GET of the exam again.
- [x] **A3 Navigate within the exam.** Next/Previous units → timer persists,
  countdown continues; no new attempt POST.
- [x] **A4 Leave the exam.** Go to another, non-exam sequence → the timer
  block is still shown above the content (the attempt is active); no
  instructions. Then open the course-home Outline tab → the outer timer is
  shown there too (H1 for real).
- [x] **A5 Low and critical.** With a 2-minute limit, at 24 s left the alert
  turns warning, at 6 s danger.
- [x] **A6 End My Exam before 00:00.** Back in the exam, click End My Exam →
  the submit page ("Are you sure…") with a "No, I'd like to continue working"
  button; the End button is gone from the timer, the countdown continues.
  Network: PUT `…/attempt/{id}` `{ action: 'stop' }`, then GET exam. Click
  continue → content again and the End button is back in the timer (PUT
  `{ action: 'start' }`; the button renders whenever the status is not
  `ready_to_submit`). Click submit → "You have submitted your timed exam.";
  the timer is gone. Network: PUT `{ action: 'submit' }`, GET exam.
  *Observed 2026-10-06:* End → the "are you sure" page with the End button
  gone from the banner; continue → End button back; submit → submitted page.
- [x] **A7 Time runs out.** Start a fresh attempt on another learner (or
  reset via Studio/instructor dashboard) and wait: at 00:00 the countdown
  holds at 00:00:00, the continue button on the submit page (if there) is
  hidden; about 5 s later the exam submits itself and the submitted page
  shows the *overtime* title ("The time allotted for this exam has
  expired…"). Network: PUT `{ action: 'submit' }` without a click.
- [ ] **A8 Past due, show entire section.** The second copy, no attempt →
  the expired page; with a submitted attempt → content rendered, no submitted
  page. *Not run by decision (2026-10-06): past-due copies with a prior
  attempt are costly to set up; covered as mocked rows B15–B16 instead.*
- [ ] **A9 Past due, hide.** The third copy, with a submitted attempt → the
  submitted page, not content. *Not run by decision; see B16.*
- [x] **A10 Staff.** As staff, open the timed subsection → content with no
  instructions and no timer. Masquerade as the learner with no attempt → the
  "This exam is hidden from the learner" alert above the content.
- [x] **A11 Logged out.** Open the public course (if the course allows) → no
  exam requests at all.

### B. Mocked attempt statuses (edx-proctoring URL family)

Mocked requests never reach the Network tab: `axios-mock-adapter` answers
inside axios before an XHR is made, so only passthrough requests show there.
For every row in B–E the request evidence is the console, where each mock
handler logs `[examMock] GET exam for sequence <status>`, `GET proctoring
settings`, `POST create → <status>`, `PUT <action> <from> → <to>`,
`GET poll …`. Request *counts* in these sections are therefore log-line
counts, not network counts.

- [x] **B0 Audit learner on a proctored exam** (any proctored scenario, audit
  enrollment) → "You do not have access to proctored exams with your current
  enrollment." in place of any instructions; other subsections unaffected.
  *Observed 2026-10-06* with `proctored-created-lti` before the enrollment
  change; this is the plan's P6.

Scenario per row; the mocked sequence is any DemoX subsection, with the
sequence metadata left real (`is_time_limited` comes from the LMS, so pick
the Studio-timed subsection from A for these, and let the mock answer its
exam GET).

- [x] **B1 `created`, LTI, proctored: the page** (`proctored-created-lti`) →
  "Set up and start your proctored exam." with Start System Check and Start
  Exam buttons, and one support sentence, the URL variant ("…contact Mock
  Provider technical support by visiting https://example.com/support"; the
  library prefers a support URL over email + phone). *Observed 2026-10-06:*
  title and URL sentence shown; console 2 × `GET exam for sequence created`,
  1 × `GET proctoring settings`.
- [x] **B1a Contacts, email + phone variant** (`proctored-created-lti-emailphone`)
  → the same page with "…by emailing support@example.com or by calling
  555-0100" in place of the URL sentence. *Observed 2026-10-06.*
- [x] **B1b Start System Check while `created`** (`proctored-created-lti`) →
  console `GET poll`, then `PUT click_download_software created →
  download_software_clicked`, then the *same window* navigates to
  `${EXAMS_BASE_URL}/lti/start_proctoring/7` (`window.location.assign`; the
  library's test title says "new window", its code does not). In section B
  `EXAMS_BASE_URL` is unset, so the target is the relative URL
  `undefined/lti/start_proctoring/7` → learning's page-not-found. *Observed
  2026-10-06:* page not found, same window. The working launch is C6.
- [x] **B1c Start Exam while not ready** (`proctored-created-lti`) → console
  `GET poll` with a status other than `ready_to_start`, no PUT, and the page
  shows "You must complete the proctoring setup before you can start the
  exam." under the buttons instead of moving on. (The passing case is B4,
  where the status is already `ready_to_start`.) *Observed 2026-10-06:* poll
  status `download_software_clicked` (left over from B1b's System Check click
  in the same page session, no reload in between), failure text shown.
- [x] **B2 `created`, legacy REST provider** (`proctored-created-rest`; `exam_proctoring_backend.
  instructions` non-empty) → legacy download instructions with those steps.
  *Observed 2026-10-06:* title, the identity-verification note, the two mocked
  steps ("Install the mock provider software", "Restart your browser"), and
  the email + phone contact sentence (the REST instructions component takes
  email and phone, not a URL).
- [x] **B2a Start System Check, legacy provider** (`proctored-created-rest`) →
  console `GET poll`, `PUT click_download_software`, then the same window
  navigates to the attempt's `software_download_url`
  (`https://example.com/download` in the mock); the legacy counterpart of
  B1b, differing only in the target URL. *Observed 2026-10-06:* landed on
  example.com/download.
- [x] **B3 `download_software_clicked`** (`proctored-download-clicked`) → download instructions without the
  skip button.
  *Observed 2026-10-06:* title, the URL contact sentence, Start System Check
  and Start Exam buttons, no skip button. Caveat: the skip button also needs
  the sequence to allow opt-out, which DemoX's subsection does not, so its
  absence here does not distinguish B3 from B1; and per B12 the LMS never
  sends that flag to the MFE, so the button is unreachable on any status.
- [x] **B4 `ready_to_start`: the page** (`proctored-ready-to-start`) →
  ready-to-start instructions: "You have 30 minutes to complete this exam",
  the timed-exam rules, "Proctored Exam Rules", and under "Additional Exam
  Rules" the mocked review policy text; console `GET review policy`.
  *Observed 2026-10-06:* all of the above, for about 5 s, then B4a.
- [x] **B4a LTI exam in a proctored status with no proctoring app**
  (`proctored-ready-to-start`, and likewise any LTI scenario at `started` or
  `ready_to_submit`) → after 5 s the API error alert "Something has gone
  wrong with your exam. Proctoring application not detected." with the site
  support link, and below it "Error with proctored exam" with the escalation
  email `escalate@example.com` from the mocked settings. Mechanism:
  `ExamWrapper` runs `checkExamEntry` on mount; for `use_legacy_attempt_api:
  false` in `ready_to_start` / `started` / `ready_to_submit` it posts
  `proctorio_status` to the top window and races the reply against a 5 s
  timeout, accepting a reply only from the `EXAMS_BASE_URL` origin; on
  failure it sets the error and PUTs `error`. In section B `EXAMS_BASE_URL`
  is unset, so every LTI scenario in those statuses ends here. Console:
  `PUT error ready_to_start → error`, `GET exam for sequence error`.
  *Observed 2026-10-06.* The surviving LTI path is C7.
- [x] **B4b Start Exam when ready, legacy provider**
  (`proctored-ready-to-start-legacy`; the legacy flag skips the entry check)
  → the ready-to-start page stays past 5 s; its Start Exam button dispatches
  `startProctoredExam`, which with no desktop worker (`desktop_application_
  js_url` empty) goes straight to `continueAttempt`: console `PUT start
  ready_to_start → started`, `GET exam for sequence started`; the sequence
  content renders with the timer banner "You are taking "Mock proctored exam"
  as proctored." (This differs from the download page's Start Exam in B1c,
  which only polls.) *Observed 2026-10-06:* no error page; content with the
  banner after the click.
- [x] **B5 `ready_to_submit`, proctored** (`proctored-ready-to-submit-legacy`; the LTI
  variant hits B4a; `proctored-ready-to-submit-zero` for the zero case is LTI and
  shows the continue-button state only for the 5 s before B4a) → proctored submit instructions and
  the continue button (time remaining > 0); with `time_remaining_seconds: 0`
  the continue button is absent.
  *Observed 2026-10-06* (`proctored-ready-to-submit-legacy`): timer banner
  still shown with the countdown (29:51 of 30:00) and no End button; "Are
  you sure you want to end your proctored exam?" with the review-submission
  wording, buttons "Yes, end my proctored exam" and "No, I'd like to
  continue working". Zero-remaining variant not observed (LTI-only).
- [x] **B6 `submitted`, proctored** (`proctored-submitted`, `proctored-second-review`) → proctored submitted page.
  **`second_review_required`** → the same page.
  *Observed 2026-10-06* (reached from B5 via "Yes, end my proctored exam"):
  "You have submitted this proctored exam for review", the upload / close-the-
  software / 5-business-days text, and "contact platform Support." The word
  "platform" is literal in the library's message
  (`SubmittedProctoredExamInstructions.jsx`, id
  `exam.SubmittedProctoredExamInstructions.text`), unlike the error page,
  which uses `SITE_NAME`; pre-existing wording, noted for the baseline only.
  `second_review_required` not observed (LTI-only in section B).
- [x] **B7 `verified`** (`proctored-verified`, `practice-verified`, `onboarding-verified`) → verified page per type (proctored, practice,
  onboarding).
  *Observed 2026-10-06:* proctored and practice both "Your proctoring session
  was reviewed successfully. A final grade will be available soon.";
  onboarding "Your onboarding profile was reviewed successfully", "Your
  profile has been established, and you're ready to take proctored exams in
  this course", and "Please contact integration@example.com if you have
  questions." (the `integration_specific_email` from the mocked settings).
- [x] **B8 `rejected`** (`proctored-rejected`, `practice-rejected`, `onboarding-rejected`) → rejected page per type, footer rules.
  *Observed 2026-10-06:* proctored: "Your proctoring session was reviewed, but
  did not pass all requirements", "…contact My Open edX Support." (uses
  `SITE_NAME`) and the footer line "If you have concerns about your
  proctoring session results, contact your course team."; practice: the same
  two sentences without the footer line; onboarding: "Your onboarding session
  was reviewed, but did not pass all requirements", "Please contact
  integration@example.com if you have questions. You may retake this
  onboarding exam by clicking \"Retry my exam\"." (retry button → B9's reset).
- [x] **B9 `error`** (`proctored-error`, `practice-error`, `onboarding-error`) → error page per type; the retry button on practice and
  onboarding → PUT `{ action: 'reset_attempt' }`, GET exam.
  *Observed 2026-10-06:* proctored: "Error with proctored exam" and the course-
  team sentence with `escalate@example.com` (the settings'
  `proctoring_escalation_email`); practice: "There was a problem with your
  practice proctoring session", "Your practice proctoring results:
  Unsatisfactory", the retry explanation and a "Retry my exam" button;
  onboarding: "Error: There was a problem with your onboarding session",
  "…You should retry this onboarding exam" and a "Retry my exam" button.
  Retry click *observed 2026-10-06* on the onboarding variant: console
  `PUT reset_attempt error → null`, then the onboarding entrance page
  ("Proctoring onboarding exam", the three "why" bullets, "provided via
  Mock Provider", the review email from `notify@example.com` and the contact
  `integration@example.com`, both from the mocked settings). That page is
  also the `onboarding` entrance for O1.
- [x] **B10 Onboarding statuses** (`proctored-onboarding-missing` / `-pending` /
  `-failed` / `-expired`) on a proctored exam → the onboarding error page with
  the settings' emails.
  *Observed 2026-10-06:* all four show "You must complete an onboarding exam
  before taking this proctored exam" and the footer "Proctoring for your exam
  is provided via Mock Provider. If you have questions… contact
  integration@example.com". Body per status: missing and expired share
  "Please complete an onboarding exam before attempting this exam." (one
  `case` for both in `OnboardingErrorExamInstructions.jsx`); pending "Your
  onboarding exam is being reviewed… allow 2+ business days…"; failed "Your
  onboarding exam failed to pass all requirements." The "Navigate to
  onboarding exam" link the component can render was not reported.
- [x] **B11 Prerequisites failed / pending** (`proctored-prereq-failed`,
  `proctored-prereq-pending`; no attempt) → the prerequisites page; skip button
  only when `allow_proctoring_opt_out`.
  *Observed 2026-10-06:* both headed "This exam is proctored". Failed: "You did
  not satisfy the requirements…", the list with "Onboarding exam", and
  "…contact My Open edX Support." (`SITE_NAME`). Pending: "You have not
  completed the prerequisites…", the pending list with "Onboarding exam",
  and "You can take this exam with proctoring only when all
  prerequisites-instructions have been successfully completed." The
  "prerequisites-instructions" is literal in the library's message
  (`prerequisites-instructions/Pending.jsx:47`), a pre-existing typo; noted
  for the baseline only. Skip button not shown (opt-out not allowed; B12).
- [x] **B12 Proctored entrance, opt-out** (`proctored-none`; needs the *course*
  advanced setting "Allow Opting Out of Proctored Exams" = true in Studio →
  Settings → Advanced Settings; the sequence metadata's `allow_proctoring_opt_out`
  is `self._get_course().allow_proctoring_opt_out` in `xmodule/seq_block.py`) → entrance with the skip button when
  the sequence allows opt-out; clicking skip → the "take without proctoring"
  confirmation; confirming → POST attempt with `attempt_proctored: 'false'`
  (or PUT `{ action: 'decline' }` when an attempt exists).
  *Observed 2026-10-06:* the proctored entrance ("This exam is proctored", the
  credit / program-credential sentence, the set-up sentence, "Continue to my
  proctored exam.") with **no skip button, before and after** setting the
  course's "Allow Opting Out of Proctored Exams" to true. **Finding (from
  code, confirmed across releases):** the skip flow has never been reachable
  in the MFE. The library renders `SkipProctoredExamButton` only when
  `allowProctoringOptOut` is true; `ExamWrapper` takes that from
  `sequence.allowProctoringOptOut`; learning reads it from the sequence
  metadata's `allow_proctoring_opt_out` (added in learning #485, 2021-06-14,
  EDUCATOR-5799); but the LMS `SequenceBlock._get_render_metadata` payload
  has no such key, on any release from Lilac to Sumac. The key is built only
  in `_time_limited_student_view`, the legacy courseware render path. So the
  value is always `undefined` and the skip button never renders. Filed as #2162 (learning, not under #1946),
  with the two options open: add the field on the platform side (one line in
  `_get_render_metadata`) or remove the dead read here. For the baseline:
  the skip flow is a learning-side unit test with mocked sequence metadata
  only, not a manual row.
- [x] **B13 Unknown status** (`unknown-status`) → the unknown
  status error page.
  *Observed 2026-10-06:* "A system error has occurred with your exam. Please
  reach out to support for assistance." (`UnknownAttemptStatusError`).
- [x] **B15 Past due, no attempt** (`timed-past-due-none`; then `practice-past-due-none`) → the expired page. Same with `type: 'practice'` → the
  entrance page, not expired.
  *Observed 2026-10-06:* timed: "The due date for this exam has passed" /
  "Because the due date has passed, you are no longer able to take this
  exam." (the expired page). Practice: the practice entrance instead, "Try a
  proctored exam", the no-impact-on-grade sentence, the start button and the
  set-up sentence (`shouldRenderExpiredPage` excludes practice exams).
- [x] **B16 Past due, submitted attempt** (`timed-past-due-submitted-show`,
  `timed-past-due-submitted-hide`, `proctored-past-due-submitted-show`) → with `hide_after_due: false` the
  unit content renders and no submitted page; with `hide_after_due: true` the
  submitted page. Same `submitted` + `hide_after_due: false` on a proctored
  exam → the submitted page (the content rule is timed-only).
  *Observed 2026-10-06*, `timed-past-due-submitted-show`: the library stepped
  aside as expected: sequence nav and unit iframe rendered, no submitted page.
  The iframe's content was edx-proctoring's legacy timed-exam entrance
  ("Text, Images, and HTML is a Timed Exam (2 minutes)… I am ready to start
  this timed exam"): the unit render is the real LMS, which knows this
  subsection as a registered timed exam with no started attempt for this
  learner. Environment artefact of mocking the exam on the Studio-timed
  subsection, not library behaviour. `timed-past-due-submitted-hide`: "You
  have submitted your timed exam." (the timed submitted page, no content).
  `proctored-past-due-submitted-show`: the proctored submitted-for-review page
  (as B6), no content; the content rule is timed-only.
- [x] **B14 Exam GET 500** (`exam-500`) on the timed subsection → the API error alert
  (default message, support link when `SITE_NAME` and `SUPPORT_URL` are set)
  above whatever renders; on a non-exam subsection with the same 500 → no
  alert.

  *Observed 2026-10-06*, timed subsection: the danger alert with heading
  "Axios Error (Response): 500 - See custom attributes for details." and the
  support sentence with the "My Open edX Support" link. The heading is the
  raw axios error text: `handleAPIError` stores `error.message || detail`
  and `ExamAPIError` shows it verbatim unless it contains `<`, so a learner
  sees frontend-platform's technical wrapper message instead of the default
  "A system error has occurred with your exam." copy. Pre-existing; noted for
  the baseline, and a decision point for v5's error display. Non-exam
  subsection half not run; covered by the Jest baseline (E1).
### C. edx-exams URL family (`EXAMS_BASE_URL` set in `env.config.jsx`)

*Not run by decision (2026-10-06).* C1, C4–C7 are request plumbing the library's
own data-layer tests already cover for both URL families and the Jest baseline
in `plan-2018-testing.md` covers too; C2–C3 (the access token gating the unit
iframe) are learning-owned behaviour and are in that Jest baseline as A1–A3.
Rows kept below for reference.

For this section set `EXAMS_BASE_URL` to the page's own origin,
`http://apps.local.openedx.io:2000`, not an arbitrary host: `checkExamEntry`
accepts the proctoring app's reply only from that origin, and with
`localStorage.examMockProctorApp = '1'` the mock answers the
`proctorio_status` probe from the page itself (console `proctorio_status
probe → replying active`), so LTI scenarios in proctored statuses survive
instead of erroring after 5 s (B4a). The mock's edx-exams handlers key on
whatever `EXAMS_BASE_URL` is, so the origin choice costs nothing.

- [ ] **C1 Entrance and start** → as A1–A2, but Network shows GET
  `/api/v1/student/exam/attempt/course_id/…/content_id/…` **and** GET
  `/api/v1/exams/attempt/latest`, then POST `/api/v1/exams/attempt`, then
  both GETs again. Record the double fetch.
- [ ] **C2 Access token.** `started` attempt → the unit iframe `src` carries
  `exam_access=<token>`; before the token GET resolves the iframe is not
  rendered. Network: GET `/api/v1/access_tokens/exam_id/{id}/` once per unit
  visited (navigate Next and confirm a second GET).
- [ ] **C3 Access token GET fails** (mock 500) → the iframe renders without
  `exam_access`; Console shows the logged error; no visible alert.
- [ ] **C4 Poll.** Leave a `started` attempt open for 2 minutes → GET
  `/api/v1/exams/attempt/latest?content_id=…` at 60 s and 120 s; set the
  mock's remaining seconds lower than the displayed time → the countdown
  jumps down to match.
- [ ] **C5 Poll returns `submitted`** → the exam refetches and the submitted
  page shows with the overtime title.
- [ ] **C7 LTI exam in a proctored status, proctoring app present**
  (`proctored-ready-to-start`, `examMockProctorApp = '1'`) → the ready-to-start
  page stays past 5 s; console shows the probe reply and no `PUT error`.
- [ ] **C6 Start System Check, LTI** (`proctored-created-lti` with
  `EXAMS_BASE_URL` set) → `GET poll`, `PUT click_download_software`, then the
  same window navigates to `http://localhost:18740/lti/start_proctoring/7`
  (the mock has no handler for a page navigation, so expect the browser's
  connection error; the URL is the check).

### D. Course-home outer timer (`TabWithTimer`)

*Not run by decision (2026-10-06)*, except D1, which A4 observed for real (timer
on the Outline tab during the section-A attempt). D2–D4 are in the Jest
baseline as H1–H3 plus the stop-from-a-tab redirect. Rows kept for reference.

- [ ] **D1 Running attempt** (real from A, or mock `latest` with a `started`
  attempt) → on Outline, Dates, Progress tabs the timer block shows exam
  name, End My Exam, countdown. Network per tab load: one GET of the
  attempt endpoint (legacy: `…/attempt/course_id/{id}?is_learning_mfe=true`
  without `content_id`; edx-exams: `/api/v1/exams/attempt/latest`).
- [ ] **D2 End My Exam from a tab** → PUT `{ action: 'stop' }` then
  `window.location` goes to the attempt's `exam_url_path` (the exam
  sequence), landing on its submit page.
- [ ] **D3 No attempt** → nothing rendered; one GET per tab load.
- [ ] **D4 Attempt GET 500** → the API error alert on the tab.

### E. Non-exam sequences (request count)

*Not run by decision (2026-10-06).* A request-count check belongs in the Jest
baseline (N1), where it is deterministic and not skewed by StrictMode.

- [ ] **E1** Hard-reload a non-exam unit → one exam GET (first sequence of
  the session). Navigate to another non-exam sequence → **no** further exam
  GET (today's "already loaded" rule). Navigate into the timed sequence →
  one GET. Back to a non-exam sequence → none. Record the counts; v5's
  per-sequence query will change this and the baseline is what it changes
  from.

## Results

Run 2026-10-06 on tutor local, `npm run dev`, with the Setup patch applied
(`ENABLE_SPECIAL_EXAMS = True` via a tutor plugin, course "Enable Timed
Exams" on, a DemoX subsection set Timed at 00:02 and published), learner
enrollment switched to `honor` for section B.

**Section A (real LMS and Studio): 7 of 11 run, all as described; 2 skipped
by decision (A8–A9, moved to B15–B16), 2 not run (A10 staff/masquerade, A11
logged out).** A1 entrance (two identical GETs under dev: StrictMode double
mount), A2 start, A3 navigate, A4 timer follows the learner to a non-exam
sequence and to the Outline tab, A5 alert variants at 24 s and 6 s of 2:00,
A6 End → submit page (End button gone) → continue (button back) → submit,
A7 time-out: holds at 00:00:00, self-submits ~5 s later, overtime title.

**Section B (mocked exam states via `src/examMock.dev.ts`): all rows
observed.** B0 audit learner → proctored access denied (enrollment mode gate).
B1/B1a download page with the URL or email + phone contact sentence; B1b
System Check → poll, PUT `click_download_software`, same-window navigation
(broken URL without `EXAMS_BASE_URL`); B1c Start Exam while not ready → poll,
no PUT, "You must complete the proctoring setup…". B2/B2a legacy REST provider
steps; System Check → `software_download_url`. B3 `download_software_clicked`.
B4 ready-to-start page with the review policy; B4a LTI entry check with no
proctoring app → error after 5 s; B4b legacy Start Exam → `PUT start` →
content with the timer banner. B5 proctored submit page. B6 submitted for
review (literal "platform Support"). B7–B9 verified / rejected / error per
type, footer rules, retry → `reset_attempt` → onboarding entrance. B10 four
onboarding statuses (missing and expired share a body). B11 prerequisites
failed and pending (literal "prerequisites-instructions"). B12 opt-out
unreachable: the LMS never sends `allow_proctoring_opt_out` (#2162). B13
unknown status. B14 exam GET 500 → alert headed with the raw axios message.
B15/B16 past-due rules, with the practice exception and the timed-only
content rule.

**Sections C–E: not run by decision**; counts and URL plumbing go to the Jest
baseline. D1 was observed for real in A4.

**Findings for the baseline, all pre-existing:** (1) StrictMode doubles
mount-effect fetches in dev; (2) audit enrollments are refused proctored
exams by the LMS's `can_access_proctored_exams`; (3) LTI exams in a proctored
status error after 5 s without a proctoring app reply from the
`EXAMS_BASE_URL` origin; (4) the 500 alert shows the raw axios error as its
heading; (5) `allow_proctoring_opt_out` never reaches the MFE (#2162); (6)
wording: literal "platform Support" and "prerequisites-instructions".

Each B row has a named scenario in `plan-2018-testing.md` section 4 (the
"B → automated" map). Observed results only; mocked rows' request evidence is
the console, since the adapter answers before any XHR is made.
