The outline tab throws for a learner without access when the outline request fails. A learner with access gets the tab page's error message in the same case.

This has not been seen on a running site or reported by anyone. It comes from reading the code, after a test in the frontend-base port failed on the throw; it has not been reproduced in a browser, and not run on `master`.

> [!NOTE]
> This issue was written by Claude (Claude Code) and reviewed before posting.

<details>
<summary> Claude Plan </summary>

Read from the code at the linked commits.

## How the tab page picks what to render

- The outline tab hands the tab page two queries, the course metadata and the outline ([`OutlineTab.jsx`](https://github.com/openedx/frontend-app-learning/blob/df388386d60dd1f6b88249561ca3b1d87f1fc4c9/src/course-home/outline-tab/OutlineTab.jsx#L198-L212)).
- [`deriveView`](https://github.com/openedx/frontend-app-learning/blob/df388386d60dd1f6b88249561ca3b1d87f1fc4c9/src/tab-page/TabPage.tsx#L50-L70) checks them in this order: the metadata failed (error); either still pending (loading); the metadata says the learner has no access (denied); a tab-data query failed (error). So a learner without access whose outline request failed is "denied", and the failed query is never looked at.
- For a denied learner the tab page redirects when [`getAccessDeniedRedirectUrl`](https://github.com/openedx/frontend-app-learning/blob/df388386d60dd1f6b88249561ca3b1d87f1fc4c9/src/shared/access.js#L7-L40) returns a URL, and otherwise renders the tab's content ([`TabPage.tsx`](https://github.com/openedx/frontend-app-learning/blob/df388386d60dd1f6b88249561ca3b1d87f1fc4c9/src/tab-page/TabPage.tsx#L93-L102)): "The page renders once metadata resolves without error — loaded, or denied without a redirect (the outline tab shows the page to denied learners)."
- On the outline tab that function returns no URL for `authentication_required`, `enrollment_required` and every code its `switch` does not list ([`access.js`](https://github.com/openedx/frontend-app-learning/blob/df388386d60dd1f6b88249561ca3b1d87f1fc4c9/src/shared/access.js#L33-L38)). Those learners stay on the outline tab, which is where the not-enrolled view is shown.

## Where it throws

- `OutlineTabContent` destructures `courseBlocks: { courses, sections }` and `datesWidget: { courseDateBlocks }` out of `useOutlineTabData(courseId, { enabled: false }).data ?? {}` ([`OutlineTab.jsx`](https://github.com/openedx/frontend-app-learning/blob/df388386d60dd1f6b88249561ca3b1d87f1fc4c9/src/course-home/outline-tab/OutlineTab.jsx#L44-L59)). With no outline data that is `{}`, `courseBlocks` is undefined, and destructuring it throws a `TypeError` while the component renders.
- The same state while the outline request is still pending is handled: `deriveView` checks pending before denied, and two tests added by #1997 hold it ([`OutlineTab.test.jsx`](https://github.com/openedx/frontend-app-learning/blob/df388386d60dd1f6b88249561ca3b1d87f1fc4c9/src/course-home/outline-tab/OutlineTab.test.jsx#L124-L138), "waits for the outline data before rendering for a denied learner (no crash)"; [`TabPage.test.jsx`](https://github.com/openedx/frontend-app-learning/blob/df388386d60dd1f6b88249561ca3b1d87f1fc4c9/src/tab-page/TabPage.test.jsx#L243-L257), "shows loading when access is denied but the tab-data query is still pending"). No test in either file gives a denied learner a failed tab-data query.

## History

| When | Change | A denied learner on the outline tab whose outline request fails |
|---|---|---|
| before 2024-01-22 | `fetchTab` awaits the metadata and then the tab data; a failed tab-data request dispatches `fetchTabFailure` | the tab page's error message, as for every learner |
| 2024-01-22 | #1259 (`ab871670`): "If the learner doesn't even have access to the course (e.g. because the course starts in the future), don't worry about a 404 fetching the course outline since we're not planning to use it anyway." `fetchTab` dispatches `fetchTabDenied` "regardless of the tabDataResult" ([`thunks.js`](https://github.com/openedx/frontend-app-learning/blob/5fe995a9f42da5e9d14b444c4009ec8aac83d2f9/src/course-home/data/thunks.js#L57-L66)) | the tab page renders the tab's content for `denied`; `OutlineTab` reads `useModel('outline', courseId)`, which is `{}` for a missing model, and the same nested destructure throws ([`OutlineTab.jsx`](https://github.com/openedx/frontend-app-learning/blob/5fe995a9f42da5e9d14b444c4009ec8aac83d2f9/src/course-home/outline-tab/OutlineTab.jsx#L46-L59)) |
| 2026-08-21 | #1997 (`591d116b`) converts the outline tab from Redux to React Query; `deriveView` keeps the thunk's order, denied before a failed tab-data query | the same throw |

#1259's case, a learner who is then redirected, never renders the tab's content. The learners the outline tab keeps are the ones it left exposed.

## When the outline request fails for such a learner

Read from openedx-platform; none of it run.

- The course metadata view builds `course_access` from `check_course_access(course, request.user, 'load', check_if_enrolled=True, check_if_authenticated=True, apply_priority_access_checks=True)` ([`course_metadata/views.py`](https://github.com/openedx/openedx-platform/blob/46c8c9b4c86e9f7ec02d31293b2d0bb3f3638114/lms/djangoapps/course_home_api/course_metadata/views.py#L99-L106)): the course's own `load` check, then authentication, enrollment, a plugin's access filter, and the survey ([`courses.py`](https://github.com/openedx/openedx-platform/blob/46c8c9b4c86e9f7ec02d31293b2d0bb3f3638114/lms/djangoapps/courseware/courses.py#L163-L230)).
- The outline view gets its course from `get_course_or_403(request.user, 'load', course_key, check_if_enrolled=False)` ([`outline/views.py`](https://github.com/openedx/openedx-platform/blob/46c8c9b4c86e9f7ec02d31293b2d0bb3f3638114/lms/djangoapps/course_home_api/outline/views.py#L202)), which checks neither enrollment nor authentication. For `enrollment_required` and `authentication_required` it does not refuse the learner, so its request fails only when something else does: a server error, a timeout, a dropped connection.
- A `load` denial is refused by the outline view too. One of its codes is not in the frontend's `switch`: `not_visible_to_user`, for a course that is `visible_to_staff_only` ([`access.py`](https://github.com/openedx/openedx-platform/blob/46c8c9b4c86e9f7ec02d31293b2d0bb3f3638114/lms/djangoapps/courseware/access.py#L374-L380), [`access_response.py`](https://github.com/openedx/openedx-platform/blob/46c8c9b4c86e9f7ec02d31293b2d0bb3f3638114/lms/djangoapps/courseware/access_response.py#L174-L192)). For it `check_course_access_with_redirect` raises `CoursewareAccessException`, an `Http404` ([`courses.py`](https://github.com/openedx/openedx-platform/blob/46c8c9b4c86e9f7ec02d31293b2d0bb3f3638114/lms/djangoapps/courseware/courses.py#L310-L312)). Not read: whether the metadata view answers such a learner with that code or refuses earlier, in `course_detail`.

## How it was seen

- 2026-11-18, in the frontend-base version's tests, on the branch of #2262. Two cases of `CoursewareContainer.test.jsx` redirect a learner denied with `enrollment_required` or `authentication_required` to the course home. That suite renders Learning's whole route array, so the outline tab rendered there, and the suite had mocked no answer for the outline request. `OutlineTabContent` threw, and the package's tests, which fail on a console error, failed in two runs of five. The suite now answers the outline request.
- `master`'s version of that suite renders only the courseware routes, so it never renders the outline tab at that address.

## Questions

- What should a learner without access see on the course home when the outline cannot be loaded: the error message a learner with access gets, or the page without an outline?
- Which learners reach this in practice? For `enrollment_required` and `authentication_required` it takes a failed request. Is there an access code that leaves the learner on the outline tab and makes the outline view refuse them every time, `not_visible_to_user` or another?
- What does the learner see after the throw? Not observed.

</details>
