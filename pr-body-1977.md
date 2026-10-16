## Summary

With #2153 the last `useModel` reader left the app, so the normalized `models` cache had no readers, no `meta`-driven mirrors and no explicit writers. This layer deletes it: the model-store module, the React Query → model-store bridge, the `QueryCache` `onSuccess` wiring that fed it, and the `models` reducer, which leaves `store.ts` registering only the external `specialExams` reducer, #1978's stated endpoint. **No component read changes; no behaviour or request change.** The test setup loses its store-seeding half with it: `initializeTestStore` is replaced by `mockCourseRequests(options)`, which installs the same course endpoint mocks and returns the built payloads, and the shared `render` passes a Redux store only to the trees that reach the exams library. **Breaking for plugins** that import `@src/generic/model-store`; see *Plugins — breaking*. Part of the Redux → React Query migration (#1946, Stage 1), layer F of the model-store dissolution; stacked above #2153. Closes #1977. Closes #1978.

## What changed

- **Deleted:** `src/generic/model-store/` (`slice.js`, `hooks.js`, `index.js`, `hooks.test.tsx`), `src/data/modelStoreBridge.ts` and `modelStoreBridge.test.ts` (decision 1).
- **`src/queryClient.ts`:** the `onSuccess` bridge call, the `ModelStoreMeta` type and the `store` parameters go; `createAppQueryCache()` and `createQueryClient()` take nothing, `Register.queryMeta` is `{ logStatusAs?: Record<number, LogLevel> }`. `src/index.jsx` calls `createQueryClient()`. `src/store.ts` drops `modelsReducer` and the importer-less `RootState`.
- **`src/setupTest.js`** (decisions 3, 6): `initializeTestStore`, `seedCoursewareModels`, `seedSequenceModels`, `getTestStoreIds` and `globalStore` go. `mockCourseRequests(options)` is the synchronous helper left: `initializeMockApp()`, the factory build, every axios reply the old setup installed (including `preventSequenceLoad` / `preventOutlineSidebarLoad`), returning the payloads plus `courseId`, `sequenceId`, `unitId`. `render` passes `AppProvider` no store unless given one through a `store` option. `createTestQueryClient()` builds TanStack's default `QueryCache`.
- **Tests** (decisions 2–5, 7–9): 41 call sites move to `mockCourseRequests` and lose their `await`; the 24 `getTestStoreIds` reads and the 24 `getState().models` reads take ids and values from the returned payloads; the 18 `excludeFetch*` options, the 29 second-store builds and the 44 `{ store }` render options go; six exam-reaching suites opt in with `{ store: initializeStore() }` and twelve suites with their own `AppProvider` pass no store; `CourseExit.test.jsx` loses its hand seeding; `queryClient.test.ts` loses the bridge case; two stale `react-redux` jest mocks go.
- **Untouched:** `package.json`'s redux packages and `docs/decisions/0004-model-store.md` (decisions 10–11).

## Plugins — breaking

`@src/generic/model-store` no longer exists, so a plugin that imports `useModel`, `useModels`, the `models` reducer or its actions from it fails to resolve the module at build time. Earlier layers left those imports working and returning `{}` as each model stopped being written (#2110, #2128, #2134, #2140, #2144, #2153 each named the hook to move to); this layer removes the module itself. It affects sidebar widgets registered through `SIDEBAR_WIDGETS` and `PluginSlot` plugins that import this repo's internals; nothing in-repo imports the module and no README documents it.

The replacement is the query hook that owns the data, as a non-fetching reader:

```js
import { useCourseHomeMeta } from '@src/course-home/data/apiHooks';
import { useSequenceMetadata } from '@src/courseware/data/apiHooks';

const MyWidgetPanel = ({ courseId, sequenceId }) => {
  const { org, verifiedMode } = useCourseHomeMeta(courseId, { enabled: false }).data ?? {};
  const { units } = useSequenceMetadata(sequenceId, { enabled: false }).data ?? {};
  // ...
};
```

| Former model | Owning hook |
|---|---|
| `courseHomeMeta` | `useCourseHomeMeta(courseId)` (`course-home/data/apiHooks`) |
| `outline`, `dates`, `progress` | `useOutlineTabData(courseId)`, `useDatesTabData(courseId)`, `useProgressTabData(courseId, targetUserId)` |
| `coursewareMeta` | `useCoursewareMetadata(courseId)` for the metadata fields, `useMinimalCourseOutline(courseId)` for the outline's `courses` map |
| `sections`, the outline's `sequences` | `useMinimalCourseOutline(courseId)` |
| `sequences` (the active one), `units` | `useSequenceMetadata(sequenceId)`, `useUnit(sequenceId, unitId)` |
| `discussionTopics` | `useDiscussionTopic(courseId, unitId)` |

Under any course page the page's own observer has fetched the data, so the disabled reader reads the cached result and adds no request, re-rendering when the fetch lands, as the `useModel` read did when the bridge wrote the store. Rendered anywhere else, `.data` stays `undefined` until something on that page fetches; the query cache is shared, so the simplest shape is the widget mounting the fetch itself, the same hook without the option, beside its read. Unaffected: the sidebar widget config functions, `isAvailable` and `prefetch`, still receive the merged `course` object. The *Accessing Course Data* section of `src/courseware/course/sidebar/README.md` documents the hooks.

## Testing

`npm run types` and `npm run lint` clean; full suite 120 suites, 1186 passed, 0 skipped. `git grep -E "model-store|modelStore|useModel|state\.models|initializeTestStore|getTestStoreIds" src` is empty; `git grep react-redux src` returns only the removed line of a migration diff example in `generic/plugin-overrides/README.md`; `git grep "from 'redux'" src` is empty; `store.ts` registers only `specialExams`. Which suites still need a Redux store was established by running the whole suite with `render` passing none: six failed, each on react-redux's "could not find react-redux context value", each predicted by its tree reaching `SequenceExamWrapper`, `OuterExamTimer` or `useExamAccess` (decision 3); those six opt in. No request-count assertion observed the deleted seeding requests (decision 5). Manual smoke on tutor local: the five course-home tabs and courseware unit and sequence navigation render and navigate as before.

## Decisions

<details>
<summary>Full decision log</summary>

# Decisions — dissolve the model-store normalized cache (#1977, layer F)

The teardown layer of the model-store dissolution, above #2153 (#1999, layer
E) on the running stack #2141. Closes #1977 and #1978. Planned and settled
with the user 2026-10-02; the plan is embedded in the #1977 issue body.

1. **Deletion only; nothing in the app changes what it reads.** After layer E,
   non-test source had zero `useModel` / `useModels` readers, zero
   `state.models` selectors, zero query `meta` entries the bridge consumed and
   zero explicit model-store dispatches; the only `react-redux` import left
   was the model-store hooks file itself. So this layer deletes
   `src/generic/model-store/` (slice, hooks, index, the hooks test),
   `src/data/modelStoreBridge.ts` and its test, the `QueryCache` `onSuccess`
   wiring, the `ModelStoreMeta` type and the `store` parameters in
   `src/queryClient.ts` (`Register.queryMeta` is now
   `{ logStatusAs?: Record<number, LogLevel> }`), and the `models` reducer and
   the importer-less `RootState` type in `src/store.ts`. `src/index.jsx` calls
   `createQueryClient()`.

2. **No rendering fallout; the seeds were inert.** The issue body expected to
   "fix the fallout across the suites that relied on pre-seeded models". With
   no readers, the models `initializeTestStore` seeded reached no component:
   suites already loaded through the real queries (`MountCourseQueryHooks`,
   `CourseQueryGate`, `seedQueryData`, `queryClient.fetchQuery`). What
   depended on the seeds was test-side: 24 `getState().models` reads in 11
   files (first unit id ×8; four block titles for the Helmet title; a
   sequence's `gatedContent`; `courseHomeMeta.verifiedMode` ×2; the whole
   normalized `courseHomeMeta` to seed a query ×2) and the ids
   `getTestStoreIds` derived from the model keys. Each has a direct source in
   the API-shaped payloads the setup already built (entry 3).

3. **`initializeTestStore` is deleted, not reshaped.** It did three jobs:
   build a store, mock the course endpoints, seed the store from them. The
   third is gone and the first is `initializeStore()` from `src/store.ts` to
   the letter, so what is left is the second:

   - **No store unless the tree needs one.** `render` in `setupTest.js` passes
     `AppProvider` no store by default (`AppProvider` renders a react-redux
     `Provider` only when given one; `OptionalReduxProvider` returns bare
     children for `null`), and takes a `store` option for the suites whose
     tree reaches one of the three library entry points, which select
     `state.specialExams` and throw "could not find react-redux context
     value" under no `Provider`. Which suites that is was established by
     running the whole suite with no default store: six failed, each on that
     error, and each predicted by its tree — `Course.test.jsx`,
     `SequenceContent.test.jsx` and `Unit/index.test.jsx` (`Unit` →
     `useExamAccess`), `Sequence.test.jsx` (`SequenceExamWrapper`),
     `CourseExit.test.jsx` and `ProductTours.test.jsx`'s outline-tab describe
     (`TabWithTimer` → `OuterExamTimer`); `courseware/course/test-utils.jsx`
     renders `Course` too. Those pass `{ store: initializeStore() }`, the app's
     own store, the way `CoursewareContainer.test.jsx` and the five tab suites
     already give their own `AppProvider` one. Nothing else in any test touched
     a store (`git grep -E "specialExams|store\.dispatch|store\.subscribe"
     -- '*.test.*'` matched only the seeds and `CourseExit.test.jsx`'s two
     `addModel` dispatches), so `globalStore`, the `overrideStore` parameter,
     the 29 second-store builds (`initializeTestStore(…, false)`) and the 44
     `{ store }` render options that carried seeded models all went. Twelve
     suites with their own `AppProvider` whose tree has no exam component
     now pass no store at all: the six that passed a test store
     (`CourseBreadcrumbs`, `CourseOutlineTray`, `CourseOutlineTrigger`,
     `SidebarSection`, `SidebarSequence`, `SidebarUnit`) and six that built
     an app store they did not need (`CoursewareResultsFilter`,
     `CoursewareSearch`, `GoalUnsubscribe`, `CourseTabsNavigation`,
     `CourseBreadcrumbsSlot`, `preferences-unsubscribe`). Rejected: a store
     on every `render` (the first draft) — the same unconditional store the
     twelve suites had just lost, handed to trees with nothing to select from
     it, and it changed `AlertList.test.jsx`'s empty-`container` assertion for
     a wrapper div the component did not render.
   - **`mockCourseRequests(options)`** is the synchronous helper that is left:
     `initializeMockApp()`, `buildSimpleCourseAndSequenceMetadata(options)`,
     every axios reply `initializeTestStore` installed (including
     `preventSequenceLoad` / `preventOutlineSidebarLoad`), and a return of the
     built payloads (`courseBlocks`, `sectionBlocks`, `sequenceBlocks`,
     `unitBlocks`, `courseMetadata`, `sequenceMetadata`, `courseHomeMetadata`)
     plus `courseId`, `sequenceId`, `unitId` picked off them. Seeding was the
     only `await`, so all 41 call sites lost theirs. Named beside
     `logUnhandledRequests` for what it does; `setUpMockRequests` (the
     container suite's local helper, less specific) and `buildMockCourse`
     (names the return, not the side effect callers depend on) were
     rejected. The `excludeFetchCourse` / `excludeFetchSequence` options,
     which only skipped seeding, went with their 18 call sites;
     `preventSequenceLoad`'s comment lost its "pair with `excludeFetchSequence`"
     clause.
   - **Rejected:** keeping `initializeTestStore` and returning the fixtures
     beside the store (a bespoke test store whose only content is the app's
     own reducer, and 29 second-store builds with nothing to distinguish
     them); a `WeakMap<store, fixtures>` behind a kept `getTestStoreIds(store)`
     (a store-keyed side table for data the store no longer holds).

4. **The test-side reads take their values from the payloads.** First unit id
   → `unitId` (the eight hand-rolled `Object.keys/values(models.units)[0]`
   reads). `Course.test.jsx`'s Helmet title → `unitBlocks[0].display_name`,
   `sequenceBlocks[0].display_name`, `sectionBlocks[0].display_name`,
   `courseMetadata.name` (the course block's `display_name` *is*
   `courseMetadata.name`: `buildSimpleCourseBlocks(courseId, courseMetadata.name)`).
   `SequenceContent.test.jsx`'s `gatedContent.prereqSectionName` →
   `sequenceMetadata[0].gated_content.prereq_section_name`.
   `LockPaywall.test.jsx`'s `verifiedMode` fields → the default
   `courseHomeMetadata.verified_mode`. `HonorCode.test.jsx` and
   `StreakCelebrationModal.test.jsx` seed the metadata query with
   `await getCourseHomeCourseMetadata(courseId)` fetched through the setup's
   adapter before each suite installs its own, which is the reason they seed
   (their comments say so, now also saying where the value comes from).
   `courseware/course/test-utils.jsx` lost its first `initializeTestStore`
   call, which existed only to read ids the second build then overwrote, and
   returns `{ courseId, sequenceId, unitId }` to `Course.test.jsx`.

5. **No request-count assertion observed the seeding requests.** Twelve
   suites assert on `axiosMock.history`; each installs its own
   `new MockAdapter(getAuthenticatedHttpClient())` after the setup call (which
   replaces the setup's adapter, so its history starts empty) or resets before
   asserting. The six requests the seeds made were never counted; no
   assertion changed.

6. **`createTestQueryClient()` builds TanStack's default `QueryCache`.** The
   store argument was the only thing selecting the app's cache, so with it
   gone one cache serves all 65 call sites. Tested against three questions:
   does the app cache behave differently (no: `QueryCacheConfig` is three
   optional callbacks, `onError` / `onSuccess` / `onSettled`, fired after a
   query settles; no query state, data, retry or timing differs, and the
   status-specific hook tests already ran under the default cache); should
   its logging be tested (it is, directly, in `queryClient.test.ts` against
   `createAppQueryCache`; no hook's own `logStatusAs` meta was asserted
   through the helper); is the logging useful for diagnosing tests
   (marginally, and noise wherever the failure is deliberate). The two
   helper-dependent logging assertions in `courseware/data/apiHooks.test.tsx`
   (the sidebar-toggles network error, the discussion-topics config failure)
   asserted the cache's generic behaviour, not the hooks', and were dropped
   with the `initializeStore()` arguments and the comment that waited on this
   layer; the cases keep their hook-specific assertions and are renamed for
   what they still check. Rejected: always the app cache (production parity
   bought with console noise, for behaviour no component can observe); a
   flag replacing the store argument (would preserve an accidental split).

7. **`CourseExit.test.jsx`'s pre-fetch was seeding by hand.** `fetchAndRender`
   awaited `getCourseMetadata` + `getCourseHomeCourseMetadata`, dispatched
   both with `addModel`, then `axiosMock.resetHistory()`; the results had no
   other use and the per-URL request counts are taken after the reset. The
   fetch, the dispatches, the `store` and their imports went;
   `MountCourseQueryHooks` was already there for the component to read
   through.

8. **Two stale `react-redux` jest mocks removed** (`CoursewareSearchResults.test.jsx`'s
   bare `jest.mock('react-redux')`; `CourseTabsNavigation.test.jsx`'s
   `useDispatch` mock with a `mockDispatch` no assertion read), both left from
   the `plugins` slice (#2017). The issue's verify line ("`git grep react-redux
   src` returns only special-exams-adjacent files") was false while they
   stood; it now returns only the removed line of a migration diff example in
   `generic/plugin-overrides/README.md`.

9. **Two incidental second-store patterns in touched files.** `OutlineTab.test.jsx`'s
   `fetchAndRender` took a `renderStore` option so one case could render on a
   fresh `initializeStore()`; with nothing in a store to differ on, the option
   and that case's store went. `ProductTours.test.jsx` passed
   `{ store: initializeStore() }` to a render of `ProductTours` alone, which
   reaches no exam component; it went.

10. **`docs/decisions/0004-model-store.md` is left as it is.** The ADR log is
    history: no layer of #1946 has amended an ADR (`0006` still describes
    thunks, `0007` still mentions "redux tests"). The superseding ADR that
    records React Query as this app's server-state layer (OEP-67 ADR-0010 is
    the org-level decision) is the epic's closing work alongside #1978's
    dependency removal, and is named as a task on #1978.

11. **`package.json` keeps `redux`, `react-redux` and `@reduxjs/toolkit`.**
    `store.ts` still uses `configureStore`, and `AppProvider store=` still
    needs a react-redux store for `OuterExamTimer` / `SequenceExamWrapper` /
    `useExamAccess`. Dropping them is #1978's library-gated step (#2018).

12. **`refactor!:`.** `@src/generic/model-store` has been importable by
    plugins; nothing in-repo documents it today, but an external plugin could
    still import `useModel`, as `@edx/unit-translation-selector-plugin`
    imported `@src/generic/plugin-store` until #2017. The footer says the
    module is gone and names the query hooks to read instead.

</details>

<details>
<summary>Manual testing</summary>

# Manual testing — dissolve the model-store normalized cache (#1977)

In-browser smoke test against a live backend (tutor local), agreed 2026-10-02
as minimal for this layer. Run by the user 2026-10-02.

What changed: the `models` reducer, the model-store module and the React
Query bridge are deleted; the app `QueryCache` loses its `onSuccess`. No
component read changed (no `useModel` reader existed), so no behaviour or
request change is intended anywhere. The one production code path that
changes shape is the `QueryCache`, which every query runs through.

Not exercised here: a timed-exam attempt. The exams library's `OuterExamTimer`,
`SequenceExamWrapper` and `useExamAccess` render for real in the unit suites
against the `specialExams`-only store (and threw, as expected, in a run with
no store), so the store wiring is covered there.

## Checks

| # | Page / action | Expect | Observed |
|---|---|---|---|
| 1 | Course home: outline, dates, progress, discussion, live tabs | each renders as before | passed — "everything seems fine from clicking around" |
| 2 | Courseware: open a unit, move between units and sequences | renders and navigates as before | passed — same pass |
| 3 | Browser console while clicking around | no new errors | not reported |

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
