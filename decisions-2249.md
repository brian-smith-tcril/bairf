# Decisions: the entrance exam status on the progress tab (#2249)

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

12. **The red `codecov/project` after the rebase onto `frontend-base` was an upload race,
    not a drop (2026-11-12).** Codecov compared the head against a base report that held
    only the package's upload. Brian re-ran the two test workflows and the check passes,
    96.78% to 96.79%. The timings and the sign to look for are entry 42 of
    `decisions-1905.md`.
