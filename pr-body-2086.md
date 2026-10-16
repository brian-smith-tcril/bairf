## Summary

The course-home metadata has been query-backed since #2010, and #2085 moved its tab-page, alert and course-home-tab readers onto `useCourseHomeMeta`. This moves the remaining 22 reads — the courseware subtree, the course-end pages, the sidebar provider and upgrade widget, the product tours and the streak modal — the same way, moves the two celebration writers off the Redux model onto the query cache, and drops the `courseHomeMeta` bridge entry, so nothing writes that model any more (the last `courseHomeMeta` layer of the #1977 model-store dissolution). **No user-facing change and no request-count change**: readers subscribe with `{ enabled: false }` under the page that already fetches the query, the writers patch the cache entry with the same value they wrote to the store, and the server-side celebration POST is untouched. **Breaking for plugins**: `useModel('courseHomeMeta', courseId)` now returns `{}` — see *Plugins — breaking* below. Part of the Redux → React Query migration (#1946, Stage 1). Closes #2086. Stacked above #2109.

## What changed

- **22 reads, four shapes.** Seven single-field sites read `.data?.field`; thirteen keep their destructure over `.data ?? {}`; `SidebarContextProvider` reads `.data` with no default (the object sits in a `useCallback` dependency array); `HiddenAfterDue` takes `useProgressTabUrl()`. `CourseInProgress` and `CourseNonPassing` take B2's tab-URL hooks too, and `HiddenAfterDue` drops its `courseId` prop in favour of the route param.
- **The writers are a literal port.** `dispatch(updateModel(…))` becomes `queryClient.setQueryData(courseHomeQueryKeys.metadata(courseId), (meta) => ({ ...meta, celebrations: { ...celebrations, <flag> } }))` with every signature kept; `useQueryClient()` replaces `useDispatch()` in `Course`, `CelebrationModal` and `StreakCelebrationModal`. `postCelebrationComplete` stays a fire-and-forget POST outside React Query; #1973 owns making it a mutation, and carries a note about the two branches where the POST and the patch are not paired.
- **The bridge entry goes.** `useCourseHomeMeta` drops `meta: { modelType: 'courseHomeMeta', courseId }`; the bridge itself stays for `dates`, `outline` and `progress` until #1999 and the teardown.
- **README.** `src/courseware/course/sidebar/README.md`'s "Accessing Course Data" is rewritten queries-first: the `course` context object widgets already receive, then `useCourseHomeMeta` and `useCoursewareMetadata` with `{ enabled: false }`, with one holdover line for the per-unit `discussionTopics` read that has no hook until #2087.
- **Tests.** Suites that rendered these components against the seeded store mount the owner's query hooks beside them (`Course`, `Sequence`, `LockPaywall`, the `CourseExit` bodies) or, where the suite's own axios adapter precludes a fetch, seed the query (`HonorCode`, the streak modal); `UpgradePanel` and `SidebarContextProvider` mock the hook instead of `useModel`. The celebration utils are tested against a real query cache instead of a dispatch spy, the streak modal suite covers the close-time cache write, and a new `CelebrationModal.test.tsx` covers the first-section modal's open-time POST and cache write (the only cases that opened it were skipped).

## Plugins — breaking

`useModel('courseHomeMeta', courseId)` from `./src/generic/model-store` no longer returns the course-home metadata. With the bridge entry gone nothing writes that model, so the call returns `{}` — the model store's value for a model it does not have — and every field read off it is `undefined`. Nothing errors; a widget that reads `verifiedMode`, `org`, `isStaff`, `username` or `courseModes` this way silently sees none of them. This affects sidebar widgets registered through `SIDEBAR_WIDGETS` and `PluginSlot` plugins that import this repo's internals: the sidebar README documented the `useModel` read for widget authors, which is why it changed.

The replacement is the query hook, as a non-fetching reader:

```js
import { useCourseHomeMeta } from './src/course-home/data/apiHooks';

const MyWidgetPanel = ({ courseId }) => {
  const { org, verifiedMode, courseModes } = useCourseHomeMeta(courseId, { enabled: false }).data ?? {};
  // ...
};
```

Under any course page — a courseware unit, the course-home tabs, the course-end page — that page has already fetched the metadata, so the disabled observer reads the cached result and adds no request; it re-renders when the page's fetch lands, exactly as the `useModel` read did when the bridge wrote the store. Rendered anywhere else, `.data` stays `undefined` until something on that page fetches the metadata. As with #2106, the query cache is shared, so one fetching observer on the page feeds every reader; the simplest shape is the widget mounting the fetch itself, `useCourseHomeMeta(courseId)` without the option, beside its read.

Unaffected: the widget config functions, `isAvailable` and `prefetch`, still receive the merged `course` object as an argument with the same fields as before. `useModel('coursewareMeta', courseId)` and `useModel('discussionTopics', unitId)` still return their models for now; #2089 and #2087 do to them what this layer does to `courseHomeMeta`, and the README already names `useCoursewareMetadata` as the hook to move `coursewareMeta` reads onto. The rewritten section is *Accessing Course Data* in `src/courseware/course/sidebar/README.md`.

## Testing

`npm run types` and `npm run lint` clean; full suite 115 suites, 1166 passed, 3 skipped. Negative checks, one reader per owner flipped to `enabled: true`: `Sequence.jsx` makes the `CoursewareContainer` count read two, `CourseCelebration.jsx` the `CourseExit` count (once #2109's count case renders the celebration body, a fix folded into that PR), `LaunchCourseHomeTourButton.jsx` the outline count, and `ProductTours.jsx` the outline, courseware and dates counts. Manual testing per the checklist below, on tutor dev: 11 of 29 checks run, all passing — the four request counts (one per page, none added by in-courseware navigation), the staff-flag preview checks, the hidden-after-due link, the celebration page's visible readers and the *Launch tour* button; 17 not run because they need course or account state the environment was not set up for (marked *not run*, not failed, each naming the unit case that covers the read), one skipped. No `org_key` was observable: every event this layer touches goes through `sendTrackEvent`, which is inert without a `SEGMENT_KEY`.

## Decisions

<details>
<summary>Full decision log</summary>

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

</details>

## Manual testing

<details>
<summary>Checklist</summary>

# Manual testing — read `courseHomeMeta` from the query: courseware, shared, and widgets (#2086)

In-browser verification against a live backend (tutor dev).

What changed: the last 22 readers of the course-home metadata that went
through the model store now read the metadata query directly, as disabled
observers under the page that fetches it (`CoursewareContainer` for the
courseware subtree, `CourseExit` for the course-end page, every tab page for
`ProductTours`, the streak modal and the tour button). The two celebration
writers patch the query cache instead of the Redux model. The bridge entry is
gone, so `useModel('courseHomeMeta')` returns `{}` for anyone still calling it.
Nothing fetches differently and the server-side celebration POSTs are
untouched.

**The three bugs this layer could introduce.** (1) A reader that fetches: a
forgotten `{ enabled: false }` shows up only as a second `course_metadata`
request on that reader's page. (2) A reader that never sees data: a disabled
observer with no owner above it reads `undefined` forever, so its component
sits in its no-data branch without erroring — a paywall that never renders, a
link that never appears, an `org_key` of `undefined` in a tracking event. (3)
A celebration that repeats: if the cache write misses, the first-section modal
shows again at the next section boundary in the same session, or the streak
modal reopens on the next tab navigation. Everything below is one of those
three checks.

## Setup

An ordinary course with a **verified mode**, at least two sections with
graded content, a **gated** (verified-only) unit if content gating is
enabled, and a subsection with **hide after due** set with a past due date.
Two accounts: an **enrolled learner** and a **staff** user who can masquerade.

For the celebrations: a **fresh enrolment** in a course with celebrations
enabled (the `course_metadata` payload shows `celebrations.first_section:
true`), and, optionally, a learning goal set and met for the weekly-goal
modal. A three-day streak is unlikely to be producible; mark it *not run*.

For the course-end page: the learner has completed the course (or staff visits
`/course/:id` directly).

## Verify by hand

**`org_key` in tracking events is not observable on this setup.** Every event
this layer touches goes through frontend-platform's `sendTrackEvent`, which
returns without doing anything when `SEGMENT_KEY` is unset
(`SegmentAnalyticsService.js:233`), so no request appears in the Network tab.
The `org_key` sub-checks below are therefore recorded as *not observable*; the
`org` reads behind them are the same one-line swap as every other reader and
are covered by the unit suites. (To observe them: set any `SEGMENT_KEY` in
`env.config.jsx`; the Segment stub then queues each `track` call on
`window.analytics`, inspectable in the console.)

### Request count — one per page (the #2098 protocol)

Hard reload, wait for the Network tab to go idle, count
`/api/course_home/course_metadata/`:

- [x] a courseware unit: **1**
- [x] the course-end page (`/course/:id`): **1**
- [x] outline → courseware crossing: clear the log after the outline is idle,
      click a sequence title, wait for idle: **1**
- [x] navigating unit → unit and sequence → sequence inside the courseware:
      **0** further `course_metadata` requests

### Courseware readers (`CoursewareContainer` owns the query)

The staff flags (`Course.jsx`, `Sequence.jsx` read `isStaff` and
`originalUserIsStaff`):

- [x] as a non-staff learner, a `/preview/...` unit URL redirects to the plain
      `/course/...` URL
- [x] as staff on a `/preview/...` unit URL, the unit iframe's `src` carries
      `preview=1` (learner view: `preview=0`)
- skipped — jump-navigation breadcrumbs as staff (`ENABLE_JUMPNAV`): not
      enabled on this setup and not worth turning on for this; `isStaff`
      reaches `BreadcrumbItem` unchanged through `CourseBreadcrumbsSlot`

Components with their own read:

- not run — `LockPaywall`: needs content gating and a gated unit, not set up
      here; its read is covered by `LockPaywall.test.jsx`, which mounts the
      owner's hooks and finds the price link once the fetch lands
- not run — `HonorCode`: needs a graded unit for a learner who has not signed
      the integrity agreement; its read is covered by `HonorCode.test.jsx`,
      which seeds the query and posts (or, masquerading, does not)
- [x] `HiddenAfterDue`: a hidden-after-due subsection shows the notice with a
      working *progress page* link (the course id now comes from the route,
      not a prop)
- not run — `UpgradePanel`: needs the `UPGRADE` sidebar widget registered in
      `env.config.jsx` (it is not on this setup) plus an audit learner in a
      course with a verified mode; its read is covered by
      `UpgradePanel.test.jsx`, which mocks the hook with the same fixture it
      mocked `useModel` with
- not run — `SidebarContextProvider`: its read is observable only through a
      widget whose `isAvailable` reads `course`, and the upgrade widget is the
      only one; same setup as above

### Course-end readers (`CourseExit` owns the query)

On the celebration page (`/course/:id` after completing the course):

- [x] `CourseExitContent`: the page shows the celebration body rather than
      redirecting to the outline (reads `canViewCertificate`, `isMasquerading`)
- [x] `CourseCelebration`: the *Congratulations!* header and the image; the
      browser tab title is `Congratulations! | <course title> | <site name>`
      (`title` from the query); its visit event's `org_key`: not observable
- [x] `CatalogSuggestion`: *Looking to learn more?* with the *search our
      catalog* link (its click event,
      `edx.ui.lms.course_exit.catalog_search.clicked` with `org_key`: not
      observable, see above)

Branches this setup does not show:

- not run — `CourseCelebration`'s certificate block (needs certificate data)
- not run — `DashboardFootnoteLink`: the *dashboard* footnote under the
      celebration content renders only in the certificate branches; its click
      would send `edx.ui.lms.course_exit.dashboard_footnote.clicked` with
      `org_key`
- not run — `SocialIcons` (needs a `marketing_url` on the course)
- not run — `UpgradeFootnote` (an audit learner on a course with an upgrade
      deadline)
- not run — `CourseRecommendations` (needs discovery recommendations; the
      catalog suggestion is its fallback)
- not run — `CourseNonPassing`: the *View grades* button goes to the progress
      tab (an ended course, not passing)
- not run — `CourseInProgress`: the *View course schedule* button goes to the
      dates tab (scheduled content, not passing)

### Tab-page readers (every tab owner)

- [x] outline: the *Launch tour* button renders in the course tools widget
      (tours enabled for the account) and clicking it starts the course-home
      tour; its click event's `org_key`: not observable
- not run — the new-user course-home tour and the courseware tour end to end
      for a user with tours enabled (not set up for this pass; `ProductTours`'
      read is `username` for the proctoring-info query, covered by
      `ProductTours.test.jsx` under the outline and courseware owners)

### Celebrations (the cache writes)

- not run — first section: with a fresh enrolment, click *Next* past the
      first section's last unit. The *Congratulations!* modal shows once; the
      Network tab shows one POST to `/api/courseware/celebration/:id` with
      `first_section: false`; closing it and crossing the **next** section
      boundary in the same session shows no second modal; a reload shows
      none either. (Needs a fresh enrolment in a course with celebrations
      enabled — not set up for this pass. The write is covered by
      `celebration/utils.test.jsx` against a real query cache.)
- not run — the modal's social icons (needs `marketing_url`); its open
      event's `org_key`: not observable
- not run — weekly goal: with a goal set and met, load a unit: the *You met
      your goal!* modal shows once with the goal's days per week; its POST
      sends `weekly_goal: false` (needs a goal set and met)
- not run — streak: with a pending streak, the modal opens once on load;
      closing it does not reopen it on the next tab navigation (needs a
      three-day streak; the close-time write is covered by
      `StreakCelebrationModal.test.jsx`)

### Plugins

- not run — a widget or plugin still calling
      `useModel('courseHomeMeta', courseId)` gets `{}` (needs a sidebar widget
      or `PluginSlot` plugin wired into `env.config.jsx` with that call; the
      behaviour is exactly what dropping the bridge entry does, and the README
      section plus the BREAKING CHANGE footer are the mitigation)

## Results

Run on tutor dev, 2026-09-23, on the B3 layer. 11 checks run, all passing: the
four request counts (a courseware unit, the course-end page, the outline →
courseware crossing, and in-courseware navigation adding none), the two
preview checks from the staff flags, the hidden-after-due notice's progress
link, the three readers visible on the celebration page, and the *Launch tour*
button on the outline. 17 checks marked *not run*: each needs course or account
state this environment was not set up for (content gating, an unsigned honor
code, the upgrade sidebar widget, certificate data, a `marketing_url`, an
upgrade deadline, discovery recommendations, a not-passing or in-progress
course end, tours end to end, a fresh enrolment for the celebration modals, a
weekly goal, a three-day streak, an out-of-repo `useModel` caller); each names
the unit case that covers its read. One check skipped (jump-navigation
breadcrumbs, not enabled and not worth enabling). No `org_key` was observable:
every event this layer touches is a `sendTrackEvent`, which is inert without a
`SEGMENT_KEY`. Nothing failed; the not-run checks were not exercised.

## Not covered

- The live and discussion tabs: their only B3 readers (`ProductTours`, the
  streak modal) are the ones every other tab exercises; their once-per-load
  counts are pinned by their suites.
- `useModel` reads of `coursewareMeta`, `sequences`, `sections`, `units` and
  `discussionTopics` in the converted files — D and C layers.
- The celebration POST itself (unchanged; #1973 converts it to a mutation).

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
