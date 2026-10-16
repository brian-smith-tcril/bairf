# Decisions — read `courseHomeMeta` from the query: courseware, shared, and widgets (#2086)

The last `courseHomeMeta` layer of the #1977 model-store dissolution, on top of
#2085 (PR #2109). Entries 1–8 were settled in the plan review on 2026-09-23 and
posted to #2086; the rest landed with the code.

1. **Scope is the issue body plus its comment.** The body lists the 22 remaining
   `useModel('courseHomeMeta', courseId)` sites, the two celebration writers
   and the bridge `meta` entry; the comment sends the three tab readers
   (`CourseInProgress`, `CourseNonPassing`, `HiddenAfterDue`) through B2's
   tab-URL hooks and asks whether `HiddenAfterDue` can drop its `courseId`
   prop. All of it is here. `git grep "useModel('courseHomeMeta'" src` is
   empty after this layer.

2. **Four read shapes, chosen per site as B2 did.** Seven single-field sites
   read `useCourseHomeMeta(courseId, { enabled: false }).data?.field`
   (`CatalogSuggestion`, `UpgradeFootnote`, `DashboardFootnoteLink`,
   `LaunchCourseHomeTourButton`, `WeeklyGoalCelebrationModal`,
   `GetCourseExitNavigation`); thirteen keep their destructure over
   `.data ?? {}`; `SidebarContextProvider` reads `.data` with no default
   because the object sits in a `useCallback` dependency array and is spread
   (`decisions-2083.md` entry 8); `HiddenAfterDue` takes `useProgressTabUrl()`.
   One deviation from the plan's table: `ProductTours` was listed as a
   single-field read of `username`, but the component already destructures a
   `username` from `getAuthenticatedUser()`, so a property read would have
   needed a new name. It keeps the whole object — `const courseHomeMeta =
   useCourseHomeMeta(courseId, { enabled: false }).data` — and the one use
   becomes `courseHomeMeta?.username`. Two tokens changed, no new name.

3. **The writers are a literal port.** Every signature stays;
   `dispatch` becomes `queryClient` in the same slot (`useQueryClient()`
   replaces `useDispatch()` in `Course`, `CelebrationModal` and
   `StreakCelebrationModal`); each `dispatch(updateModel(…))` block becomes
   one `queryClient.setQueryData(courseHomeQueryKeys.metadata(courseId),
   (meta) => ({ ...meta, celebrations: { ...celebrations, <flag> } }))`,
   spreading the same render-time `celebrations` the store version spread;
   the two identical first-section writes stay inline in
   `celebration/utils.jsx`; `recordModalClosing`'s unused `org` parameter
   stays; `postCelebrationComplete` is untouched. The first draft recommended
   the updater form reading the cache's own `celebrations` (dropping that
   parameter and the dead `org`) and one private helper for the two writes.
   Rejected in review on a principle: doing the cache write by hand beside a
   fire-and-forget POST is React Query's documented pattern
   ([Updates from Mutation Responses](https://tanstack.com/query/latest/docs/framework/react/guides/updates-from-mutation-responses))
   but the untidy shape, and #1973 already owns turning that POST into a
   `useMutation`, so this layer does the minimal change and the cleanup
   happens there. A note went to #1973 the same day: the POST and the patch
   are not paired one to one in `shouldCelebrateOnSectionLoad` (one branch
   posts without patching, one patches without posting), and the signature
   cleanup was deferred. Value semantics are unchanged in every reachable
   case, including `celebrations: null` (`{ ...null, firstSection: false }`
   is `{ firstSection: false }` both ways); with no cache entry the spread of
   an undefined `meta` creates a bare `{ celebrations }` entry, which is what
   `updateModel` did with a missing model.

4. **`CourseHomeMeta` gains no fields.** B2's log expected B3 to add
   `celebrations.firstSection` / `weeklyGoal` and `verifiedMode`'s fields.
   The readers converted here are JavaScript except `DashboardFootnoteLink`,
   which reads `org`, already named. Fields are named when a TypeScript
   reader needs them; until then the index signature returns `unknown`,
   which fails `npm run types` at the point of use and is the cue.

5. **`CourseExitContent` reads through a disabled observer.** `CourseExit`
   holds the query one component up and passes it to `TabWithTimer`; B2's
   "query in hand" shape applied within one component, and a prop through
   `TabWithTimer`'s children for one read buys nothing — two observers on
   one key are one cache entry.

6. **`HiddenAfterDue` drops `courseId`.** `Sequence` renders only under
   `CoursewareContainer`'s `:courseId` routes, so the prop was always the
   route param, and `useProgressTabUrl()` reads `useParams()` itself. The
   prop, its `propTypes` and `Sequence.jsx`'s `courseId={courseId}` go. The
   one `Sequence.test.jsx` case asserting the notice's progress link renders
   under a `MemoryRouter` route (`/course/:courseId/:sequenceId/*`, the
   `UnitNavigation.test.jsx` shape), because `setupTest`'s `wrapWithRouter`
   is frontend-platform's `AppProvider` around a bare `BrowserRouter` with no
   `Route`, so `useParams()` is empty there.

7. **The bridge entry goes; the bridge stays.** `useCourseHomeMeta` drops
   `meta: { modelType: 'courseHomeMeta', courseId }`. `bridgeToModelStore`'s
   `{ modelType, courseId }` branch is still used by `dates`, `outline` and
   `progress` (#1999 and F). Nothing in production writes the
   `courseHomeMeta` model any more; `setupTest.js` still seeds it for tests,
   which F removes. `useModel('courseHomeMeta', courseId)` therefore returns
   `{}` everywhere: the breaking change.

8. **The sidebar README is rewritten queries-first.** "Accessing Course
   Data" told widget authors to call `useModel` and listed `courseHomeMeta`.
   The requirement set in review: the README must never suggest `useModel`
   gives more than it does. The section now leads with the `course` context
   object widgets already receive, then the two metadata queries that work
   today (`useCourseHomeMeta` and `useCoursewareMetadata`, both with
   `{ enabled: false }` and the #2103 sentence: under the courseware page
   they return what `CoursewareContainer` fetched), and keeps one holdover
   line for the per-unit `discussionTopics` read, which has no query hook
   until C (#2087). `courseHomeMeta` gets no disclaimer; it simply left the
   README. The two "merged … models" lines describing the `course` object now
   say metadata, since half of it is a query result. C's README change is
   the deletion of the holdover line; D3 needs none.

9. **Tests: mount where the suite can fetch, seed where its adapter precludes
   it, mock-swap where the suite mocks module boundaries.** The
   `decisions-2098.md` entry 3 rule plus two exceptions.
   - **Mount** `MountCourseQueryHooks` beside the component: `Course.test.jsx`
     (a `renderCourse(testData, testStore)` helper replaces 19 near-identical
     `render(<Course …/>)` calls), `test-utils.jsx`'s `setupDiscussionSidebar`,
     `Sequence.test.jsx`'s `SidebarWrapper`, `LockPaywall.test.jsx` (a
     `renderPaywall` helper), and `CourseExit.test.jsx`'s `fetchAndRender`
     for the 24 body renders. `Course.test.jsx` passed with or without the
     mount — every case reads `undefined` happily — which is the reason to
     mount rather than leave it: the suite would otherwise claim more than it
     checks.
   - **Seed** a nested `QueryClientProvider`: `HonorCode.test.jsx` and
     `StreakCelebrationModal.test.jsx`, whose `new MockAdapter` after
     `initializeTestStore` replaces the axios adapter and its
     `course_metadata` handler, so a mounted hook would 404. Both seed with
     `store.getState().models.courseHomeMeta[courseId]` rather than
     `camelCaseObject(factory)`: `normalizeCourseHomeCourseMetadata` is not
     exported, `HonorCode`'s masquerade case reads the `isMasquerading` it
     derives, and the store copy is exactly that normalizer's output for the
     case's factory input. F, which stops seeding the store, reworks these
     two seeds along with the rest.
   - **Mock-swap**: `UpgradePanel.test.jsx` and `SidebarContextProvider.test.jsx`
     replace the `courseHomeMeta` branch of their `useModel` mock with a
     `useCourseHomeMeta` mock returning `{ data }` (the
     `CoursewareSearch.test.jsx` shape). `UpgradePanel` failed without it;
     `SidebarContextProvider` passed on `undefined` and keeps its `{ tabs: [] }`
     fixture for fidelity.
   - `LockPaywall.test.jsx`'s cases were synchronous against a store seeded
     before render; with a mounted fetch the metadata arrives after the first
     render, so `getBy*` became `await findBy*` and three cases became
     `async`. *Does not display anything if course does not have verified
     mode* still passes before the fetch settles (a negative assertion with
     no wait) — pre-existing shape, left as is.
   - `CourseExit.test.jsx`'s `fetchAndRender` mounts the hooks only beside a
     body component, not beside `<CourseExit />`, so the count case counts
     the owner alone; it then waits for `queryClient.isFetching()` to reach
     zero before returning, since the bodies render with `undefined` until the
     fetch lands.
   - `LoadedTabPage.test.jsx`'s streak case dropped its second store: the real
     modal reads the query the helper already seeds. `OutlineTab.test.jsx`'s
     denied-learner case waited on the store model the bridge filled; it now
     waits on the query through the client `fetchAndRender` returns.
   - `celebration/utils.test.jsx`'s `dispatchMock` case (which asserted only
     that something was dispatched) became two cases on a seeded
     `QueryClient`: `recordFirstSectionCelebration` flips `firstSection` and
     leaves the rest of the entry alone; `shouldCelebrateOnSectionLoad`'s
     clearing branch does the same write. `StreakCelebrationModal.test.jsx`
     gained *clears the streak in the course metadata query when the modal
     closes*: click the close button, `streakLengthToCelebrate` is `null`,
     `org` still there — the `useQueryClient` → `recordModalClosing` wiring.
     `CelebrationModal.test.tsx` is new, for codecov's patch check: the
     first-section modal's effect (`useQueryClient` →
     `recordFirstSectionCelebration`) ran in no unskipped test, because the
     only cases that open the modal are the two skipped `Course.test.jsx`
     celebration cases (#1669). Two cases in the `EnrollmentAlert.test.tsx`
     shape on a seeded query: opened, it POSTs `first_section: false`, flips
     the flag in the cache and tracks `org_key` from the query; closed, it
     does none of that.

10. **The `CourseExit` count case rendered no body; the fix went into #2109,
    not here.** B2's case called `fetchAndRender(<CourseExit />)` with the
    suite's default metadata, whose `enrollment.is_active` is `null`, so
    `getCourseExitMode` returned `disabled` and the page rendered a redirect
    with no body. It counted the owner and `TabPage`'s readers correctly (B2's
    own readers on that page) but nothing under them, so the plan's claim
    that it covered this layer's course-end readers was wrong: the first
    negative check here (flipping `CourseCelebration` to `enabled: true`)
    still read one. The fix — set an active enrolment and a downloadable
    certificate so the celebration body renders, asserted by
    *Congratulations!* — first landed in this layer and was pulled out in
    review: nothing this layer does to the source changes what that case
    sees, so a reviewer would read the test change as caused by this PR when
    it is B2's test being corrected. It is folded into #2109 (still open, one
    layer down; `decisions-2085.md` entry 13), and this layer's negative check
    for the course-end page runs against it there.

11. **No hook-suite case for "a disabled reader re-renders on `setQueryData`".**
    The plan promised to pin that mechanism with a test instead of a docs
    quote, and a first version landed in `apiHooks.test.tsx`. Dropped in
    review: `useCourseHomeMeta` has nothing special in it, so the case tested
    React Query, not our code, and its name said nothing about why. The one
    thing such a case would catch beyond the utils suite's `getQueryData`
    assertions is an updater that mutates the cached object in place — same
    flag in the cache, no new reference, no observer re-render, the
    first-section modal showing twice — and that guard was judged not worth
    adding to writers #1973 rewrites into a mutation with tests of its own.
    Recorded while it was fresh: the notification is asynchronous (React
    Query's batched notifier, which a synchronous `act` does not flush), so
    any future version of the case needs `waitFor`.

12. **Commit type is `refactor!:` with a `BREAKING CHANGE:` footer**, the
    #2103 (PR #2106) shape: what stopped working, what to call instead, where
    the README is. One commit: the writers, the readers and the bridge entry
    are one change, since the entry can go only once both are off the store.

13. **Negative checks, one reader per owner flipped to `enabled: true`.**
    `Sequence.jsx` → the `CoursewareContainer` count reads two;
    `CourseCelebration.jsx` → the `CourseExit` count reads two (after entry
    10); `LaunchCourseHomeTourButton.jsx` → the outline count reads two;
    `ProductTours.jsx` → outline, courseware and dates each read two. Every
    flip was reversed by the inverse substitution, never by a checkout.
