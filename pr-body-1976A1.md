## Summary

Read the courseware route ids from `useParams` instead of the Redux slice's mirrors. The `courseware` slice's `courseId`/`sequenceId` are written only by the transitional `statusBridge.ts` hooks, which dispatch the route params verbatim — so every reader that consumes just those id fields can read the route directly. This is **layer A1** (of six) of the courseware slice teardown #1976 ([plan](https://github.com/openedx/frontend-app-learning/issues/1976)) in the Redux → React Query migration (#1946, Stage 1), stacked on the discussion-topics conversion #2068. Part of #1976 — the teardown's final layer closes it.

Status reads are untouched: the bridge keeps writing the slice for them until the later layers.

## What changed

- **Nine readers swap the slice ids for `useParams`:** `useIFrameBehavior`, the outline-sidebar hook (`useCourseOutlineSidebar`), `UnitButton` (which builds unit hrefs from them; its `RootState` import goes), and the course-exit readers — `CourseRecommendations`, `CourseCelebration`, `CourseInProgress`, `CourseNonPassing`, `CatalogSuggestion`, `UpgradeFootnote` (all `courseId` under `/course/:courseId/course-end`).
- **`useContextId` (`src/data/hooks.ts`) becomes `useParams().courseId`.** Its `state.courseHome.courseId` fallback was dead — `fetchTabFailure`, the only writer, has had no dispatcher since the tab conversions. Every course-home and courseware route carries `:courseId`.
- **The outline-sidebar hook stops returning `sequenceStatus`** — a dead field: no component consumed it.
- **`CourseOutline.tsx`** resolves the active section via `activeSequenceId && Object.keys(sections).find(...)` — the same guarded-scan idiom `courseOutline.ts` uses for the identical parent-section lookup — because the id is now honestly typed `string | undefined` (route param) instead of the untyped selector's `any`.
- **Tests move to runtime-faithful routes instead of slice seeding:** `CourseOutlineTray.test` renders under `/course/:courseId/:sequenceId/:unitId` (the sidebar lives on unit pages), `UnitButton.test`'s preview case gains a real `Route` (its bare `MemoryRouter` gave `useParams` nothing), `CourseExit.test` drops its `fetchCourseSuccess` slice seeding, and `useIFrameBehavior.test` loses a dead `react-redux` mock.

## Testing

`npm run types` (0 errors), `npm run lint` (clean), full jest suite green at head (111 suites, 1120 passed / 3 pre-existing skips). Manual pass on tutor local in the details block below.

## Decisions

<details>
<summary>Full decision log</summary>

# Decisions — courseware route ids from useParams (#1976, layer A1)

1. **Route params replace the slice's id mirrors.** The `courseware` slice's
   `courseId`/`sequenceId` are written only by the `statusBridge.ts` hooks,
   which dispatch the route params verbatim — so `useParams()` is the faithful
   replacement, minus a one-effect-tick lag (the bridge sets the slice fields
   in a post-render effect; the route has them immediately). No status fields
   convert in this layer; the bridge keeps writing the slice for the remaining
   readers until layer B.

2. **The plan's reader inventory had a grep gap, found while running this
   layer's tests.** The original sweep matched `state.courseware.` (with a
   trailing dot) and missed eight destructuring readers of the form
   `const { courseId } = useSelector(state => state.courseware)`. Six are
   id-only and joined this layer: `CourseCelebration`, `CourseInProgress`,
   `CourseNonPassing`, `CatalogSuggestion`, `UpgradeFootnote` (all course-exit,
   all `courseId` under `/course/:courseId`), and `UnitButton`
   (`courseId` + `sequenceId`, rendered on unit routes). `SequenceNavigation`
   reads `courseId` **and** `sequenceStatus`, so it moves whole to layer A2
   (one touch per file); `TabPage`'s destructure (`errorMessage`) was already
   assigned to B-prep/B. A follow-up sweep with broader patterns
   (`getState().courseware`, bracket access, bare `.courseware`) found nothing
   else.

3. **The outline-sidebar hook stops returning `sequenceStatus` — a dead
   field.** No component consumes it (`CourseOutline`, the tray, the trigger,
   and the `Sidebar*` components read only `activeSequenceId` and friends);
   it was plumbed through `useCourseOutlineSidebar`'s return object and read
   by nothing. Dropped rather than converted.

4. **`CourseOutline.tsx` gains an explicit `undefined` guard instead of a
   cast.** `activeSequenceId` is now typed `string | undefined` (route param)
   where the untyped selector was `any`. The old runtime behavior on the
   course root was `sequenceIds.includes(undefined)` → `false`; the guard
   (`activeSequenceId !== undefined && …includes(activeSequenceId)`)
   preserves exactly that without a non-null assertion that would state a lie.

5. **`useContextId` becomes `useParams().courseId`.** Its
   `state.courseHome.courseId` fallback was dead — `fetchTabFailure`, the only
   writer of `courseHome.courseId`, has had no dispatcher since the tab
   conversions — and the slice half mirrored the route. Every course-home and
   courseware route carries `:courseId`. Return type narrows from the untyped
   selector result to `string | undefined`; the sole caller
   (`DashboardFootnoteLinkPluginSlot`) feeds `useModel`/`logClick`, both fine
   with it. The `RootState` import leaves `src/data/hooks.ts`.

6. **Tests move to runtime-faithful routes instead of slice seeding.**
   - `CourseOutlineTray.test.jsx` rendered under `/course/:courseId`, relying
     on the slice for the active sequence; at runtime the sidebar renders on
     unit pages, so the test now renders under
     `/course/:courseId/:sequenceId/:unitId` with the seeded sequence/unit ids
     in the entry URL. (Without this, `CourseOutline` resolves no section and
     renders no sequence rows.)
   - `UnitButton.test.jsx`'s preview case rendered inside a `MemoryRouter`
     with no `Route`, so `useParams()` was empty; it now mounts under
     `/preview/course/:courseId/:sequenceId/:unitId`. The other UnitButton
     cases don't assert hrefs and stay as-is.
   - `CourseExit.test.jsx` drops its `fetchCourseSuccess({ courseId })`
     dispatch + slice import — it existed to seed slice `courseId` for the
     course-exit readers, all converted here; the tests already render under
     `/course/:courseId`.
   - `useIFrameBehavior.test.js` loses its `react-redux` mock (the hook no
     longer touches react-redux; nothing else in the mocked tree does) and
     gains an explicit `useParams` entry in its `react-router-dom` mock.
   - Test-side *convenience* reads of `state.courseware.courseId` (five
     suites use it just to learn the id) still work — the slice lives until
     layer B, which re-sources them.

7. **Behavior deltas: one accepted corner case, confined to the outline
   sidebar.** In healthy flows the values are identical: ids arrive one
   effect-tick earlier and are `undefined` (not `null`) when the route lacks
   them, and every route that renders the touched components carries the
   params they read (section-id and unit-as-sequence URLs populate the
   `:sequenceId` position with the same value the slice held).

   The corner (raised in review): slice `sequenceId` is "the last
   `:sequenceId` that was ever in the URL" — the bridge dispatches route
   params verbatim but bails when the param is absent, and nothing resets the
   field. So after an in-app `navigate('/course/:courseId')` — reachable only
   through the redirect *fallback* paths (invalid sequence with no parent,
   empty section) — the slice keeps the old id while the route has none.
   That is the same window where the container's ids-match guard bails
   forever (the latent stale-bail bug layer B removes), leaving the old
   sequence rendered under the bare course URL. There, the sidebar previously
   highlighted the stale sequence (consistent with the stale content,
   inconsistent with the URL); post-A1 it resolves no active section and
   renders an empty sequence list. Blast radius is the sidebar only, and the
   state is hard to reach with the tray involved (the fallbacks fire on
   sequence *load failures*, where `sequenceStatus` is `failed` and most
   loaded-sequence UI doesn't render). **Accepted** rather than keeping the
   sidebar on the slice until B: it preserves fidelity only to a state that
   is itself the bug being removed, and B's guard deletion makes the state
   self-heal (the resume redirect fires and navigates to a real unit URL).

   The benign inverse also changes: during sequence→sequence navigation the
   slice lagged the route by one effect tick, so the sidebar briefly
   highlighted the *previous* sequence; the params version highlights the
   current one immediately.

</details>

<details>
<summary>Manual testing</summary>

# Manual testing — courseware route ids from useParams (#1976, layer A1)

In-browser verification for layer A1, against tutor local
(`http://apps.local.openedx.io:2000/learning`, DemoX
`course-v1:OpenedX+DemoX+DemoCourse`). This layer claims **zero user-facing
change**: nine readers swap the slice's `courseId`/`sequenceId` mirrors for
`useParams()`, and the values are identical on every route that renders them.
The things to watch are the places those ids feed URLs or lookups.

## Verify by hand

- [x] **Unit navigation buttons** (`UnitButton` builds
  `/course/{courseId}/{sequenceId}/{unitId}` from route params now) —
  `UnitButton` only renders inside `SequenceNavigation`, whose slot
  (`org.openedx.frontend.learning.sequence_navigation.v1`) renders nothing by
  default: re-inject the default nav via `env.config.jsx` per the slot's
  README first. Then open a unit with several units in the sequence; the
  per-unit icon tabs link to sibling units correctly (hover/copy a link — no
  `undefined` segments), and clicking navigates.
- [x] **Preview route** (`UnitButton`'s `/preview` prefix) — same
  `env.config.jsx` setup; open the same unit under `/preview/course/...`
  (staff): unit buttons keep the `/preview` prefix and work.
- [x] **Outline sidebar** (`useCourseOutlineSidebar` active ids from params)
  — open the outline tray on a unit page: the active section's sequences
  show, the active sequence is expanded/highlighted; clicking a unit in the
  tray navigates and (mobile width) closes the tray.
- [x] **Unit iframe** (`useIFrameBehavior` active sequence from params) —
  unit content loads and resizes normally; navigating between units keeps
  working.
- [x] **Course-end page** (`CourseCelebration` / `CourseInProgress` /
  `CourseNonPassing` / `CatalogSuggestion` / `UpgradeFootnote` /
  `CourseRecommendations` courseId from params) — open
  `/course/{courseId}/course-end`: the celebration (or
  in-progress/non-passing) content renders with its links (dashboard
  footnote, progress/dates links, recommendations or catalog suggestion);
  no blank sections.

## Results

All five checks passed (2026-09-15, tutor local, DemoX; sequence-navigation
checks with the default nav re-injected via `env.config.jsx`). No `undefined`
URL segments, active section/sequence resolved in the tray, course-end
content and links intact.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
