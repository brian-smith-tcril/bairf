The outline tab links to the dates tab when the learner's tab list has no dates tab. Two cases: a course whose Dates tab is hidden, where the "View Course Schedule" button opens a dates page with no dates on it; and a learner who has not yet passed the entrance exam, for whom only the "Entrance Exam" tab is listed, where that button and the dates widget's "View all course dates" link both open the dates page.

**Status (2026-11-12):** the frontend-base port of the outline tab (#2191) fixes this in the frontend-base version of Learning, the package under `frontend-base/` on the `frontend-base` branch. The frontend-build and frontend-platform version under `src/` has the bug. If a fix is wanted there, it needs its own change.

> [!NOTE]
> This issue was written by Claude (Claude Code) and reviewed before posting.

<details>
<summary> Claude Plan </summary>

## Mechanism

Read from the code at the linked commits; not reproduced in a browser.

- Both links take `datesTabLink` from the outline response: the anchor in [`CourseDates.jsx`](https://github.com/openedx/frontend-app-learning/blob/363bc1e43a1c62199c35f0bf5d83fcd1a8fdf90a/src/course-home/outline-tab/widgets/CourseDates.jsx#L38-L40), and the button in [`ScheduledCotentAlert.jsx`](https://github.com/openedx/frontend-app-learning/blob/363bc1e43a1c62199c35f0bf5d83fcd1a8fdf90a/src/course-home/outline-tab/alerts/scheduled-content-alert/ScheduledCotentAlert.jsx#L27-L36), whose only gate is `datesTabLink &&`. The outline view sets `dates_tab_link` for every course without looking at the tab ([`outline/views.py`](https://github.com/openedx/openedx-platform/blob/d3a86602dcf70bbf4f7925727bcc50ff10e51109/lms/djangoapps/course_home_api/outline/views.py#L224)), so the gate is always true.
- The tab list is the course metadata response's `tabs`, built by [`get_course_tab_list`](https://github.com/openedx/openedx-platform/blob/d3a86602dcf70bbf4f7925727bcc50ff10e51109/lms/djangoapps/courseware/tabs.py#L327-L359). It has no dates tab when the tab is hidden ([`DatesTab.is_enabled`](https://github.com/openedx/openedx-platform/blob/d3a86602dcf70bbf4f7925727bcc50ff10e51109/lms/djangoapps/courseware/tabs.py#L319-L324); the tab is `is_hideable`), and it has only the courseware tab, renamed "Entrance Exam", for a learner who must complete the entrance exam ([L337-L345](https://github.com/openedx/openedx-platform/blob/d3a86602dcf70bbf4f7925727bcc50ff10e51109/lms/djangoapps/courseware/tabs.py#L337-L345)).
- **Hidden tab.** The outline view and the dates view both empty `course_date_blocks` when `DatesTab.is_enabled` is false ([`outline/views.py`](https://github.com/openedx/openedx-platform/blob/d3a86602dcf70bbf4f7925727bcc50ff10e51109/lms/djangoapps/course_home_api/outline/views.py#L258-L264), [`dates/views.py`](https://github.com/openedx/openedx-platform/blob/d3a86602dcf70bbf4f7925727bcc50ff10e51109/lms/djangoapps/course_home_api/dates/views.py#L114-L118)). The dates widget renders nothing without blocks ([`CourseDates.jsx`](https://github.com/openedx/frontend-app-learning/blob/363bc1e43a1c62199c35f0bf5d83fcd1a8fdf90a/src/course-home/outline-tab/widgets/CourseDates.jsx#L21-L23)), so its link is not shown. The scheduled content alert, shown to an enrolled learner in a course with unreleased content ([`hooks.js`](https://github.com/openedx/frontend-app-learning/blob/363bc1e43a1c62199c35f0bf5d83fcd1a8fdf90a/src/course-home/outline-tab/alerts/scheduled-content-alert/hooks.js#L18-L30)), still shows its button, and the dates page it opens gets an empty `course_date_blocks`.
- **Entrance exam.** `DatesTab.is_enabled` is still true, so the widget renders with its link, the alert shows its button, and the dates page lists the course's dates.

## Elsewhere in Learning

The course exit page's in-progress view gates the same kind of button on the tab list: [`CourseInProgress.jsx`](https://github.com/openedx/frontend-app-learning/blob/363bc1e43a1c62199c35f0bf5d83fcd1a8fdf90a/src/courseware/course/course-exit/CourseInProgress.jsx#L28) reads `useDatesTabUrl()`, the dates tab's URL from `tabs`, and renders its schedule button only when there is one ([L44-L48](https://github.com/openedx/frontend-app-learning/blob/363bc1e43a1c62199c35f0bf5d83fcd1a8fdf90a/src/courseware/course/course-exit/CourseInProgress.jsx#L44-L48)).

## Fix

- `CourseDates.jsx` and the scheduled content alert read `useDatesTabUrl()` in place of the response's `datesTabLink`, and render the link or button only when the hook returns a URL, as `CourseInProgress.jsx` does.
- Tests: the outline suite gains, for a course whose `tabs` has no dates tab, a case with date blocks and no "View all course dates" link, and a case with scheduled content and no "View Course Schedule" button.

## Acceptance

- [ ] A course whose `tabs` has no dates tab shows no "View Course Schedule" button in the scheduled content alert and no "View all course dates" link in the dates widget
- [ ] A course with a dates tab shows both as today

</details>
