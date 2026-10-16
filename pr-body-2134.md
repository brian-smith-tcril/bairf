## Summary

The eleven readers of the `sequences` model read the active sequence from the sequence query (`useSequenceMetadata(sequenceId, { enabled: false }).data?.sequence`) and other sequences' `id` / `title` / `sectionId` from the learning-sequences outline (`useMinimalCourseOutline(courseId, { enabled: false }).data?.sequences[id]`); the position writer patches the cached sequence instead of the store; the three `sequences` store selectors in `CoursewareContainer` and `redirects.ts` read the cache; and neither query writes the `sequences` model any more. Each reader takes the query that owns the fields it reads: `sectionId` only ever came from the outline, so `Sequence`, `Course`, the entrance-exam alert and `UnitNavigationEffortEstimate` read both. `useSaveSequencePosition` writes `activeUnitIndex` at the sequence's exact key and rolls back with the TanStack snapshot-and-restore shape. The redirect rules take a full `SequenceMetadata`, so their guards for the store's partial outline entry go. **No request change** and no learner-visible change beyond the loading page title losing its empty segments. **Breaking for operators** — see below. Part of the Redux → React Query migration (#1946, Stage 1); layer D2 of the model-store dissolution (#1977), on top of #2128 (layer A) and #2131 (the normalizer types peeled out of this layer's review). Closes #2088.

## What changed

- **Readers** (decision 1). Sequence query for `unitIds`, `gatedContent`, `isHiddenAfterDue`, `format`, the active title, `showCompletion`, `navigationDisabled`, `bannerText`, `activeUnitIndex`, `saveUnitPosition` and the whole object `SequenceExamWrapper` receives; outline for `sectionId` everywhere and for other sequences' titles. Where a file holds the outline's entry whole it is `minimalSequenceMetadata` (`Sequence`, `Course`), after its type; `CoursewareContainer` holds the whole `minimalCourseOutline` and reads `sectionId` / `nextSectionId` off it, with the celebration guarded on `nextSequenceId && nextSectionId`. `sequenceQuery` → `sequence` stays wherever a status flag is read off the query. The banner alert builds its `useAlert` options under one named guard, `hasBannerText`.
- **`CourseBreadcrumbs`** reads the outline once and indexes into it, replacing the `useModels('sequences', …)` call inside `.map()` (decision 2). **`UnitNavigationEffortEstimate`** drops the `Object.keys` guards #808 added for the `{}` sentinel (decision 3).
- **Store selectors** for `sequences` in `CoursewareContainer` and `redirects.ts` come forward from D4, since the bridge runs only from a fetch and a store read of `activeUnitIndex` would go stale once the writer moved (decision 4). The `sequences` mirror leaves both queries' `meta.models`.
- **Redirect rules** take `SequenceMetadata | null` and check `sequence` alone; the `sequence.id` / `unitIds !== undefined` guards and the three partial-state cases in `redirects.test.ts` go with the store's partial entry, and `useIFrameBehavior` drops the same `unitIds?.` guard (decision 5).
- **`useSaveSequencePosition`** (decision 6): `setQueryData` at `coursewareQueryKeys.sequence(sequenceId, isPreview)`; `onMutate` snapshots the cached entry and `onError` restores it, the shape in TanStack's Optimistic Updates guide; a sequence with no cache entry gets the request and no write. Drops `useStore` / `useDispatch`. The remaining hand-written `getQueryData` / `setQueryData` generics are #2133's, repo-wide.
- **Types** come from #2131; this layer declares none (decision 7).
- **Tests** (decisions 8–11, 13): the position suite asserts on the cache; the redirect suite builds full fixtures through `buildSequence(overrides)`; the `SequenceContent` suite renders behind the loaded sequence as `Sequence` does; two container resume cases await the unit; two new container cases pin that each unit change saves the position and that leaving the first section records the celebration; the breadcrumb fixture passes sequence ids so its jump-nav rows build; `useIFrameBehavior.test` mocks `useSequenceMetadata`. Three "not cached" case names became "with no cache entry", two of them in #2128's own commit. Negative check, run: with the position write disabled, exactly the two hook cases that read the cached index fail.

## Operators — breaking

- **`useModel('sequences', id)` returns `{}`**: the model is no longer written. The active sequence's full shape is `useSequenceMetadata(sequenceId, { enabled: false }).data?.sequence`; any sequence's `id`, `title` and `sectionId` are `useMinimalCourseOutline(courseId, { enabled: false }).data?.sequences[id]`, both from `./src/courseware/data/apiHooks`.
- While the sequence loads, the page title is the course and site names only (it used to carry two empty segments from the store's `{}`).

## Testing

`npm run types` and `npm run lint` clean; full suite 117 suites, 1189 passed, 0 skipped. `git grep "useModel('sequences'\|useModels('sequences'" src` is empty. Manual checks on tutor dev, 9 of 17 run, all passing: see the checklist.

## Decisions

<details>
<summary>Full decision log</summary>

# Decisions — read sequences from the courseware queries, not `useModel` (#2088, layer B)

Layer D2 of the #1977 model-store dissolution; the ninth layer of the running
stack #2121, on top of #2131 (#2129, the normalizer types peeled out of this
layer's review), branch `bsmith/sequences-query-reads`. Closes #2088.
Entries 1–4 and 6 follow the plan review (2026-09-25, posted to #2088); the
rest landed with the code; entry 7 was rewritten when the layer rebased onto
#2129 (2026-09-27).

1. **Each reader takes the query that owns the fields it reads.** The
   `sequences` model was a merge (#1977, fact 4): the outline query wrote
   `{ id, title, sectionId }` for every released sequence, and the sequence
   query wrote the full `normalizeSequenceMetadata` shape for the active one.
   The field survey decided each site:
   - **Sequence query** (`useSequenceMetadata(sequenceId, { enabled: false })
     .data?.sequence`, the `sequenceQuery` variable most files already held
     after #2123): `unitIds`, `gatedContent`, `isHiddenAfterDue`, `format`,
     `title` (of the active sequence), `showCompletion`,
     `navigationDisabled`, `bannerText` (the banner alert builds its
     `useAlert` options under one named guard, `hasBannerText =
     sequenceQuery.isSuccess && !!sequence.bannerText`, and passes that
     guard as the visibility flag — settled in review over a condition and
     a `text` that read `bannerText` two different ways, and over the
     options object's own `text` as the flag, which did not say what it was
     for), `activeUnitIndex`,
     `saveUnitPosition`, and the whole object `SequenceExamWrapper` receives
     (the library reads `id`, `isTimeLimited`, `gatedContent`,
     `allowProctoringOptOut`, all from this query).
   - **Outline query** (`useMinimalCourseOutline(courseId, { enabled: false })
     .data?.sequences[id]`): `sectionId` everywhere it is read
     (`Sequence`, `Course`, the entrance-exam alert, `CoursewareContainer`'s
     celebration check) and the title / identity of sequences *other* than
     the active one (`CourseBreadcrumbs`, `UnitNavigationEffortEstimate`'s
     `nextSequence`).
   The plan's "active-sequence readers → sequence query, title-only readers →
   outline" was the same rule stated by file; `Sequence`, `Course`, the
   entrance-exam alert and `UnitNavigationEffortEstimate` turned out to read
   both, because `sectionId` only ever came from the outline. `undefined` for
   a missing entry, optional chains at the sites (C's precedent). `Course`'s
   Helmet title while loading loses its empty segments (`{}`.title), the one
   visible difference. Where a file reads the outline's entry for the
   current sequence it was first named `outlineSequence` (`Sequence`,
   `Course`, the entrance-exam alert), after the `OutlineSequence` type,
   so the two objects were distinguishable without a comment — settled in
   review over a bare `sequence` or a `sectionId` read inline off the query
   result, which left a reader asking why the same sequence came from two
   places. After the rebase onto #2129 the review found `outlineSequence`
   said nothing, since "outline" now names three endpoints, and the type is
   `MinimalSequenceMetadata`; the outline-side variables take their types'
   names where the type is what is held, and the field's name where only a
   field is read. `Sequence.jsx` and `Course.jsx`: `minimalSequenceMetadata`
   (`Course.jsx` reads two fields, `sectionId` for the section lookup and
   `title` through the page-title breadcrumbs; destructuring them was
   weighed and not taken, since the breadcrumb block is reshaped when D3
   moves `section` and `course` off the store, so the lines stay dense
   until then rather than be restructured twice).
   `CoursewareContainer`: `minimalCourseOutline` for the whole
   `useMinimalCourseOutline(...).data` (the two lookups then read as the
   outline's entry for an id), and the next entry is not named at all —
   the handler reads only its `sectionId` and its `id`, which is the
   `nextSequenceId` it was looked up by, so `nextSectionId` replaces it,
   the current `sectionId` is read beside it at the top of the component
   rather than inside the handler, and the celebration guard is
   `nextSequenceId && nextSectionId`. That
   guard is the handler's precise precondition (it compares sections) and
   differs from the old `nextSequence !== null` only for an entry with no
   `sectionId`, which cannot come from `useSequenceIds`: the sections that
   supply those ids are the ones that write `sectionId` onto their
   sequences. A `nextMinimalSequenceMetadata` variable was tried and
   rejected as an awkward name for a value nothing needed whole.
   `sequenceQuery` → `sequence` stays as the repo's query naming
   (`metadataQuery`, `courseHomeMetaQuery`) wherever a status flag is read
   off the query; the readers that need only data already take
   `.data?.sequence` directly. The entrance-exam alert (`outlineSequence`)
   and `UnitNavigationEffortEstimate` (`nextSequence`) are still on the
   first names, pending the rest of the review.

2. **`CourseBreadcrumbs` reads the outline once and indexes into it.** The
   `useModels('sequences', section.sequenceIds)` inside `.map()` — a hook
   call per section, surviving on stable array identity — becomes
   `section.sequenceIds.map(id => sequences[id])` over the outline's map.
   The `coursewareMeta` and `useModels('sections', …)` reads stay for D3
   (#2089); the sections read is at top level, so no hook-in-loop remains.
   Reviewed and kept as is: the `sequenceIds.map(id => sequences[id])` inside
   the table entry is the same lookup `useModels('sequences', ids)` did
   inside its selector (`ids.map(id => state.models.sequences[id])`), now in
   the open; the consumers (`links`, `BreadcrumbItem`, `JumpNavMenuItem`)
   need the sequence objects, so the map has to run somewhere, and moving it
   into the `links` memo or behind a one-call resolver only relocates it.
   Also considered and not taken: naming the `useModels('sections', …)`
   result on its own line and dropping its dead `?.` (`useModels` always
   returns an array) — a fair readability fix, but D3 rewrites that block
   when `sections` moves to the outline, so it waits for there.

3. **`UnitNavigationEffortEstimate`: verbatim, minus the `Object.keys`
   guards.** `!sequence || !nextSequence` is the whole guard once a missing
   entry is `undefined`; the `Object.keys(x).length === 0` halves were #808's
   own workaround for the `{}` sentinel that killed A3's guard (its author:
   "This code was counting on a bug in useModel that returned undefined if
   the model existed, but the ID didn't"). The effort branch stays
   unreachable (AA-930): `effortActivities` / `effortTime` are not fields of
   either query.

4. **The three `sequences` store selectors move here from D4.** The bridge
   runs only from a fetch (#2088 plan, mechanism 4), so once B6 writes the
   position to the cache, a store read of `activeUnitIndex` would go stale
   within a sequence. `CoursewareContainer` reads `sequenceQuery.data
   ?.sequence` for the save guard and the outline's `sequences` map for the
   celebration's section comparison and `nextSequence`, adding a disabled
   outline observer (`useCoursewareRedirects` owns that fetch — #2098, entry
   4); `redirects.ts` reads `sequenceQuery.data?.sequence`. D4 keeps the
   `coursewareMeta` ×2 and `sections` ×2 selectors and `modelReader.ts`. With
   no reader left, the `sequences` mirror leaves both queries' `meta.models`;
   the sequence query now carries no mirror at all.

5. **The redirect rules take a full `SequenceMetadata`, and their
   partial-state guards go.** `SequenceRedirectArgs.sequence` was
   `any` with a comment naming the untyped store object. Typing it surfaced
   why the rules checked `sequence.id` and `sequence.unitIds !== undefined`:
   the store handed them the outline's `{ id, title, sectionId }` entry
   before the metadata loaded, so a loaded-looking sequence could lack
   `unitIds`. The cache never does — `sequenceQuery.data?.sequence` is the
   full shape or `undefined` — so the argument is `SequenceMetadata | null`
   and the rules check `sequence` alone. `redirects.test.ts` builds full
   fixtures through a `buildSequence(overrides)` helper; its three cases
   for the partial state go with the state — *return when sequence id is
   null* (`{ id: null, unitIds }`, the marker rule), *returns when sequence
   id is null* (no `id`, and `isSequenceLoaded: false` besides) and
   *returns when unit ids are undefiend* (no `unitIds`), the last two on
   `sequenceToSequenceUnitRedirect` — since a full `SequenceMetadata`
   cannot be built without an `id` or `unitIds`. The reachable states
   keep their cases: not loaded, an empty `unitIds`, a `unitId` already
   present, the resume position. There is no case for `sequence: null`
   with `isSequenceLoaded: true` because that pair cannot occur:
   `isSequenceLoaded` is `sequenceQuery.isSuccess`, and success means
   `data` and its `sequence` are present. `useIFrameBehavior` drops the
   same guard: its
   `activeSequence.unitIds?.length` covered the store's partial entry and
   `{}`; on the cache `activeSequence` is the full shape or `undefined`, the
   `activeSequence &&` in front handles `undefined`, and `unitIds` is
   `string[]` on the type. A first version typed the argument as the three fields the rules
   read, each optional, to keep those fixtures; rejected because it typed
   the tests' shape rather than the caller's.

6. **`useSaveSequencePosition` writes the exact key.** `setQueryData` on
   `coursewareQueryKeys.sequence(sequenceId, isPreview)` patching
   `sequence.activeUnitIndex`, with `useIsPreview()` for the flag (A5's
   shape). The rollback is snapshot-and-restore, the shape the TanStack
   docs give for optimistic updates (Optimistic Updates guide, "Updating a
   list of todos when adding a new todo",
   https://tanstack.com/query/v5/docs/framework/react/guides/optimistic-updates#updating-a-list-of-todos-when-adding-a-new-todo:
   "Snapshot the previous value" with `getQueryData`, "Return a result with
   the snapshotted value", and in `onError` "use the result returned from
   onMutate to roll back" with `setQueryData`): `onMutate` returns
   `{ previous }`, the whole cached entry, and `onError` writes it back.
   When there was no entry, `previous` is `undefined` and the restore is a
   documented no-op — the QueryClient reference for `setQueryData`
   (https://tanstack.com/query/v5/docs/reference/QueryClient#queryclientsetquerydata):
   "If the updater (or the value passed) resolves to `undefined`, the
   cache is left untouched and no query is created". Two earlier shapes
   were reviewed and replaced: the store version's field-level undo,
   `setPosition(sequenceId, context!.initialActiveUnitIndex)`, where on the
   store a missing entry made `onMutate`'s read throw before the request
   was sent; and a cache version of it guarded by `initialActiveUnitIndex
   !== undefined`, which was only correct on the invariant that a cached
   sequence always carries a numeric `activeUnitIndex` — true of every
   writer in `src`, but not something the guard could check, and a
   hand-seeded entry without the field would have had its optimistic write
   left in place. Restoring the entry needs no such invariant. The docs'
   example also cancels in-flight refetches of the key before the snapshot
   and invalidates in `onSettled`; neither is taken here — no refetch of
   the sequence is in flight when a save fires (the readers are disabled
   and the owner has finished), and `goto_position` returns nothing worth
   refetching for — and the `cancelQueries` half is noted as a possible
   follow-up if the post-event invalidation in `useIFrameBehavior` ever
   races a save. Drops the hook's `useStore` / `useDispatch`; `useStore`
   leaves the module. A sequence that is not cached gets the request and
   no write,
   pinned by *writes nothing for a sequence with no cache entry* (renamed
   in review from *posts the position and writes nothing when the sequence
   is not cached*, then from *does not create a cache entry for a sequence
   that is not cached*, whose "cache entry" and "not cached" muddied each
   other; the POST assertion inside it only confirms the request is
   unaffected). The two sibling cases A named *… not cached* — the
   completion suite's and the bookmark suite's — take the same wording, in
   A's own commit so the names stay with the layer that wrote them. The
   writer's `setQueryData<SequenceMetadataData>` / `getQueryData<…>`
   generics stay: the review asked whether the key could carry the type
   instead — it can, through `sequenceMetadataQuery(...).queryKey`, which
   `queryOptions` tags with the data type — but the same hand-written
   generic sits at every imperative cache read and write in the repo, so
   it is a repo-wide cleanup, filed as #2133 under #1946, rather than two
   sites fixed here.

7. **Types come from #2129; this layer declares none.** A first version
   declared `SequenceMetadata` (with `SequenceGatedContent`),
   `OutlineSequence { id, title, sectionId? }` and `CoursewareOutlineData`
   beside the hooks in `apiHooks.ts`. The review asked why not on the
   normalizers themselves, since the normalizer is the schema; the answer
   was that `courseware/data/utils.js` was JavaScript, and typing it became
   #2129, which landed below this layer. On rebase the declarations became
   imports: `SequenceMetadata` from `courseware/data/sequenceMetadata`
   (`redirects.ts` and its suite), `MinimalCourseOutline` on
   `useMinimalCourseOutline` (the hook's new name), `MinimalSequenceMetadata`
   for what the readers here call `outlineSequence`. #2129 also corrected
   this layer's guesses from the platform: `bannerText` and `format` are
   present and nullable, `gatedContent` is always present with nullable
   prereq fields, and `allowProctoringOptOut` is the one optional; the
   redirect suite's `buildSequence` fixture carries those fields now.

8. **Two container cases now await the unit.** *should use the resume block
   response to pick a unit if it contains one* and *…first sequence ID and
   activeUnitIndex…* asserted `.fake-unit` synchronously the instant the
   course-level spinner cleared, before the resume request, its redirect and
   the sequence fetch had run. Probed: with a short wait the original
   assertions pass. The container's added disabled outline observer shifts
   when the unit lands past that instant. Same family as #2123's
   discussions-trigger race; the first assertion in each is now a `waitFor`.

9. **The `SequenceContent` suite renders behind the loaded sequence.**
   `Sequence` renders `SequenceContent` only after `sequenceQuery.isSuccess`,
   and the gated branch reads `sequence.title` and `sequence.gatedContent`
   directly under that contract; rendered bare with `gated: true` the
   component threw on an undefined sequence. A `LoadedSequenceContent` gate
   in the suite mirrors `Sequence` (the `LoadedCourse` shape). The gated
   case's check that the lazy `ContentLock` fallback appears first becomes a
   bare `await screen.findByText(...)`, the form `Sequence.test`'s gated case
   uses: with the render gated, the lazy import resolves within a microtask
   of the first render, so `findByText` resolves on the fallback but an
   `expect(...).toBeInTheDocument()` on the element it returned then finds
   it detached. A first version dropped the check as unobservable; the
   reviewer asked what else covered the message, and the Sequence suite's
   form answered it.

10. **One new container case, *saves the position on each unit change*; the
    composed bare-URL case was measured and dropped.** Load the first unit,
    click next twice, and expect the `goto_position` bodies to be `[]` after
    load, `[2]` after the first click and `[2, 3]` after the second
    (1-indexed on the server), with the matching unit on screen each time —
    the tightened `toEqual` assertions are the reviewer's; a first version
    only checked `toContain(3)`, and the case's first name carried a "not on
    load" suffix and a "1-indexed" comment, both dropped in review. The
    on-load skip is pre-existing: `checkSaveSequencePosition` is
    memoized per unit id, its first run for the first unit happens before
    the sequence has loaded, and it never re-runs for that id — since the
    class component of #115 (2020), carried through the de-class in #2020.
    A second case, *resolves the bare sequence URL to the last saved
    position*, entered `/course/{c}/{seq}` after the two clicks (as a
    `pushState` plus `popstate` inside `act`, since the suite's
    `BrowserRouter` reacts to browser navigation and not to the test's
    `history.push`; a breadcrumb-click version never navigated and passed
    trivially, which the negative check caught) and expected the redirect to
    land on the third unit. It guarded the mechanism-4 state — writer on the
    cache, redirect still on the store — which this layer itself makes
    unreachable by removing the `sequences` mirror. Measured over the full
    suite, dropping it lost no statement or branch in any file: the write is
    covered by the hook suite, the redirect's read of `activeUnitIndex` by
    *should use activeUnitIndex to pick a unit from the sequence*, and the
    two sides share one key builder. The composed path stays as a manual
    check (*saved position drives the bare URL*).

11. **`useIFrameBehavior.test.js` mocks `useSequenceMetadata`** (`{ data: {
    sequence: { unitIds, activeUnitIndex } } }`) where it mocked `useModel`;
    the suite has no router, and the hook's `useIsPreview` would need one.

12. **Commit: `refactor!:` with a `BREAKING CHANGE:` footer.** No request
    change and no learner-visible change beyond entry 1's loading title. For
    plugins: `useModel('sequences', id)` returns `{}`; the active sequence's
    full shape is `useSequenceMetadata(sequenceId, { enabled: false }).data
    ?.sequence`, and any sequence's `id` / `title` / `sectionId` is
    `useMinimalCourseOutline(courseId, { enabled: false }).data?.sequences[id]`.

13. **Two patch-coverage gaps closed after submit, both pre-existing.**
    Codecov on the first push reported four uncovered patch lines.
    `CoursewareContainer.tsx` 93–96, the body of `handleNextSequenceClick`:
    no container case had ever clicked next across a sequence boundary,
    so the old handler's body was uncovered too. *records the section
    change for the first-section celebration* now builds the two-section
    course (`buildBinaryCourseBlocks`), gives the metadata
    `celebrations: { first_section: true }`, loads the last unit of the
    first section's last sequence, clicks next, and asserts the
    `CelebrationModal.showOnSectionLoad` local-storage entry
    `handleNextSectionCelebration` writes, `{ prevSequenceId,
    nextSequenceId }`; that also exercises the `nextSequenceId &&
    nextSectionId` guard from entry 1. `CourseBreadcrumbs.jsx` 30, the
    `sequenceIds.map` callback: the breadcrumb suite's section fixture
    passed `children: [{ id }]`, an object where `buildOutlineFromBlocks`
    copies ids, so the normalizer's `seqId in models.sequences` never
    matched and every section had `sequenceIds: []`; the callback, the
    `useModels` it replaced, and the jump-nav loop on line 48 (not a patch
    line) all went unreached. The fixture is `children: [sequenceId]` now,
    and the file is at 100% lines; the four existing cases still pass with
    the jump nav populated.

Full suite on this layer: 117 suites, 1189 tests.

</details>

## Manual testing

<details>
<summary>Checklist</summary>

# Manual testing — read sequences from the courseware queries, not `useModel` (#2088, layer B)

In-browser verification against a live backend (tutor dev).

What changed: the eleven readers of the `sequences` model read the active
sequence from the sequence query and other sequences' `id` / `title` /
`sectionId` from the outline query; the position writer patches the cached
sequence instead of the store; the three `sequences` store selectors in
`CoursewareContainer` and `redirects.ts` read the cache; neither query writes
the `sequences` model any more. No request change intended.

**The bugs this layer could introduce.** (1) *A reader on the wrong query* —
a field read from the query that does not carry it is `undefined`: a missing
section crumb or entrance-exam alert (`sectionId`), a missing next-sequence
title, a sequence rendered as gated or hidden when it is not. (2) *The
position round trip* — the save writes the cache and the bare-sequence
redirect reads it; if either missed, `/course/{c}/{seq}` would land on the
unit fetched at page load instead of the last one visited. (3) *The
rollback* — a failed `goto_position` POST should put the cached position
back. (4) *Navigation at the edges* — previous/next across a sequence
boundary and the first/last-unit disabling read `unitIds` from the sequence
query and the sequence list from the outline.

## Setup

A course with two or more sections of several sequences each, some with
several units; a sequence with a banner text; a prerequisite-gated sequence,
a timed exam and a hidden-after-due sequence if available. Devtools Network
filtered to `courseware/sequence|goto_position`, Console open.

## Checks

### Request count (unchanged)

- [x] **Hard-reload a unit, wait for idle:** `api/courseware/sequence/{id}` **1**; navigate within the sequence: no new one.

### Readers (bug 1)

- [x] **Sequence renders:** unit content, top and bottom unit navigation with the unit tabs.
- [ ] **Breadcrumbs:** section and sequence crumbs with the right titles; jump nav (staff, `ENABLE_JUMPNAV`) lists the section's sequences.
- [x] **Page title:** the tab reads "{sequence} | {section} | {course} | {site}" once loaded.
- [ ] **Banner text alert:** on the sequence with a banner, the info alert shows.
- [ ] **Entrance exam (if configured):** the entrance-exam alert shows on the exam section's sequences and nowhere else.
- [ ] **Prerequisite-gated sequence (if available):** "Content Locked" with the prerequisite's name; lock icon in the unit navigation.
- [ ] **Hidden-after-due (if available):** the notice renders.
- [ ] **Timed exam (if available):** the exam start screen renders.
- [ ] **First-section celebration (if the course is fresh for the learner):** completing the last unit of the first section and moving on shows the celebration once.

### Navigation (bug 4)

- [x] **Previous/next across a sequence boundary:** next from the last unit lands on the next sequence's first unit; previous from a first unit lands on the previous sequence's last unit.
- [x] **Edges:** previous is disabled on the course's first unit; next on the last unit reads the end-of-course text.
- [ ] **`/course/{c}/{seq}/first` and `/last`:** land on that sequence's first and last unit.

### Position round trip (bugs 2 and 3)

- [x] **Saved position drives the bare URL:** open a sequence's first unit, navigate to its third unit (one `goto_position` POST with `position: 3`), then load `/course/{c}/{seq}` in the same session (breadcrumb, or edit the URL and press enter): it lands on the third unit.
- [x] **Rollback:** block `goto_position` in devtools, navigate to another unit in the sequence, then open `/course/{c}/{seq}`: it lands on the previously saved unit, not the blocked one; the console shows the logged error.
- [x] **Console:** no error naming `useSequenceMetadata`, `useMinimalCourseOutline`, `useSaveSequencePosition` or `logSequenceEvent`.

## Results

Run 2026-09-27 on tutor dev, after the rebase onto #2131. 9 of 17 checks
run, all passing.

**Run**

- **Request count:** one `api/courseware/sequence/{id}` request per hard
  reload; none on navigation within the sequence.
- **Sequence renders; page title:** unit content and both unit navigations
  rendered; the tab title carried the sequence, section, course and site
  names once loaded.
- **Previous/next across a sequence boundary; edges:** next from a last
  unit landed on the next sequence's first unit and previous from a first
  unit on the previous sequence's last; previous disabled on the course's
  first unit, the end-of-course text on the last.
- **Saved position drives the bare URL:** after navigating to a sequence's
  third unit (one `goto_position` POST), `/course/{c}/{seq}` landed on the
  third unit.
- **Rollback:** with `goto_position` blocked, moving to another unit and
  reopening `/course/{c}/{seq}` landed on the previously saved unit, with
  the error logged to the console.
- **Console:** no error naming the layer's hooks.

**Not run**

- Breadcrumbs and the jump nav (the same outline read as the page title,
  which passed; the breadcrumb suite covers the section's sequences).
- Banner text, entrance exam, prerequisite-gated, hidden-after-due, timed
  exam and the first-section celebration (no such content in the test
  course; each reader is covered by its suite against the real query or a
  mocked `useSequenceMetadata`).
- `/first` and `/last` (the redirect suite's resume cases cover the rule).

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
