When staff open a learner's progress page (`progress/:targetUserId`), the certificate card cannot learn that learner's entrance exam status: the only endpoint that reports it answers for the requester, honors a `username` override only for global staff, and wants a username the page learns only from the progress response. The card ignores the entrance exam on every progress page today (#2243); this issue is what the staff view needs before that can change.

**Status (2026-11-18):** #2249 leaves the card reading no entrance exam status on any progress page in the frontend-base version of Learning, the package under `frontend-base/` on the `frontend-base` branch, so nothing on this page uses the requester's status. The frontend-build and frontend-platform version under `src/` is unchanged. The backend side is not started.

> [!NOTE]
> This issue was written by Claude (Claude Code) and reviewed before posting.

<details>
<summary> Claude Plan </summary>

## Mechanism

- The progress endpoint answers for the target: `GET api/course_home/v1/progress/{course_key}/{student_id}/` resolves the learner from the URL for a requester with course staff access ([`progress/views.py`](https://github.com/openedx/edx-platform/blob/d3a86602dcf70bbf4f7925727bcc50ff10e51109/lms/djangoapps/course_home_api/progress/views.py#L156-L186)).
- The courseware metadata endpoint answers for the requester: `entrance_exam_passed` is computed for `effective_user` ([`courseware_api/views.py`](https://github.com/openedx/edx-platform/blob/d3a86602dcf70bbf4f7925727bcc50ff10e51109/openedx/core/djangoapps/courseware_api/views.py#L234)), the requester after masquerade. A `username` parameter is honored only when `request.user.is_staff`, global staff ([L705-L709](https://github.com/openedx/edx-platform/blob/d3a86602dcf70bbf4f7925727bcc50ff10e51109/openedx/core/djangoapps/courseware_api/views.py#L705-L709)); course staff cannot use it. Learning's `getCourseMetadata(courseId)` sends none.
- The route carries the learner's numeric id; the username arrives only in the progress response, so even for global staff the status request would depend on the progress request.
- `entrance_exam_passed` has no staff exemption: [`user_has_passed_entrance_exam`](https://github.com/openedx/edx-platform/blob/d3a86602dcf70bbf4f7925727bcc50ff10e51109/lms/djangoapps/courseware/entrance_exams.py#L47-L56) asks the milestones subsystem for the user's outstanding milestone; the staff exemption is in `user_can_skip_entrance_exam`, which the field does not consult. A staff member who never sat the exam reports `false` for themselves.

## What would go wrong

If the card on this page read the courseware metadata, from a request or from the query cache, it would apply the staff member's own `false` to the learner's page: `entranceExamFail`, no certificate card, whatever the learner's state. Today that page shows the learner's "not passing", "upgrade" or "downloadable" card from the progress response, which is right as far as it goes.

## Frontend side

- The card reads no entrance exam status on any progress page (#2249). The progress tab makes no courseware metadata request, and the card does not read the query cache, which the requester's own courseware pages can fill with the requester's status. So this page stays as it is on a fresh load today.
- Tests: on `progress/:targetUserId`, no courseware metadata request, and the card as today with a failing status in the query cache.

## Backend side, a separate issue when picked up

The progress response saying, for the learner it already resolves, whether the entrance exam holds that learner back. `entrance_exam_passed` as the courseware metadata computes it is not that value: it is `false` for a learner allowed to skip the exam (#2243), so the progress response's value has to count `user_can_skip_entrance_exam` as well. The card then reads it from the progress data on a learner's own page and on this one, and the staff view is right for course staff as well as global staff. That is an openedx/edx-platform change (`lms/djangoapps/course_home_api/progress/`), filed there by whoever takes this up, with this issue updated to depend on it.

## Acceptance

- [ ] On `progress/:targetUserId` the progress tab makes no courseware metadata request and the certificate card renders as today, whatever the query cache holds
- [ ] The backend issue is filed and linked here before the frontend reads the status on this page

</details>
