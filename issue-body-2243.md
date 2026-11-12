The progress tab's certificate card takes the learner's entrance exam status into account, but it never has it: the card reads the courseware metadata from the query cache without fetching, and nothing on the progress page fetches it. A learner who has not passed the entrance exam sees the certificate card the course would show without an exam. This has been so since #1429 added the check. This issue is the learner viewing their own progress; staff viewing another learner's progress is #2244, since the endpoint cannot answer for that learner.

**Status (2026-11-12):** #2249 fixes this in the frontend-base version of Learning, the package under `frontend-base/` on the `frontend-base` branch. The frontend-build and frontend-platform version under `src/` still has the bug. If a fix is wanted there, #2249's change needs to be backported to it.

> [!NOTE]
> This issue was written by Claude (Claude Code) and reviewed before posting.

<details>
<summary> Claude Plan </summary>

## Mechanism

- [`CertificateStatus.jsx`](https://github.com/openedx/frontend-app-learning/blob/363bc1e43a1c62199c35f0bf5d83fcd1a8fdf90a/src/course-home/progress-tab/certificate-status/CertificateStatus.jsx#L21-L23) reads `useCoursewareMetadata(courseId, { enabled: false }).data`, a cache read with no fetch, and passes `entranceExamData?.entranceExamPassed ?? null` to `getCourseExitMode` ([L48-L57](https://github.com/openedx/frontend-app-learning/blob/363bc1e43a1c62199c35f0bf5d83fcd1a8fdf90a/src/course-home/progress-tab/certificate-status/CertificateStatus.jsx#L48-L57)). `false` yields `COURSE_EXIT_MODES.entranceExamFail`, which no branch of the card matches, so no card renders; `null` means "no exam".
- The only fetchers of the courseware metadata query are the courseware container and the course exit page. [`ProgressTab.jsx`](https://github.com/openedx/frontend-app-learning/blob/363bc1e43a1c62199c35f0bf5d83fcd1a8fdf90a/src/course-home/progress-tab/ProgressTab.jsx#L57-L58) runs the course-home metadata and progress queries only, and every path into the progress tab is a full page load (the course tab links are anchors), so the cache is always empty when the card renders: `entranceExamPassed` is always `null`.
- The LMS exposes `entrance_exam_passed` only in the courseware metadata API ([`courseware_api/views.py`](https://github.com/openedx/edx-platform/blob/d3a86602dcf70bbf4f7925727bcc50ff10e51109/openedx/core/djangoapps/courseware_api/views.py#L234)); neither the progress response nor the course-home course metadata carries it.

## History

- #1429 (2024-09, fixing #1415) added `entranceExamPassed` to `getCourseExitMode` so the unit navigation disables the Next button, and added the argument at the card's call site reading `useModel('coursewareMeta', courseId)`. The course-home thunk never added a `coursewareMeta` model, and `useModel` returned `{}` for a missing model, so the read was empty from the start. No test covered the card's entrance exam branch.
- #2140 (2026-10) converted the read to `useCoursewareMetadata(courseId, { enabled: false })`, preserving the behavior.

## What a learner sees

With the entrance exam not passed, the card renders as for a course without one: a non-passing learner sees the "not passing" card, an audit learner the upgrade card, and so on. #1429 wired the status into the card, and with the status the card renders nothing. Neither #1429 nor #1415 says the progress tab was meant to change, so that intent is read from #1429's code.

## Fix

- `ProgressTab` runs `useCoursewareMetadata(courseId)` as a fetching query beside the progress query and passes `tabDataQueries: [tabDataQuery, coursewareMetadataQuery]` to `TabWithTimer`, the array form [`TabPage`](https://github.com/openedx/frontend-app-learning/blob/363bc1e43a1c62199c35f0bf5d83fcd1a8fdf90a/src/tab-page/TabPage.tsx#L22-L27) already takes and the outline tab uses. The card keeps its cache read of a cache the page now fills.
- The gate matters: without it the card mounts before the response, computes its state with `null`, sends its `visited` event from that render (its effect runs once), and then re-renders; a gated learner sees the card paint and vanish.
- Only when no `targetUserId` is in the route. On `progress/:targetUserId` the courseware metadata endpoint answers for the requester, not the learner, so that page does not fetch and keeps `null`; see #2244.
- Costs to weigh in the pull request: one more request per progress load; a failure of that endpoint becomes the tab's error page where today the card ignores it; the endpoint records user activity for the requester ([L717](https://github.com/openedx/edx-platform/blob/d3a86602dcf70bbf4f7925727bcc50ff10e51109/openedx/core/djangoapps/courseware_api/views.py#L717)).
- Tests: the progress suite gains the gated case (no certificate card, and the `visited` event's `certificate_status_variant` for it), the ungated case, and the request count.

## Acceptance

- [ ] A learner who has not passed the entrance exam sees no certificate card on their progress tab, in one render, and the `visited` event reflects it
- [ ] A learner who has passed it, or a course without one, sees the card as today
- [ ] The progress tab requests the courseware metadata once per load when viewing one's own progress, and not on `progress/:targetUserId`

</details>
