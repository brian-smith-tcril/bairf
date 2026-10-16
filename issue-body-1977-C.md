Part of #1946 — Redux → React Query migration (Stage 1). Part of the #1977 model-store dissolution ([plan](https://github.com/openedx/frontend-app-learning/issues/1977)) — **Layer C**. Independent — can slot anywhere in the stack.

**Goal:** read discussion topics from the query instead of the `discussionTopics` model, and drop its bridge entry.

**Context.** #2016 converted the fetch to `prefetchDiscussionTopics(queryClient, courseId)` but deliberately left the three readers on `useModel`, since read conversions are this issue's home. The query resolves to a **list** of topics filtered to those with a `usageKey`; the bridge writes them into the model store keyed by `usageKey` (`idField: 'usageKey'`), which is why the readers look them up by unit id.

**Tasks**
- Convert the three `useModel('discussionTopics', unitId)` readers — `widgets/discussions/DiscussionsSidebar.jsx:22`, `widgets/discussions/DiscussionsTrigger.jsx:21`, `courseware/course/sidebar/SidebarContextProvider.jsx:35` — to a lookup by `usageKey` against `coursewareQueryKeys.discussionTopics(courseId)`.
- Remove `meta: { models: [{ modelType: 'discussionTopics', … }] }` from `prefetchDiscussionTopics`.
- If the bridge's `idField` pass-through (added in #2016) has no other user left, note it for layer F rather than removing it here.

**Verify:** on an openedx-provider course the discussions trigger and sidebar still appear for units with a topic and stay hidden for units without one; legacy-provider courses unaffected; `git grep discussionTopics src` finds no model-store reference.

> [!NOTE]
> This issue was authored by Claude (Claude Code) and reviewed before posting.

**Findings that shape the task list**

- **The readers key by unit id, the query holds a list.** The conversion is a `find(topic => topic.usageKey === unitId)` over the query result, not a direct index. Each topic also carries its own `id` (the discussion topic id) which the render gates check (`topic?.id && topic?.enabledInContext`) — keep both fields straight.
- **The data is prefetched, not observed.** `prefetchDiscussionTopics` is fired once from `SidebarContextProvider`'s widget-registry effect, so the readers must subscribe to the cache entry without re-fetching it themselves — the same non-fetching read layer A introduces for the cross-tab outline alerts.
- **Single source, so no merge to untangle** — unlike `sequences`/`coursewareMeta`, this model has exactly one writer, which is why it is independent of the rest of the stack.
