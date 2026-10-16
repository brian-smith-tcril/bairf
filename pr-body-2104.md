## Summary

`getProgressTabData`, the `queryFn` behind `useProgressTabData`, answered a 404 from `/api/course_home/progress/` by calling `location.replace` to the LMS's legacy progress page and resolving to `{}`. The destination is right: the endpoint 404s when the MFE progress tab is not active for the course (the `course_home.course_home_mfe_progress_tab` course flag off, an Old Mongo course, or `DisableProgressPageStackedConfig`), and the legacy view is the page that works there. The trigger is wrong: because the redirect sat inside the query, **anything that fetched the query navigated the whole page**, not just the progress tab. A plugin widget calling `useExamsData()` from a slot on another tab fetches through it, and on such a course bounced the learner off the outline to the legacy progress page.

The side effect now belongs to the fetch's owner. `getProgressTabData` lets the 404 propagate like every other unhandled status, and `ProgressTab`, the component that fetches this query, redirects from an effect when its query fails with a 404, showing a spinner while the browser navigates. Any other fetcher of the progress query reads an error and stays on its page. Nothing changes on any other response.

Part of the Redux → React Query migration (#1946, Stage 1). Closes #2104. Stacked above #2102 (#2098); #2103 stacks on this one, so that its plugin migration note — mount `useProgressTabData(courseId)` yourself — is side-effect free.

## What changed

- **`getProgressTabData` drops its 404 branch.** The 401 and 403 branches, which resolve to `{}` because access is decided from the metadata request, are unchanged.
- **`useProgressTabData` declares `logStatusAs: { 404: 'silent' }`.** Letting the 404 throw has one new consequence — the global `QueryCache` `onError` would log it as an error — and before this change the 404 was not logged at all (the query succeeded with `{}`), so the hook keeps it silent, through the same `logStatusAs` mechanism the courseware outline query uses for its expected 403. Retries already skip 4xx.
- **`ProgressTab` owns the redirect.** It reads the status off `tabDataQuery.error` with `getResponseStatus`, calls `location.replace` from an effect with the same URL as before, and returns `PageLoading` — announcing `TabPage`'s existing loading message — instead of `TabWithTimer`. Rendering `TabWithTimer` would have shown `TabPage`'s error view ("There was an error loading this course.") until the legacy page, which computes grades, finished loading. The redirect still fires on every 404, as before: the endpoint's two 404 causes (tab disabled; bad or unauthorized `student_id`) are indistinguishable from the response, and this change is about where the redirect lives, not when.
- **Tests.** The hook's 404 case now asserts the query errors without navigating (it keeps its `window.location` swap to prove `replace` was not called). `ProgressTab.test.jsx` gains the redirect case: 404 reply, `replace` called with the legacy URL, loading indicator present, failure text absent. Its `fetchAndRender` took a `{ waitForLoaded }` option because the loading indicator it normally waits out is the expected view here. Both new cases fail against the pre-change source.

## Testing

`npm run types`, `npm run lint` and the full suite (113 suites, 1141 passed, 3 skipped) are green.

Manually verified on tutor dev as staff, producing real 404s with a `targetUserId` that matches no user (`/progress/999999`) — the endpoint answers that exactly as it answers an opted-out course, and the frontend takes the same path from there. The bad-id progress URL shows the bare spinner and lands on the legacy page with no error view in between; browser back returns cleanly; an outline-tab probe widget that mounts `useProgressTabData` with the bad id stays on the outline and reads the 404; one request per load, no retry, nothing logged; the plain progress URL, viewing a real learner's progress, and masquerade all render as before. The console was not compared against a before capture. A course with the MFE progress tab actually disabled was not set up — same status, same body, same frontend path.

## Decisions

Working notes for this layer, kept out of the tree:

<details>
<summary>Full decision log</summary>

# Decisions — move the 404 redirect to the legacy progress page out of `getProgressTabData` and into `ProgressTab` (#2104)

Layer on top of #2098 (PR #2102); #2103 stacks on it. The diagnosis, the
ownership move and the two open questions were settled in the plan on issue
#2104; entries here record choices made while implementing.

1. **What the page shows while the browser navigates: `PageLoading`,
   announcing `TabPage`'s own loading message.** With the 404 now an error,
   rendering `TabWithTimer` as usual would put `TabPage` in its error view:
   `deriveView` reads `tabDataQuery.isError`, and `getErrorDetail` has
   backend prose only for a 403, so a 404 falls back to "There was an error
   loading this course." That text would stay up until the LMS serves the
   legacy progress page, which computes grades and is often seconds, for a
   learner who is about to land on a page that works. The repo's redirect
   precedents (`TabPage`'s `<Navigate>` for denied access,
   `courseware/RedirectPage.tsx`) render nothing; the spinner is the small
   honest deviation. `PageLoading` has no text of its own — `srMessage` is a
   required prop rendered `sr-only` — so `ProgressTab` formats
   `tab-page/messages`' `loading` ("Loading course page…") itself, the way
   `TabPage.tsx:113-115` does. That keeps the screen-reader announcement
   identical to the loading state that preceded it; a progress-specific
   string can be added later if wanted. The header, visible during that
   preceding state, drops out when the 404 lands; keeping it would mean
   holding `TabPage` in its loading view with an errored query, and the jump
   is not worth that.

2. **Redirect on every 404, as today.** The endpoint 404s for two unrelated
   reasons — the MFE progress tab disabled for the course, or a bad or
   unauthorized `student_id` — with an identical body, and the current code
   redirects on both without looking. Guarding on `targetUserId` would be a
   behaviour change unrelated to where the side effect lives; if that
   experience should change it gets its own issue.

3. **Effect, not render-time.** `courseware/RedirectPage.tsx` calls
   `location.assign` during render. Here a `useEffect` keyed on the derived
   boolean and `courseId` keeps the render pure; under `StrictMode`'s
   development double-invoke the worst case is `replace` called twice with
   the same URL, a no-op.

4. **`logStatusAs: { 404: 'silent' }` on the hook.** The only new consequence of
   letting the 404 throw is logging: `shouldRetryQuery` already skips 4xx, and
   the global `QueryCache.onError` (#2022) logs at `error` unless the query
   says otherwise. Before this change the 404 was not logged at any level —
   `getProgressTabData` caught it and the query succeeded with `{}` — so the
   faithful port keeps it silent. `'info'` was the first draft, following the
   courseware outline query's treatment of its expected 403 and on the
   grounds that the redirect is now a decision the app makes; review
   (2026-09-23) preferred preserving the old behaviour exactly, and `'silent'`
   is a `LogLevel` the mechanism already supports. The mechanism is covered in
   `src/queryClient.test.ts` (including a `'silent'` case); no hook-level log
   assertion, matching the outline.

5. **Tests.** The hook case *redirects to the legacy progress page and
   resolves to an empty object on a 404* became *surfaces a 404 as an error
   without navigating*; it keeps the `window.location` swap so it can assert
   `replace` was not called. `ProgressTab.test.jsx` gained the redirect case
   in a describe of its own. `fetchAndRender` took a `{ waitForLoaded }`
   option (the shape `OutlineTab.test.jsx`'s helper has) because its default
   wait — for the loading indicator to disappear — never ends when the
   indicator *is* the expected view. Both new cases fail against the
   pre-change source (`replace` called from the `queryFn`; query succeeds
   with `{}`) and pass with it.

6. **The sequence on a 404, render by render.** The early return and the
   effect divide the work, and it is worth being exact about which does what:

   1. *Progress query pending.* `tabDataQuery.error` is null, so
      `getResponseStatus` returns undefined and `redirectToLegacyProgress` is
      false. `ProgressTab` renders `TabWithTimer`; `TabPage` derives its
      loading view — header, spinner, footer. The effect registers; its body
      is skipped.
   2. *Metadata resolves.* Still pending on progress; same view.
   3. *The 404 lands.* React Query moves the query to its error state and
      `ProgressTab` re-renders. `getResponseStatus` now returns 404, the flag
      is true, and **in that same render** `ProgressTab` takes the early
      return and renders `PageLoading` directly. `TabWithTimer` unmounts, so
      the header and footer go and a bare spinner remains. `TabPage` never
      sees the errored query — it stops being rendered in the render where
      the error first appears — which is what keeps its error view off the
      screen without any change to `TabPage`.
   4. *After that commit, the effect runs.* Its dependency went false → true,
      so the body executes and calls `location.replace`. `useEffect` runs
      after paint, so the bare spinner is painted before navigation starts.
   5. *The browser navigates.* The current document — the bare spinner —
      stays visible until the LMS responds with the legacy progress page.

   So the early return decides what is on screen from step 3 until the new
   page arrives, and the effect decides when navigation starts. On the happy
   path the flag is false at every render: the early return is never taken
   and the effect body never runs, so `ProgressTab` returns the same tree it
   did before this change.

7. **Commit type `refactor:`, not breaking.** Nothing a learner on the
   progress tab sees is broken today, and the change is where a side effect
   lives. A plugin that fetched this query off the tab loses an unintended
   page navigation, which is the point, and no documented contract changes.

</details>

## Manual testing

<details>
<summary>Checklist</summary>

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

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
