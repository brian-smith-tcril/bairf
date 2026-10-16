# Plan: #2089 layer B — the owners' direct selectors and the courseware mirrors

Layer D4 of the #1977 model-store dissolution, on top of #2089's layer A
(D3, PR #2140) in the running stack; closes #2089; #2135 stacks above.
Planned 2026-09-30 against the code as layer A left it. The settled
decisions (the slot `model` prop, the fire-once guards) are in
`decisions-2089B.md`, entries 1–2; the choices below become its entries 3
onward as the implementation confirms them. Change 4 (the bridge) was
settled 2026-09-30.

## How it works today (after layer A)

- **Two mirrors still write the courseware models.** `useCoursewareMetadata`
  (`courseware/data/apiHooks.ts`) carries
  `meta: { models: [{ modelType: 'coursewareMeta', strategy: 'updateModel' }] }`,
  and `minimalCourseOutlineQuery` carries two mirrors beside its `logStatusAs`:
  `coursewareMeta` from the outline's `courses` (`updateModelsMap`) and
  `sections` from its `sections` (`addModelsMap`). `sequenceMetadataQuery` lost
  its mirrors with #2128 and #2134.
- **Four `useSelector` reads are left in `src/courseware/`**, all through
  `readModels` in `courseware/data/modelReader.ts`, which casts `state.models`
  to `CoursewareModels` (`coursewareMeta`, `sequences`, `sections`, each
  `Record<string, any>`): `CoursewareContainer.tsx` reads
  `coursewareMeta[courseId]` for `course.celebrations.firstSection` in
  `handleNextSequenceClick`; `redirects.ts`' `useCoursewareRedirects` reads
  `sections[sequenceId]` (`sectionViaSequenceId`), `coursewareMeta[courseId]`
  (for `sectionIds[0]`) and `sections[firstSectionId]` (for
  `sequenceIds[0]`). Both files already hold the owning queries as fetching
  observers: `metadataQuery` in the container, `outlineQuery` in the hook.
- **The bridge has two forms** (`src/data/modelStoreBridge.ts`): the single
  form, `{ modelType, courseId }`, which the course-home `dates`, `outline`
  and `progress` queries use until #1999; and the list form,
  `{ models: [{ modelType, strategy, source?, idField? }] }`, with five
  strategies. After this layer the list form has no producer: #2122 removed
  the `discussionTopics` mirror (`updateModels` + `idField`), #2128 the
  `units` one (`updateModels`), #2134 the `sequences` ones (`updateModelsMap`),
  and this layer removes the last three. Those layers left the bridge itself
  untouched (its history: #1987, #2023, #2068).
- **Tests reach the two models two ways.** `seedCoursewareModels` in
  `setupTest.js` dispatches `coursewareMeta` and `sections` into the store
  directly, so the suites that read `state.models` for ids and expected values
  (`getTestStoreIds`, `Course.test.jsx`'s page-title case, the outline-sidebar
  and discussions suites' `models.units`) do not depend on the mirrors. The
  bridge suite in `apiHooks.test.tsx` ("courseware apiHooks — coursewareMeta
  bridge") does: its race case asserts the store's `sectionIds` survive a late
  metadata write, and both its cases also exercise `useSequenceIds`.
  `CoursewareContainer.test.jsx` renders the container against
  `initializeStore()` with the bridge filling the store, and reads nothing
  from it. `redirects.test.ts` calls the rules with explicit arguments.

## The change

**1. `CoursewareContainer` reads `celebrations` from its own metadata query,
and `CoursewareMeta.celebrations` names the one field it reads** (the posted
plan's B1). The container already holds `metadataQuery`; the read is
`const coursewareMetadata = metadataQuery.data;` (layer A's decision 2: the
local is named after the hook, since it no longer holds the merged store
entry) and `handleNextSequenceClick`'s guard keeps its shape with the name
swapped: `coursewareMetadata && coursewareMetadata.celebrations &&
coursewareMetadata.celebrations.firstSection`. The `useSelector` gave `null`
for a missing entry and `data` is `undefined`; the `&&` chain treats both
alike, and the celebration is only recorded on a Next click, which #2139
disables until the outline has loaded, well after the metadata.

`celebrations` is `unknown` on `CoursewareMeta` and on
`CoursewareMetadataResponse`. It becomes `{ firstSection: boolean } | null`
(`{ first_section: boolean } | null` on the response), following the file's
rule: name the fields this repo's readers use, leave the rest of the
endpoint's shape undescribed. `null` is in the type because the endpoint sends
it (the `courseMetadata` factory's default). The other celebration fields
(`weeklyGoal`, `streakLengthToCelebrate`, `streakDiscountEnabled`) are read
from the *course-home* metadata's `celebrations`, typed in
`course-home/data/apiHooks.ts`, not from this one, so they are not named
here. Layer A's decision 4 noted this tightening would follow when the reader
converted; the sidebar's `buildWidgetCourse` spread picks it up without
change.

**2. `useCoursewareRedirects` reads the sections and the first section id
from the outline query it already holds** (B2). `outlineQuery` is the hook's
fetching observer of `useMinimalCourseOutline(courseId)`. The three selectors
become reads of `outlineQuery.data`, each keeping its ternary and its
`?? null`, so the rule arguments keep the `null` their types declare
(`section: { sequenceIds?: string[] } | null`) and the memo keys see the same
values:

- `sectionViaSequenceId`: `(sequenceId ? outlineQuery.data?.sections[sequenceId] : null) ?? null`
  — still a *section* looked up by the route's sequence id; that is how a
  section-shaped URL is detected, not a typo (B2's note stays as a comment on
  the line).
- the course entry: `(courseId ? outlineQuery.data?.courses[courseId] : null) ?? null`,
  named `minimalCourseMetadata` after its type (layer A's decision 2:
  outline-side locals take their types' names; `course` held the merged
  store entry). `firstSectionId` is unchanged:
  `isCourseLoaded ? (minimalCourseMetadata?.sectionIds ?? [])[0] : undefined`.
- `firstSection`: `(firstSectionId ? outlineQuery.data?.sections[firstSectionId] : null) ?? null`;
  `firstSequenceId` unchanged.

`MinimalSectionMetadata.sequenceIds` is `string[]`, assignable to the rule
arguments' `{ sequenceIds?: string[] }`; the argument types are not touched
(they are #2135's inputs). Behaviour is the same because the store entries
were the query's results: the bridge wrote `sections` and the course entry
from this same `queryFn`'s result in the `QueryCache`'s `onSuccess`, before
observers re-rendered, so on every render the store held exactly what
`outlineQuery.data` holds now, or nothing while it was pending — when
`isCourseLoaded` is false and every rule that reads a section returns early.

**3. The mirrors and `modelReader.ts` go** (B3–B4). `useCoursewareMetadata`
loses its `meta` entirely; `minimalCourseOutlineQuery` keeps
`meta: { logStatusAs: { 403: 'info' } }` and loses `models`.
`courseware/data/modelReader.ts` is deleted with its `CoursewareModels` type;
`readModels`, `useSelector` and the `RootState` import leave
`CoursewareContainer.tsx` and `redirects.ts`. After this nothing in
`src/courseware/` imports `react-redux` except `redirects.ts`' `shallowEqual`,
and nothing imports `@src/store` (decision 2).

**4. The bridge keeps both forms until the teardown.** After change 3 no
query carries `meta.models`, so `bridgeToModelStore`'s list-form branch (the
`models?.forEach`, the `ModelMirror` and `MirrorStrategy` types,
`ModelStoreMeta.models`) has no producer left; the single form still serves
the course-home `dates`, `outline` and `progress` queries until #1999.
Removing the list form here was weighed and not taken (2026-09-30): the
teardown (#1977 layer F) deletes `modelStoreBridge.ts`, its test and the
`onSuccess` / `store` wiring in `queryClient.ts` wholesale, and that deletion
is the same size whether the file holds one form or two, so a trim now is a
diff in two files this layer otherwise does not touch, for no saving later.
This also matches #2122, #2128 and #2134, which left the strategies they
orphaned in place. `modelStoreBridge.test.ts` keeps its list-form cases; they
test code that is still shipped, just unused.

## Tests

**The bridge suite in `apiHooks.test.tsx` goes; what it tested of
`useSequenceIds` moves to a `useSequenceIds` suite.** The "courseware
apiHooks — coursewareMeta bridge" describe pins the merge race change 3
removes (layer A's decision 1 already moved its evidence field to
`language`). Both its cases also test `useSequenceIds`: the race case asserts
`[]` while the metadata is pending and the section-ordered sequence ids once
it lands, and "fetches nothing on its own" asserts no request. Those two
behaviours stay, in a new `describe('courseware apiHooks — useSequenceIds')`
beside the `useIsCourseLoaded` one: *is empty until the course is loaded,
then lists the sequences in section order* (the same outline-first,
metadata-last setup, with the store assertions dropped) and *fetches nothing
on its own*. Imports the bridge suite alone used (`initializeStore`'s store
for `coursewareMetaFor`, at least) go if nothing else in the file uses them —
checked at implementation.

**The owners' existing suites cover the conversion; no suite needs the store
filled.** `CoursewareContainer.test.jsx` exercises every rule change 2 feeds
through real fetches: section → sequence ("when the URL contains a section ID
instead of a sequence ID"), section/unit → unit, the empty section → course
root, `/first` and `/last`, the resume redirect, and the course with no
sections; "when next leaves the first section" covers change 1's guard with
`celebrations: { first_section: true }`. The suite reads nothing from the
store, so the store staying empty changes nothing for it. `redirects.test.ts`
passes arguments directly and is unaffected. Negative checks to run:
`sectionViaSequenceId` read from `sequences` instead of `sections` fails the
section-URL cases; a `celebrations` typed without `firstSection` fails
`npm run types` at the container's guard. Layer A's once-per-load request
counts on both owner pages stand as the "no request change" check.

**Left for the teardown (F)**, not touched here unless a file is edited for
another reason: `seedCoursewareModels` and `getTestStoreIds` in
`setupTest.js`; `CourseExit.test.jsx`'s `fetchAndRender`, which still
dispatches `coursewareMeta` and `courseHomeMeta` into a store nothing under
`CourseExit` reads since layer A and #2110; `Course.test.jsx`'s page-title
case, which reads its expected `course.title` from the seeded store (the
outline's title, since `seedCoursewareModels` applies the outline's `courses`
last).

## Commit and PR

`refactor!:` with a `BREAKING CHANGE:` footer (B7): nothing writes
`coursewareMeta` or `sections` into the model store any more, so
`useModel('coursewareMeta', courseId)` and `useModel('sections', sectionId)`
return `{}`, and a direct `state.models.coursewareMeta[courseId]` read is
`undefined`. Replacements: `useCoursewareMetadata(courseId, { enabled: false
}).data` for the courseware metadata, and `useMinimalCourseOutline(courseId,
{ enabled: false }).data` for the outline's `courses[courseId]` (`id`,
`title`, `sectionIds`, `hasScheduledContent`) and `sections`. The PR's
Operators section carries decision 1's plugin-author migration from
`decisions-2089B.md`.

## Implementation order

1. `coursewareMeta.ts`: type `celebrations` on both interfaces (change 1).
2. `CoursewareContainer.tsx`: the `coursewareMetadata` read; drop `useSelector`,
   `readModels`, `RootState` (changes 1, 3).
3. `redirects.ts`: the three outline reads; drop `useSelector`, `readModels`,
   `RootState`; keep `shallowEqual` and `memoize` (changes 2, 3; decision 2).
4. `apiHooks.ts`: drop `useCoursewareMetadata`'s `meta` and
   `minimalCourseOutlineQuery`'s `models` (change 3).
5. Delete `modelReader.ts` (change 3).
6. `apiHooks.test.tsx`: replace the bridge suite with the `useSequenceIds`
   suite.
7. `npm run types`, `npm run lint`, full suite; the negative checks above.
8. Move the confirmed choices into `decisions-2089B.md` as entries 3+.

## Verify

`git grep "readModels\|modelReader" src` is empty;
`git grep -n "useSelector\|useDispatch" src/courseware` is empty;
`git grep "meta: { models\|models: \[" src/courseware` is empty;
`git grep "modelType: 'coursewareMeta'\|modelType: 'sections'" src`
returns only test seeding and bridge cases (`setupTest.js`,
`CourseExit.test.jsx`, `modelStoreBridge.test.ts`,
`generic/model-store/hooks.test.tsx`);
`git grep -E "from '(react-redux|reselect)'" src/courseware` returns only
`redirects.ts` (`shallowEqual`, `memoize`) and `CoursewareContainer.tsx`
(`memoize`), for #2135.

## Manual test (B8), tutor local

The five redirect rules still land where they do today — resume
(`/course/{id}`), section → first sequence, section/unit → unit, unit → its
sequence/unit, outline failure → course home (a 500 on the outline request);
the first-section celebration still records on crossing into the next section
(`CelebrationModal.showOnSectionLoad` in localStorage, then the modal on the
next page); the network tab shows the courseware metadata and the outline
requested once per load.
