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
