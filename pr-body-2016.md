## Summary

Convert the last courseware thunk to React Query: `getCourseDiscussionTopics` becomes `prefetchDiscussionTopics`, an imperative `prefetchQuery` wrapper driven by the sidebar widget-registry prefetch, and `courseware/data/thunks.js` is deleted. This completes **Target 5 (leaf)** of the courseware decomposition ([plan](https://github.com/openedx/frontend-app-learning/issues/1946#issuecomment-5348891139)) in the Redux → React Query migration (#1946, Stage 1), stacked on the remaining-writers conversion #2067. Closes #2016.

## Breaking change

The sidebar widget `prefetch` contract no longer receives `dispatch` — the context object is now `{ courseId, course, queryClient }`. External widgets registered via the `SIDEBAR_WIDGETS` config key whose `prefetch` dispatched a Redux thunk must fetch through the provided React Query client instead. The commit carries a `refactor!:` subject and a `BREAKING CHANGE:` footer (semantic-release major). Why break now rather than at the Redux teardown: the registry mechanism is ~5 months old (#1885/#1897), its only in-repo `prefetch` user was this thunk, a code search finds no external consumer, and #1976 makes the break inevitable — one contract change instead of two.

## What changed

- **`courseware/data/apiHooks.ts`: `prefetchDiscussionTopics(queryClient, courseId)`** — a plain function, not a hook (the sole consumer is imperative). The thunk's structure ports 1:1 into `queryFn`: the config fetch, the openedx-provider gate (original comment included), and the `usageKey` filter; a non-openedx provider resolves to `[]`, which bridges as a no-op — the thunk's dispatch-nothing path. `prefetchQuery` never rejects; failures log through the app QueryCache `onError` → `logError`, the thunk's catch behavior.
- **`data/modelStoreBridge.ts`: `idField` pass-through.** The `discussionTopics` model is keyed by `usageKey` (the unit id), which `ModelMirror` couldn't express. The keying itself is pre-existing model-store code (`model[idField ?? 'id']` in the slice helpers; the thunk already dispatched `idField: 'usageKey'`) — the bridge now forwards the field from query `meta` onto the dispatched action payloads.
- **`SidebarContextProvider`** passes `{ courseId, course, queryClient }` to widget prefetches; `useDispatch` and the `react-redux` import leave the file. `discussionsPrefetch` keeps its `DISCUSSIONS_MFE_BASE_URL` + discussion-tab gate and calls the new function.
- **Readers untouched.** `SidebarContextProvider` / `DiscussionsSidebar` / `DiscussionsTrigger` keep their `useModel('discussionTopics', unitId)` reads via the bridge; read conversions are #1977's home.
- **Deletions:** `courseware/data/thunks.js` — this was the last thunk, and `courseware/data/index.js` already had no `./thunks` exports.
- **Docs:** the sidebar README/ARCHITECTURE document the new prefetch contract with a React Query example; the discussions widget README describes the query + bridge flow (tagged transitional, #1977).
- **Tests:** the three seeding sites swap `executeThunk` for the real converted path (`prefetchDiscussionTopics` on a bridge-wired test client), keeping their endpoint mocks meaningful. New cases: the `usageKey` filter (previously untested), the legacy-provider skip (no topics request), the config-failure path, and a bridge `idField` case. `SidebarContextProvider.test.jsx` gains a `QueryClientProvider` wrapper and loses its `react-redux` mock, which only fed the provider's `useDispatch`.

## Testing

`npm run types` (0 errors), `npm run lint` (clean), full jest suite green at head (111 suites, 1120 passed / 3 pre-existing skips). Manual pass on tutor local in the details block below; the legacy-provider skip rests on its hook-level case (mapped in the manual-testing results).

## Decisions

<details>
<summary>Full decision log</summary>

# Decisions — getCourseDiscussionTopics → React Query (#2016)

1. **A prefetch function, not a hook.** No reader converts in this issue
   (useModel → query-result read conversions are #1977's home), and the
   thunk's only dispatcher is imperative — the widget-registry prefetch effect
   in `SidebarContextProvider` — so `courseware/data/apiHooks.ts` gains
   `prefetchDiscussionTopics(queryClient, courseId)` wrapping
   `queryClient.prefetchQuery(...)` rather than a `useQuery` hook. The three
   `useModel('discussionTopics', unitId)` readers (`SidebarContextProvider`,
   `DiscussionsSidebar`, `DiscussionsTrigger`) are untouched and keep working
   through the bridge.

2. **The provider gate lives inside `queryFn`.** Same two-call sequence as
   the thunk: fetch the discussion config, and only for
   `config.provider === 'openedx'` fetch topics (original comment and
   `usageKey` filter preserved). Non-openedx resolves to `[]` — the bridge's
   `updateModels` over an empty array is a no-op, the same end state as the
   thunk's dispatch-nothing path (`models.discussionTopics` stays unset either
   way; returning `null` instead would crash the bridge's `forEach`).
   `prefetchQuery` never rejects; failures log through the app QueryCache
   `onError` → `logError`, the thunk's catch behavior.

3. **The bridge gained an `idField` pass-through — the keying behavior itself
   is pre-existing Redux code, not something this layer added.** The
   model-store slice has always keyed models by `model[idField ?? 'id']` (the
   `add`/`update` helpers in `generic/model-store/slice.js`, with `idField`
   accepted on every add/update action payload), and the old thunk already
   dispatched `updateModels({ …, idField: 'usageKey' })` — the
   `discussionTopics` model is keyed by `usageKey` (the unit id; each topic
   keeps its own `id`, the discussion topic id, which readers also check).
   What was missing was only the bridge link: `ModelMirror` couldn't express a
   non-`id` key, so this layer forwards `idField` from the query `meta` onto
   the dispatched action payloads — uniformly across all five strategies
   rather than special-casing `updateModels`. The slice is untouched.

4. **The widget prefetch contract is broken deliberately: `dispatch` →
   `queryClient`.** `prefetch({ courseId, course, dispatch })` is a documented
   plugin contract (`sidebar/README.md`, `ARCHITECTURE.md`) for external
   widgets registered via the `SIDEBAR_WIDGETS` config key, so this is a
   breaking change and the commit advertises it twice: a `refactor!:` subject
   and a `BREAKING CHANGE:` footer (semantic-release major). It breaks *now* rather than at the Redux teardown
   (#1976) because: the registry mechanism is ~5 months old (PRs #1885/#1897);
   its only in-repo `prefetch` user was this thunk; a GitHub code search finds
   no external `SIDEBAR_WIDGETS` consumer (caveat: operator `env.config.jsx`
   files are untracked and unsearchable); and the teardown makes the break
   inevitable regardless — deferring would mean touching the same contract
   line and the same three docs twice for one break's worth of change. The
   context object is now `{ courseId, course, queryClient }` (`queryClient`
   from `useQueryClient()`, a stable reference in the effect deps), and
   `useDispatch` + the `react-redux` import leave `SidebarContextProvider`
   entirely. The two sidebar docs and the discussions widget README were
   updated in the same layer.

5. **`courseware/data/thunks.js` deleted** — `getCourseDiscussionTopics` was
   the last thunk left after #2015, and `courseware/data/index.js` already had
   no `./thunks` exports, so only the file itself goes.

6. **Light structural types instead of `any`.** The discussion api functions
   (`api.js`) are untyped, so the queryFn annotates locally:
   `config: { provider: string }` and `topics: { usageKey: string | null }[]`
   (course-wide topics carry a null usage key — that's what the filter drops).
   No `as any`.

7. **Tests seed through the real converted path.** The three files that
   seeded via `executeThunk(getCourseDiscussionTopics(...))`
   (`DiscussionsSidebar.test.jsx`, `DiscussionsTrigger.test.jsx`,
   `courseware/course/test-utils.jsx`) now run
   `prefetchDiscussionTopics(createTestQueryClient(store), courseId)` — the
   bridge-wired client populates the model store exactly as production does,
   and the existing endpoint mocks keep exercising the provider gate. New
   `apiHooks.test.tsx` cases: openedx success with the usage-key filter
   (previously untested), the legacy-provider skip (no topics request), and
   the config-failure path (`logError`, nothing written); plus a bridge
   `idField` case in `modelStoreBridge.test.ts`.

8. **`SidebarContextProvider.test.jsx` gained a `QueryClientProvider`
   wrapper and lost its `react-redux` mock.** That suite renders the provider
   with raw RTL `render` in a fully mocked environment (the model store is
   jest-mocked), so the new `useQueryClient()` call needed a plain
   `new QueryClient()` wrapper — consistent with the file's isolated-unit
   style; no store/bridge wiring needed since the mocked widgets define no
   `prefetch`. The `react-redux` jest mock existed only to feed the provider's
   `useDispatch`, which is gone.

9. **Behavior deltas are the standard query-conversion posture.** The thunk
   fetched once per effect fire; the query gets the app default
   `shouldRetryQuery` (up to 3 retries on 5xx/network) and `prefetchQuery`
   dedupes an in-flight fetch. With the default `staleTime: 0`, effect
   re-fires still refetch — effectively the thunk's fire-every-effect
   behavior.

</details>

<details>
<summary>Manual testing</summary>

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

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
