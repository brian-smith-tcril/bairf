# Decisions — read the courseware models' direct selectors from the queries and drop the courseware mirrors (#2089, layer B)

Layer D4 of the #1977 model-store dissolution, on top of #2089's layer A
(D3, PR #2140). Closes #2089. Entries 1 and 2 were settled in the #2089 plan
review (2026-09-28); entries 3–8 were planned in `plan-2089B.md` and
confirmed by the implementation (2026-09-30).

1. **The slots' `model` prop stays; removing the mirror it points at is a
   `BREAKING CHANGE:`, not a deprecation.** #1494 (SONIC-717, 2024-10) added
   `model` to the three upgrade-messaging slots, "passing model as a prop to
   plugin slot for dynamic model selection": `'outline'` on the outline tab's
   slot and `'coursewareMeta'` on the two courseware notification trays. Each
   value names the model-store entry the slot's parent read its upgrade data
   from, so one plugin component can be put in every slot and read the
   right entry through `useModel(model, courseId)`. The slots' default
   content, `UpgradeNotification` in all three, received the merged
   `pluginProps` (FPF merges them into default children) but never read
   `model`; it used only `courseId`. #1675 then removed that default content,
   and #1885 removed the new-sidebar slot
   (`org.openedx.frontend.learning.notification_widget.v1`) outright. Two
   slots pass `model` today: `org.openedx.frontend.learning.upgrade_panel.v1`
   (`'coursewareMeta'`) and
   `org.openedx.frontend.learning.course_outline_tab_notifications.v1`
   (`'outline'`). The plugin #1494 was written for is not public, and neither
   the ticket nor the PR describes it.

   FPF ADR 0003 (Plugin Slot Naming and Life Cycle, decision 2) defines a
   slot's API contract as its location, the type of content it wraps, and
   "the specific set of `pluginProps` it exposes"; only a change to one of
   those calls for a version bump and a deprecation of the old version
   (decision 3). This layer changes none of them: both slots keep passing
   `model` with the same value. What changes is what the value reaches —
   after this layer nothing writes `coursewareMeta` into the model store, so
   `useModel('coursewareMeta', courseId)` returns `{}`. That is a plugin
   reaching into this app's internals, not the slot's contract, which is the
   footing every earlier layer's `useModel` change was released on. Removing
   `model` would change the set of `pluginProps` and is not done here. The
   `outline` entry keeps being written until #1999, which drops its mirror.

   The commit carries the `BREAKING CHANGE:` footer, and the PR description
   gives plugin authors the migration below.

2. **The redirects' fire-once guards stay as they are here; replacing them is
   its own layer (#2135).** This layer removes the store-coupled imports from
   `src/courseware/` (`useSelector` from `redirects.ts` and
   `CoursewareContainer.tsx`, `useDispatch` from `apiHooks.ts`), which is
   what the issue's check is for. Left behind are `defaultMemoize` from
   `reselect` and `shallowEqual` from `react-redux`, the guards that keep each
   redirect rule from re-firing on every render. The end state of the
   migration has no Redux-ecosystem dependency at all, so these go too, but
   not by writing local copies: the plan review found the guards are
   dependency arrays by another name (`CoursewareContainer` does not remount
   between courseware routes, and `navigate` in every rule's arguments
   changes on every navigation and mount), and the tentative replacement is a
   declarative resolver rendered as `<Navigate replace>` with the two lookups
   as queries. That depends on the redirect cases rather than on the model
   store, and it works on the inputs this layer settles, so it is stacked
   above this one. The issue's check becomes "no `useSelector` /
   `useDispatch` in `src/courseware/`". (Layer A already took `useDispatch`
   out of `apiHooks.ts`; the four `useSelector` reads are this layer's.)

3. **`CoursewareContainer` reads `celebrations` from its own metadata query,
   and `CoursewareMeta.celebrations` names the one field it reads.** The
   container already held the query as `metadataQuery`, renamed
   `coursewareMetadataQuery` in review: `TabPage` takes the *course-home*
   query in its `metadataQuery` slot and this one as `tabDataQuery`, so the
   old name read as the wrong query on the `courseStatus` line. The read is
   inside `handleNextSequenceClick`, the one place the data is used:
   `const celebrateFirstSection = coursewareMetadataQuery.data?.celebrations?.firstSection;`
   (settled in review over a first version that kept a component-level
   `coursewareMetadata = coursewareMetadataQuery.data` local and the old
   `course && course.celebrations && course.celebrations.firstSection` chain
   with the name swapped — a local for one read, in the pre-optional-chaining
   idiom). The name matches the same guard in `Course.jsx`. The `useSelector`
   gave `null` for a missing entry and `data` is `undefined`; the `if` tests
   truthiness as the chain did, and the celebration is only recorded on a Next
   click, which #2139 disables until the outline has loaded, well after the
   metadata. `celebrations` goes from `unknown` to `{ firstSection: boolean }`
   on `CoursewareMeta` and `{ first_section: boolean }` on
   `CoursewareMetadataResponse`, following the file's rule of naming only the
   fields this repo's readers use; the other celebration fields are read from
   the course-home metadata's `celebrations`, typed in
   `course-home/data/apiHooks.ts`, so they are not named here. **Not
   nullable** (settled in review over a first version with `| null`): #2129's
   rule is that nullability comes from the platform, not from fixtures, and in
   openedx-platform `get_celebrations_dict`
   (`openedx/core/djangoapps/courseware_api/utils.py`) returns a dict on both
   of its paths — the not-enrolled defaults or the computed values — and the
   serializer declares `celebrations = serializers.DictField()`. The `null` in
   the first version came from the `courseMetadata` factory's
   `celebrations: null`, the fixture typing #2129 entry 6 rejected. So the
   read is `coursewareMetadataQuery.data?.celebrations.firstSection`, and the
   factory now sends the platform's not-enrolled dict (`first_section: false`,
   `streak_length_to_celebrate: null`, `streak_discount_enabled: false`,
   `weekly_goal: false`); `CoursewareContainer.test`'s celebration case keeps
   its `{ first_section: true }` override. Negative check, run: with
   `celebrations` left `unknown`, `npm run types` fails at the container's
   guard (`Property 'firstSection' does not exist on type '{}'`).

4. **`useCoursewareRedirects` reads the sections and the first section id
   from the outline query it already holds.** `outlineQuery` is the hook's
   fetching observer of `useMinimalCourseOutline(courseId)`. The three
   selectors became reads of `outlineQuery.data`, each keeping its ternary
   and its `?? null`, so the rule arguments keep the `null` their types
   declare (`section: { sequenceIds?: string[] } | null`) and the memo keys
   see the same values. `sectionViaSequenceId` is still a *section* looked
   up by the route's sequence id — how a section-shaped URL is detected; the
   name carries that, so the line has no comment, as the `useSelector` it
   replaces had none. The course entry is `minimalCourseMetadata`,
   after its type (`course` held the merged store entry); `firstSectionId`
   and `firstSequenceId` are unchanged. The argument types are not touched;
   they are #2135's inputs. Behaviour is the same because the store entries
   were the query's results: the bridge wrote `sections` and the course entry
   from this same `queryFn`'s result in the `QueryCache`'s `onSuccess`, before
   observers re-rendered, so on every render the store held exactly what
   `outlineQuery.data` holds now, or nothing while it was pending — when
   `isCourseLoaded` is false and every rule that reads a section returns
   early. Negative check, run: with `sectionViaSequenceId` read from
   `sequences` instead of `sections`, `npm run types` fails at both rule
   calls that take it (`MinimalSequenceMetadata` has no `sequenceIds`) and
   `CoursewareContainer.test`'s *should choose a unit within the section's
   first sequence* fails.

5. **The mirrors and `modelReader.ts` go.** `useCoursewareMetadata` lost its
   `meta` entirely; `minimalCourseOutlineQuery` keeps
   `meta: { logStatusAs: { 403: 'info' } }`. `courseware/data/modelReader.ts`
   is deleted with its `CoursewareModels` type; `readModels`, `useSelector`
   and the `RootState` import left `CoursewareContainer.tsx` and
   `redirects.ts`. Nothing in `src/courseware/` imports `@src/store` or
   `react-redux` now except `redirects.ts`' `shallowEqual` (entry 2).

6. **The bridge keeps both forms until the teardown.** After entry 5 no query
   carries `meta.models`, so the list-form branch of `bridgeToModelStore`
   (`models?.forEach`, `ModelMirror`, `MirrorStrategy`, `ModelStoreMeta.models`)
   has no producer left; the single form still serves the course-home
   `dates`, `outline` and `progress` queries until #1999. Removing the list
   form here was weighed and not taken: the teardown (#1977 layer F) deletes
   `modelStoreBridge.ts`, its test and the `onSuccess` / `store` wiring in
   `queryClient.ts` wholesale, and that deletion is the same size whether the
   file holds one form or two, so a trim now would be a diff in two files this
   layer otherwise does not touch, for no saving later. This also matches
   #2122, #2128 and #2134, which left the strategies they orphaned in place.
   `modelStoreBridge.test.ts` keeps its list-form cases; they test code that
   is still shipped, just unused.

7. **The bridge suite in `apiHooks.test.tsx` is replaced by a `useSequenceIds`
   suite.** "courseware apiHooks — coursewareMeta bridge" pinned the merge of
   the two mirrors entry 5 removes (layer A's decision 1 had already moved its
   evidence field to `language`). Both its cases also tested `useSequenceIds`,
   and that stays as "courseware apiHooks — useSequenceIds": *is empty until
   the course is loaded, then lists the sequences in section order* (the same
   outline-first, metadata-last setup, waiting on the outline query's status
   instead of the store, with the store assertions dropped) and *fetches
   nothing on its own*. The suite takes the file's per-suite `makeWrapper`
   shape over the bridge suite's `AppProvider` + store wrapper, so
   `AppProvider` leaves the imports; `initializeStore` stays for the suites
   that still seed a store.

8. **Coverage: the redirect destinations are tested end to end; the one
   timing property this layer's reads take part in gains two cases; the
   other ways a store read and a query read could differ are left to
   reasoning, for the reasons given.** `CoursewareContainer.test.jsx` drives
   six of the seven rules through real fetches to their destinations (resume,
   section → first sequence, empty section → course root, `/first` and
   `/last`, sequence → unit, the course with no sections) and covers entry 3's
   guard; the unit-as-sequence path (a unit id in the sequence slot, a 422,
   then `getSequenceForUnitDeprecated`) is covered only at the rule level in
   `redirects.test.ts`, with `section: null` passed by hand — as before this
   layer. Neither suite reads the store, so the store staying empty changes
   nothing for them; `redirects.test.ts` passes arguments directly.

   **Where a store read and a query read could differ, and what covers each:**
   - *Data and status arriving apart.* The bridge wrote the store in the
     query cache's `onSuccess` and react-redux notified `useSelector` on its
     own schedule, so a render could see the outline in the store while
     `isCourseLoaded` was still false; now `data` and `isSuccess` come from one
     query result. The rules were and are gated on `isCourseLoaded`, and that
     gate is the one property this layer's reads take part in, so it gains
     two cases in the suite's "while the learning-sequences outline is
     pending" block: *does not resume-redirect from the course root* (the
     resume endpoint mocked to name a unit, so a rule that ran would navigate;
     asserts the URL and that the resume request was never made) and *does not
     redirect a section URL* (asserts the URL and that no block lookup was
     requested). Negative checks, run: with `isCourseLoaded &&` removed from
     `resumeRedirect`'s condition the first fails alone; removed from
     `unitToSequenceUnitRedirect`'s, the second fails alone.
   - *A half-written store.* `sections?.[id]` needed its `?.` because
     `state.models.sections` did not exist until the outline's mirror wrote
     it. A defined outline result always carries all three maps
     (`normalizeMinimalCourseOutline` starts from the three empty maps), so
     that state cannot occur; the `?? null` that keeps the rules' `null` is
     enforced by `npm run types`, since `undefined` is not assignable to the
     argument types. Nothing to test.
   - *Data outliving the query.* The store kept a mirrored entry for ever; a
     query entry can be removed, reset or garbage-collected. Nothing in `src`
     calls `removeQueries`, `resetQueries` or `clear`; both owners are fetching
     observers, so garbage collection never applies while they are mounted;
     `invalidateQueries` keeps data; and on a refetch error TanStack keeps the
     last data, as the store did. A test would have to invent a cache
     operation the app does not perform.
   - *A refetch re-firing rules.* The store's merge produced new objects on
     every write, so a refetch re-fired the section rules through
     `shallowEqual` even when nothing changed; structural sharing keeps
     `sections[id]` referentially stable when its content is unchanged, so this
     can only fire less. Not tested before either, and #2135 replaces the
     firing mechanism, so a count assertion here would pin behaviour that
     layer removes.
   - *The celebration guard's source.* It reads the courseware metadata's
     `firstSection`, while `recordFirstSectionCelebration` patches the
     course-home metadata's copy, so a second section crossing re-records the
     localStorage marker and the course-home read then declines the modal.
     Pre-existing: the store copy was never patched either. Not this layer's
     to test or change.

   Full suite on this layer: 120 suites, 1216 tests (layer A's 1214 plus the
   two cases). Left for the teardown: `seedCoursewareModels` and
   `getTestStoreIds` in `setupTest.js`; `CourseExit.test.jsx`'s
   `fetchAndRender`, which still dispatches `coursewareMeta` and
   `courseHomeMeta` into a store nothing under `CourseExit` reads since layer
   A and #2110; `Course.test.jsx`'s page-title case, which reads its expected
   `course.title` from the seeded store. So
   `git grep "modelType: 'coursewareMeta'\|modelType: 'sections'" src` returns
   `setupTest.js`, `CourseExit.test.jsx`, `modelStoreBridge.test.ts` and
   `generic/model-store/hooks.test.tsx`, all test seeding or bridge cases.

## For plugin authors

#1494 added a `model` prop to the upgrade-messaging plugin slots, "passing
model as a prop to plugin slot for dynamic model selection". It names the
model-store entry holding the course data for the page the slot is on. Two
slots still pass it:

| Slot | `model` |
|---|---|
| `org.openedx.frontend.learning.upgrade_panel.v1` (aliases `notification_tray.v1`, `notification_tray_slot`) | `'coursewareMeta'` |
| `org.openedx.frontend.learning.course_outline_tab_notifications.v1` (alias `outline_tab_notifications_slot`) | `'outline'` |

Both slots keep passing the same values. After this PR nothing writes
`coursewareMeta` into the model store, so `useModel('coursewareMeta',
courseId)` returns `{}`. The `outline` entry keeps being written until
#1999. Both queries exist today, so a plugin can switch both reads now.

A plugin that picked its model with the prop:

```jsx
import { useModel } from '@src/generic/model-store';

const ExamplePlugin = ({ courseId, model }) => {
  const userHasPassingGrade = useModel(model, courseId).userHasPassingGrade;
  return <p>userHasPassingGrade: {userHasPassingGrade ? 'Yes' : 'No'}</p>;
};
```

reads the query that owns that model instead:

```jsx
import { useCoursewareMetadata } from '@src/courseware/data/apiHooks';
import { useOutlineTabData } from '@src/course-home/data/apiHooks';

const ExamplePlugin = ({ courseId, model }) => {
  // Hooks can't be called conditionally, so read both. `enabled: false` means neither
  // fetches: the page has already loaded its own, and the other stays empty.
  const dataByModel = {
    coursewareMeta: useCoursewareMetadata(courseId, { enabled: false }).data,
    outline: useOutlineTabData(courseId, { enabled: false }).data,
  };
  const userHasPassingGrade = dataByModel[model]?.userHasPassingGrade;
  return <p>userHasPassingGrade: {userHasPassingGrade ? 'Yes' : 'No'}</p>;
};
```
