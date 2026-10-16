Part of #1946 — Redux → React Query migration (Stage 1). Part of the #1977 model-store dissolution ([plan](https://github.com/openedx/frontend-app-learning/issues/1977)) — **Layer B1**. Prerequisite for B2 (#2085) and B3 (#2086); no readers convert here.

**Goal:** stop keying the course-home metadata query by `rootSlug`, so the 53 `courseHomeMeta` readers can read it without naming a variant.

**Context.** `courseHomeQueryKeys.metadata(courseId, rootSlug)` caches the same endpoint twice — under `'outline'` for the course-home tabs and `'courseware'` for the courseware route. `rootSlug` never reaches the request. It changes exactly one field:

```js
// src/course-home/data/api.js
// The API uses "courseware" as a slug for both courseware and the outline tab.
slug: tab.tabId === 'courseware' ? rootSlug : tab.tabId,
```

That field is not server data — it is a pre-resolved answer to the nav's highlight check (`CourseTabLink.tsx:16`, `active: slug === activeTabSlug`). The LMS returns **one** tab entry for a destination learning splits into two pages, and that entry should be highlighted on both, so neither fixed value works and the fetch stamps whichever page asked. React Query keys on *what was requested*, while this field encodes *who was asking* — hence two cache entries for one response, and readers that would have to name a root.

**Tasks**
- `course-home/data/api.js`: drop the `rootSlug` parameter from `getCourseHomeCourseMetadata` and `normalizeCourseHomeCourseMetadata`; emit `slug: tab.tabId`. Keep the field named `slug`.
- `course-home/data/queryKeys.ts`: `metadata(courseId)` loses the parameter; drop the argument at the ten call sites (`OutlineTab`, `DatesTab`, `ProgressTab`, `LiveTab`, `DiscussionTab`, `CourseAccessErrorPage`, `CoursewareContainer`, `redirects`, `useIsCourseLoaded`, `CourseExit`).
- Add an `isActiveTab(tab, activeTabSlug)` predicate carrying the rule, used by `course-tabs/CourseTabLink.tsx:16` and `tab-page/LoadedTabPage.tsx:46`:

```ts
// The LMS returns a single tab for both the course-home page and courseware,
// so it is the active tab on either of them.
const isActiveTab = (tab, activeTabSlug) => (
  tab.slug === 'courseware'
    ? activeTabSlug === 'outline' || activeTabSlug === 'courseware'
    : tab.slug === activeTabSlug
);
```

- Add a `findCourseHomeTab(tabs)` accessor beside it for the two lookups that want the course-home link — `progress-tab/grades/detailed-grades/DetailedGrades.jsx:41` and `progress-tab/related-links/RelatedLinks.jsx:28`, today `find(tab => tab.slug === 'outline')` — so the API quirk lives in one module rather than two components.
- Update `course-home/data/__factories__/courseHomeMetadata.factory.js` and any test asserting on `tabs[].slug`.

**Verify:** the Course tab is highlighted on **both** `/course/:courseId/home` and the courseware route; the Helmet title still carries the tab name on both; the "Course Outline" links on the progress tab still resolve; crossing between courseware and a course-home tab now makes **one** `course_metadata` request instead of two.

> [!NOTE]
> This issue was authored by Claude (Claude Code) and reviewed before posting.

**Findings that shape the task list**

- **Why the parameter exists.** Before PR #861 (2022, "unify source of tabs") the two pages read tabs from *different* endpoints — the courseware metadata endpoint kept the raw `'courseware'` id, and the course-home normalizer rewrote it to `'outline'` unconditionally. #861 pointed both pages at the course-home endpoint, so one normalizer had to serve two pages needing different values, and the hardcoded `'outline'` became `rootSlug` — passed `'outline'` by `fetchTab` and `'courseware'` by `fetchCourse`. That was the cheap choice then: the thunks were *per-page* fetchers, so fetch time and render time were the same moment and every consumer stayed a plain equality check.
- **The duplicate request predates React Query.** Both thunks have called `/api/course_home/course_metadata/:courseId` since #861; React Query only made the two results cacheable separately. Collapsing the key removes the second fetch.
- **The rule beats the stamp.** Rewriting the slug at display time (in `LoadedTabPage`) would also work, but that component would then have to compute "which root am I on", so the `rootSlug` concept survives and every future tab-list reader has to go through that one funnel. Putting the rule in the comparison removes the concept outright.
- **Plugins are unaffected.** `CourseTabsNavigationSlot` passes no `pluginProps`, and `CourseTabLinksSlot` passes only `activeTabSlug` — the tabs array never reaches plugin code. The slot README's example renders its own `<CourseTabLink slug="custom-link" activeTabSlug={…} />`, whose slug never equals `'courseware'`, so it takes the plain-equality branch exactly as today.
- **Unaffected lookups:** `'progress'` / `'dates'` / `'discussion'` (`CertificateStatusAlert`, `CourseInProgress`, `CourseNonPassing`, `HiddenAfterDue`, `widgets/discussions/widgetConfig.js`) and `key={slug}` in `CourseTabLinksList`.
