## Summary

The progress tab's certificate card now has the learner's entrance exam status. `master`'s card reads it from the courseware metadata query without fetching, and nothing on the progress tab fetches that query, so the card never has it (#2243). `ProgressTab` now fetches the courseware metadata on a learner's own page and waits for it with the progress data. **One change a learner can see: a learner who has not passed the entrance exam sees no certificate card**, where `master` shows the card the course would show without an exam. The legacy tree under `src/` is untouched.

Part of #1905. Resolves #2190. Stacked above #2247.

> [!NOTE]
> **For reviewers:** hiding the card is `master`'s code running for the first time, not new logic: `getCourseExitMode` returns `entranceExamFail` and the card has no branch for it. That #1429 meant this is read from its code. #1429 does not say so (decision log entry 2).

## What changed

- **`ProgressTab` fetches the courseware metadata and waits for it.** It runs `useCoursewareMetadata(courseId)` and passes the query to the tab-page frame in `tabDataQueries`, beside the progress query. `CertificateStatus` keeps `master`'s `enabled: false` read, which the page now fills, so the card mounts with the status known, renders once, and sends its `visited` event from that render.
- **Not on another learner's page.** On `progress/:targetUserId` the query is neither run nor waited for, and the card passes `null` whatever the query cache holds: `GET /api/courseware/course/` answers for the requester, not the learner in the route (#2244). Both conditions carry #2244's URL.
- **The courseware metadata slice of `courseware/data/` ports to support this.** `coursewareMeta.ts` whole, `getCourseMetadata` in `api.js`, `coursewareMetadataQuery` and `useCoursewareMetadata` in `apiHooks.ts` in place of the stub from #2246, and the `courseMetadata` factory. #2195 adds the rest of each file at the same path; `useMinimalCourseOutline` stays a stub until then.
- **Tests.** `ProgressTab.test.jsx` gains five "Entrance exam status" cases. `courseware/data/apiHooks.test.tsx` is new, with cases for the hook. Two comments in the lower layers' tests, false once the query is real, are corrected.

## Known differences from `master`

- **A learner who has not passed the entrance exam sees no certificate card on their progress tab.** On `master` they see the card for their grade and enrollment, for example the "not passing" card.
- **One more request on each load of a learner's own progress page**, `GET /api/courseware/course/<id>`. If it fails, the tab shows its error view. The endpoint records user activity for the requester.
- **Another learner's progress page is as on `master`.** Staff see that learner's card without the entrance exam status until the progress response carries it (#2244).

## Testing

At the layer's commit, in `frontend-base/`: lint, the tests, `build` and `build:ci` pass. Lint ran with the package's `.jsx` files included (openedx/frontend-base#327).

- 36 suites, 412 tests passed and 7 skipped (the six kept as `it.skip` under #2194, and the streak-celebration case under #2201).

**Coverage.** The package is at 100% of lines, against its 96.15% bar. Counted from the local coverage report the way Codecov counts a patch, this layer adds 17 lines with none missed or partly covered.

**Manual testing** on the package's dev site against tutor dev, with one enrolled learner in the demo course: the real courseware metadata request and its `entrance_exam_passed` field on the progress page; the certificate card showing, then gone with the response faked to say the exam is not passed; and no such request on a staff view of another learner's progress. The record is below.

## Decisions

What was decided while building this layer; the scope is in #2190, the bug in #2243 and the staff view in #2244.

<details>
<summary>Full decision log</summary>

# Decisions: the entrance exam status on the progress tab

Decisions made while building this layer of #2190. The scope is in #2190's plan, the bug
is described in #2243 and the staff view in #2244. The tab itself is ported in #2247, the
layer below.

1. **The progress tab fetches the courseware metadata and waits for it on a learner's
   own page.** `ProgressTab` runs `useCoursewareMetadata(courseId)` as a fetching query
   and passes it to the tab-page frame in `tabDataQueries`, beside the progress query.
   `CertificateStatus` keeps `master`'s line, a read of that query with
   `enabled: false`; the page above it now fills what it reads.
   - On `master` nothing on the progress tab fetches that query and every way into the
     tab is a page load, so the read is always empty (#2243).
   - Under the shell a tab switch keeps the query cache. Once the courseware pages are
     ported (#2195), a learner switching from one to Progress would reach the card with
     the status cached, and a page load would not. Fetching on the page removes that
     difference.
   - The page waits because the card sends its `visited` event from its first render.
     Without the wait the card would render with no status, send the event, and then
     render again when the response arrived: a learner who has not passed the exam would
     see the card appear and vanish.

2. **What a learner now sees: no certificate card until the entrance exam is passed.**
   This is the one change from `master` a learner can see. On `master` that learner sees
   the card the course would show without an exam, for example "In order to qualify for
   a certificate, you must have a passing grade".
   - The behaviour is `master`'s code, running for the first time. `getCourseExitMode`
     returns `entranceExamFail` before it looks at anything else, and the card has no
     branch for that mode, so it renders nothing.
   - That it was meant is read from #1429's code, not from anything #1429 says. #1429
     added the read, the `entranceExamPassed` line and the extra argument to the card,
     and did not add them to `CourseExit.jsx`, the function's other caller outside the
     unit navigation. Those lines have no purpose unless the card is meant to react to a
     failed exam. #1429 and the issue it closed, #1415, are about the unit navigation's
     Next button; neither mentions the progress tab, and no test covered the card's
     branch.
   - The read never worked: #1429 wrote it as `useModel('coursewareMeta', courseId)` on
     a page that never loaded that model, and #2140 converted it to the query read with
     the same result.
   - The other direction, the card never reading the status, would keep what learners
     see on `master`. It was raised during the manual pass and not taken.

3. **On another learner's page nothing changes, and the card ignores the cache.**
   `GET /api/courseware/course/` answers for the requester, not for the learner in the
   route, and a staff member who never sat the exam reports `false` for themselves
   (#2244). So on `progress/:targetUserId`:
   - `ProgressTab` does not run the query and does not wait for it.
   - `CertificateStatus` passes `null` whatever the cache holds. The query key names no
     user, so the requester's own progress page, or a courseware page once #2195 lands,
     can leave the requester's status there. `null` is what `master`'s read gives on
     that page.
   - Both conditions carry #2244's URL: its backend change, the progress response
     carrying the status, removes them.
   - The cache case in the suite renders the requester's own page with a failed exam
     and then navigates to `progress/10` with the router. With the card's condition
     removed, that case alone fails.

4. **Arriving at one's own page with the status already cached.** The page does not
   wait: the card renders from the cached status and the query refetches in the
   background, as every query on every tab does. If the status changed since it was
   cached, the first render and the `visited` event use the old value and the card
   corrects itself when the response arrives. In this PR only the progress page fills
   that cache. This is read from the code; no case covers this arrival.

5. **The `visited` event has no entrance exam variant.** In `entranceExamFail` mode the
   card sends the progress response's `cert_status` as it is, which is `master`'s code.
   The suite's case asserts that literal value and one call.

6. **Costs.** One more request on each load of a learner's own progress page. A failure
   of that request shows the tab's error view, where `master`'s card never asked. The
   endpoint records user activity for the requester.

7. **The courseware metadata slice of `courseware/data/` ports here.** The fix needs
   the real query, and the rest of the module ports with #2195.
   - `coursewareMeta.ts` ports whole. `api.js` holds `getCourseMetadata` only, and
     `apiHooks.ts` holds `coursewareMetadataQuery` and `useCoursewareMetadata`. Each file
     has one manifest line; #2195 adds the rest of each file at the same path.
   - `useMinimalCourseOutline` stays the stub #2246 added, under #2195's URL.
   - The `courseMetadata` factory ports, with a `__factories__/index.js` whose other
     four imports are commented out under #2195's URL.
   - `useCoursewareMetadata` builds its options with `coursewareMetadataQuery(courseId!)`
     and is disabled without a course id, as the hooks in `course-home/data/apiHooks.ts`
     do.

8. **Tests.**
   - `ProgressTab.test.jsx` gains "Entrance exam status": no card and one `visited`
     event for a learner who has not passed; the card for one who has; one courseware
     metadata request on a learner's own page and none on another learner's; the cache
     case of entry 3. The suite's `beforeEach` answers the new request, since an
     unanswered one rejects and the page now waits for it.
   - `courseware/data/apiHooks.test.tsx` is new: the query carries the query defaults,
     the hook fetches once, and it requests nothing when disabled or without a course
     id. `master` has a file at this path with cases for eleven other hooks and queries
     and none of its own for `useCoursewareMetadata`, which only does the fetching in
     its `useSequenceIds` and `useIsCourseLoaded` cases; #2195 ports those into this
     file. Leaving the new file out loses one branch, the hook called with no options,
     which is `master`'s signature and has no caller yet.
   - `getCourseMetadata` and the normalizer get no cases of their own. A first version
     had three (the request URL, the normalized shape, the clock offset). Leaving them
     out lost no line or branch, since the progress cases run both, and they asserted
     behaviour the port does not change, so they were dropped.
   - Two comments in the lower layers' tests became false and are corrected:
     `course-exit/utils.test.ts` said both courseware queries are stubs, and
     `ProgressTabComponents.test.tsx` said nothing on the tab loads the courseware
     metadata.

9. **One commit.** The fix, the slice it needs and their tests. A split into failing
   tests and then the fix was considered and not made for this layer.

10. **Coverage at this layer.** 100% of lines for the package. Counted from the local
    coverage report the way Codecov counts a patch, the layer adds 17 lines with none
    missed or partly covered. The `useMinimalCourseOutline` stub's function is not
    called (#2195).

11. **The manual pass: the real request, and the card going away once.** The suite
    answers the new request from a factory, so the first look is the real request from
    the real app and the real response's `entrance_exam_passed`. Setting up a course
    with an entrance exam was not worth it for the second look: a local patch, never
    committed, edits the two responses where they arrive, so the normalizer and
    everything after it run as they are. The patch gives the progress response an
    `unverified` certificate, not a `requesting` one, whose card has a button that
    posts a certificate request.

</details>

<details>
<summary>Manual testing</summary>

The layer makes the progress page wait for one more request, `GET /api/courseware/course/<id>`,
and hides the certificate card when that response says the entrance exam is not passed.
The suite fakes the request, so what needs eyes is the real request in the real app, and
the card going away once in a real browser. A course with an entrance exam is not needed:
the second look fakes the two responses with a local patch.

### Setup

- The dev site as for the progress tab layer, on `bsmith/progress-entrance-exam`.
- The same enrolled learner and the demo course.
- For look 2 only, the fakes: the patch below, applied with `git apply` and taken out
  with `git apply -R` when done. It is never committed. It changes two request
  functions:
  - `getProgressTabData`: the response's `certificate_data` becomes
    `{ cert_status: 'unverified' }` and `verification_data.status` becomes `'pending'`, so
    a certificate card with no button shows.
  - `getCourseMetadata`: the response's `entrance_exam_data.entrance_exam_passed` becomes
    `false`, only when the page URL has `?exam=failed`.

  The same two edits as browser overrides on the two responses do the same job.

```diff
diff --git a/frontend-base/src/course-home/data/api.ts b/frontend-base/src/course-home/data/api.ts
index 06302270..ae6fa19b 100644
--- a/frontend-base/src/course-home/data/api.ts
+++ b/frontend-base/src/course-home/data/api.ts
@@ -203,6 +203,9 @@ export async function getProgressTabData(courseId: string, targetUserId?: string
 
   try {
     const { data } = await getAuthenticatedHttpClient().get(url);
+    // Manual pass fake, never committed: a certificate card with no button.
+    data.certificate_data = { cert_status: 'unverified' };
+    data.verification_data = { ...data.verification_data, status: 'pending' };
     const camelCasedData = camelCaseObject(data);
 
     // We replace gradingPolicy.gradeRange with the original data to preserve the intended casing for the grade.
diff --git a/frontend-base/src/courseware/data/api.js b/frontend-base/src/courseware/data/api.js
index 5345526e..746039c5 100644
--- a/frontend-base/src/courseware/data/api.js
+++ b/frontend-base/src/courseware/data/api.js
@@ -6,5 +6,9 @@ export async function getCourseMetadata(courseId) {
   let url = `${getSiteConfig().lmsBaseUrl}/api/courseware/course/${courseId}`;
   url = appendBrowserTimezoneToUrl(url);
   const metadata = await getAuthenticatedHttpClient().get(url);
+  // Manual pass fake, never committed: the entrance exam reads as not passed when the page URL has ?exam=failed.
+  if (window.location.search.includes('exam=failed')) {
+    metadata.data.entrance_exam_data.entrance_exam_passed = false;
+  }
   return normalizeCoursewareMeta(metadata);
 }
```

### Two looks

- [x] **1. The request, for real** (no fakes) — open
      `http://apps.local.openedx.io:2000/learning/course/course-v1:OpenedX+DemoX+DemoCourse/progress`
      with DevTools' Network panel filtered to `courseware`, and reload. There is one
      request to `/api/courseware/course/course-v1:OpenedX+DemoX+DemoCourse`, with a
      `browser_timezone` parameter and status 200. Its response has
      `entrance_exam_data.entrance_exam_passed`, and the value is `true` or `false`. The
      page renders as it did on the progress tab layer.
      *Why here:* the page now waits for this request and shows the tab's error view
      when it fails; the suite answers it from a factory, so neither the real request
      nor the real response's field has been seen.
      *Please note:* the value of `entrance_exam_passed` you see.
- [x] **2. The card with the entrance exam not passed** (fakes applied) — reload the
      same page: a "Certificate status" card shows, saying the ID verification is
      pending. Add `?exam=failed` to the URL and load it: the card is not there, and it
      does not flash in while the page loads. The rest of the page is unchanged.
      *Why here:* this is the layer's one visible change, and it has only run in jsdom.

### Optional

- [x] **A staff view** (needs a staff session and a learner's user id; no fakes) —
      `…/progress/<userId>` with Network filtered to `courseware`: no request to
      `/api/courseware/course/`. The suite asserts this; this only adds the real route.

### Checked outside the app

- **Lint, tests and both builds** at the layer's commit, 2026-11-11: all pass. 36
  suites, 412 passed, 7 skipped, 100% of lines.
- **The fakes** — with the patch applied, the suite's "Entrance exam status" cases were
  run twice, 2026-11-12. With the test page's URL as it is, "shows the certificate card
  to a learner who has passed the entrance exam" passes, and the visited event carries
  `certificate_status_variant: 'unverified'`: the faked card renders, with no console
  output. With the URL set to `http://localhost/?exam=failed`, the same case fails
  with the card not found: the switch hides it. The patch was then taken back out.

### Left to the suite

`ProgressTab.test.jsx`, "Entrance exam status":

- No card, and one visited event, for a learner who has not passed the entrance exam.
- The card for a learner who has passed it.
- One courseware metadata request on the learner's own page; none on another learner's.
- Another learner's card shows when the requester's own page left a not-passed status in
  the query cache.

`courseware/data/apiHooks.test.tsx`: the hook fetches once, and requests nothing when
disabled or without a course id.

### Not this layer

Everything in the progress tab layer's section. The courseware pages that also read this
query port with #2195 and #2196.

### Results

**2026-11-12, Brian, on the dev site, on `bsmith/progress-entrance-exam`,** with the
fakes patch applied for the whole pass and taken out afterwards.

- Brian ticked both looks and the optional staff view.
- Look 1 ran with the fakes applied. The Network panel shows the response as it arrived,
  before the patch edits it, so the request and the field are the real ones; the page
  itself already carried the faked certificate data.
- Look 2: during the pass Brian quoted the card as "Certificate status — In order to
  qualify for a certificate, you must have a passing grade", the "not passing" card, not
  the "ID verification is pending" card the step names. With the faked `unverified`
  certificate either card can show, depending on the course home metadata's
  `can_view_certificate`; the step's wording was a guess at which.
- Look 1: `entrance_exam_passed` was `true` in the real response (Brian, asked
  afterwards). The demo course has no entrance exam.
- Look 2: the "not passing" card is what showed at the plain URL (Brian, asked
  afterwards), and it was gone with `?exam=failed`.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
