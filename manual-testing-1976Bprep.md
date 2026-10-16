# Manual testing — restore the 403 detail message (#1976, layer B-prep)

In-browser verification for layer B-prep, against tutor local
(`http://apps.local.openedx.io:2000/learning`, DemoX). The observable change
in this layer is the restored 403 detail message on converted course-home
tabs.

## Verify by hand

- [ ] **403 detail on a course-home tab** — as a learner who gets a 403 with
  a `detail` body from the course-home metadata endpoint (e.g. a course
  restricted from them; check the Network tab for the 403's response body),
  open `/course/{courseId}/dates`: the page shows the response's specific
  detail text instead of the generic "There was an error loading this
  course." If no local course produces a 403-with-detail, note it and lean on
  the TabPage suite (the extraction and both generic fallbacks are pinned
  there).
- [x] **No regression on healthy tabs** — dates/progress/outline render
  normally for an enrolled learner.

## Results

Env: tutor local (DemoX), 2026-09-16, run against the local branch @
`731f3b14` (before any push).

The healthy-tabs check passed: dates/progress/outline render normally for an
enrolled learner, no console errors.

The **403-detail check was not run by hand** — no local course produced a
403-with-`detail` body from the course-home metadata endpoint. It rests on
the automated coverage: the TabPage suite pins the extraction (metadata-query
403 detail, tab-data-query 403 detail, non-403 → generic, bodyless 403 →
generic), and `CourseExit.test`'s pre-existing "surfaces the 403 access
detail" integration test exercises the full path — a mocked 403-with-body on
the courseHomeMeta endpoint through `getErrorDetail` to the rendered
paragraph — and passes unchanged on the new sourcing.
