**Goal:** find out why the courseware metadata API sends the course name HTML-escaped, and decide what, if anything, should change — in openedx-platform, in this MFE, or both.

**Context.** Found while converting the courseware's `coursewareMeta` reads to React Query (#2089). `normalizeCoursewareMeta` (`src/courseware/data/coursewareMeta.ts`) mapped the endpoint's `name` to `title`, and two readers put that `title` in a page `<title>`: `Course.jsx` (the courseware page) and `CourseCelebration.jsx` (the course-end page). For a course named "R&D" the value is "R&amp;D", and React renders those characters as-is, so the browser tab shows "R&amp;D". #2089 stops mapping `name` to `title` and reads the course title from the learning-sequences outline instead; this issue is for the question that leaves open.

**What we know**

The MFE reads a course title from three course-level metadata endpoints, and only one escapes it:

| Endpoint | MFE query | Field | Source in openedx-platform |
|---|---|---|---|
| `/api/courseware/course/{course_id}` | `useCoursewareMetadata` | `name` | `display_name_with_default_escaped` (`openedx/core/djangoapps/courseware_api/serializers.py`) — **HTML-escaped** |
| `/api/learning_sequences/v1/course_outline/{course_id}` | `useMinimalCourseOutline` | `title` | written at publish from `display_name_with_default` (`cms/djangoapps/contentstore/outlines.py`) |
| `/api/course_home/course_metadata/{course_id}` | `useCourseHomeMeta` | `title` | `course.display_name_with_default` (`lms/djangoapps/course_home_api/course_metadata/views.py`) |

- The courseware API has used the escaped property since it was added (openedx-platform `1aa8c9c53d`, 2020-01-14, "Add a new courseware API Django app to support the courseware micro-frontend"). It is the only `_escaped` field in that app. Still present on openedx-platform `master` (`037eb6a6e4` as of writing).
- The property's docstring marks it deprecated: "DEPRECATED: use display_name_with_default … This newly introduced method should not be used. It was only introduced to enable a quick search/replace and the ability to slowly migrate and test switching to display_name_with_default, which is no longer escaped." (`openedx/core/djangoapps/content/course_overviews/models.py`).
- In this MFE the escaped value was invisible until #2023: `fetchCourse` fetched the courseware metadata and the learning-sequences outline together and always wrote the outline's `title` over the metadata's, so the unescaped one won. #2023 split them into independent queries mirrored into the model store as each arrived, so the page title took whichever response landed last. #2089 removes the choice by not mapping `name` at all.

**Open questions**

- Why the courseware API chose the escaped property — deliberate (some consumer renders it as HTML), or a carry-over from the XSS migration the docstring describes.
- Who else consumes `/api/courseware/course/`'s `name`, and whether switching the serializer to `display_name_with_default` would break any of them.
- Whether any other text in that response is escaped server-side without being marked as such.
- Whether this MFE should standardize on one source for the course title (the course-home metadata's `title` is already the most widely read — the tab-page header, the social share links, and the sidebar widgets' `course` object).

**Not in scope:** the #2089 conversion itself, which already reads an unescaped title.

> [!NOTE]
> This issue was authored by Claude (Claude Code) and reviewed before posting.
