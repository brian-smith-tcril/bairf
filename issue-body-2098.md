Part of #1946 — Redux → React Query migration (Stage 1). Layer on top of #2084.

**Goal:** fetch each of `useIsCourseLoaded`'s three queries once per navigation
into courseware, from `CoursewareContainer`, instead of once more for each
descendant that re-checks the gate.

**Context.** One outline → courseware navigation requests
`/api/course_home/course_metadata/`, `/api/courseware/course/` and
`/api/learning_sequences/v1/course_outline/` **three times each**, while
`/api/course_home/v1/navigation/` (`staleTime: Infinity`, outside the gate) is
requested once. A trace of the `course_metadata` requests shows the first from
`CoursewareContainer` and the other two from `UnitNavigation` and
`UnitNavigationEffortEstimate`, both through `useSequenceIds` →
`useIsCourseLoaded`. That hook is `CoursewareContainer`'s gate check, but it is a
fetching observer of all three queries, so every descendant that calls it (or
`useSequenceIds`) mounts after the data lands, finds it stale, and refetches.
There is no remount across the redirect. It is the same defect #2083 fixed for
the outline and dates tabs, and gets the same fix: the owner fetches, and the
gate check under it only reads.

**Tasks**
- Add `{ enabled }` to `useCourseHomeMeta`, `useCoursewareMetadata` and
  `useCoursewareOutline`.
- Make `useIsCourseLoaded` non-fetching: it passes `{ enabled: false }` to all
  three. `useSequenceIds` follows, since that hook is its only link to React
  Query. Neither takes an option, and the gated call sites (`CourseBreadcrumbs`,
  `useSequenceNavigationMetadata`, `UnitNavigationEffortEstimate`) are
  untouched. `CoursewareContainer` and `useCoursewareRedirects` keep fetching
  through the query hooks they already call directly.
- Component suites that render a gated component on its own mount the owner's
  fetches beside it (`src/tests/MountCourseQueryHooks.tsx`), rather than seeding
  the cache.
- Re-measure all four endpoints with the protocol below.

**Verify:** hard-reload the outline, wait for idle, clear the network log, click
a sequence title, wait for idle: each of the three gate endpoints is requested
once. Courseware, breadcrumbs, unit navigation and the redirect rules behave as
before.

**Out of scope:** `staleTime` (the owner's refetch on navigation is legitimate —
it is where `course_metadata` records the learner's daily streak); the
progress tab's `useProgressData`, which looks like the same defect and gets its
own issue once measured (#2103); and tab clicks, which are full page loads.
