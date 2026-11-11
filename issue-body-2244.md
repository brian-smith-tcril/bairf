When staff open a learner's progress page (`progress/:targetUserId`), the certificate card cannot learn that learner's entrance exam status: the only endpoint that reports it answers for the requester, honors a `username` override only for global staff, and wants a username the page learns only from the progress response. #2243 fixes the learner's own page; this one is the staff view, where the frontend has to leave the status unknown on purpose until the backend carries it in the progress response.

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

If the progress tab fetched the courseware metadata on this page as it does for the learner's own page, the card would apply the staff member's own `false` to the learner's page: `entranceExamFail`, no certificate card, whatever the learner's state. Today that page shows the learner's "not passing", "upgrade" or "downloadable" card from the progress response, which is right as far as it goes.

## Frontend side

- On `progress/:targetUserId` the progress tab does not run the courseware metadata query, does not gate on it and does not read its cache, which the requester's own pages can fill with the requester's status; the card keeps passing `null`, the "no information" value `getCourseExitMode` already handles, so the page stays as it is on a fresh load today. The condition carries this issue's URL and says why: the endpoint cannot answer for the target.
- The masquerade case needs nothing: with no target id, both endpoints apply the same masquerade and agree.
- Tests: the target-user case asserts no courseware metadata request and the card as today, with the query cache empty and with the requester's failing status in it.

## Backend side, a separate issue when picked up

The progress response adding `entrance_exam_passed` for the learner it already resolves. The card then reads it from the progress data on both pages, the own-page fetch and gate from #2243 become unnecessary, and the staff view is right for course staff as well as global staff. That is an openedx/edx-platform change (`lms/djangoapps/course_home_api/progress/`), filed there by whoever takes this up, with this issue updated to depend on it.

## Acceptance

- [ ] On `progress/:targetUserId` the progress tab makes no courseware metadata request and the certificate card renders as today, whatever the query cache holds
- [ ] The condition names this issue and the reason
- [ ] The backend issue is filed and linked here before the frontend reads the status on this page

</details>
