# Manual testing — move the 404 redirect to the legacy progress page out of `getProgressTabData` and into `ProgressTab` (#2104)

In-browser verification against a live backend (tutor dev).

What changed: `getProgressTabData` no longer navigates the page on a 404; the
query errors instead (and stays unlogged, as before). `ProgressTab`, the
component that owns that fetch, redirects to `/courses/:courseId/progress` on
the LMS when its query fails with a 404, rendering a bare spinner from the
render in which the 404 lands until the browser gets there. Any other fetcher
of the progress query reads an error and stays put.

**The bug this layer could introduce** is a course that used to fall back to the
legacy progress page and now shows an error view, or a spinner forever. The
first group below is for that. The second group is the reason for the layer: a
fetcher that is not the progress tab must no longer move the page.

## Setup

**Producing a real 404 without changing any config.** The endpoint 404s for a
bad `student_id` as well as for an opted-out course, and the frontend cannot
tell the two apart — same status, same empty body, same code path from the
response onward. So run the "opted-out" checks below as **staff** against an
ordinary course, using a `targetUserId` that matches no user:

    /course/:courseId/progress/999999

The alternative is the real thing: Django admin → Waffle → *Waffle flag course
overrides* → `course_home.course_home_mfe_progress_tab` for one course,
override **off** (or `Disable progress page stacked configs`). Not needed for
the frontend path; use it only if you want the learner-facing framing.

**Do not block the endpoint in the Network tab for this.** A blocked request
fails at the network level with no `response`, so `getResponseStatus` reads
undefined, the flag stays false, the query retries three times (only 4xx skips
retries) and `TabPage` shows its ordinary error view. That is correct and
unchanged for a non-404 failure, but it never reaches the redirect.

**One check needs a widget that fetches the progress query from the outline.**
Add it to `env.config.jsx` (untracked — check a stale local copy is not
carrying other overrides). It asks for the bad id so it gets the 404 too:

```jsx
import { PLUGIN_OPERATIONS, DIRECT_PLUGIN } from '@openedx/frontend-plugin-framework';
import { useParams } from 'react-router-dom';
import { useProgressTabData } from './src/course-home/data/apiHooks';

const ProgressProbe = () => {
  const { courseId } = useParams();
  const { status, error } = useProgressTabData(courseId, '999999');
  return <p data-testid="progress-probe">progress query: {status} {error?.response?.status ?? ''}</p>;
};

const config = {
  pluginSlots: {
    'org.openedx.frontend.learning.course_outline_tab_notifications.v1': {
      plugins: [{
        op: PLUGIN_OPERATIONS.Insert,
        widget: { id: 'progress-probe', type: DIRECT_PLUGIN, RenderWidget: ProgressProbe },
      }],
    },
  },
};
export default config;
```

That slot is rendered by `OutlineTab.jsx` in the side column (`CourseOutlineTabNotificationsSlot`); `course_home_section_outline.v1` is the only other slot on the outline tab.
This is the #2103 migration shape (a widget mounting `useProgressTabData`
itself), so it doubles as a preview of what that layer will tell plugins to do.

Run everything as **staff** on one ordinary course; the 404 checks use the
bad-id URL above, the happy-path checks use the plain progress URL.

## Verify by hand

### The redirect still works for the progress tab (404 via bad id)

- [x] **Load `/course/:courseId/progress/999999`.** Header and spinner while
      the queries are in flight, then a bare spinner (no header or footer)
      once the 404 lands, then the LMS legacy progress page at
      `/courses/:courseId/progress`. "There was an error loading this course."
      never appears. (Staff are not bounced back to the MFE by the legacy
      view, so it renders the legacy page for the staff user's own progress —
      same as before this change.)
- [x] **Browser back from the legacy page** lands where you came from, not in
      a redirect loop. `location.replace` adds no history entry, so the MFE
      `/progress/999999` URL should not be in the back stack.

### Nothing but the progress tab redirects (404 via bad id)

- [x] **Load the outline with the probe widget.** The outline renders and
      stays. The probe reads `progress query: error 404`. Nothing navigates.
- [x] **Load the dates tab** (no probe there): unaffected — it never fetched
      this query.

### Request and logging (404 via bad id)

- [x] **One `/api/course_home/progress/…/999999/` request per load**, answered
      404, on both the progress tab and the outline-with-probe. No retry — 4xx
      is not retried.
- [x] **Nothing logged for the 404.** The logging service (or the console, if
      the mock logger prints there) records no error and no info line for it;
      before this change the 404 was never logged either.

### The happy path is unchanged (same course, valid URLs)

- [x] **Load `/course/:courseId/progress`.** Grades, completion donut,
      certificate status, related links render as before; header present
      throughout; no bare-spinner frame.
- [x] **Load `/course/:courseId/progress/:targetUserId`** for a real enrolled
      learner: "Course progress for <username>", as before.
- [x] **Masquerade as a learner** (masquerade bar) and open the progress tab:
      renders as before.

### General

- [ ] **No new console errors** on any of the above. In particular no React
      warning from `ProgressTab` about hooks or effects, and no "Not
      implemented: navigation" — that one is jsdom-only. (not sure, doesn't seem like it)

Not covered:

- **A course with the MFE progress tab actually disabled** (waffle flag off,
  `DisableProgressPageStackedConfig`, or an Old Mongo course): the endpoint
  returns the same 404 with the same empty body, and the frontend takes the
  same path from there, so the bad-id runs above cover it. The difference is
  only the learner-facing framing — a learner, not staff, and the legacy view
  then rendering their real progress rather than redirecting.
- **A non-staff learner loading `/progress/<someone else>`**: the endpoint
  404s, the redirect fires as before, and the legacy view bounces a non-staff
  learner back to their own MFE progress page. Unchanged by this layer and
  needs a second learner account; the staff bad-id check exercises the same
  frontend path.

## Results

Run 2026-09-23 on tutor dev, as staff on one ordinary course, 404s produced
via the bad-id URL. Nine of ten checks pass as written: the bad-id progress
URL shows the bare spinner and lands on the legacy page with no error view;
browser back returns cleanly; the outline with the probe stays put and the
probe reads `error 404`; the dates tab is unaffected; one request per load,
no retry, nothing logged; the plain progress URL, a real learner's id and
masquerade all render as before. The console check is left unchecked: nothing
stood out, but the console was not compared against a before capture.
