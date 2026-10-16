# Manual testing — read discussion topics from the query, not `useModel` (#2087)

In-browser verification against a live backend (tutor dev).

What changed: the discussions trigger, the discussions panel and the sidebar
provider's `unit` read the current unit's topic through
`useDiscussionTopic(courseId, unitId)`, a disabled observer of the query
`DiscussionsProvider` fetches, instead of the `discussionTopics` model; the
query no longer writes that model. No request or storage change intended:
still one `v1/courses/{courseId}` and one `v2/course_topics/{courseId}` per
sidebar mount, both the Provider's.

**The bugs this layer could introduce.** (1) *A reader that never sees the
data* — a disabled observer with nothing fetching its query stays `pending`
forever, so the trigger and panel would never appear and `unit` would never
be defined, with no error. Every reader renders inside the provider, where
`DiscussionsProvider` is mounted, so this should be impossible; a failure
means that assumption is wrong. (2) *A reader that fetches* — a reader
mounting after the Provider's fetch settled would refetch at `staleTime: 0`,
showing as a second `course_topics` request pair. (3) *The sync path* — the
readers must re-render when the Provider's query resolves, which is what
opens a stored `DISCUSSIONS` preference and makes the trigger appear after
load; if the disabled observers did not subscribe, both would stay closed or
hidden until something else re-rendered. (4) *`undefined` where `{}` was* —
an operator widget's `isAvailable` written as `unit.id` now throws
(documented as breaking); `unit?.id` is unaffected.

## Setup

A course with the **Open edX** discussions provider, `DISCUSSIONS_MFE_BASE_URL`
configured, and two units: one with in-context discussions **on**, one with
them **off** (Authoring → the unit's discussion setting). A legacy-provider
course if one is handy (optional; see *Not run* otherwise). Browser devtools
open on the Network tab filtered to `discussion`, and on the Console.

For bug 4, optionally a probe widget in `env.config.jsx` (untracked — check
a stale local copy is not carrying other overrides) whose `isAvailable` reads
`unit?.id` and whose panel reads
`useDiscussionTopic(courseId, unitId).data` through `useSidebar()`; remove it
afterwards.

## Checks

### Request count (bug 2) — the #2098 protocol

- [x] **Hard reload a unit with discussions on, wait for the Network tab to go idle:** `v1/courses/{courseId}` **1**, `v2/course_topics/{courseId}` **1**.
- [x] **Open the discussions panel, then navigate to the next unit and back:** no new `course_topics` request.

### The readers see the data (bugs 1 and 3)

- [x] **Unit with discussions on:** the discussions trigger is in the sidebar strip; opening it loads the iframe at `{DISCUSSIONS_MFE_BASE_URL}/{courseId}/category/{unitId}?inContextSidebar`.
- [x] **Unit with discussions off:** no discussions trigger, no panel; navigating between the two units flips the trigger without a new topics request.
- [x] **Trigger appears after load:** on a hard reload of a unit with discussions on, the trigger appears once the topics request resolves (the first availability check runs before it lands).
- [x] **Stored preference auto-opens:** with discussions open, reload — the panel is open again once the query resolves (the sync path). Close it, reload — closed.
- [x] **Console:** no error naming `useDiscussionTopic`, `useSidebar` or `.filter`.

### Legacy provider

- [ ] **Legacy-provider course:** `v1/courses/{courseId}` **1**, no `course_topics` request, no discussions trigger.

### Operator widget contract (bug 4, optional)

- [ ] **Probe widget:** its trigger shows on the unit with discussions on and not on the unit with them off; its panel renders the topic's `id`; no console error.

## Results

Run 2026-09-25 on tutor dev. 7 of 9 checks run, all passing; 2 not run.

**Run**

- **Request count:** on a hard reload of a unit with discussions on,
  `v1/courses/{courseId}` and `v2/course_topics/{courseId}` once each; with
  the panel open, the next unit and back added no `course_topics` request.
- **Unit with discussions on:** the trigger in the strip; opening it loaded
  the iframe at `{DISCUSSIONS_MFE_BASE_URL}/{courseId}/category/{unitId}?inContextSidebar`.
- **Unit with discussions off:** no trigger, no panel; navigating between
  the two units flipped the trigger with no new topics request.
- **Trigger appears after load:** on a hard reload the trigger appeared once
  the topics request resolved.
- **Stored preference:** discussions open, reload — open again once the query
  resolved; closed, reload — closed.
- **Console:** no error naming `useDiscussionTopic`, `useSidebar` or `.filter`.

**Not run**

- **Legacy-provider course:** not tested. Covered at the query level by
  *skips the topics request entirely for a legacy provider* in
  `courseware/data/apiHooks.test.tsx` (one request, `[]` cached), and the
  readers then find no topic, the same path the *discussions off* check
  exercised by hand.
- **Probe widget (`undefined` where `{}` was):** not tested. The value is
  pinned by *returns undefined for a unit with no topic* in the
  `useDiscussionTopic` describe, and the contract by `npm run types` checking
  `discussionsIsAvailable`'s own `SidebarWidgetContext` parameter against
  `unit?: DiscussionTopic`.
