The outline tab's course end alert and certificate status alert ignore the learner's time zone preference. Their dates are formatted in the browser's time zone; every other date on the tab uses the preference. The cause is the one in #2148, which #2149 fixed for the sequence due dates.

Both versions of Learning are affected: the frontend-build and frontend-platform version under `src/`, and the frontend-base version under `frontend-base/` on the `frontend-base` branch, where #2252 (open) ports the two alerts with the same reads.

> [!NOTE]
> This issue was written by Claude (Claude Code) and reviewed before posting.

<details>
<summary> Claude Plan </summary>

## Mechanism

Read from the code at the linked commits; not reproduced in a browser.

- Both alerts' hooks read `userTimezone` as a top-level key of the outline data: [`useCourseEndAlert`](https://github.com/openedx/frontend-app-learning/blob/363bc1e43a1c62199c35f0bf5d83fcd1a8fdf90a/src/course-home/outline-tab/alerts/course-end-alert/hooks.js#L13-L18) and [`useCertificateStatusAlert`](https://github.com/openedx/frontend-app-learning/blob/363bc1e43a1c62199c35f0bf5d83fcd1a8fdf90a/src/course-home/outline-tab/alerts/certificate-status-alert/hooks.js#L38-L47). The outline data has no such key ([`normalizeCourseHomeOutline`](https://github.com/openedx/frontend-app-learning/blob/363bc1e43a1c62199c35f0bf5d83fcd1a8fdf90a/src/course-home/data/courseHomeOutline.ts#L278-L298)): the outline response carries `user_timezone` only inside `dates_widget` ([`outline/serializers.py`](https://github.com/openedx/openedx-platform/blob/d3a86602dcf70bbf4f7925727bcc50ff10e51109/lms/djangoapps/course_home_api/outline/serializers.py#L118-L126), [`outline/views.py`](https://github.com/openedx/openedx-platform/blob/d3a86602dcf70bbf4f7925727bcc50ff10e51109/lms/djangoapps/course_home_api/outline/views.py#L235-L239)). So each hook puts `undefined` in its alert's payload.
- Each alert builds its format arguments as `userTimezone ? { timeZone: userTimezone } : {}` ([`CourseEndAlert.jsx`](https://github.com/openedx/frontend-app-learning/blob/363bc1e43a1c62199c35f0bf5d83fcd1a8fdf90a/src/course-home/outline-tab/alerts/course-end-alert/CourseEndAlert.jsx#L23), [`CertificateStatusAlert.jsx`](https://github.com/openedx/frontend-app-learning/blob/363bc1e43a1c62199c35f0bf5d83fcd1a8fdf90a/src/course-home/outline-tab/alerts/certificate-status-alert/CertificateStatusAlert.jsx#L61)), so its dates are formatted in the browser's time zone.
- The reads were right until #606 (`70e2aa02`, 2021), which moved the tab's time zone reads to the course metadata. In these two hooks it took `userTimezone` out of the `datesWidget` nesting and left the read on the outline data, as it did in the read #2148 describes:

  ```diff
     const {
       datesWidget: {
         courseDateBlocks,
  -      userTimezone,
       },
  +    userTimezone,
     } = useModel('outline', courseId);
  ```

- **The certificate status alert has a second fault.** It spreads the format arguments onto its `FormattedMessage`, which has no `timeZone` prop, and the two `FormattedDate` elements inside the message get none ([`CertificateStatusAlert.jsx`](https://github.com/openedx/frontend-app-learning/blob/363bc1e43a1c62199c35f0bf5d83fcd1a8fdf90a/src/course-home/outline-tab/alerts/certificate-status-alert/CertificateStatusAlert.jsx#L61-L75)). With a time zone in its payload, the alert would still format both dates in the browser's time zone.

## Where it shows

- **Course end alert**, shown to an enrolled learner in the 14 days before the course ends ([`hooks.js`](https://github.com/openedx/frontend-app-learning/blob/363bc1e43a1c62199c35f0bf5d83fcd1a8fdf90a/src/course-home/outline-tab/alerts/course-end-alert/hooks.js#L20-L23)). In the last day it reads "This course is ending {timeRemaining} at {courseEndTime}.", a date, a time and a time zone abbreviation. Before that it reads "This course is ending {timeRemaining} on {courseEndDate}.", a date only.
- **Certificate status alert**, in the "earned but not available" status: "This course ends on {courseEndDateFormatted}. Final grades and any earned certificates are scheduled to be available after {certificateAvailableDate}.", both dates only.
- A date with no time differs between the two time zones only when they put the instant on different days.

## Elsewhere on the tab

The other dates on the tab read `userTimezone` from the course metadata, which carries it ([`course_metadata/views.py`](https://github.com/openedx/openedx-platform/blob/d3a86602dcf70bbf4f7925727bcc50ff10e51109/lms/djangoapps/course_home_api/course_metadata/views.py#L148), [`api.ts`](https://github.com/openedx/frontend-app-learning/blob/363bc1e43a1c62199c35f0bf5d83fcd1a8fdf90a/src/course-home/data/api.ts#L36)): the dates widget ([`CourseDates.jsx`](https://github.com/openedx/frontend-app-learning/blob/363bc1e43a1c62199c35f0bf5d83fcd1a8fdf90a/src/course-home/outline-tab/widgets/CourseDates.jsx#L13)), the sequence due dates since #2149 ([`SequenceDueDate.tsx`](https://github.com/openedx/frontend-app-learning/blob/363bc1e43a1c62199c35f0bf5d83fcd1a8fdf90a/src/course-home/outline-tab/section-outline/SequenceDueDate.tsx#L25)), the course start alert ([`CourseStartAlert.jsx`](https://github.com/openedx/frontend-app-learning/blob/363bc1e43a1c62199c35f0bf5d83fcd1a8fdf90a/src/alerts/course-start-alert/CourseStartAlert.jsx#L23-L26)) and the access expiration alert ([`hooks.ts`](https://github.com/openedx/frontend-app-learning/blob/363bc1e43a1c62199c35f0bf5d83fcd1a8fdf90a/src/alerts/access-expiration-alert/hooks.ts#L38)).

#2148 said, from the code and not observed, that the course end alert shows the preference's time zone. It does not.

## Fix

- `useCourseEndAlert` and `useCertificateStatusAlert` read `userTimezone` from `useCourseHomeMeta(courseId, { enabled: false }).data`, as `CourseDates.jsx` does.
- `CertificateStatusAlert.jsx` spreads the format arguments onto its two `FormattedDate` elements in place of the `FormattedMessage`.
- Tests: the outline suite gains a case for each alert under a course metadata response whose `user_timezone` puts the alert's date on a different day than the browser's time zone does, asserting the date in the preference's time zone, as #2149's case does for a sequence due date.

## Acceptance

- [ ] With `user_timezone` in the course metadata response, the course end alert's date and time are formatted in that time zone
- [ ] With `user_timezone` in the course metadata response, the certificate status alert's two dates are formatted in that time zone
- [ ] With no `user_timezone`, both alerts format their dates in the browser's time zone, as today

</details>
