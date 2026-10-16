# Manual testing — getCourseDiscussionTopics → React Query (#2016)

In-browser verification for the discussion-topics layer, run against a live
backend (tutor local). This layer claims **zero user-facing change**: the
thunk becomes `prefetchDiscussionTopics` (same config → provider gate →
topics sequence, bridged into the same `discussionTopics` model keyed by
usage key), and every reader keeps reading the model. The things to watch are
the old semantics: the prefetch firing from `SidebarContextProvider`'s
post-mount effect, the trigger/sidebar appearing only for units with an
in-context topic, and legacy-provider courses staying untouched.

## Getting real IDs (DemoX on tutor local)

Course id: `course-v1:OpenedX+DemoX+DemoCourse`; base
`http://apps.local.openedx.io:2000/learning`.

- **DemoX uses the openedx provider** (tutor local ships the Discussions MFE
  and forum plugin) — confirm via the config GET below reporting
  `"provider": "openedx"`.
- The prefetch shows as a GET to `/api/discussion/v1/courses/{courseId}`
  followed (openedx provider only) by a GET to
  `/api/discussion/v2/course_topics/{courseId}`, fired once per course on
  courseware mount.

## Verify by hand

On a unit with discussions enabled in context (openedx provider):

- [x] **Prefetch fires on courseware mount** — open a unit: Network tab shows
      the `v1/courses` config GET, then the `v2/course_topics` GET; no console
      errors.
- [x] **Trigger appears and opens the sidebar** — the discussions trigger
      renders in the right rail; clicking it opens the sidebar iframe at
      `{DISCUSSIONS_MFE_BASE_URL}/{courseId}/category/{unitId}?inContextSidebar`.
- [x] **No trigger without an in-context topic** — on a unit with no
      discussion topic (or discussions disabled in context), the trigger does
      not render.
- [x] **Unit navigation** — moving between units swaps the sidebar category
      URL to the new unit without refetching topics (the query is cached per
      course; a remount refetches).

Legacy-provider course (env permitting; if no local legacy-provider course
exists, the automated coverage below carries this half):

- [ ] **Topics request skipped** — the config GET reports a non-openedx
      provider and no `course_topics` request follows; no trigger renders and
      no console errors.

## Left to the automated suite (not re-done by hand)

- The converted fetch path end to end — `apiHooks.test.tsx`
  (`prefetchDiscussionTopics`): openedx success keyed by usage key with the
  course-wide-topic filter, the legacy-provider skip (no topics request), and
  the config-failure path (`logError`, nothing written).
- The `usageKey`-keyed bridge write — `modelStoreBridge.test.ts` (`idField`).
- The reader gates — `DiscussionsSidebar.test.jsx` / `DiscussionsTrigger.test.jsx`
  (render with a topic, nothing without), now seeded through the real
  prefetch + bridged test client.
- The provider mount path — `SidebarContextProvider.test.jsx`,
  `Course.test.jsx` (via `setupDiscussionSidebar`), `CoursewareContainer.test.jsx`.

## Results

Env: tutor local, run against the local branch @ `1ed4aa20` (before any PR).

The four openedx-provider items passed as described on DemoX (prefetch pair
on mount, trigger + iframe category URL, no trigger without an in-context
topic, no refetch on unit navigation).

The legacy-provider skip was not run by hand — no local course uses the
legacy provider. A course with discussions disabled entirely (no `discussion`
tab) was checked instead: no discussion requests fire at all, no trigger, no
console errors — that exercises `discussionsPrefetch`'s tab gate in
`widgetConfig.js`, not the provider gate inside `queryFn`. The provider gate
rests on the automated legacy-provider case in `apiHooks.test.tsx` (config
GET only, no `course_topics` request, nothing written).
