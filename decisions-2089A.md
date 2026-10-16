# Decisions — read sections and coursewareMeta from the courseware queries, not `useModel` (#2089, layer A)

Layer D3 of the #1977 model-store dissolution; PR #2140 in stack #2141, on
top of #2139 (#2138: the courseware and course-end pages before the outline
has loaded), after #2088's layers landed with stack #2121.
Part of #2089 (layer B, D4, closes it). Entry 1 was settled in the #2089 plan
review (2026-09-28); entries 2–11 were decided during implementation, and
entry 4 revises the posted plan's A3.

1. **`coursewareMeta.title` is read from the outline query, at every reader.**
   The `coursewareMeta[courseId]` model is a merge (#1977, fact 4): the
   metadata query writes the whole `normalizeCoursewareMeta` shape, whose
   `title` is the endpoint's `name`, and the outline query's `courses` map
   writes `{ id, title, sectionIds, hasScheduledContent }`. #1977 recorded the
   `title` collision as looking inert, since no reader was found. There are two,
   and both build a page `<title>`: `Course.jsx` (the Helmet title from
   `pageTitleBreadCrumbs`) and `CourseCelebration.jsx` (the course-end page's
   `<title>`). `SidebarContext.tsx` also passes the merged model to each
   widget's `isAvailable` as `course`.

   **The two values are not the same field.** In openedx-platform the
   courseware metadata serializer's `name` is `display_name_with_default_escaped`
   (`course_overviews/models.py`: "Return html escaped reasonable display name
   for the course", marked DEPRECATED), while the learning-sequences outline's
   `title` is written at publish from `course.display_name_with_default`
   (`cms/djangoapps/contentstore/outlines.py`), unescaped. They agree for most
   names; for a name containing `&`, `<`, `>` or quotes the metadata value is
   HTML-escaped, and the page `<title>` renders it as text, so a course named
   "R&D" shows "R&amp;D" in the browser tab.

   **Before #2023 the outline always won.** `fetchCourse` in
   `courseware/data/thunks.js` fetched the metadata, the outline, the
   course-home metadata and the sidebar toggles in one `Promise.allSettled`,
   and dispatched only after all four settled, in a fixed order:
   `addModel` of the metadata first (a wholesale replace), then
   `updateModelsMap` of the outline's `courses` (a merge). The outline's
   `title` was therefore always the one on the model, and the escaped `name`
   never reached a reader.

   **#2023 made the winner the network's choice.** Splitting the fetch into
   independent queries, each mirrored into the store by the bridge from the
   `QueryCache`'s `onSuccess` as its own response arrives, made the dispatch
   order the arrival order. Both mirrors end in the slice's `update`
   (`{ ...existing, ...model }`), so whichever response lands second sets
   `title`. `CoursewareContainer` starts both fetches in one render, and
   `CourseExit` mounts fetching observers of both, so the race is re-run on
   the course-end page as well. #2023 saw the other half of the
   ordering dependency: it changed the metadata mirror from `addModel` to
   `updateModel` so a late metadata response could not drop the outline's
   `sectionIds`, pinned by *keeps coursewareMeta.sectionIds (and the sequence
   order nav needs) when metadata resolves after the outline* in
   `apiHooks.test.tsx`. The same case asserts `title` is `courseMetadata.name`
   in that order — its evidence that the late metadata write landed — which
   also pinned the metadata-last value rather than the pre-#2023 one.

   **So the outline's `title` is the faithful conversion, and fixes a
   regression from our own migration.** `CourseCelebration.jsx` reads
   `useMinimalCourseOutline(courseId, { enabled: false }).data
   ?.courses[courseId].title`; `Course.jsx` puts the outline's course entry,
   `minimalCourseMetadata`, in the page-title breadcrumbs beside the
   outline's sequence and section. `SidebarContext.tsx` rebuilds the merge as
   `{ ...coursewareMetadata, ...minimalCourseMetadata, ...courseHomeMeta }`,
   the order `fetchCourse` wrote in, with `courseHomeMeta` still spread last
   as it is today. The learner-visible effect, a course name with
   HTML-special characters shown unescaped on every load, goes in the commit
   body as a restoration of pre-#2023 behavior, not as a new fix. The
   `apiHooks.test.tsx` bridge suite goes in layer B with the mirrors it tests.

   **And `normalizeCoursewareMeta` stops mapping `name` to `title`** (settled
   in review). With `title` on both results, every reader of the outline's
   looked like it had picked one of two sources, and a comment at each site
   would be needed to say why. Nothing in `src` reads the metadata's `title`
   after the conversion, so `title` leaves `CoursewareMeta` and `name` leaves
   `CoursewareMetadataResponse`, which names only the fields the normalizer
   reads; each field of the course now has one source, and the escaped value
   cannot be picked up by accident. The normalizer carries a one-line note
   pointing at #2137, the issue that records what is known — three
   course-level endpoints carry the course name, the courseware metadata's
   `name` is the only escaped one, the deprecated property it reads — and the
   open questions (why that property, who else consumes it, whether the MFE
   should standardize on one title source); the detail lives there rather
   than inline. The course-home metadata's `title` is unescaped too and is
   what `TabPage`, `SocialIcons` and the sidebar merge already read; the two
   page titles keep the outline, the pre-#2023 source. Nothing points plugin
   authors at `useCoursewareMetadata(...).data.title`, though #2110's PR
   named `useCoursewareMetadata` as where `coursewareMeta` reads move, so
   layer B's plugin notes name `useMinimalCourseOutline` for the outline's
   fields. Until layer B the bridge still writes the store entry, whose
   `title` now comes from the outline alone. The bridge case in
   `apiHooks.test.tsx` keeps its subject, `sectionIds` surviving a late
   metadata write; with no `title` from the metadata, its evidence that the
   write landed becomes a field only the metadata carries, `language`
   (`courseMetadata.language`), and the comment is unchanged.

2. **A local that holds the metadata query's result is named
   `coursewareMetadata`, after the hook it comes from.** Before this layer the
   sites that kept a name for the read — `coursewareMeta` in
   `SidebarContext.tsx`, `course` in `Course.jsx`, the entrance-exam alert and
   the outline sidebar hook, `meta` in `UnitSuspense.tsx` — held the merged
   store entry, the metadata plus the outline's course fields. After it they
   hold the metadata query's result alone. Keeping the old names left that
   change invisible in review; naming the local after its type
   (`coursewareMeta`, #2088 layer B's rule) was weighed and not taken, since
   the type's name is the store model's name and so reads as unchanged too.
   `useCoursewareMetadata(...).data` becomes `coursewareMetadata` at every one
   of those sites; the sites that destructure or read one field keep no
   local. The outline-side locals keep their types' names
   (`minimalCourseOutline`, `minimalCourseMetadata`), which are new and carry
   no old meaning.

3. **`undefined` where `{}` was.** `useModel` returned `{}` for a missing
   model; a query's `data` is `undefined` until it has a result. Each reader
   takes the form the earlier layers settled for its shape:
   - a destructure reads `.data ?? {}` inline (`CertificateStatus`,
     `LockPaywall`, the sequence-navigation hook, `UpgradePanel`, `Sequence`,
     `CourseExit`, `GetCourseExitNavigation`, `CourseCelebration`);
     `LockPaywall` and `UpgradePanel` had named a `course` only to
     destructure it, so the destructure moves onto the read, the form of the
     course-home read beside it in each file;
   - a named local takes `?.` at its uses (`coursewareMetadata?.entranceExamData`
     in the entrance-exam alert and the outline sidebar hook,
     `coursewareMetadata?.contentTypeGatingEnabled` in `UnitSuspense`); the
     `|| {}` after `entranceExamData` stays, for metadata without the field;
   - a single field is read by property access, `.data?.marketingUrl` in
     `SocialIcons`, `.data?.userNeedsIntegritySignature` in
     `useShouldDisplayHonorCode`.

   The `sections` reads change the same way: `useModel('sections', id)`
   returned `{}` for a section not in the store, and the outline's
   `sections[id]` is `undefined`. Two consequences, both only while the
   outline is pending. `Course.jsx` and `Sequence.jsx` pass
   `section ? section.id : null` to `CourseBreadcrumbsSlot` and
   `CourseOutlineSidebarTriggerSlot`; with `{}` that was `undefined`, and it
   is now the `null` the expression names — both slots pass `sectionId` on
   in their `pluginProps`, so a plugin in either sees `null` rather than
   `undefined` in that window (the set of `pluginProps` is unchanged), and
   `CourseBreadcrumbs`' own default is `null`. And the page title's breadcrumbs drop segments whose entry is not
   there yet, as #2088 layer B's did for the sequence: before the outline
   lands, the course segment came from the store entry's metadata `title`,
   and now it is left out until the outline's `title` arrives. On this stack
   that window no longer reaches the tab: #2139 renders `Course`'s `<Helmet>`
   only once the outline query has succeeded, leaving `LoadedTabPage`'s title
   in place until then.

4. **`getAvailableWidgets` asks every widget with whatever is loaded, as it has since
   #1885; `isAvailable`'s parameter is typed as the spread that builds `course` —
   revised from the posted plan and from this layer's first draft.** The plan (A3) had
   `SidebarWidgetContext.course` extended with the outline's fields. The first draft
   instead returned `[]` from `getAvailableWidgets` when either metadata query had no
   data, so that `{ ...coursewareMetadata, ...minimalCourseMetadata, ...courseHomeMeta }`
   type-checked against the declared `course: CourseHomeMeta & CoursewareMeta`. Review
   rejected that: it was the first change since the widget registry to *whether* widgets
   are asked, made only to satisfy the compiler.

   **How `isAvailable` has been fed.** Before #1885 availability was coded in the
   provider and triggers (discussions: the unit's topic; notifications: `verifiedMode`
   from `useModel('courseHomeMeta')`). #1885 introduced the registry and `isAvailable`,
   handed `course: { ...coursewareMeta, ...courseHomeMeta }` from two `useModel` reads,
   each `{}` when missing, and filtered every time: a widget without `isAvailable` was
   always available, and each widget decided from whatever was loaded. #1897, #1899 and
   #2068 left that alone; #2110 made `courseHomeMeta` query data (`undefined` when
   missing, which a spread treats like `{}`); #2113 typed it — `isAvailable?: (context:
   SidebarWidgetContext) => boolean`, `course: CourseHomeMeta & CoursewareMeta`, "not
   `Partial`: the provider renders under the gate" (#2111, decision 6) — while
   `coursewareMeta` was still `useModel`'s `any`, so the declaration was never checked.
   This layer's typed `coursewareMetadata` is the first time it is. The widgets are the
   two built-ins (discussions reads `unit`; upgrade reads `course.verifiedMode`, a
   course-home field) and every operator widget in `getConfig().SIDEBAR_WIDGETS`,
   usually from a JavaScript `env.config.jsx`; the sidebar README documents the contract
   as "the first availability check runs before the data arrives, and when the query
   resolves the framework re-evaluates availability", with examples that guard
   `course?.` and one that checks only `courseId`.

   **Reachability.** `SidebarProvider` renders only in `Course`, which `TabPage` renders
   only once `CoursewareContainer`'s two queries — the course-home metadata and the
   courseware metadata — have succeeded, and nothing removes or resets them afterwards
   (only `invalidateQueries`, which keeps the data). So in the app both are always
   there, and the first draft's `[]` never fired; it was still a different function —
   with the course-home metadata missing it hid a widget that ignores `course`, where
   every version since #1885 showed it. The outline is not in that gate: on the
   courseware page `course` has no `sectionIds` or `hasScheduledContent` until the
   outline lands (since #2074; #2139 made only the course-end page wait).

   **So:** no early return; `getAvailableWidgets` builds `course` with a local
   `buildWidgetCourse(coursewareMetadata, minimalCourseMetadata, courseHomeMeta)`, the
   spread, and the parameter `isAvailable` receives is a local, unexported
   `SidebarAvailabilityContext` whose `course` is `ReturnType<typeof
   buildWidgetCourse>` — the type is the spread's, so it cannot drift from the object:
   each field optional, and a field both endpoints carry typed as either endpoint's
   (in the row with the course-home metadata missing, `course.celebrations` is the
   courseware metadata's value, `unknown` today; it tightens when a layer types
   `CoursewareMeta.celebrations` for its reader, `CoursewareContainer`'s
   `celebrations.firstSection`). `SidebarWidget.isAvailable` and
   `SidebarRegistryEntry.isAvailable` take it. The built-ins type themselves from the
   slot, `NonNullable<SidebarWidget['isAvailable']>`, and drop their
   `SidebarWidgetContext` import: `@edx/typescript-config` sets `strictFunctionTypes:
   false`, so a built-in still annotated with the complete context would compile
   against the looser slot while claiming more than it is handed, losing #2111
   decision 9's check. In the diff the annotation moves from the parameter to
   the variable — `({ unit }: SidebarWidgetContext) => …` becomes
   `discussionsIsAvailable: NonNullable<SidebarWidget['isAvailable']> = ({ unit })
   => …` — so the function declares itself to be the slot's function type
   (`SidebarWidget['isAvailable']`, an indexed access type, is that property's
   type; `NonNullable` drops the `undefined` its `?` adds, since the built-in is
   a function) and its destructured parameter takes the slot's parameter type
   by contextual typing; that is also how the built-ins reach the unexported
   `SidebarAvailabilityContext` without importing it. The exported `SidebarWidgetContext` is not loosened: it gains
   `& Partial<MinimalCourseMetadata>`, naming the outline's fields as optional (additive;
   the shared `id` and `title` stay `string` from the course-home metadata). Rejected: a
   cast of the spread to the declared type (it would state completeness exactly where
   it does not hold); `Partial<SidebarWidgetContext>` (shallow — `course?` must still be
   complete when present, and `npm run types` still fails); `Partial` of the two-type
   intersection (fails on `celebrations`, which the intersection types as the
   course-home shape); typing `CoursewareMeta.celebrations` now to make that pass (it
   rests on the two endpoints agreeing, and its reader converts in layer B). Type-only
   for TypeScript plugins typed from the slot; runtime identical to `master` for every
   widget. Tests: *when a metadata query has no data* in `SidebarContext.test`, one case
   per missing query, with a widget without `isAvailable`, one that checks only
   `courseId` and the real `upgradeIsAvailable`. Negative checks, run: with the early
   return restored, both fail; a temporary `const org: string = course.org` in
   `upgradeIsAvailable` fails `npm run types`. The sidebar README's "Context Object"
   section had named the parameter `SidebarWidgetContext`; it now names it as the
   parameter of `SidebarWidget['isAvailable']`, with every `course` field optional, so
   the plugin-facing doc describes what a widget is handed.

5. **Readers that render before the queries resolve.** In production every
   converted reader renders behind `TabPage`'s gate or under `CourseExit`,
   so the metadata is there on first render; several suites render the
   reader beside `MountCourseQueryHooks` instead, where it is pending, and
   passed until now only because `initializeTestStore` seeds the store
   directly. Each site is handled by what it depends on:
   - `GetCourseExitNavigation` (`course-exit/utils.js`) keeps its
     destructure as it was, `entranceExamData: { entranceExamPassed }` with
     no default, and its two callers' suites mount them behind the gate
     (settled in review over a first version that added `= {}`). It throws
     while the metadata is pending, and a default would have turned that
     into `undefined`, which `getCourseExitMode` reads as not failed
     (`entranceExamPassed = null`, and only `=== false` returns
     `entranceExamFail`): an unknown exam status would enable the next
     button rather than fail loudly. The sibling in
     `sequence-navigation/hooks.js` has had that default since #2071
     (`decisions-1976A3.md` entry 4) and was the first version's precedent,
     but it is safe there and would not be here: that hook returns early
     unless `useIsCourseLoaded`, which includes the metadata's success, so
     its `undefined` is never used for a decision, while
     `GetCourseExitNavigation` passes the value straight to
     `getCourseExitMode`. With `useModel` the value was never `undefined`
     either: the callers, `UnitNavigation`'s `renderNextButton` and
     `SequenceNavigation`, render under `Sequence` inside `TabPage`, whose
     `deriveView` renders children only once the metadata query has
     succeeded; the bridge wrote the store in that query's `onSuccess`,
     before observers re-rendered; and the endpoint always sends
     `entrance_exam_data` with a boolean `entrance_exam_passed`. So it was a
     boolean, and the throw — `TypeError: Cannot read properties of
     undefined (reading 'entranceExamPassed')` in `GetCourseExitNavigation`,
     surfacing as the app's error page — was unreachable; the navigation
     suites passed on the seeded store. The query read keeps both: under the
     gate `data` is the successful result on the same render, and outside it
     the failure is the same function, line, message and error page (seen in
     this layer's first run, 44 times, before the suites were gated).
   - `CourseBreadcrumbs` reads the outline once and builds its section list
     only when the outline is there; the breadcrumb suite renders it beside
     the owner, so it handles the pending state itself (#2088 layer A's
     `Unit` shape). The outline read destructures `courses`, `sections` and
     `sequences`, and `courseSections` is `[]` without `courses`. That
     replaces the `course.sectionIds ?? []` guard #2139 added below this
     layer for the same pending state (the rebase's one conflict here); its
     slot case, *inserted breadcrumbs do not error while the outline is
     loading*, passes on this layer. The
     `sequences = {}` default #2088 layer B added goes: it covered the store
     and the query disagreeing — sections read from the store through
     `useModels('sections', course.sectionIds)`, sequences from the query —
     which production never reaches, since the bridge writes the store in
     the query's `onSuccess`, but the breadcrumb suite did, rendering with
     the seeded store's sections while the outline query was pending. With
     all three read from one result, either all are there or `courseSections`
     is empty and `sequences` is never read. That holds because a defined
     `data` is always a normalizer result: the query function returns
     `normalizeMinimalCourseOutline(data)` (`api.js`), which starts from
     `{ courses: {}, sections: {}, sequences: {} }`, only adds entries, and
     returns that object, so all three maps are present even for an empty
     course; and nothing else writes the outline's cache entry (the only
     other `coursewareQueryKeys.outline(...)` uses in `src` are two test
     assertions on its status). The assumption the component does make is
     the neighbouring one, that `courses[courseId]` exists: a route
     `courseId` that differed from the outline's `course_key` would throw on
     `.sectionIds`. The old read made the same one — `useModel('coursewareMeta',
     courseId)` would have returned `{}`, and `useModels('sections',
     undefined)` threw — so this layer neither adds nor removes it. The
     table's `sequences[id]` line stays as it was (settled in review over a
     version that reached through the whole outline object at each use).
   - `Course` depends on its parent's contract, so the suites mount it behind
     the gate rather than teach it to render empty. `LoadedCourse` came in
     with #2120, in `Course.test.jsx` only: `Course` reads `celebrations`
     from the course-home metadata in the weekly-goal modal's `useState`
     initializer, so with that query pending on first render the
     celebration modals could never open. `setupDiscussionSidebar` in
     `courseware/course/test-utils.jsx` rendered `Course` with no gate and
     did not need one — its cases do not depend on `celebrations`, and the
     courseware metadata came from the seeded store, present on first
     render. This layer makes `Course` dereference the metadata query on
     first render (`coursewareMetadata.enrollmentMode` for
     `LearnerToolsSlot`, and `course.notes.enabled` inside `ContentTools`),
     so every render before it resolves throws, the helper's included (the
     sixteen `enrollmentMode` errors of the first run). `LoadedCourse`
     therefore moves into `test-utils.jsx`, where both render paths use it,
     and gates on what `deriveView` waits for: the course-home metadata and
     the courseware metadata. The #2120 version gated on the course-home
     query alone, through a fetching `useCourseHomeMeta(courseId)`; the
     shared one reads every query with `{ enabled: false }`, as
     `LoadedTabPage` does, so the gate adds no request. `Course` is meant to
     require the metadata, as its parent's gate provides it; the one guarded
     read, `coursewareMetadata?.courseGoals`, is `master`'s
     `course?.courseGoals` renamed, kept rather than tightened for the
     faithful diff.
   - **The gate is `src/tests/CourseQueryGate.tsx`** (settled in review over
     a fixed two-query version). It renders its children only while the
     course's queries — course-home metadata, courseware metadata,
     learning-sequences outline, sequence metadata — are in the states a
     test names, each `'success'` or `'pending'`, defaulting to the two
     `TabPage` waits for having succeeded; `LoadedCourse` is `Course` inside
     it, and the two navigation suites' `renderNav` render their component
     inside it. The test puts each query in its state through the mocks; the
     gate keeps the component from rendering outside that state. When open
     it renders a hidden `data-testid="course-query-gate-open"` marker, for
     cases whose component renders nothing.
   - **`SequenceNavigation.test`'s *is empty while loading* keeps testing
     the component's branch.** It pins `SequenceNavigation`'s
     `sequenceQuery.isSuccess ? … : null`. Behind a plain gate it would pass
     whatever the component did — nothing mounts on the render it asserts
     on — and bare it would pass because the component throws. It now
     passes `preventSequenceLoad` to `initializeTestStore`, a new option
     beside `preventOutlineSidebarLoad` that holds the sequence request
     pending (paired with `excludeFetchSequence`, whose seeding would wait
     on it), renders behind the gate with `{ sequence: 'pending' }`, and
     waits for the marker before asserting. It also renders its own store's
     sequence: it had rendered `mockData.sequenceId` from the `beforeEach`
     store, whose request its second `initializeTestStore` no longer mocks,
     so `logUnhandledRequests` answered `200 {}` and the sequence query
     errored — on `master` the case had passed with a failed sequence, not
     a loading one. Negative check, run: with the pending branch rendering
     the navigation container instead of `null`, the case fails.
     `UnitNavigation.test`'s *renders correctly without units* awaits its
     two controls (`findAllByRole`) now that the component mounts once the
     gate opens; since #2139 below this layer they are disabled buttons, not
     links, so it awaits `button` and keeps #2139's disabled assertions.

6. **`useSequenceIds` reads the course's sections through a `select`;
   `CertificateStatus` stays as the plan had it.**
   `useSequenceIds` reads the course's sections through a new
   `useCourseSections(courseId)`, a disabled observer of the outline query
   (#2098, decision 4: it is non-fetching by design) whose `select` maps the
   course entry's `sectionIds` over its `sections` — the lookup
   `useModels('sections', sectionIds)` did, now in the `select`, whose result
   structural sharing keeps stable as `useModels`' `shallowEqual` did. The
   outline's options move into a `minimalCourseOutlineQuery(courseId)`
   `queryOptions` factory that `useMinimalCourseOutline` and
   `useCourseSections` both spread, so every observer of the key carries the
   bridge `meta` (`sequenceMetadataQuery` / `useUnit`'s shape); its `queryFn`
   declares `Promise<MinimalCourseOutline>`, the type the hook's `useQuery`
   generic used to state, since `getLearningSequencesOutline` is JavaScript.
   The `useIsCourseLoaded` gate stays outside the memo, as it was: `sections`
   is `undefined` until the course is loaded — stable across renders, unlike a
   fresh `[]` — and the memo is `sections?.flatMap(…) ?? []` on `[sections]`.
   The hook is called on every render and the gate applied to its result
   (`isCourseLoaded ? useCourseSections(…).data : undefined` would call it
   conditionally; `react-hooks/rules-of-hooks` is off in `.eslintrc.js`, so
   lint does not catch that). `useIsCourseLoaded` implies the outline has
   succeeded, so the course entry is read without a fallback. `CertificateStatus` keeps
   `{ enabled: false }`: nothing on the progress tab fetches the courseware
   metadata, so its `entranceExamData` is `undefined` there, and
   `entranceExamData?.entranceExamPassed ?? null` is `null`, as it was with
   `{}`.

7. **Suite mocks follow the reads.** `UnitSuspense.test`,
   `useShouldDisplayHonorCode.test` and `UpgradePanel.test` mock
   `useCoursewareMetadata` (`{ data }`) where they mocked `useModel`, and
   their "reads … the courseware metadata" cases assert
   `(courseId, { enabled: false })`. `SidebarContext.test`,
   `UpgradeTrigger.test` and `UpgradeWidgetContext.test` render the provider
   with no `QueryClientProvider` and mock each query hook it calls, so they
   add `useCoursewareMetadata` (`{ data: {} }`, the `{}` their `useModel` mock
   returned) and `useMinimalCourseOutline` (`{ data: undefined }`).
   `Sidebar.test` and `SidebarTriggers.test` render the real provider under
   `setupTest`'s `QueryClientProvider` with no course data and mock no query
   hook: the disabled observers return `undefined`, which the spread in entry
   4 treats as `{}`. (This layer's first draft mocked the two gated hooks
   there with `{ data: {} }`, for the early return entry 4 removed; the mocks
   outlived it until review.) The `model-store` mocks left with nothing to
   mock go from those five suites, `UpgradePanel.test` and
   `DiscussionsProvider.test`.

8. **`LockPaywall`'s analytics case sets up its own mocks.** It rendered
   against the store seeded in `beforeAll` and passed while `LockPaywall`
   read `offer` from that store. Reading the query instead, it fetched
   against the axios mocks the previous case registered — a course metadata
   response with an `offer` — and rendered the discounted link. The case now
   calls `initializeTestStore({}, false)` and renders with that store, the
   form its neighbouring cases use.

9. **The integrity-signature writer suite asserts on the cache.** It seeds a
   minimal entry at `coursewareQueryKeys.metadata(courseId)`,
   `{ userNeedsIntegritySignature: true }` — the hook touches only that
   field, #2088 layer A's bookmark-suite precedent — and reads it back with
   `getQueryData`; the suite drops its store. A fourth case, *writes nothing
   for a course with no cache entry*, takes the sibling writers' name and
   their flush after the request.

10. **Request counts cover both queries on both owner pages.** #2098's cases
    counted only the course-home metadata on `CoursewareContainer` and
    `CourseExit`. Each page gains *requests the courseware metadata once per
    load* and *requests the learning-sequences outline once per load*;
    `CourseExit.test`'s three count cases share a `loadCelebrationPage`
    helper, the setup its one case had inline. Negative check, run: with
    `CourseCelebration`'s outline read and `Sequence`'s metadata read flipped
    to fetching, exactly two cases fail — the course-end page's outline count
    and the courseware page's metadata count.

11. **Commit: `refactor!:` with a `BREAKING CHANGE:` footer.** The bridge
    still writes both models in this layer, so `useModel('coursewareMeta', …)`
    and `useModel('sections', …)` keep returning data until layer B; what
    changes for plugins is that saving the integrity signature no longer sets
    `userNeedsIntegritySignature: false` on the store copy, so a plugin
    reading it through `useModel` sees `true` until the next metadata fetch.
    And `title` leaves `useCoursewareMetadata(...).data`, while the store
    copy's `title` is always the outline's. Learner-visible: entry 1's title.

12. **Codecov after submit: two behaviour tests for code the layer stopped
    reaching indirectly.** The project check fell 0.07% with no uncovered
    patch line. `generic/model-store/hooks.js`'s `useModels` lost its last
    in-repo callers (`useSequenceIds`, `CourseBreadcrumbs`) — the model store
    has no suite of its own, so it had been covered only through them; it stays
    exported (plugins can reach `@src/generic/model-store`) until #1977 removes
    the store, and gains `model-store/hooks.test.tsx`: each id's model in order
    with `{}` for a missing id, and `{}` for every id of a model type not in the
    store. `getCourseExitMode`'s `canImmediatelyViewCertificate = false` default
    had been hit only by navigation suites that rendered before the course-home
    query had data; rendering through `CourseQueryGate`, as the app does, every
    call passes a defined value. `course-exit/utils.test.ts` pins the default:
    omitted, a not-passing learner with no certificate data gets `celebration`;
    passed `true`, `nonPassing`. The exit-page flag is passed as `undefined`
    there: `utils.js` is JavaScript, so its parameter types come from the
    defaults, and `courseExitPageIsActive = null` types that parameter `null`.
