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
