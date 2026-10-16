Part of #1946 — Redux → React Query migration (Stage 1). Found while planning #2103, and the layer before it.

**Goal:** make fetching `/api/course_home/progress/` side-effect free, so that only `ProgressTab` — the component that owns that fetch — can send the learner to the legacy progress page.

**Context.** `getProgressTabData` (`course-home/data/api.js:169-174`), the `queryFn` of `useProgressTabData`, handles a 404 by navigating the whole page:

```js
  } catch (error) {
    const httpErrorStatus = error?.response?.status;
    if (httpErrorStatus === 404) {
      global.location.replace(`${getConfig().LMS_BASE_URL}/courses/${courseId}/progress`);
      return {};
    }
```

The redirect itself is a feature, from the original progress tab (#391, 2021). The endpoint 404s when the MFE progress tab is not active for the course — `course_home_mfe_progress_tab_is_active` in `openedx-platform` `lms/djangoapps/course_home_api/progress/views.py` is false for an Old Mongo course, when the `course_home.course_home_mfe_progress_tab` course waffle flag is off, or when `DisableProgressPageStackedConfig` disables it — and for a bad `student_id`. The legacy `courses/<id>/progress` view is the mirror image: it redirects learners to the MFE when the tab *is* active. So a course that opted out of the MFE progress tab bounces to the page that works.

The problem is where the redirect lives. Because it runs inside the `queryFn`, **anything that fetches this query redirects the page**, not just the progress tab. Today that includes a plugin widget calling `useExamsData()` (`progress-tab/hooks.jsx:11`) from a slot on another tab: it fetches through `useProgressData()`, and on a course with the MFE progress tab disabled, the learner is bounced off the outline (say) to the legacy progress page. After #2103 makes those hooks non-fetching, its migration note tells a plugin outside the progress tab to mount `useProgressTabData(courseId)` itself, which walks into the same redirect. The side effect belongs to the owner, not to the query, the same ownership line #2083, #2098 and #2103 draw for the fetch itself.

**Tasks**
- `getProgressTabData`: drop the 404 branch, so a 404 propagates like every unhandled status. The 401 and 403 branches (resolve to `{}`; access is handled via the metadata request) stay as they are. `shouldRetryQuery` (`src/queryClient.ts:34-43`) already skips retries on 4xx.
- `useProgressTabData`: add `logStatusAs: { 404: 'silent' }` to its `meta`, through the mechanism `useCoursewareOutline` uses for its expected 403, so the global `QueryCache.onError` (#2022) does not start logging a 404 that was never logged before (today the query succeeds with `{}`).
- `ProgressTab` (`progress-tab/ProgressTab.jsx:49-63`): when `tabDataQuery` fails with a 404 (`getResponseStatus` from `@src/data/http-error`), call `global.location.replace(...)` with the same URL from an effect, and return `PageLoading` — announcing `TabPage`'s existing `messages.loading` via `useIntl` — instead of `TabWithTimer`, so the page shows a spinner rather than `TabPage`'s error view while the browser navigates. Redirect on every 404, as today.
- Tests: the hook case *redirects to the legacy progress page and resolves to an empty object on a 404* (`course-home/data/apiHooks.test.tsx:272-288`, with its `window.location` swap) becomes *surfaces a 404 as an error without navigating*; `ProgressTab.test.jsx` gains the redirect case (404 reply, `replace` called with the legacy URL, loading indicator present, failure text absent), rendered without `fetchAndRender`'s wait for the indicator to disappear.

**Verify:** on a course with the MFE progress tab disabled (`course_home.course_home_mfe_progress_tab` off for the course, via Django admin), loading `/course/:courseId/progress` still lands on `/courses/:courseId/progress` on the LMS, with a spinner and no error page in between. On that same course, a plugin widget on the outline tab that mounts `useProgressTabData(courseId)` (the #2103 migration shape) stays on the outline and reads an error. On a normal course the progress tab is unchanged, including `/progress/:targetUserId` as staff.

**Behaviour change.** The redirect moves from before the query settles to the render after it errors: one render later, and only when `ProgressTab` is the fetcher. Today the query resolves to `{}` and the tab renders its content against an empty payload until the browser navigates; after this it renders a spinner instead. The 404 stays unlogged, as today. Nothing changes on any other response.

**Out of scope:** the refetch from readers under the tab (#2103, the layer above this one); the 401/403 handling; guarding the redirect on `targetUserId` (the endpoint's two 404 causes have identical bodies, and the current code redirects on both); and whether the legacy progress page is still a meaningful destination on current `openedx-platform` (it is, on `master`).

## Plan

> [!NOTE]
> The findings and plan below were generated by Claude (Claude Code) and reviewed before posting.

Investigation findings that shape the task list above:

- **The destination is right; the trigger is wrong.** The endpoint 404s when the course opted out of the MFE progress tab (flag `toggle_default: False`; tutor's MFE plugin turns it on) or for a bad `student_id`, and the legacy view redirects the other way when the tab is active. The redirect stays a progress-tab feature; only what fires it changes.
- **Any fetcher redirects.** The side effect sits in the `queryFn`, so a plugin off the tab that fetches this query — today through `useExamsData()`, after #2103 by mounting `useProgressTabData` as its migration note says — bounces the learner to the legacy progress page from whatever tab they were on.
- **Throwing the 404 has one new consequence: logging.** Retries already skip 4xx. The global `onError` would log it at error, and today it is not logged at all (the query succeeds), so the hook declares `logStatusAs: { 404: 'silent' }` to keep that; `Register.queryMeta` already types `ModelStoreMeta & { logStatusAs? }` and the outline query already carries both kinds of entry.
- **Not `TabPage`'s error view during the navigation interval.** With the query in error, `deriveView` picks `isError`, and `getErrorDetail` has prose only for a 403, so the page would read "There was an error loading this course." until the LMS serves the legacy page — which computes grades and is often seconds. The repo's redirect precedents (`TabPage`'s `<Navigate>` for denied access, `courseware/RedirectPage.tsx`) render nothing; a spinner is the small honest deviation. Reusing `TabPage`'s loading string keeps the screen-reader announcement identical to the loading state that preceded it (the string is a prop to `PageLoading`, rendered `sr-only`).
- **The header drops out when the 404 lands.** Keeping it would mean holding `TabPage` in its loading view with an errored query; the jump is not worth that.
- **Redirect on every 404, as today.** The two 404 causes are indistinguishable from the response, and guarding on `targetUserId` would be a behaviour change unrelated to where the side effect lives.
- **The happy path is untouched.** On success `error` is null, the flag is false, the effect body is skipped and `ProgressTab` returns the same tree. 401/403 keep resolving to `{}`; other errors were already thrown.
- **`refactor:`, not breaking.** A plugin that fetched this query off the tab loses an unintended page navigation.

<details>
<summary>Full plan</summary>

# Plan: #2104 — Move the 404 redirect to the legacy progress page out of `getProgressTabData` and into `ProgressTab`

Next layer in the running stack, on top of #2098 (PR #2102). #2103 stacks on
this, so that its plugin migration advice (mount `useProgressTabData` yourself)
is side-effect free.

## Context

### How it works today

`useProgressTabData` (`course-home/data/apiHooks.ts:133-137`) has
`getProgressTabData` as its `queryFn`. That function's catch block
(`course-home/data/api.js:169-187`) turns three statuses into a successful
empty result, and one of them also navigates the page:

```js
  } catch (error) {
    const httpErrorStatus = error?.response?.status;
    if (httpErrorStatus === 404) {
      global.location.replace(`${getConfig().LMS_BASE_URL}/courses/${courseId}/progress`);
      return {};
    }
    if (httpErrorStatus === 401) { … return {}; }   // unenrolled / unauthenticated: courseAccess handles it
    if (httpErrorStatus === 403) { … return {}; }   // access error: the metadata request carries the redirect
    throw error;
  }
```

So on a 404 the query *succeeds* with `{}`, `TabPage` opens its gate, and the
tab renders its content against an empty payload while the browser navigates
away. The redirect is from the original progress tab (#391, 2021).

### When the endpoint 404s

`lms/djangoapps/course_home_api/progress/views.py` (`openedx-platform`
`master`) raises 404 when:

- `course_home_mfe_progress_tab_is_active(course_key)` is false: an Old Mongo
  course, the `course_home.course_home_mfe_progress_tab` course waffle flag off
  for the course (`toggle_default: False`; tutor's MFE plugin turns it on), or
  `DisableProgressPageStackedConfig` disabled for it.
- `student_id` is not an integer, names no user, or the requester is not staff
  and asked for someone else.

The legacy `courses/<id>/progress` view is the mirror image: with the MFE tab
active it redirects non-staff to the MFE. So the destination is right, and the
redirect stays a feature of the progress tab.

### Why it has to move

The side effect lives in the `queryFn`, so **whatever fetches the query
redirects the page**, not just the progress tab. Today a plugin widget calling
`useExamsData()` from a slot on the outline fetches through `useProgressData()`
(both `progress-tab/hooks.jsx`), and on a course with the MFE progress tab
disabled the learner is bounced off the outline to the legacy progress page.
#2103 makes those hooks non-fetching and tells a plugin outside the tab to call
`useProgressTabData(courseId)` itself, which is the same trap. Ownership is the
line #2083, #2098 and #2103 draw for the fetch; this draws it for the fetch's
side effect: `ProgressTab` owns the fetch, so `ProgressTab` owns the redirect.

## The change

1. **`getProgressTabData`: drop the 404 branch.** A 404 falls through to
   `throw error` like every unhandled status. The 401 and 403 branches and
   their comments stay. Nothing else in `api.js` changes.

2. **`useProgressTabData`: keep the 404 silent.** `shouldRetryQuery`
   (`src/queryClient.ts:34-43`) already skips retries on 4xx, so the only new
   consequence of throwing is that the global `QueryCache.onError` (#2022) logs
   it, at `error` by default. Today the 404 is not logged at all — the query
   succeeds with `{}` — so a faithful port keeps it that way: the hook declares
   `'silent'`, the `LogLevel` the courseware outline query's `logStatusAs`
   mechanism already offers (`courseware/data/apiHooks.ts` uses `'info'` for
   its expected 403):

   ```ts
   meta: { modelType: 'progress', courseId, logStatusAs: { 404: 'silent' } },
   ```

   `Register.queryMeta` is already `ModelStoreMeta & { logStatusAs? }`
   (`queryClient.ts:17-21`), so the two coexist without a type change.

3. **`ProgressTab` redirects.** `progress-tab/ProgressTab.jsx:49-63` becomes:

   ```jsx
   const ProgressTab = () => {
     const { courseId, targetUserId } = useParams();
     const metadataQuery = useCourseHomeMeta(courseId);
     const tabDataQuery = useProgressTabData(courseId, targetUserId);
     const redirectToLegacyProgress = getResponseStatus(tabDataQuery.error) === 404;

     useEffect(() => {
       if (redirectToLegacyProgress) {
         global.location.replace(`${getConfig().LMS_BASE_URL}/courses/${courseId}/progress`);
       }
     }, [redirectToLegacyProgress, courseId]);

     if (redirectToLegacyProgress) {
       return <PageLoading srMessage={…} />;
     }
     return (
       <TabWithTimer …>
   ```

   `getResponseStatus` is `src/data/http-error.ts:5-7`, already what `TabPage`
   and the query cache use to read a status. The URL string moves verbatim; as
   today it does not append `targetUserId` (the legacy view redirects a
   non-staff learner back to their own MFE progress page, which is the
   existing fallback chain).

   **Effect, not render-time.** `courseware/RedirectPage.tsx` calls
   `location.assign` during render. Here an effect keeps the render pure, and
   under `StrictMode`'s development double-invoke (`src/index.jsx`) the worst
   case is `replace` called twice with the same URL, which is a no-op.

4. **What the page shows while the browser navigates** (open question 1).
   `TabPage` (`tab-page/TabPage.tsx:141-149`) renders `HeaderSlot`, then one
   of loading / content / error, then `FooterSlot`. With the query now in
   error, rendering `TabWithTimer` as usual would show the header, the generic
   failure text ("There was an error loading this course") and the footer
   until the new document arrives. The draft above instead returns
   `PageLoading` from `ProgressTab`: a spinner with no header or footer, for
   the same interval. Neither is what today shows (content against `{}`,
   which for the nested destructures under the tab is a crash), so both are
   improvements; the question is which look to pick.

## Tests

- **`course-home/data/apiHooks.test.tsx`**, `describe('useProgressTabData')`:
  the case *redirects to the legacy progress page and resolves to an empty
  object on a 404* (`:272-288`) is replaced by *surfaces a 404 as an error
  without navigating*. It keeps the `window.location` swap (jsdom's `replace`
  is non-configurable, so the whole object is swapped in a `try/finally`) and
  asserts `isError`, `getResponseStatus(result.current.error) === 404`, and
  `replace` not called. The `logStatusAs` mechanism is covered generically in
  `src/queryClient.test.ts:37-46`; no hook-level log assertion, matching the
  outline 403.

- **`progress-tab/ProgressTab.test.jsx`**, new describe *when the progress
  request 404s*: mock `progressUrl` to reply 404 (`reply(404, {})` gives
  `error.response.status`, which is all `getResponseStatus` reads), swap
  `window.location`, render, and assert `replace` was called with
  `${LMS_BASE_URL}/courses/${courseId}/progress`, the loading indicator
  (`role="status"`) is present, and the failure text is not. `fetchAndRender`
  (`:73-91`) waits for the loading indicator to disappear, which here it
  never does, so this case renders through a variant that skips that wait.

- **`api.js` has no direct suite** for `getProgressTabData`; the hook suite is
  its coverage today and stays so.

## Behaviour changes

- The redirect fires one render later: after the query has errored, from the
  owner's effect, instead of inside the `queryFn` before the query settles.
- Only `ProgressTab` redirects. Any other fetcher of the progress query reads
  an error and stays on its page.
- During the navigation interval the page shows a loading (or error) view
  instead of the tab rendered against an empty payload.
- The 404 is still not logged (`logStatusAs: { 404: 'silent' }`), as today.

Not breaking: no plugin contract changes. A plugin that fetched this query off
the tab loses an unintended page navigation, which is the point.

## Commit type

`refactor:`. Nothing a learner on the progress tab sees is broken today, and
the change is where a side effect lives. Same call as `decisions-2098.md`
entry 2.

## Not in scope

- **The 401 / 403 branches** in `getProgressTabData`. They resolve to `{}`
  deliberately (access is decided from the metadata request) and have no side
  effect.
- **`useProgressData` / `useExamsData` fetching** — that is #2103, the layer
  above this one.
- **Appending `targetUserId` to the legacy URL.** Not done today; the fallback
  chain through the legacy view works without it.

## Open questions

1. **Settled: `PageLoading` during the navigation interval, announcing
   `TabPage`'s `messages.loading` ("Loading course page…").** `PageLoading`
   has no text of its own; `srMessage` is a required prop rendered in an
   `sr-only` span, so sighted learners see only the spinner. `ProgressTab`
   does what `TabPage.tsx:113-115` does: import `messages` from
   `tab-page/messages`, call `useIntl()`, pass
   `intl.formatMessage(messages.loading)`. Reusing the string keeps the
   screen-reader announcement identical to the loading state that preceded
   it; a progress-specific message can be added later if wanted.
   Rendering `TabWithTimer` as usual would show `TabPage`'s error view —
   `deriveView` reads `tabDataQuery.isError`, and `getErrorDetail` has prose
   only for a 403, so the 404 falls back to "There was an error loading this
   course." — for as long as the LMS takes to serve the legacy page, which
   computes grades and is often seconds. The repo's redirect precedents
   (`TabPage`'s `<Navigate>` for denied access, `courseware/RedirectPage.tsx`)
   render nothing; the spinner is the small honest deviation. The header,
   visible during the preceding loading state, drops out when the 404 lands;
   keeping it would mean holding `TabPage` in its loading view with an errored
   query, and the jump is not worth that.
2. **Settled: redirect on every 404, as today.** The endpoint 404s for two
   unrelated reasons (tab disabled for the course; a bad or unauthorized
   `student_id`) with an identical body, and the current code redirects on
   both without looking. Guarding on `targetUserId` would be a behaviour
   change unrelated to where the side effect lives — scope creep for this
   issue; if that experience should change it gets its own issue.

## Verification

- `npm run types`, `npm run lint`, full suite.
- Manual (tutor dev). Turn the MFE progress tab off for one course: Django
  admin → Waffle → course flag `course_home.course_home_mfe_progress_tab`, add
  a course override with the flag off (or `DisableProgressPageStackedConfig`
  for the course). Then:
  - Load `/course/:courseId/progress` as a learner: lands on
    `/courses/:courseId/progress` on the LMS; the interval before it shows
    the chosen view, not an error and not a crash.
  - On that course, a widget in an outline-tab slot (via `env.config.jsx`)
    that calls `useProgressTabData(courseId)` and renders `String(isError)`:
    the outline stays put and the widget reads `true`; the logging service
    records nothing for the 404.
  - Turn the flag back on: the progress tab loads as before, including
    `/progress/:targetUserId` as staff.

## Stack

One layer on top of #2098 (PR #2102), closing #2104. #2103 follows, then B2
(#2085).

</details>
