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
