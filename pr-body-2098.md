## Summary

One outline → courseware navigation was requesting `/api/course_home/course_metadata/`, `/api/courseware/course/` and `/api/learning_sequences/v1/course_outline/` **three times each**. Those are exactly the three queries `useIsCourseLoaded` observes. `CoursewareContainer` fetches them once; the other two requests came from components under it — `UnitNavigation` and `UnitNavigationEffortEstimate`, through `useSequenceIds` → `useIsCourseLoaded` — mounting after the data had landed, finding it stale at the default `staleTime` of 0, and refetching. `useIsCourseLoaded` is a gate check, but it was also a fetching observer, so every component that asked "is the course loaded?" quietly became a fetcher.

This is the defect #2083 fixed on the course-home tabs, and it gets the same fix: the owner fetches, the readers under it only read. No caller of `useIsCourseLoaded` needs it to fetch — its two default callers run inside `CoursewareContainer`'s own render, which already calls the three query hooks directly — so it now never fetches. Measured on tutor dev, the crossing goes from **3 / 3 / 3 to 1 / 1 / 1** requests. No other user-facing change.

Part of the Redux → React Query migration (#1946, Stage 1). Closes #2098. Stacked above #2101 (#2100), which fixes four `useIsCourseLoaded` tests this change exposed as never having asserted anything.

## What changed

- **`useIsCourseLoaded` never fetches.** It passes `{ enabled: false }` to `useCourseHomeMeta`, `useCoursewareMetadata` and `useCoursewareOutline`, which take that option now. A disabled observer returns the query's current state and re-renders when the owner's fetch lands, so every caller reads the same value as before, and `useIFrameBehavior`'s invalidation of the three keys still refetches through the owner's observers.
- **`useSequenceIds` follows with no change of its own** — `useIsCourseLoaded` is its only link to React Query. The four gated call sites (`CourseBreadcrumbs`, `useSequenceNavigationMetadata` twice, `UnitNavigationEffortEstimate`) are untouched.
- **No `staleTime`.** It would have hidden the extra fetches without deciding who owns them, and would also have delayed the owner's refetch on navigation — which is where `course_metadata` records the learner's daily streak.
- **Tests mount the owner's fetches themselves.** Component suites that render a gated component on its own (`CourseBreadcrumbs`, `SequenceNavigation`, `UnitNavigation`) render the new `src/tests/MountCourseQueryHooks.tsx` beside it; the hook tests in `courseware/data/apiHooks.test.tsx` call the three query hooks alongside the gate hook. New hook tests pin that the gate fetches nothing on its own and reads an owner's result without fetching again — both fail if the gate is made to fetch.
- **`QueryOptions`** is declared locally in `courseware/data/apiHooks.ts`, matching the course-home one, since `src/` has no shared module for it.

## Testing

`npm run types`, `npm run lint` and the full suite (113 suites, 1140 passed, 3 skipped) are green.

Manually verified on tutor dev, with `CourseBreadcrumbs` and `SequenceNavigation` inserted through their slots (both render nothing by default). Entering courseware six ways (including a hard reload on a unit URL and the three redirect shapes), the breadcrumbs and their dropdowns, and every unit-navigation check across all three navigation surfaces behave as before. The request count on the outline → courseware crossing is 1 / 1 / 1 for the gate endpoints (3 / 3 / 3 before) with the control endpoint unchanged at 1, and moving across a sequence boundary requests none of them. The preview route was not run, and console output was not compared against a before capture; video auto-advance and the first-section celebration are left out with their reasons.

## Decisions

Working notes for this layer, kept out of the tree:

<details>
<summary>Full decision log</summary>

# Decisions — stop the courseware gate queries refetching from components under the gate (#2098)

Layer on top of #2084. The diagnosis and the ownership fix were settled in the
plan on issue #2098; entries here record choices made after it.

1. **`QueryOptions` is declared locally in `courseware/data/apiHooks.ts`, not
   shared.** `course-home/data/apiHooks.ts:28-30` already declares
   `interface QueryOptions { enabled?: boolean; }` as a module-private type, and
   this layer needs the same shape for `useCoursewareMetadata` and
   `useCoursewareOutline` (`useIsCourseLoaded` and `useSequenceIds` take no
   option; see entry 4). The courseware module declares a matching local copy.

   Sharing it was considered. The best home would be a new
   `src/data/query-options.ts`, beside `http-error.ts`, whose `RequestError` is
   already a type both feature hook modules import from `@src/data/`. It was
   rejected because no such module exists yet: `src/` has no shared types module
   at all, so sharing would mean creating a file for a one-field interface that
   mirrors React Query's own option name and is unlikely to drift. If a suitable
   shared module appears later, importing from it becomes the right move and
   both copies should fold into it.

2. **The commit type is `refactor:`.** The change restructures who fetches the
   courseware gate queries — the owner fetches, readers under the gate
   subscribe — and nothing is broken today, so `fix:` would imply a bug that
   isn't there. `perf:` describes the outcome (three requests per gate query
   become one) and is allowed by the shared openedx commitlint config, but this
   repo has not used it, while the rest of the React Query migration landed as
   `refactor:`; staying consistent with those commits wins.

3. **Suites that render a gated component on its own mount the owner, not a
   seeded cache — the plan was wrong to expect `seedQueryData`.** Three suites
   (`CourseBreadcrumbs`, `SequenceNavigation`, `UnitNavigation`; 13 cases)
   relied on the component under test fetching the gate queries itself, against
   the endpoints `initializeTestStore` already mocks. Seeding did not fit: the
   two navigation suites use `setupTest`'s `render`, which builds its client
   internally with no way to reach it, and seeding would mean writing each
   query's normalized result shape by hand, while the components read only
   `isSuccess` and `courseAccess.hasAccess` — a stand-in shape would let those
   tests claim more than they check. Instead `src/tests/MountCourseQueryHooks.tsx`
   exports a component that calls `useCoursewareMetadata`,
   `useCoursewareOutline` and `useCourseHomeMeta` for the course, and each
   suite renders it beside the component under test. That is the production
   shape — `CoursewareContainer` fetches, the components under it read — using
   the real hooks and the existing mocks. `apiHooks.test.tsx` calls the three
   hooks directly inside `renderHook`, alongside the gate hook, so each test
   shows what it mounts; a shared hook for that was tried and read worse than
   the three calls it hid.

   **Naming.** The helper is named for what it does — it mounts query hooks —
   not for the state it produces or the hook that reads its results. Names
   built on `useIsCourseLoaded` (`CourseLoadedQueries`) pointed at the reader
   rather than the fetcher and read as "the queries of a loaded course";
   `Courseware…` claimed the wrong set (one of the three is course-home's, and
   courseware has sequence and sidebar queries this does not mount); verb-led
   hook names (`useFetch…`, `usePopulate…`) read awkwardly. A generic
   `MountHook` (one element per hook, the hook passed as a value) was sketched
   and set aside as more machinery than three call sites need, but it gave the
   vocabulary: *mount* for the action, *query hooks* for what is mounted, and
   *course* for the course-level queries as opposed to the sequence query
   `CoursewareContainer` also mounts.

   **Home.** It lives in its own TypeScript file beside
   `src/tests/MockedPluginSlot.jsx`, the existing place for render-tree test
   helpers. `setupTest.js` was the first home, but it is JavaScript, so
   `react/prop-types` required a `propTypes` declaration for `courseId` —
   more PropTypes to remove later. `src/courseware/course/test-utils.jsx`
   (the courseware test helpers, closer in scope) has the same problem, and
   converting it is out of scope. A prop-less local copy in each suite would
   have avoided the rule too, at the cost of three copies. In a `.tsx` file
   the prop is typed and the rule is satisfied, which is why no `.tsx` file in
   the repo declares `propTypes`; a one-component file was judged better than
   either new PropTypes or duplication.

4. **`useIsCourseLoaded` never fetches; `useSequenceIds` follows, and neither
   takes an option.** The plan gave both an `{ enabled }` option, with the
   gated components passing `false` — the per-call-site shape #2083 uses for
   the tab readers. But no caller wants it on. The two that took the default
   `true`, `redirects.ts:248` and `CoursewareContainer.tsx:46` (through
   `useSequenceIds`), run inside `CoursewareContainer`'s own render, which
   already fetches all three queries directly (`CoursewareContainer.tsx:32-33`,
   `redirects.ts:249-250`), so their observers only deduped. Three shapes were
   weighed:
   - *Keep the option, default `true`.* Clearest at the call site, but an
     option nobody needs, and forgetting `{ enabled: false }` silently brings
     back the duplicate requests this change removes — nothing fails, and the
     trace showed it only turns up when someone counts requests.
   - *Default it to `false`.* Still an option nobody needs, and it inverts
     React Query's own default, so `{ enabled: true }` at a call site would
     read as the surprise.
   - *Always non-fetching* (chosen). The simplest, and its misuse fails
     loudly: a caller with no owner above it stays `false` forever, which
     breaks the page and any test of that component. The name already fits a
     read — it asks whether the course is loaded.

   It carries no comment. A draft named `CoursewareContainer` as the owner, but
   "never fetches" restated the `{ enabled: false }` below it, "every caller
   runs inside `CoursewareContainer`" read as a restriction when any fetching
   observer of the same queries will do, and a trimmed version ("stays false
   until something else fetches these queries") still only described what a
   disabled query does. #2083's disabled readers carry none either, since
   `{ enabled: false }` is React Query's own vocabulary; the owner is recorded
   here and in `MountCourseQueryHooks`' comment, where the tests mirror it.

   `useSequenceIds` has no query of its own — `useIsCourseLoaded` is its only
   link to React Query, and its other reads are model-store selectors — so it
   became non-fetching with no change of its own, and its pass-through option
   went with it. The four gated call sites are back to their original
   argument lists. The three query hooks keep `{ enabled }`:
   `useIsCourseLoaded` uses it internally, and B2 (#2085) and B3 (#2086) need
   it on `useCourseHomeMeta` for their gated readers.

   **For #2089 (D3):** it converts `useSequenceIds`' model-store reads onto the
   outline query, which gives the hook a query observer of its own. By the
   same reasoning that observer should read without fetching —
   `CoursewareContainer` owns the outline fetch, through
   `useCoursewareRedirects`.

   The hook tests were checked by making the gate fetch again: with the three
   internal `{ enabled: false }` flipped to `true`, *fetches nothing on its
   own* (both the `useIsCourseLoaded` and the `useSequenceIds` case) and
   *reads the owner's result without fetching again* fail — 0 requests
   becoming 3, and 3 becoming 6, one refetch of each gate endpoint.

5. **Four #2071 tests got their own layer, #2100 (PR #2101), below this one.**
   With the owner/reader split, four `useIsCourseLoaded` tests from #2071
   (*pending*, *lacks access*, *outline fails*, *a query fails*) failed. The
   hook was not at fault: each registered its special handler and then called
   `mockHappyPath()`, which replaced it, and asserted before any response
   settled, so they had never tested the states they name — deleting the
   special handlers left them green. That repair is #2100's, split out the way
   #2078 was so this layer stays about who fetches. This layer builds on its
   version of the block: `renderLoaded` keeps #2100's optional `queryClient`
   argument and additionally calls the three query hooks, and
   `makeWrapper` lets the reader test mount a second hook on the same client.

</details>

## Manual testing

<details>
<summary>Checklist</summary>

# Manual testing — stop the courseware gate queries refetching from components under the gate (#2098)

In-browser verification against a live backend (tutor dev).

What changed: `useIsCourseLoaded` no longer fetches, and neither does
`useSequenceIds`, which reads through it. `CoursewareContainer` (together with
`useCoursewareRedirects`, which it calls) is now the only thing fetching the three
gate queries — `/api/course_home/course_metadata/`, `/api/courseware/course/` and
`/api/learning_sequences/v1/course_outline/`. Everything below it only reads.

**The bug this layer could introduce is a reader that never sees loaded data.** A
disabled observer with nothing fetching its query stays `pending`, so the gate reads
`false` forever and the component sits in its "not loaded yet" state without
erroring. That is what this doc is mostly for: click through every page and every
component that now only reads, and confirm each behaves as if the course is loaded.
In the app nothing should be in that position — every reader renders under
`CoursewareContainer` — so any failure here means that assumption is wrong somewhere.

What "stuck unloaded" looks like, per reader:

| reader | reads | stuck unloaded, you would see |
|---|---|---|
| `CourseBreadcrumbs` (slot-inserted, see Setup) | `useIsCourseLoaded` | breadcrumbs with no section/subsection crumbs or empty dropdowns |
| `useSequenceNavigationMetadata` → `UnitNavigation` (beside the unit title and at the bottom, by default) and `SequenceNavigation` (the unit-tab bar, slot-inserted) | `useIsCourseLoaded`, `useSequenceIds` | Previous/Next never disabled at the course's ends, no link to the course-end page, and cross-sequence Next/Previous going nowhere |
| `useSequenceNavigationMetadata` → `useIFrameBehavior` | same | video auto-advance doing nothing at the end of a video (not run; see *Not covered*) |
| `UnitNavigationEffortEstimate` (inside Next) | `useSequenceIds` | nothing visible — its effort branch is unreachable today (AA-930) and it passes its children through |
| `CoursewareContainer` itself | `useSequenceIds` | the first-section celebration not being queued when Next crosses out of the first section (not run; see *Not covered*) |
| `useCoursewareRedirects` | `useIsCourseLoaded` | a partial courseware URL that never redirects to a unit |

## Setup

An ordinary course with **several sections**, each with a few subsections and
units, covers most of it. Test as an **enrolled learner** unless a check says
otherwise.

**Two of the readers render only when a plugin slot inserts them**, so add both to
`env.config.jsx` (it is untracked — check a stale local copy is not carrying other
overrides). Both inserts are the "Replace with default … component" examples from the
slots' READMEs:

- `org.openedx.frontend.learning.course_breadcrumbs.v1` — `CourseBreadcrumbsSlot`
  renders nothing by default; insert `CourseBreadcrumbs` from
  `./src/courseware/course/breadcrumbs`, passing through `courseId`, `sectionId`,
  `sequenceId`, `unitId` and `isStaff` (`src/plugin-slots/CourseBreadcrumbsSlot/README.md`).
- `org.openedx.frontend.learning.sequence_navigation.v1` — `SequenceNavigationSlot`
  also renders nothing by default (`Sequence.jsx` says so above it); insert
  `SequenceNavigation` from `./src/courseware/course/sequence/sequence-navigation`
  as in `src/plugin-slots/SequenceNavigationSlot/README.md`.

Without them, the breadcrumb checks and the unit-tab bar checks below have nothing
to look at. The two `UnitNavigation` instances render by default.

Extra state for one check:

- **Preview route** — a staff account, to open a unit through
  `/preview/course/:courseId/:sequenceId/:unitId` (e.g. *Preview* from the authoring
  MFE).

## Verify by hand

### Entering courseware

Each of these mounts the readers in a different order relative to the owner's fetch.

- [x] **From the outline**, click a sequence title. The unit renders, breadcrumbs
      fill in, the navigation works.
- [x] **Hard reload on a unit URL** (`/course/:courseId/:sequenceId/:unitId`). The
      readers mount while the owner's requests are still in flight, which is the case
      most likely to expose a reader that never updates.
- [x] **`/course/:courseId`** redirects to the resume unit (or the first unit on a
      fresh enrollment) and the page settles as above.
- [x] **`/course/:courseId/:sequenceId`** redirects to a unit in that sequence.
- [x] **A section id in the sequence slot** (`/course/:courseId/<section id>`)
      redirects to that section's first sequence.
- [x] **Home breadcrumb back to the outline, then a sequence title again** — the
      second entry reuses cached data rather than fetching from scratch, and should
      settle the same way.

### Breadcrumbs

- [x] **Section and subsection crumbs show** with the right titles, on first entry
      and after moving to another sequence.
- [x] **The section dropdown lists every section**, and choosing one navigates there.
- [x] **The subsection dropdown lists that section's subsections**, and choosing one
      navigates there.

### Unit navigation

Three navigation surfaces read the same metadata: `UnitNavigation` beside the unit
title, `UnitNavigation` at the bottom of the unit, and the `SequenceNavigation`
unit-tab bar (slot-inserted). Run each check in **all three**.

- [x] **Previous is disabled on the course's first unit**, and enabled on every other
      unit.
- [x] **Next and Previous within a sequence** move one unit.
- [x] **Next on a sequence's last unit** lands on the first unit of the next
      sequence; **Previous on a sequence's first unit** lands on the last unit of the
      previous one. Include a **section boundary**.
- [x] **Next on the course's last unit** goes to the course-end page
      (`/course/:courseId/course-end`), and that page renders.
- [x] **After several of the above**, the bars still reflect the current unit — no
      stale first/last state from a previous sequence.

### Preview route

- [ ] **Open a unit via `/preview/course/…`** as staff: breadcrumbs (with `/preview`
      in their links), the navigation and unit-to-unit movement behave as on the
      normal route.

### Request count

Protocol, same as #2084's: hard reload the outline, wait for the Network tab to go
idle, clear the log, click a **sequence title**, wait for idle again, count each
endpoint.

| endpoint | before (on #2084) | after |
|---|---|---|
| `/api/course_home/course_metadata/` | 3 | 1 |
| `/api/courseware/course/` | 3 | 1 |
| `/api/learning_sequences/v1/course_outline/` | 3 | 1 |
| `/api/course_home/v1/navigation/` (control) | 1 | 1 |

"Before" was measured while diagnosing this issue: `course_metadata` over five runs
(3 every time), the other three once.

- [x] **Each gate endpoint is requested once**, and the control stays at 1.
- [x] **Next across a sequence boundary**: clear the log, click, wait for idle, count
      the three gate endpoints. **0 on this layer.** Not measured on the layer below
      (#2101), so there is no before number to compare against.

### General

- [ ] **No new console errors** on any of the above. *Not verified — nothing stood
      out while testing, but the console was not checked against a before capture.*

Not covered:

- **Video auto-advance.** `useIFrameBehavior` takes `isLastUnit` and `nextLink` from
  the same `useSequenceNavigationMetadata(sequenceId, unitId)` call the navigation
  surfaces use, so the unit-navigation checks above — Next resolving within a
  sequence, across sequence and section boundaries, and to course-end on the last
  unit — exercise the values it would act on. What is specific to it is the video
  block's `plugin.autoAdvance` message, which this layer does not touch. Setting it
  up needs the platform's `ENABLE_AUTOADVANCE_VIDEOS` flag (off by default, and it
  hides the course's *Enable video auto-advance* Advanced Setting while off), the
  course setting, and the learner's player toggle.
- **The first-section celebration.** Its read is `CoursewareContainer`'s own
  `useSequenceIds` call, in the owner's render alongside the fetching
  `useCoursewareMetadata` / `useCourseHomeMeta` calls and `useCoursewareRedirects`,
  so it cannot be left without a fetch the way a component further down could; the
  sequence-boundary Next checks above already show `useSequenceIds` returning the
  loaded sequence list. The modal is also off by default: openedx-platform creates the
  enrollment's celebration row only when the enrollment is created while the
  `courseware.mfe_progress_milestones` course waffle flag is on, and it then needs Next
  from a section's last unit into the next section, with no streak celebration due.
- **The `useIFrameBehavior` invalidation after a `post_event`** (the
"Shift due dates" button in a past-due problem). It refetches through the owner's
observers, which are unchanged by this layer, and producing a missed deadline takes
a self-paced course with the `relative_dates` flag and a backdated schedule. Worth
running only if something above suggests the owner itself is misbehaving.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
