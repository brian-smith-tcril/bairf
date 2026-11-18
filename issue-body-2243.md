The progress tab's certificate card ignores the entrance exam. #1429 (2024-09) gave the card a check for it, but the check reads a value the progress tab never loads, so it has never run: a learner who has not passed the exam sees the card the course would show without one. The value it would read, `entrance_exam_passed`, is also `false` for a learner allowed to skip the exam and for enrolled course staff, so the card cannot use it as it stands. This is read from the code of frontend-app-learning and edx-platform. It has not been observed on a course with an entrance exam. Staff viewing another learner's progress is #2244.

**Status (2026-11-18):** in the frontend-base version of Learning, the package under `frontend-base/` on the `frontend-base` branch, #2249 removes the card's read, so the card ignores the exam there on purpose until a response says whether the learner is held back. The call keeps the argument as a commented-out line that links here. #2249's first version made the check run, and [review](https://github.com/openedx/frontend-app-learning/pull/2249#discussion_r4566252439) reversed it. The frontend-build and frontend-platform version under `src/` is unchanged.

> [!NOTE]
> This issue was written by Claude (Claude Code) and reviewed before posting.

<details>
<summary> Claude Plan </summary>

## Mechanism

- [`CertificateStatus.jsx`](https://github.com/openedx/frontend-app-learning/blob/363bc1e43a1c62199c35f0bf5d83fcd1a8fdf90a/src/course-home/progress-tab/certificate-status/CertificateStatus.jsx#L21-L23) reads `useCoursewareMetadata(courseId, { enabled: false }).data`, a cache read with no fetch, and passes `entranceExamData?.entranceExamPassed ?? null` to `getCourseExitMode` ([L48-L57](https://github.com/openedx/frontend-app-learning/blob/363bc1e43a1c62199c35f0bf5d83fcd1a8fdf90a/src/course-home/progress-tab/certificate-status/CertificateStatus.jsx#L48-L57)). `false` yields `COURSE_EXIT_MODES.entranceExamFail`, which no branch of the card matches, so no card renders; `null` means "no exam".
- The only fetchers of the courseware metadata query are the courseware container and the course exit page. [`ProgressTab.jsx`](https://github.com/openedx/frontend-app-learning/blob/363bc1e43a1c62199c35f0bf5d83fcd1a8fdf90a/src/course-home/progress-tab/ProgressTab.jsx#L57-L58) runs the course-home metadata and progress queries only, and every path into the progress tab is a full page load (the course tab links are anchors), so the cache is always empty when the card renders: `entranceExamPassed` is always `null`.
- `entrance_exam_passed` is only in the courseware metadata response, `GET /api/courseware/course/` ([`courseware_api/views.py`](https://github.com/openedx/edx-platform/blob/d3a86602dcf70bbf4f7925727bcc50ff10e51109/openedx/core/djangoapps/courseware_api/views.py#L234)); neither the progress response nor the course-home course metadata carries it.

## What `entrance_exam_passed` says

- It is [`user_has_passed_entrance_exam`](https://github.com/openedx/edx-platform/blob/d3a86602dcf70bbf4f7925727bcc50ff10e51109/lms/djangoapps/courseware/entrance_exams.py#L47-L56): `True` when the milestones subsystem has no entrance exam content outstanding for the user.
- The exemptions are in [`user_can_skip_entrance_exam`](https://github.com/openedx/edx-platform/blob/d3a86602dcf70bbf4f7925727bcc50ff10e51109/lms/djangoapps/courseware/entrance_exams.py#L29-L44), which the field does not consult: a user with course staff access, and a learner an instructor allowed to skip the exam (`EntranceExamConfiguration`).
- So `false` covers two kinds of learner: one the exam holds back, and one who can take the whole course without passing it.
- [`entrance_exam_data`](https://github.com/openedx/edx-platform/blob/d3a86602dcf70bbf4f7925727bcc50ff10e51109/openedx/core/djangoapps/courseware_api/views.py#L219-L235) has five fields (current score, enabled, id, minimum score, passed). None says the learner may skip, so the frontend cannot tell the two apart.

## History

- #1429 (2024-09, fixing #1415) added `entranceExamPassed` to `getCourseExitMode` so the unit navigation disables the Next button, and added the argument at the card's call site reading `useModel('coursewareMeta', courseId)`. The course-home thunk never added a `coursewareMeta` model, and `useModel` returned `{}` for a missing model, so the read was empty from the start. No test covered the card's entrance exam branch.
- #2140 (2026-10) converted the read to `useCoursewareMetadata(courseId, { enabled: false })`, preserving the behavior.
- #2249's first version (2026-11-12) fetched the courseware metadata on a learner's own progress page and waited for it, so the check ran. It was reversed before merging, for the reason in the section above.

## What a learner sees

- Today, with the entrance exam not passed, the card renders as for a course without one: a non-passing learner sees the "not passing" card, an audit learner the upgrade card, and so on. Each is true of that learner.
- With the check running on `entrance_exam_passed`, the card renders nothing for every learner whose value is `false`. A learner allowed to skip the exam, and enrolled course staff, would lose the cards for requesting a certificate, verifying their identity and upgrading.
- Neither #1429 nor #1415 says the progress tab was meant to change. That the card was meant to hide is read from #1429's code alone.

## To find out

- Is the card meant to hide for a learner the entrance exam holds back?
- If it is, which response tells the progress tab that a learner is held back, with the skip exemptions counted? None does today. #2244 asks the same of the progress response for the staff view.

## Acceptance

- [ ] It is settled whether the card hides for a learner the entrance exam holds back
- [ ] If it hides, the card reads a value that counts the skip exemptions: a learner allowed to skip the exam, and enrolled course staff, see the card
- [ ] A learner who has passed the exam, or a course without one, sees the card as today

</details>
