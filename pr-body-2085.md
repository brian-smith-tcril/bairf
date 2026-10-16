## Summary

The course-home metadata has been query-backed since #2010, but 53 readers still went through the model store the bridge mirrors it into. This moves the 31 tab-page, alert and course-home-tab reads onto `useCourseHomeMeta` directly (layer B2 of the #1977 model-store dissolution; B3, #2086, takes the courseware, shared and widget reads and the bridge entry). **No user-facing change and no request-count change**: readers subscribe with `{ enabled: false }` under the page that already fetches the query, and every read keeps its existing shape, so each one's behaviour, including its handling of missing data, is inherited exactly. Three progress/outline components take their tab links from new hooks (`useCourseOutlineUrl`, `useDatesTabUrl`, `useProgressTabUrl`) instead of a `tabs` array, per the issue's follow-up comment. Part of the Redux → React Query migration (#1946, Stage 1). Closes #2085. Stacked above #2108.

## What changed

- **`useCourseHomeMeta` is typed.** An exported `CourseHomeMeta` names the fields this repo's TypeScript readers need, as required fields, with an index signature so plugins importing the hook are not limited to that list (the `OutlineTabData` shape from #2083, minus the optionality that endpoint's `{}` branch forced). `TabPage`'s `CourseStatus` uses it.
- **31 reads, three shapes.** `TabPage` and `DatesTab` read the query they already hold. `useEnrollmentAlert` and `usePrivateCourseAlert` read `.data` with no default, since the whole object sits in a `useMemo` dependency array. The rest read `useCourseHomeMeta(courseId, { enabled: false }).data ?? {}`.
- **`LoadedTabPage` narrows on `isSuccess`**, the shape the [React Query docs](https://tanstack.com/query/latest/docs/framework/react/typescript#type-narrowing) give for "when is `data` defined": it renders only after the owner's query settled, so it checks the status, throws with the course id if not (the `Section.tsx` guard from #2083), and destructures typed data. `TabPage` renders its header while pending, so it keeps the default, typed `Partial<CourseHomeMeta>`.
- **Tab-URL hooks.** `course-tabs/hooks.ts` wraps B1's accessors as zero-argument, non-fetching hooks. `RelatedLinks`, `DetailedGrades` and `CertificateStatusAlert` use them; `tabs` leaves the alert's payload and `propTypes`.
- **Tests.** A disabled case for `useCourseHomeMeta`; a suite for the three hooks; `LoadedTabPage.test.jsx` seeds the query per case and covers the guard's throw; a suite for `EnrollmentAlert`, whose body had never run in a test; `TabPage.test.jsx` drops a store dispatch the prop already covered; `CoursewareSearch.test.jsx` mocks the hook instead of `useModel`; and every page that owns the query gains *requests the course metadata once per load* (outline, dates, progress, discussion, live, `CoursewareContainer`, `CourseExit`).

## Testing

`npm run types` and `npm run lint` clean; `course-tabs/hooks.test.tsx` 6/6, `EnrollmentAlert.test.tsx` 3/3 and the 14 touched suites 323/323; full suite 115 suites, 1163 passed, 3 skipped. Negative check: with `useCourseHomeMeta` ignoring `{ enabled: false }`, all seven count cases fail (six read two, the courseware page three) and the three hook `fetches nothing on its own` cases read one. Manual testing per the checklist below, on tutor dev: 21 of 35 checks run, all passing, covering the request counts on every reachable owner page and the crossing, and every reader on the outline, dates, progress, courseware and course-end pages; 14 checks not run because they need course or account state the environment was not set up for (they are marked *not run*, not failed), and the live tab skipped as not configured.

## Decisions

<details>
<summary>Full decision log</summary>

# Decisions — read `courseHomeMeta` from the query: tab-page, alerts, and course-home tabs (#2085)

Layer B2 of the #1977 model-store dissolution, on top of #2107 (PR #2108).
Entries 1–7 were settled in the plan on issue #2085 (posted 2026-09-23, after
review); the rest landed with the code.

1. **Scope is the issue body plus its comment.** The body lists the 31
   `useModel('courseHomeMeta', courseId)` sites; the 2026-09-22 comment adds
   the three tab-URL hook façades and `CertificateStatusAlert` dropping `tabs`
   from its payload. Both are done here. The other 22 sites, the two
   celebration writers and the bridge `meta` entry are B3 (#2086).

2. **Three read shapes, chosen per site.** The body's task list says every
   site becomes `useCourseHomeMeta(courseId, { enabled: false }).data ?? {}`;
   #2083's per-site reasoning gives three:
   - **The query already in hand** (2): `TabPage` receives the owner's query
     as `courseStatus.metadataQuery`, and `DatesTab` fetches it two lines
     above its read, so both read `metadataQuery.data ?? {}` — what
     `DatesTab` did for its tab payload in #2083. A second observer of the
     same key in the same component would be pointless.
   - **Disabled observer, no default** (2): `useEnrollmentAlert` and
     `usePrivateCourseAlert` put the whole `course` object in a `useMemo`
     dependency array, so they read `.data` without `?? {}`
     (`decisions-2083.md` entry 8, the same call for `outline` in the same
     two hooks). `undefined` is referentially stable; `{}` per render is not.
   - **Disabled observer, destructured with `?? {}`** (26, and `LoadedTabPage`
     by a different route — entry 4): `useModel` returned `{}` for a missing
     model, so the default keeps every destructure and every no-data branch
     as it was (`decisions-2083.md` entry 1).

   **Single-field reads use property access, not a one-field destructure with
   a default.** Nineteen of the sites read one field — seventeen that always
   did (`useAccessExpirationMasqueradeBanner`, `useActiveEnterpriseAlert`,
   `EnrollmentAlert`, the three reads in `course-start-alert/hooks.js`,
   `useScheduledContentAlert`, `useCourseEndAlert`, `DateSummary`,
   `CourseDates`, `CourseTools`, `ProctoringInfoPanel`,
   `StartOrResumeCourseCard`, `CourseGradeHeader`, `SubsectionTitleCell`,
   `Day`, `CoursewareSearch`) plus `RelatedLinks` and `DetailedGrades` once
   `tabs` left them (entry 6) — and each reads
   `useCourseHomeMeta(courseId, { enabled: false }).data?.field`. A first
   pass converted only eight by eye and missed nine written as multi-line
   one-field destructures; review caught `EnrollmentAlert`, and a scripted
   census found the rest. The value is
   unchanged (`{}.field` and `undefined?.field` are both `undefined`), it is
   the repo's single-value rule, and it is the shape #2083 used for its one
   single-field TypeScript reader (`SequenceDueDate`). Settled in review from
   a "don't paint the TypeScript conversion into a corner" angle: a
   destructure with `?? {}` does convert — it needs a `Partial<CourseHomeMeta>`
   annotation, as `TabPage` shows — but that is something the converter has
   to know and argue for later, whereas `data?.field` converts untouched.
   The multi-field sites keep the `?? {}` destructure; their conversion is
   the one-token annotation, recorded here so it is not relitigated.

3. **`CourseHomeMeta` names its fields as required.** `useCourseHomeMeta` was
   typed as `{ courseAccess?: { hasAccess: boolean } }`, with a comment
   deferring the rest to `useModel`. It now takes an exported `CourseHomeMeta`
   naming what this repo's TypeScript readers need, with an index signature
   so plugins importing the hook are not limited to that list — the
   `OutlineTabData` shape and comment (`decisions-2083.md` entries 9 and 11).
   Unlike `OutlineTabData` the named fields are required. The outline type is
   all-optional because that endpoint's 403 branch returns `{}`; the metadata
   endpoint has no such branch (`getCourseHomeCourseMetadata` camel-cases the
   whole serializer), so required is the accurate type, and "not loaded" is
   expressed the way React Query expresses it — `data` is `undefined` and
   `isSuccess` is `false` — rather than by every field being optional.
   `TabPage`'s `CourseStatus.metadataQuery` becomes
   `UseQueryResult<CourseHomeMeta, RequestError>`; every caller already
   passes the hook's result. `verifiedMode` is `Record<string, unknown> | null`:
   `LoadedTabPage` only tests it for truthiness and passes it to the untyped
   `StreakCelebrationModal`, so its fields wait for B3, which types that
   modal's own reads. `celebrations` names the two fields `LoadedTabPage`
   derives from; B3 adds `firstSection` and `weeklyGoal` when it converts
   their readers.

4. **`LoadedTabPage` narrows on `isSuccess` and throws otherwise; the two
   `.tsx` readers do not share a shape.** `data ?? {}` widens to
   `CourseHomeMeta | {}`, which TypeScript will not destructure
   (`decisions-2083.md` entry 10). The React Query docs' answer to "when is
   `data` defined" is the status discriminant:

   > React Query uses a discriminated union type for the query result,
   > discriminated by the `status` field and the derived status boolean
   > flags. This will allow you to check for e.g. `success` status to make
   > `data` defined.
   > — [TypeScript › Type Narrowing](https://tanstack.com/query/latest/docs/framework/react/typescript#type-narrowing)

   and a disabled observer over a populated cache is in that state:

   > If the query has cached data, then the query will be initialized in the
   > `status === 'success'` or `isSuccess` state.
   > — [Disabling/Pausing Queries](https://tanstack.com/query/latest/docs/framework/react/guides/disabling-queries)

   `LoadedTabPage` renders only after `TabPage` has seen the owner's query
   settle, so it keeps the query result, checks `isSuccess`, and destructures
   `metadataQuery.data` typed as `CourseHomeMeta` — which also hands `tabs`
   to `CourseTabsNavigationSlot` as `TabMetadata[]` with no coercion. If the
   query is not in success it throws, naming the course. That is our
   addition, following `Section.tsx:50-52` from #2083, and it is not a
   behaviour change in any reachable state. Production never renders
   `LoadedTabPage` outside success: `TabPage` renders it only when the
   metadata query is neither pending nor in error (`deriveView`,
   `shouldRenderContent`), which is `isSuccess` — including the case of a
   failed refetch over cached data, where `TabPage` shows its error view and
   unmounts `LoadedTabPage`. In the one unreachable state, rendered with no
   data at all, the old code already crashed: checked on this layer's base by
   rendering it with no `courseHomeMeta` model and the tab nav unmocked —
   `TypeError: Cannot read properties of undefined (reading 'map')` in
   `CourseTabLinksList`, during the initial render, tearing down the tree.
   The guard keeps that loudness one level up with a message that names the
   component and course. The one wrinkle is `useToggle`, whose initial value is needed before
   the guard because hooks cannot follow an early throw, so the streak length
   is read once above the hooks with optional chaining, and the destructured
   `celebrations` below the guard feeds the two derived lines unchanged.

   `useToggle(!!…)`: Paragon's `useToggle` takes `defaultIsOn?: boolean` and
   the value is `number | null | undefined`. The toggle's state becomes
   `true` instead of `3`; its consumers are `!!isStreakCelebrationOpen` on
   the modal prop (already coerced) and `ProductTours`'
   `isStreakCelebrationOpen`, which is `PropTypes.bool.isRequired` and used
   as a bare condition, so the coercion is what the prop already asked for
   and removes a PropTypes type warning that fired whenever a streak was
   pending.

   The first draft used an all-optional type and an annotated destructure
   (`const {…}: CourseHomeMeta = data ?? {}`) in both files, with a separate
   guard on `tabs`. Rejected in review in favour of the shape the official
   docs describe, cited from the docs rather than from blog posts, which
   date. Also rejected: `data!` or a cast at the read (`decisions-2083.md`
   entry 13), and optional chaining per field (seven chained reads
   rewriting a block the docs' shape leaves intact).

5. **`TabPage` keeps the default, typed as `Partial<CourseHomeMeta>`.** It
   renders `HeaderSlot` with `org`/`number`/`title` while the query is still
   pending, so narrowing does not apply and the docs offer nothing for a
   default. `{}` is assignable to `Partial<CourseHomeMeta>`, every binding is
   `T | undefined`, and the header receives `undefined` while pending exactly
   as the store's `{}` gave it. `getAccessDeniedRedirectUrl` is JavaScript
   and runs only under `isDenied`, which implies the query settled.

6. **The tab-URL hooks do not fetch, and share one private helper.**
   `course-tabs/hooks.ts` exports `useCourseOutlineUrl`, `useDatesTabUrl` and
   `useProgressTabUrl`, each `getXUrl(useTabs())` where `useTabs` reads
   `useParams().courseId` and `useCourseHomeMeta(courseId, { enabled: false }).data?.tabs`.
   The issue comment's sketch fetched; every caller renders under an owner,
   so these read like every other reader here and like `useProgressData()`
   after #2103. Two observers on one key are one cache entry, pinned by
   *serves both contexts from one cache entry*. The helper is not exported:
   the comment's point was that components stop handling `tabs`, and a
   public `useTabs` would invite exactly that. Consumers here:
   `RelatedLinks` (outline + dates), `DetailedGrades` (outline),
   `CertificateStatusAlert` (progress). `CertificateStatusAlert` calls the
   hook at the top of the component — it cannot go inside
   `renderNotPassingCourseEnded`, a nested function — so the link is computed
   on every render instead of in one of four branches; a `find` over a
   handful of tabs, and the same URL. `tabs` leaves the alert's payload,
   memo deps and `propTypes`. `LoadedTabPage` keeps `tabs`: the nav slot
   takes the array, so `getActiveTabTitle(tabs, activeTabSlug)` stays rather
   than a fourth hook for one caller that holds `tabs` anyway. The B3 sites
   (`CourseNonPassing`, `CourseInProgress`, `HiddenAfterDue`) switch when B3
   rewrites their destructures; `widgetConfig.js` keeps `hasDiscussionTab`
   (a widget-lifecycle function, not a component), so the accessors stay
   exported.

7. **A request-count case in every owner page's suite.** Outline, dates,
   progress, discussion, live, `CoursewareContainer` and `CourseExit` each
   gained *requests the course metadata once per load*: wait for
   `queryClient.isFetching()` to be 0, then exactly one GET for the exact
   `course_metadata` URL — #2103's shape. One representative case was
   proposed and rejected in review: the property is per page, since a
   forgotten `{ enabled: false }` in `Day.jsx` shows only on the dates page.
   `CourseAccessErrorPage` is the one owner without a case: its suite mocks
   `useCourseHomeMeta` for every caller. Five helpers created their client
   inline in JSX and now hoist and return it (the change #2103 made to the
   progress helper); `LiveTab` already held it. `CourseExit`'s helper also
   fetches the metadata directly, outside React Query, to seed the store for
   its B3 readers, so it now calls `axiosMock.resetHistory()` before
   rendering — no test in that suite read the history — and the count is of
   what rendering requests. Each case reads one on the unchanged code and
   one after. Negative check, all at once: making `useCourseHomeMeta` ignore
   the option (`enabled: !!courseId`) fails all seven — six read two, the
   courseware page three — and the three `fetches nothing on its own` cases
   in `course-tabs/hooks.test.tsx` read one.

8. **The other suites.**
   - `apiHooks.test.tsx`: *stays idle with no request when disabled* for
     `useCourseHomeMeta`, mirroring the `useProctoringInfoData` case. #2098
     relied on this through `useIsCourseLoaded`; with 31 sites now depending
     on the option it has its own case.
   - `course-tabs/hooks.test.tsx` (new): each hook returns its tab's URL
     from a client seeded at `courseHomeQueryKeys.metadata(courseId)`, and
     *fetches nothing on its own* on an unseeded one — the `useIsCourseLoaded`
     reader cases. Accessor logic stays covered by `utils.test.ts`.
   - `TabPage.test.jsx`: the last case built a second store and dispatched
     `addModel` to feed the `useModel` read; the prop already carries
     `hasAccess: false`, so the store, the dispatch and the import go.
   - `LoadedTabPage.test.jsx`: each case seeds the metadata query on a nested
     `QueryClientProvider` (a `renderWithMetadata` helper; `render` builds
     its own client with no handle), with the factory output camel-cased —
     `normalizeCourseHomeCourseMetadata` is `camelCaseObject` plus
     `isMasquerading`, which the component does not read. Seeding rather
     than mounting an owner because the component throws without data on
     its first render (entry 4). The streak case keeps its store seeding:
     the real modal (#2107) still reads `useModel('courseHomeMeta')` for
     `org`/`username`, a B3 site.
   - `CoursewareSearch.test.jsx`: its `useModel` mock becomes a
     `useCourseHomeMeta` mock returning `{ data: { org } }`, the shape
     `CourseAccessErrorPage.test.jsx` already uses; the suite mocks every
     hook the component calls and has no endpoint handlers, so seeding or an
     owner would have been the file's only real request path. What it no
     longer catches — a forgotten option in `CoursewareSearch.jsx` — the
     seven count cases catch, since `CourseTabsNavigation` renders it on
     every owner page.
   - `InstructorToolbar.test.jsx` passes unchanged: its only alert assertion
     is negative, and the two banner hooks now read an empty query instead
     of the seeded store. The positive path is `OutlineTab.test.jsx` *renders
     page banner on masquerade*, under the owner.
   - **Two cases added for codecov's patch check**, which flagged one line in
     each of two files. `LoadedTabPage.test.jsx` gained *throws when rendered
     before the course metadata has loaded*: an unseeded client, and the
     `AppProvider` error boundary's `logError` call asserted through
     `getLoggingService()` — the `Section.test.tsx` shape from #2083, except
     that the service is read live because `initializeTestStore` reconfigures
     it after module scope. `EnrollmentAlert.test.tsx` is new: the
     component's body had never run in the whole suite, because the outline
     suite's *Enroll now* cases render the private-course alert (which borrows
     `enrollment-alert`'s messages) and `useEnrollmentAlert` needs a private
     outline no fixture provides. Three cases in the `ActiveEnterpriseAlert.test.jsx`
     shape — learner text with the button, staff text without it, and the
     click posting the enrolment and reporting `org_key` from the seeded
     query, which is the value this layer moved. Both files are now fully
     covered by lines; `LoadedTabPage`'s one uncovered branch is the
     pre-existing discount chain.

9. **`CoursewareSearch.jsx` imports two modules named `apiHooks`.** Its own
   `./data/apiHooks` (search results) and course-home's `../data/apiHooks`
   (the metadata hook) sit on adjacent lines. A first scripted pass merged
   the new import into the wrong one; the fix is two imports, which is also
   what a reader needs to see.

10. **Commit type is `refactor:`.** Who reads moves; nothing fetches
    differently; the bridge `meta` stays until B3, so `useModel('courseHomeMeta')`
    keeps working for plugins, and no README documents a B2 file's read.
    Not `refactor!:` — that is B3's, when the bridge entry goes.

11. **The `celebrations` window between B2 and B3 has no visible effect.**
    `LoadedTabPage` now reads `celebrations` from the query, while
    `recordModalClosing` and the first-section writers still write the store
    until B3. After the streak modal closes, the query keeps the fetched
    `streakLengthToCelebrate` until the owner next fetches (the next tab
    navigation, `staleTime` 0). Its two uses in the window are `useToggle`'s
    initial value (no effect after mount) and the prop of a modal that is
    now closed. The `firstSection` writes have no B2 reader.

12. **Left as is: the conditional hook call in `course-start-alert/hooks.js`.**
    `IsStartDateInFuture` is capitalised, so `react-hooks/rules-of-hooks`
    treats it as a component and does not flag `isEnrolled && IsStartDateInFuture(…)`.
    Swapping `useSelector` for `useQuery` inside it changes nothing about
    that: both are hooks, and the hook count flips only if `isEnrolled`
    flips without a remount, which enrolment does not do
    (`enrollment-alert/clickHook.js:28` reloads). A hoist of the `start` read
    into the two callers is a behaviour-preserving cleanup with its own
    review, not a reader conversion.

13. **The `CourseExit` count case renders the celebration body (added after
    review of #2086).** As first written, the case rendered `<CourseExit />`
    with the suite's default metadata, whose `enrollment.is_active` is
    `null`, so `getCourseExitMode` returned `disabled` and the page was a
    redirect with no body. The count was right for that load — `CourseExit`,
    `TabPage`, `LoadedTabPage` and this layer's readers on that page — but the
    course-end bodies, and so every reader B3 (#2086) converts under
    `CourseExit`, were never on the page being counted; B3's negative check
    (a body reader flipped to fetching) still read one. The case now sets an
    active enrolment and a downloadable certificate and asserts
    *Congratulations!* before counting, so the celebration body and its
    readers are part of the load. Folded into this layer rather than B3
    because it corrects the case where it is introduced; nothing B3 does to
    the source changes what the case sees.

</details>

## Manual testing

<details>
<summary>Checklist</summary>

# Manual testing — read `courseHomeMeta` from the query: tab-page, alerts, and course-home tabs (#2085)

In-browser verification against a live backend (tutor dev).

What changed: 31 readers of the course-home metadata that went through the
model store now read the metadata query directly, as disabled observers under
the page that fetches it (`OutlineTab`, `DatesTab`, `ProgressTab`, `LiveTab`,
`DiscussionTab`, `CoursewareContainer`, `CourseExit`, `CourseAccessErrorPage`).
Three progress/outline components take their tab links from new hooks
(`useCourseOutlineUrl`, `useDatesTabUrl`, `useProgressTabUrl`) instead of a
`tabs` array. Nothing fetches differently.

**The two bugs this layer could introduce.** (1) A reader that fetches: a
forgotten `{ enabled: false }` shows up only as a second `course_metadata`
request on that reader's page. (2) A reader that never sees data: a disabled
observer with no owner above it reads `undefined` forever, so its component
sits in its no-data branch without erroring — a header with no course title,
an alert that never appears, a link that never renders. Everything below is
one of those two checks.

## Setup

An ordinary **self-paced** course with graded subsections, a dates tab, a
progress tab, and a verified mode. Two
accounts: an **enrolled learner** and a **staff** user who can masquerade.
For the alert checks, an **unenrolled** learner (or the staff user, not
enrolled) and a course whose **start date is in the future**.

Optional, for the certificate-status alert's *View grades* button: a course
that has **ended** with the learner **not passing** on a **verified**
enrolment.

## Verify by hand

### Request count — one per page (the #2098 protocol)

Hard reload, wait for the Network tab to go idle, count
`/api/course_home/course_metadata/`:

- [x] outline (`/course/:id/home`): **1**
- [x] dates: **1**
- [x] progress: **1**
- skipped — live: not configured on this setup; its count is pinned by
  `LiveTab.test.jsx`
- [x] a courseware unit: **1**
- [x] the course-end page (`/course/:id`, after completing the course or via a
      direct visit as staff): **1**
- [x] outline → courseware crossing: clear the log after the outline is idle,
      click a sequence title, wait for idle: **1**
- [x] client-side navigation across the tabs (outline → dates → progress →
      outline): **1 per navigation**, none extra

### Readers that render on every tab (`TabPage`, `LoadedTabPage`)

On each of outline, dates, progress and a courseware unit:

- [x] the header shows the course org, number and title
- [x] the browser tab title on the course-home tabs is
      `<tab title> | <course title> | <site name>`, where the first segment is
      the LMS title of the tab that claims the page: "Course" on the outline
      (the outline maps to the `courseware` tab), then "Dates", "Progress".
      On a courseware unit `Course.jsx` sets its own title from the breadcrumb
      trail, so this check does not apply there
- [x] the nav highlights the right tab (Course on outline **and** on a
      courseware unit)
- [x] as staff: the instructor toolbar renders, with *View course in Studio*
      when the account has author access
- [x] courseware search (the magnifier in the tab nav) opens and a submitted
      search sends `edx.course.home.courseware_search.submit` with `org_key`
      set (Network tab → the segment/tracking request, or the console with
      analytics logging on)

### Links built from a tab URL (the new hooks)

- [x] progress → *Related links*: the **Dates** and **Course outline** links
      render and go to the right pages
- [x] progress → detailed grades: the *course outline* link in the empty-table
      message renders (a course with no graded scores yet) and goes to the
      outline
- not run — outline, ended course, not passing, verified enrolment: the
      certificate-status alert shows *View grades* and it goes to the
      progress tab

### Outline tab

- [x] course dates widget shows dates in the learner's timezone (set a
      non-UTC timezone in account settings; the dates shift)
- [x] course tools widget renders its links
- not run — proctoring info panel renders when the course has proctored exams
      (otherwise absent, as before)
- [x] start / resume course card renders and the click is tracked with
      `org_key`
- not run — weekly learning goal card renders; saving a goal works
- [x] date summary rows under the outline (upcoming dates) use the timezone
- not run — course-end alert appears on a course ending within the alert window
- not run — scheduled-content alert appears on a self-paced course with scheduled
      (not yet released) content
- not run — private-course alert as an **unenrolled** learner on a private course
- not run — enrollment alert as an unenrolled learner (above the tab nav) — the
      *Enroll now* button enrolls and reloads

### Alerts that depend on `courseHomeMeta` directly

- not run — course-start alert: enrolled learner, course start in the future — the
      *starts on* alert on the outline
- not run — course-start masquerade banner: staff masquerading as a learner on the
      **progress** tab of a not-yet-started course
- not run — access-expiration masquerade banner: staff masquerading as a learner
      whose audit access has expired, on outline and dates (the banner reads
      `userTimezone` from this layer's read and the rest from the tab model)
- not run — active-enterprise alert: `/course/:id/access-denied` for a learner whose
      access code is `incorrect_active_enterprise` (or confirm the page
      renders its alert list for a denied learner)

### Dates tab

- [x] day rows render with the learner's timezone; today/overdue badges as
      before

### Progress tab

- not run — grade summary header renders org-tracked links (the *view grading
      policy* / upgrade links, when shown)
- [x] detailed grades table renders; subsection titles link into the course
- not run — certificate status side panel renders for the enrolment's state
- [x] as staff, `/progress/:otherUserId` shows *Course progress for <user>*

### Streak celebration

- not run — with a pending streak (three consecutive days), the streak modal opens
      once on load; closing it does not reopen it on the next tab navigation

## Results

Run on tutor dev, 2026-09-23. 21 checks run, all passing. 14 checks
marked *not run*: each needs course or account state this environment was not
set up for (proctored exams, a weekly-goal save, a course ending within the
alert window or with scheduled content, an unenrolled learner on a private
course, a future start date, masquerading as an expired or not-yet-started
learner, an `incorrect_active_enterprise` learner, verified/certificate
states, a three-day streak). None of them failed; they were not exercised.
The live tab was skipped as not configured. Both request-count checks and
every reader on the outline, dates, progress, courseware and course-end pages
were confirmed, including `org_key` in the resume-course and courseware-search
tracking events.

## Not covered

- The live tab: not configured on this setup, so not exercised by hand. Its
  once-per-load count is pinned by `LiveTab.test.jsx`, and its B2 readers are
  the shared ones (`TabPage`, `LoadedTabPage`, the alerts) every other tab
  exercises.
- The discussion tab: on this setup the Discussion entry is served by the
  separate discussions MFE, so learning's `DiscussionTab` page is not
  reachable by hand. Its once-per-load count is pinned by
  `DiscussionTab.test.jsx`, and its only B2 readers (`TabPage`,
  `LoadedTabPage`, the alerts) are the ones every other tab exercises.
- Cross-tab reads of the outline model (`useEnrollmentAlert`,
  `useLogistrationAlert` outside the outline tab) — unchanged by this layer.
- B3 sites (courseware, course-exit, streak/celebration modals' own reads).

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

