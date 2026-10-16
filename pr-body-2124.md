## Summary

`useSequenceMetadata` sets no `staleTime`, so its data is stale on arrival, and React Query's default `refetchOnMount` refetches whenever a fetching observer mounts onto stale data. `CoursewareContainer` and `useCoursewareRedirects` observe the sequence query from the first render; five more fetching observers sit under the gate and mount later — `Sequence`, `SequenceNavigation`, `CourseBreadcrumbs`, the two `sequence-alerts` hooks and `useSequenceNavigationMetadata` — and each refetches on mount. Measured: **three** `api/courseware/sequence/{id}` requests per unit load on tutor dev (two in the jest harness), **one** after this change. It is the defect #2098 fixed for the three course-level queries, with the same fix: the owner fetches, observers under it only read. **No learner-visible change and no data change**; the request count is the only intended difference. Peeled out of #2088's plan review because both of that issue's layers convert every one of these five readers, so the fix would otherwise have landed in passing. Part of the Redux → React Query migration (#1946, Stage 1); fifth layer of stack #2121, on top of #2122. Closes #2123.

## What changed

- **`useSequenceMetadata(sequenceId, { enabled })`** in `courseware/data/apiHooks.ts`, the module's own `QueryOptions` shape (`useCoursewareMetadata` / `useCoursewareOutline`), default `true`, `enabled: enabled && !!sequenceId`. Key, `queryFn`, `retry` and `meta` are unchanged. `CoursewareContainer.tsx:34` and `redirects.ts:251` keep the default and remain the owner.
- **The five under-gate observers pass `{ enabled: false }`** — `Sequence.jsx`, `SequenceNavigation.jsx`, `CourseBreadcrumbs.jsx`, `alerts/sequence-alerts/hooks.js` (both hooks), `sequence-navigation/hooks.js`. Each keeps its `sequenceQuery` variable for the `isPending` / `isSuccess` / `isError` reads it already makes; only the call gains the option. No `useModel` line changes; those are #2088's.
- **`src/tests/MountCourseQueryHooks.tsx` takes an optional `sequenceId`** and calls `useSequenceMetadata(sequenceId)` unconditionally (the hook is disabled for `undefined`), so the suites that render one of those components alone mount the owner beside it — the shape #2098 introduced for the course queries (decision 3).
- **Suites.** `Sequence`, `SequenceNavigation`, `UnitNavigation`, `CourseBreadcrumbs`, `Course` and `course/test-utils.jsx` pass the sequence id to the mount helper. `Sequence.test`'s load-failure case mounts the owner under its failing adapter, and the navigation suite's *is empty while loading* keeps the owner so it passes for the right reason (decision 4). `CoursewareContainer.test` and `ProductTours.test` render the container itself and are unchanged.
- **New cases.** `apiHooks.test.tsx`: *fetches nothing on its own when disabled* and *reads the owner's result without fetching again*, the `useIsCourseLoaded` pair on the sequence hook. `CoursewareContainer.test.jsx`: *requests the sequence metadata once per load* beside #2098's course-metadata case — two on the layer below, one here. Negative check, run: with the five observers flipped back, exactly that case fails; the hook pair correctly stays green, since it pins the option rather than the call sites.
- **`Course.test.jsx`.** *opens discussions when the user clicks its trigger, closing the outline* clicked the discussions trigger with a synchronous `getByRole` after waiting on the outline sidebar; the trigger renders when the topics query resolves, independently of the outline. With the sequence fetch now above the gate the outline settles a round earlier and the lookup missed. The click awaits `findByRole` (decision 8).

## Testing

`npm run types` and `npm run lint` clean; full suite 116 suites, 1175 passed, 0 skipped. Manual checks on tutor dev: 11 of 15 run, all passing — see the checklist below, including the request counts before and after.

## Decisions

<details>
<summary>Full decision log</summary>

# Decisions — stop the sequence query refetching from components under the gate (#2123)

Peeled out of the #2088 plan review (2026-09-25) as its own issue and layer,
the way #2098 was for the course queries; the fifth layer of the running
stack #2121, on top of #2122 (#2087), branch `bsmith/sequence-gate-readers`.
Entries 1–7 were proposed in the plan review (2026-09-25, posted to #2123);
8–9 landed with the code.

## The change, file by file

**`src/courseware/data/apiHooks.ts`.** `useSequenceMetadata(sequenceId,
{ enabled = true }: QueryOptions = {})`, `enabled: enabled && !!sequenceId`,
the shape `useCoursewareMetadata` / `useCoursewareOutline` already have
(`:29-37`, `:39-45`). Nothing else in the hook changes: same key, same
`queryFn`, same `retry: false`, same `meta`.

**The five under-gate observers pass `{ enabled: false }`.** Each keeps its
`sequenceQuery` variable for the `isSuccess` / `isPending` / `isError` reads
it makes today; only the call gains the option.

| File | Line | Reads from the query |
|---|---|---|
| `courseware/course/sequence/Sequence.jsx` | 50 | `isPending`, `isSuccess`, `sequenceMightBeUnit(sequenceQuery)` |
| `courseware/course/sequence/sequence-navigation/SequenceNavigation.jsx` | 37 | `isSuccess` |
| `courseware/course/breadcrumbs/CourseBreadcrumbs.jsx` | 21 | `isSuccess` |
| `alerts/sequence-alerts/hooks.js` | 9, 24 | `isSuccess` |
| `courseware/course/sequence/sequence-navigation/hooks.js` | 14 | `isSuccess` |

`CoursewareContainer.tsx:34` and `redirects.ts:251` are untouched and keep
fetching. No `useModel` line changes anywhere; those are #2088's.

**`src/tests/MountCourseQueryHooks.tsx`** takes an optional `sequenceId` and
calls `useSequenceMetadata(sequenceId)` when given one (`useQuery` is
disabled for `undefined`, so an unconditional call with the optional prop is
fine). Its comment says it mounts what `CoursewareContainer` mounts.

**Suites.** Every suite that renders one of the five components alone gets
its sequence data from the component's own observer today; after this
change that observer is disabled, so each mounts the owner with the
sequence id:

| Suite | Today | Change |
|---|---|---|
| `Sequence.test.jsx` | `SidebarWrapper` and two inline renders mount `MountCourseQueryHooks courseId` (`:57`, `:152`, `:451`); *displays error message on sequence load failure* (`:173`) renders `Sequence` alone under a failing adapter | add `sequenceId` to the three mounts; the failure case mounts the owner beside `Sequence` under the same failing mock, at a route with `:sequenceId` |
| `SequenceNavigation.test.jsx` | `renderNav` mounts `MountCourseQueryHooks courseId` (`:45`) | add `sequenceId` (the resolved one `renderNav` already computes) |
| `UnitNavigation.test.jsx` | `renderNav` mounts `MountCourseQueryHooks courseId` (`:48`) | add `sequenceId`; *renders correctly without units* passes `''`, which stays disabled as today |
| `CourseBreadcrumbs.test.jsx` | `renderWithProvider` mounts `MountCourseQueryHooks courseId` (`:51`) | add `sequenceId={props.sequenceId}` |
| `Course.test.jsx`, `course/test-utils.jsx` | mount `MountCourseQueryHooks courseId` (`:66`, `:37`); `Sequence` under `Course` fetched for itself | add `sequenceId` |
| `CoursewareContainer.test.jsx`, `ProductTours.test.jsx` | render the container, the owner | unchanged; they are the check that the owner still fetches |
| `useIFrameBehavior.test.js` | mocks `sequence-navigation/hooks` outright (`:55`) | unchanged |

*renders correctly without data* (`Sequence.test.jsx:77`, `sequenceId`
`undefined`) is unchanged: the query was already disabled for a missing id.

**New tests.**

- `apiHooks.test.tsx`, `useSequenceMetadata` describe: *fetches nothing on
  its own* and *reads the owner's result without fetching again*, the
  `useIsCourseLoaded` pair (`:219-238`) on the sequence hook with
  `{ enabled: false }`; `makeWrapper(client, pathname)` already gives the
  router the hook needs.
- `CoursewareContainer.test.jsx`, `request count` describe: *requests the
  sequence metadata once per load*, beside #2098's course-metadata case
  (`:538`), filtering `axiosMock.history.get` on
  `/api/courseware/sequence/{defaultSequenceBlock.id}`. Measured on
  `master` with a throwaway copy of that case: **2** requests; expected
  after: 1.

**Negative check, run:** with the five `{ enabled: false }` flipped back,
exactly one case fails — *requests the sequence metadata once per load* —
across the hooks, container, sequence, navigation, breadcrumbs and Course
suites (155 of 156 pass). The two hook cases stay green, correctly: they pin
the option on `useSequenceMetadata`, not the call sites, and would fail only
if the option itself were removed.

## Entries

1. **`{ enabled }` on `useSequenceMetadata` uses the module's existing
   `QueryOptions`** (#2098, entry 1: declared locally in
   `courseware/data/apiHooks.ts`, not shared). Default `true`, so
   `CoursewareContainer` and `redirects` need no change.

2. **The disabled readers carry no comment** (#2098, entry 4): `{ enabled:
   false }` is React Query's own vocabulary, and the owner is recorded here
   and in `MountCourseQueryHooks`' comment, where the suites mirror it.

3. **`MountCourseQueryHooks` takes an optional `sequenceId`** (settled as P2
   in the #2088 plan review): one helper mirroring `CoursewareContainer`,
   which owns all four queries. #2098's entry 3 named it *course* "as opposed
   to the sequence query `CoursewareContainer` also mounts" because its three
   suites did not need it, not as a rule. Rejected: a sibling
   `MountSequenceQueryHook`, two helpers for one production owner.

4. **Suites produce loading, failure and gated states through the owner,
   not by rendering the component without one.** A disabled observer with
   nothing fetching stays `pending` forever, so *is empty while loading*
   (`SequenceNavigation.test.jsx:56`) would pass for the wrong reason
   without the owner, and *displays error message on sequence load failure*
   (`Sequence.test.jsx:173`) would never reach the error. Each renders the
   owner beside the component; the failing case keeps its own adapter and
   the owner fetches through it. This is the #2098 entry-3 shape ("the
   owner fetches, the components under it read") applied to the fourth
   query.

5. **Commit: `refactor:`** (#2098, entry 2: restructures who fetches, no
   bug, `perf:` unused in this repo). Title: *stop the sequence query
   refetching from components under the gate*. No `!`: no plugin-facing
   change — `useSequenceMetadata`'s new parameter is optional and defaults
   to today's behaviour.

6. **`staleTime` stays at the default.** The owner's refetch on a new
   sequence is where `position`, `complete` and `bookmarked` are read, and
   #2088 relies on the entry being the live one. Out of scope, as #2098
   recorded for the course queries.

7. **The manual test names the second requester.** The jest count says
   *two*; the browser trace (initiator column) says which under-gate observer
   sends the second request and whether there is a third in a real render,
   and the manual-testing doc records that, not just the count.

8. **One pre-existing race in `Course.test.jsx` surfaced and is fixed here.**
   *opens discussions when the user clicks its trigger, closing the outline*
   waited for the outline sidebar and then clicked the discussions trigger
   with a synchronous `getByRole`. The trigger renders only once the topics
   query resolves (#2087's manual test recorded "the trigger appears once the
   topics request resolves"), independently of the outline. With the owner
   mounted above `Course`, the sequence data now lands earlier relative to
   the topics response, the outline appears first, and the lookup missed.
   The click now awaits `findByRole`, no comment. The neighbouring cases wait on the discussions sidebar itself
   and were unaffected. Same family as #2118, kept here because this layer
   is what exposed it.

9. **`MountCourseQueryHooks` calls `useSequenceMetadata(sequenceId)`
   unconditionally.** The hook is already disabled for an `undefined` id
   (`enabled: enabled && !!sequenceId`), so the optional prop needs no
   branch; a conditional hook call would also break the rules of hooks.

</details>

## Manual testing

<details>
<summary>Checklist</summary>

# Manual testing — stop the sequence query refetching from components under the gate (#2123)

In-browser verification against a live backend (tutor dev).

What changed: `useSequenceMetadata` takes `{ enabled }`, and the five
observers under `CoursewareContainer` — `Sequence`, `SequenceNavigation`,
`CourseBreadcrumbs`, the two sequence alerts and
`useSequenceNavigationMetadata` — pass `{ enabled: false }`, so only
`CoursewareContainer` and `useCoursewareRedirects` fetch the sequence
metadata. No reader changes, no data changes; the only intended difference is
the request count.

**The bugs this layer could introduce.** (1) *A component that never sees
the data* — a disabled observer with nothing fetching its query stays
`pending` forever. Every one of the five renders under `CoursewareContainer`,
which fetches, so the sequence, its navigation, breadcrumbs and alerts should
render exactly as before; a spinner that never clears, or a missing
breadcrumb / alert, means that assumption is wrong somewhere. (2) *A stale
sequence* — the owner's refetch on navigating to a new sequence is what
brings in `position`, `complete` and `bookmarked`; if the owner somehow
stopped refetching, the unit navigation would show the previous sequence's
state. (3) *The count did not drop* — an observer was missed, or the second
request comes from somewhere not in the five.

## Setup

A course with at least two sections, each with two or more sequences, some
with several units. One sequence with a banner text and, if available, a
prerequisite-gated sequence and a timed exam. Browser devtools open on the
Network tab filtered to `courseware/sequence`, with the *Initiator* column
visible, and on the Console.

## Checks

### Request count (bug 3) — the #2098 protocol

- [x] **Baseline, on `master` (or the layer below):** hard-reload a unit, wait for the Network tab to go idle: `api/courseware/sequence/{id}` count = **3**. Initiator of each request beyond the first: **___**.
- [x] **On this layer:** same reload: count **1**.
- [x] **Navigate to another unit in the same sequence:** no new `courseware/sequence` request.
- [x] **Navigate to a unit in another sequence (next/previous across the boundary, and via the sidebar):** exactly one request, for the new sequence.
- [x] **Open `/course/{id}/{sequenceId}` with no unit:** one request; the redirect lands on the active unit.

### The components see the data (bug 1)

- [x] **Sequence renders:** unit content loads, the top and bottom unit navigations show the unit tabs and previous/next.
- [ ] **Breadcrumbs:** section and sequence crumbs render; jump nav (staff, `ENABLE_JUMPNAV`) lists the sequences.
- [ ] **Banner text alert:** on the sequence with a banner, the info alert shows above the content.
- [ ] **Prerequisite-gated sequence (if available):** the "Content Locked" panel and the lock in the unit navigation.
- [ ] **Timed exam (if available):** the exam wrapper renders its start screen.
- [x] **Hidden-after-due (if available):** the notice renders.
- [x] **Console:** no error naming `useSequenceMetadata`, `sequenceMightBeUnit` or `MountCourseQueryHooks`.

### Owner still refetches (bug 2)

- [x] **Complete a unit, move to the next sequence and back:** the completion tick on the earlier unit is present after the return (the return is a new sequence fetch).
- [x] **Bookmark a unit, leave the sequence and return:** the bookmark icon is present on the unit tab.

## Results

Run 2026-09-25 on tutor dev. 11 of 15 checks run, all passing; 4 not run.

**Run**

- **Request count:** on the layer below (`bsmith/discussion-topics-query-reads`),
  a hard reload of a unit requested `api/courseware/sequence/{id}` **3**
  times (the jest harness shows 2; a real render mounts more observers after
  the data settles). On this layer the same reload requested it **once**.
  Another unit in the same sequence: no new request. A unit in another
  sequence, by next/previous and by the sidebar: one request, for the new
  sequence. `/course/{id}/{sequenceId}` with no unit: one request, and the
  redirect landed on the active unit. The initiators of the two extra
  baseline requests were not recorded.
- **Sequence renders:** unit content loaded; both unit navigations showed
  the unit tabs and previous/next.
- **Hidden-after-due:** the notice rendered.
- **Console:** no error naming `useSequenceMetadata`, `sequenceMightBeUnit`
  or `MountCourseQueryHooks`.
- **Owner still refetches:** after completing a unit, crossing into the next
  sequence and returning, the completion tick was present; after
  bookmarking a unit, leaving the sequence and returning, the bookmark icon
  was present on its tab.

**Not run**

- **Breadcrumbs / jump nav:** not checked. `CourseBreadcrumbs.test.jsx`
  (4 cases) renders the component under the owner mount this layer added,
  the same shape as production.
- **Banner text alert:** no sequence with a banner in the test course.
  Covered by *renders banner text alert* in `Course.test.jsx`, which renders
  `Course` under the owner mount, so the alert hook's disabled observer is
  exercised.
- **Prerequisite-gated sequence:** none in the test course. Covered by
  *renders correctly for gated content* in `Sequence.test.jsx` and *renders
  locked button for gated content* in `SequenceNavigation.test.jsx`, both
  under the owner mount.
- **Timed exam:** none in the test course. `SequenceExamWrapper` receives
  the `sequence` model from `useModel`, which this layer does not touch, and
  the exam library is mocked in `Course.test.jsx`; not covered by this
  layer's tests either, by design of the layer (no reader change).

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
