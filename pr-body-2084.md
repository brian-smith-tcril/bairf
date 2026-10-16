## Summary

`/api/course_home/course_metadata/` sends **one** tab, `courseware`, for a destination this MFE renders as two separate pages: the course outline at `/course/:courseId/home`, and the courseware content routes. The nav decides which tab to highlight by comparing a tab's id against the page you are on, so that single entry has to count as "current" in two different situations.

The data layer used to settle that at fetch time by rewriting the tab's id. `getCourseHomeCourseMetadata` took a `rootSlug` — `'outline'` or `'courseware'`, whichever page was asking — and stamped the shared tab with it, so the nav's plain `===` would match. That made the response depend on its caller rather than on the request, so the query key had to carry `rootSlug` too, and one endpoint ended up cached twice per course. The arrangement dates to a 2020 bug fix rather than a design decision; decision 1 below has the chain, with links.

This removes `rootSlug` and the mapping with it. Tabs carry the id the endpoint sent, `src/course-home/data/` has no opinion about tabs at all, and the two-pages rule moves into `isActiveTab` in `src/course-tabs/utils.ts` — which becomes the only module that names a tab id. **No user-facing change.**

Part of the Redux → React Query migration (#1946, Stage 1), layer B1 of the model-store dissolution (#1977). Closes #2084. Stacked above #2093.

## What changed

- **`course-home/data/api.js`** — `getCourseHomeCourseMetadata(courseId)` and `normalizeCourseHomeCourseMetadata(metadata)` drop the parameter, and the `tabs` mapping is deleted outright rather than reduced to `slug: tab.tabId`. `camelCaseObject` already produces `tabId`, and per the pact contract the endpoint sends only `tab_id`/`title`/`url`, so what remained would have re-spelled one field and filtered nothing. The normalizer now computes only `isMasquerading`.
- **The key and hook** lose the parameter, along with the ten call sites of the hook and one more place that builds the key directly — `useIFrameBehavior`, which invalidates it and so does not appear in a search for the hook.
- **`course-tabs/utils.ts`** exports an accessor per destination returning what callers use — `getCourseOutlineUrl`, `getDatesTabUrl`, `getProgressTabUrl`, `hasDiscussionTab` — over a module-private `getTab`, alongside `isActiveTab` and `getActiveTabTitle`. Every one of the five tab-object callers immediately wrote `const tab = …; const url = tab && tab.url;`, and `widgetConfig.js` only tested truthiness, so no consumer wanted a tab. Eight lookups move onto them; no component outside `course-tabs/` now names a tab field or holds a tab.
- **`CourseTabLink` is untouched.** Its `slug` prop is a documented plugin contract whose domain is wider than LMS tab ids — the slot README has operators passing a name they chose, and `activeTabSlug` is a page name, not a tab id. `CourseTabLinksList` is the single seam.
- **One `TabMetadata` type.** `CourseTabsNavigation`, `CourseTabLinksList` and `CourseTabLinksSlot` each re-declared `{ title, slug, url }`; all three import it now. Mandatory rather than tidying — left alone they declare a field that no longer exists.
- **The tab factory is the safety net.** `useModel('courseHomeMeta')` returns `any` and `useCourseHomeMeta` is typed to only `{ courseAccess }`, so `tsc` cannot catch a missed reader. `tab.factory.js` emitted `slug` *and* a derived `tab_id`, plus `priority`/`type` that this endpoint has never sent — fields the mapping was silently stripping. It now matches the pact, so a consumer left unconverted fails in tests rather than only in production.
- **`discussionsPrefetch` gains the test it never had**, and loses an `edxProvider` local that named a provider check happening one layer down.

## Testing

`npm run types`, `npm run lint` and the full suite (113 suites, 1137 passed, 3 skipped) are green.

Manually verified on tutor dev. The nav highlight is the core of the change and was checked on both root pages, on every other tab, and across the two client-side crossings; the Helmet title, every link built from a tab's url, the discussions prefetch gate, an LMS-hosted tab (Teams), and a slot-inserted `CourseTabLink` all behave as before. Four checks were not run — three expensive course states that are repeat call sites of accessors already confirmed, and console noise — each listed with its reason.

**No request-count change, despite the collapsed key.** Counting `course_metadata` hits across an outline → courseware crossing gives exactly 3 either way, five runs each side with no variance. `useCourseHomeMeta` sets no `staleTime`, so a shared key still refetches for every observer that mounts on a stale entry — collapsing two keys into one turns a cache miss into a stale hit rather than removing a fetch. An earlier draft of this PR claimed the crossing saved a request; that was reasoning from the key alone and the measurement disproved it. Reducing the count is #2098, which this layer makes tractable by leaving one key to tune instead of two.

## Decisions

Working notes for this layer, kept out of the tree:

<details>
<summary>Full decision log</summary>

# Decisions — take tab identity out of the course-home metadata query (#2084)

Layer B1 of the model-store dissolution (#1977). Some entries were settled in the
plan on issue #2084; others landed with the code, and a few correct things the
plan had wrong — notably that no factory change was needed.

1. **The rule moves into the comparison, not back into the data.** `tabs[].slug`
   was never a property of the tab: the LMS returns **one** entry,
   `tabId: 'courseware'`, for a destination this MFE splits into two pages, and
   the normalizer stamped it with whichever page was asking so that the nav's
   `slug === activeTabSlug` check would highlight it. React Query keys on **what
   was requested** while the field encodes **who was asking**, which is what
   produced two cache entries for one response, so the knowledge moves to where
   the question is actually asked.

   **Nobody designed this split.** A page name and a tab id collided, the nav
   silently broke, and the cheapest fix available at the time was to bend the
   payload:

   | when | PR | what happened |
   |---|---|---|
   | 2020-06-15 | [#80](https://github.com/openedx/frontend-app-learning/pull/80) | The outline becomes its own page, routed as `tab="outline"` — a *page* name, not a tab id. |
   | 2020-06-25 | [#93](https://github.com/openedx/frontend-app-learning/pull/93) | `course-home/data/api.js` is created emitting plain `slug: tab.tabId`. From here the Course tab is **not highlighted** on the outline page: it carries `'courseware'`, the page passes `'outline'`, and the nav compares with `===`. |
   | 2020-12-16 | [#281](https://github.com/openedx/frontend-app-learning/pull/281) | Six months later, a 31-file feature PR (+481/−203) building the anonymous/un-enrolled landing page — public-course support, the private-course alert, the anonymous user menu, `requireAuthenticatedUser` removed — notices the dead highlight in passing and fixes it in two lines: `slug: tab.tabId === 'courseware' ? 'outline' : tab.tabId`. Its review thread states the bug outright — ["The "Course" tab wasn't active while in course home because our course metadata calls it "courseware""](https://github.com/openedx/frontend-app-learning/pull/281#discussion_r537750859). |
   | 2022-03-10 | [#861](https://github.com/openedx/frontend-app-learning/pull/861) | Unifying the tab source means one normalizer serves both pages, so the hardcoded `'outline'` becomes the `rootSlug` parameter. |
   | 2026-08-31 | [#2023](https://github.com/openedx/frontend-app-learning/pull/2023) | Converting the fetch to React Query means the queryFn's output varies by `rootSlug`, so it must go in the key — two cache entries for one response. |

   Each step was locally right. #281 chose the two-line fix in a function that
   already knew which page was asking, because `fetchTab` was a *per-page* thunk:
   fetch time and render time were the same moment, so "who is asking" was ambient
   and free, while fixing the comparison meant touching the nav component. It was
   also an incidental correction inside a large feature PR, which is a good part of
   why the approach was never weighed.

   **It cost nothing until caching arrived**, which is why five years passed
   without anyone revisiting it. In December 2020 there was exactly one caller of
   `/api/course_home/course_metadata/`:

   | when | callers of `course_metadata` | why the rewrite was free |
   |---|---|---|
   | 2020-12 ([#281](https://github.com/openedx/frontend-app-learning/pull/281)) | course-home pages only | Courseware took its tabs from `/api/courseware/course/`, which sent `slug: 'courseware'` natively — which is why only the outline's highlight was broken. The rewrite changed the sole consumer of the endpoint. |
   | 2022-01 (`3fe5bb17`, AA-1018 "api refactor") | course-home **and** `fetchCourse` | The courseware thunk adds `getCourseHomeCourseMetadata(courseId)` to its `Promise.allSettled`, so there are two callers. Harmless: courseware's nav still reads the courseware endpoint's tabs, so the hardcoded `'outline'` is never compared there. |
   | 2022-03 ([#861](https://github.com/openedx/frontend-app-learning/pull/861)) | both | The courseware endpoint stops sending tabs, so courseware's nav must use these — and the hardcode breaks *its* highlight, which is what turns `'outline'` into the `rootSlug` parameter. Still free: thunks had no cache, so both callers refetched on every navigation regardless. |
   | 2026-08 ([#2023](https://github.com/openedx/frontend-app-learning/pull/2023)) | both, now through React Query | A cache exists that could serve both callers from one entry. `rootSlug` in the key is exactly what prevents it. **First moment the 2020 decision has a price.** |

   So `rootSlug` never caused an extra request; it varied the shape of requests
   that were already happening. React Query keys on the request, so a per-page
   value inside a per-course response has to be declared in the key — #2023 doing
   the honest thing, and thereby turning a six-year-old shape problem into a
   visible duplicate fetch. It is also the first point at which fixing it properly
   is cheaper than not.

   The name `slug` came from the other endpoint. Both metadata endpoints served
   `get_course_tab_list`, and each named the id differently: course-home sent
   `tab_id`, while `/api/courseware/course/` built its own list and called the
   same value `slug`:

   ```python
   # openedx-platform, CoursewareMeta.tabs, deleted by openedx/openedx-platform#30023
   for priority, tab in enumerate(get_course_tab_list(self.effective_user, self.overview)):
       tabs.append({
           'title': _(title),
           'slug': tab.tab_id,
           'priority': priority,
           'type': tab.type,
           'url': tab.link_func(self.overview, reverse),
       })
   ```

   So `slug` was never a separate concept — it was the courseware API's alias for
   `tab_id`, and `priority` was the `enumerate()` index of a list that already
   arrived in order. Once #861 moved the MFE onto the course-home endpoint, the
   normalizer's `slug: tab.tabId` was reproducing a rename the courseware API had
   been doing server-side, and kept doing it for four years after that API stopped.
   Deleting the mapping is therefore not choosing a new name for the field; it is
   dropping an inherited alias from an endpoint that no longer exists and using
   the one name the surviving endpoint has always used.

2. **Rejected: stamping the slug at display time.** `LoadedTabPage` could rewrite
   the courseware entry before rendering the nav, keeping the comparison a plain
   `===`. That works, but the component then has to compute "which root am I on",
   so the `rootSlug` concept survives, and every future reader of the tab list
   has to go through that one funnel.

3. **The whole tabs mapping goes, not just the parameter.** Dropping `rootSlug`
   alone leaves `tabs.map(tab => ({ slug: tab.tabId, title, url }))`.
   `camelCaseObject` has already produced `tabId`, and per the pact contract the
   endpoint sends only `tab_id`, `title` and `url`, so that map filters nothing
   either — its entire remaining effect is to re-spell one field, which is the
   only reason tab identity is a concern of `course-home/data/` at all. The
   request is `GET /api/course_home/course_metadata/{courseId}?browser_timezone=…`:
   no tab is an input, and the response is identical for every page, so tab
   identity is *content* in the body and never a parameter. `normalizeCourseHome
   CourseMetadata` now computes only `isMasquerading`.

4. **`tabs` is a server-owned nav menu, not a list of this app's pages.** Worth
   stating because it explains why the payload carries URLs at all, and why so few
   accessors are needed. `openedx.course_tab` is an entry-point namespace — any
   installed Django app can register a type — and openedx-platform ships nineteen:

   ```
   ccx  courseware  dates  discussion  edxnotes  external_discussion  external_link
   html_textbooks  instructor  lti_discussion  lti_live  lti_tab  pdf_textbooks
   progress  static_tab  syllabus  teams  textbooks  wiki
   ```

   Four of those are pages this MFE routes. The rest are either LMS-hosted (`wiki`,
   `instructor`, `teams`, `edxnotes`, `syllabus`, the textbook tabs) or carry URLs
   the course author chose — `external_link` and `external_discussion` are
   `LinkTab` subclasses, `static_tab` has an author-chosen slug, and the `lti_*`
   tabs are launch URLs. The MFE could not construct those even in principle, and
   for the four it does own, the LMS is still the authority on whether a tab points
   here or at a legacy page, since that is a server-side rollout decision. Hence
   `url` in the payload, generated by `request.build_absolute_uri(tab.link_func(…))`.

   So the nav's job is `title` → `url` for whatever arrives, and the MFE inspects
   ids only for destinations it deep-links to from elsewhere. That set is exactly
   four, which is why `utils.ts` has four accessors and needs no general lookup.
   It is also why `getActiveTabTitle` must tolerate ids it has never heard of.

5. **A named accessor per destination, returning what callers use.** `getTab`
   stays module-private; `course-tabs/utils.ts` exports `getCourseOutlineUrl`,
   `getDatesTabUrl`, `getProgressTabUrl` and `hasDiscussionTab`. Plain-versus-quirky
   lookups is a fact about the implementation, not about the caller, so splitting
   the call sites on it exposes a distinction no consumer has reason to care
   about. And `'dates'`/`'progress'`/`'discussion'` are the LMS's vocabulary
   appearing as bare literals in six components — the same kind of external
   knowledge these accessors were extracted for. No component outside
   `course-tabs/` now names a tab field or a tab id.

   **They return values, not tabs.** Every one of the five tab-object callers
   immediately wrote `const tab = getXTab(tabs); const url = tab && tab.url;`, and
   `widgetConfig.js` only tested truthiness — so no consumer wanted a tab at all.
   Returning the URL (or a boolean) collapses each of those pairs to one line and
   means a component never holds a tab it has to know the shape of — including
   `getActiveTabTitle`, which returns the Helmet string rather than the tab.
   From a component's point of view "the dates tab" is not a meaningful object;
   the link destination is.

   `get`, not `find`. This repo has no `find*` helpers; the convention outside the
   API modules is `get*` — `getResponseStatus`, `getErrorDetail`,
   `getEnabledWidgets`, `getSidebarId`, `getReadableProctoringStatus`,
   `getAccessDeniedRedirectUrl`. The first two return `| undefined` and are still
   called `get`, so "might not be there" is not a distinction this codebase draws
   in a name. `find` also names the mechanism rather than the result: these would
   read the same if they were ever backed by a lookup map instead of
   `Array.prototype.find`.

   **The Course tab gets a URL accessor, not a tab accessor.** Three names
   disagree about this one nav entry, and containing that in `utils.ts` is worth
   more than naming it consistently at call sites. The LMS's id is `courseware`
   (`CoursewareTab.type`) and its title is **Course** (`CoursewareTab.title =
   gettext_noop('Course')`); this MFE splits it across the outline route
   `/course/:courseId/home` and the content routes `/course/:courseId/:sequenceId/:unitId`;
   and the tab's own `url` points at the outline, which is what the UI calls
   **Course outline** — `courseware/course/sidebar/sidebars/course-outline/`,
   `progress-tab/related-links`, `progress-tab/grades`. Neither `courseware` nor
   `outline` appears in any URL; they are in-app labels for which of the two pages
   is showing, which is what `activeTabSlug` carries.

   So a comment states the disagreement once, immediately above the one export it
   concerns, and that export is `getCourseOutlineUrl(tabs)` — named for where it
   goes. The tab ids stay inline string literals rather than named constants: each
   appears once or twice, the comment already carries the meaning a constant name
   would have gestured at, and `getTab(tabs, 'dates')` says more than
   `getTab(tabs, DATES_TAB_ID)`. Both callers only ever reached for `.url`, so this also collapses
   their `const tab = …; const url = tab && tab.url;` pairs into one line and
   retires `overviewTab`, a local from `edba1600` (2022) that matched nothing: not
   the LMS's id, not the UI's label, not the lookup beside it. An earlier pass named
   the accessor `getCourseOutlineTab`, which was wrong in the other direction — it
   gave a *page* name to the *tab*.

6. **All eight lookups move.** `CourseNonPassing`, `HiddenAfterDue` and
   `CertificateStatusAlert` take `getProgressTabUrl`; `CourseInProgress` and
   `RelatedLinks` take `getDatesTabUrl`; `widgetConfig.js` takes `hasDiscussionTab`;
   `LoadedTabPage` takes `getActiveTabTitle`; and `DetailedGrades` and `RelatedLinks`
   take `getCourseOutlineUrl`. The accessors accept `undefined` because
   `widgetConfig.js` legitimately passes `course?.tabs` before the model has
   loaded.

7. **`isActiveTab` keeps a `slug` parameter and `CourseTabLink` is untouched.**
   It takes a string rather than a tab because `CourseTabLink` passes it a value
   that need not be an LMS tab id: the slot README documents operators rendering
   their own `<CourseTabLink slug="custom-link" …/>`, and `activeTabSlug` is a
   route name — `OutlineTab` passes `'outline'`, which no tab is called. That
   identity's domain is strictly wider than the LMS's tab ids, so it is not a
   renamed `tabId` and does not move with this change. `CourseTabLinksList`'s
   `slug={tabId}` is the single seam, left uncommented: at that line the value is
   always an LMS tab id, since plugin links are rendered by the plugin inside the
   slot and never pass through that map, so a comment there would describe a case
   that cannot occur.

   **Two active-tab exports for one rule, on purpose.** `isActiveTab` has a single
   external caller (`CourseTabLink`), which on its own would argue for inlining it
   there. It stays in `utils.ts` because `getActiveTabTitle` is the rule's second
   consumer: `CourseTabLink` needs it for a CSS class and `LoadedTabPage` for the
   Helmet title, and those are different modules. Inlining into the component would
   leave `getActiveTabTitle` either importing from a component or carrying its own copy
   of the ternary — the duplication the helper was extracted to remove.

   Dropping `getActiveTabTitle` and letting `LoadedTabPage` write
   `tabs?.find(tab => isActiveTab(tab.tabId, activeTabSlug))` was considered. It
   trades two exports for one, but puts a tab field back in a component, which is
   the property the accessors exist to hold. Neither shape is obviously right; this
   one keeps the rule stated once and the field named nowhere outside
   `course-tabs/`.

   Also worth recording: making `isActiveTab` take only a `slug` and read the
   active page from context was rejected. `activeTabSlug` is not derivable where it
   is used — it appears in no URL, and is a hardcoded literal in each of the seven
   page components — and it is threaded for more than the nav (`ProductTours`,
   `InstructorToolbar`, `getAccessDeniedRedirectUrl`, `TabPage`'s tour button), so
   a context would be a second mechanism beside the existing prop rather than a
   replacement. It is also the slot's only `pluginProps`, and the README has
   operators forwarding it into their own `CourseTabLink`. The version of that idea
   worth doing is deriving `activeTabSlug` from the route app-wide — the mapping to
   `DECODE_ROUTES` is 1:1 — which deletes the literals and the threading, and is
   its own change.

8. **One `TabMetadata` type.** `CourseTabsNavigation`, `CourseTabLinksList` and
   `CourseTabLinksSlot` each re-declared `{ title, slug, url }`; all three now
   import `TabMetadata`. This was mandatory rather than tidying — left alone they
   declare a field that no longer exists. `title`/`url` became required, since
   `CourseTabLink` requires `url: string` and the optional form would not compile
   once the type was actually used; nothing depended on it, as `TabMetadata` had no
   importers.

9. **The factory is the safety net, not cleanup.** `useModel('courseHomeMeta')`
   returns `any` — `generic/model-store/hooks.js` is JavaScript — and
   `useCourseHomeMeta` is typed as only `{ courseAccess }`, so **`tsc` cannot
   catch a missed reader**. That makes the fixtures the only thing standing
   between a missed consumer and a silent production break, and the fixtures were
   describing a payload that does not exist.

   `/api/course_home/course_metadata/` has sent exactly `tab_id`, `title` and
   `url` since the endpoint was created
   ([`8a74bbd5fb`](https://github.com/openedx/openedx-platform/commit/8a74bbd5fb46d5e6920931e4378e79ca8a986ac6),
   AA-150, 2020-05-21). `CourseTabSerializer` is the only declaration of that
   shape and has never been modified since. It has never had `priority`, `type`,
   or a tab `slug`. The fixture's extra fields therefore did not drift out of
   date — they were never right for this endpoint:

   | | added | by | accurate then? |
   |---|---|---|---|
   | `tab.factory.js` created under `courseware/`, with `title`/`priority`/`slug`/`type`/`url` | 2020-07 | [#95](https://github.com/openedx/frontend-app-learning/pull/95) | **yes** — the courseware API really sent those |
   | moved to `shared/`, gains `.attr('tab_id', ['slug'], slug => slug)` so one factory serves both endpoints | 2021-03 | [#400](https://github.com/openedx/frontend-app-learning/pull/400) | it now emits the **union**, so correct for neither alone |
   | `tabs` added to `courseHomeMetadata.factory.js`, each build passing `priority`/`slug`/`type` | 2022-03-10 | [#861](https://github.com/openedx/frontend-app-learning/pull/861) | **no** — course-home never sent them |
   | courseware API's `tabs` deleted outright | 2022-03-11 | [openedx-platform#30023](https://github.com/openedx/openedx-platform/pull/30023) | the shape now exists nowhere |
   | remaining duplicate courseware fields deleted | 2022-03-18 | [openedx-platform#30079](https://github.com/openedx/openedx-platform/pull/30079) | |

   #861 and #30023 are the same ticket (AA-1207) a day apart: the MFE stopped
   reading tabs from the courseware API, then the platform removed them. Nothing
   was relocated to course-home — the fields were dropped. So #861 wrote a
   course-home fixture describing the courseware payload in the same commit that
   made that payload irrelevant. The mechanism looks mundane: it reused the
   existing courseware-shaped `tab` factory and passed its usual four-field
   literal, of which only `slug` was load-bearing, as the input `tab_id` derives
   from.

   Because `slug` was declared with `.attrs()` rather than `.option()`, it also
   leaked into the built object — so fixtures carried the very field the deleted
   mapping used to synthesise. A consumer left unconverted would have found
   `slug` in tests and `undefined` in the browser.

   The factory now emits `tab_id`, `title` and `url`, matching both the serializer
   and the pact, and the six `Factory.build('tab', …)` calls in
   `courseHomeMetadata.factory.js` moved with it in one edit — rosie silently
   accepts a stray `slug` override *and* falls back to its default `tab_id`, so a
   partial conversion would have produced six tabs all claiming `courseware`
   without throwing.

10. **Two of the three `rootSlug` tests are deleted, not rewritten.** #2023 added
   them when the convention was introduced: the tab is labelled `courseware`, the
   tab is labelled `outline`, and the query is keyed by rootSlug "so the two
   contexts do not share a cache entry". The first two asserted a data-layer
   opinion about tab ids — exactly what this layer removes — and only compiled
   through a `data as { tabs: … }` cast, so they have no owner once the mapping is
   gone. The third **inverts** into *serves both contexts from one cache entry*,
   asserting both hooks return the same object and that only **one** request was
   made, which pins the removal as the improvement it is.

11. **The pact test's expectation changes; the contract does not.** Its
    `slug: 'outline'` was an assertion about our *normalized* output and becomes
    `tabId: 'courseware'`; the `tab_id: 'courseware'` it asserts against the LMS
    is the actual contract and is untouched.

12. **`useIFrameBehavior`'s invalidation was an eleventh site, beyond the ten hook
    calls.** It builds the key directly —
    `courseHomeQueryKeys.metadata(eventCourseId, 'courseware')` — rather than
    calling the hook, so it does not show up in a search for the hook. Its test
    asserts the same key and moves with it.

13. **`discussionsPrefetch` got the only new test of a pre-existing path.**
    Nothing exercised it: every test calls `prefetchDiscussionTopics` directly,
    bypassing the tab gate, and the only test that renders the provider supplies
    `{ tabs: [] }`. With no type coverage on that path either, a mistake there
    would have been invisible — CI green, discussion-topic prefetching silently
    dead. It is the one site in this change where that was true.

    Its `edxProvider` local was dropped rather than renamed, because the name made
    a claim the line never checked. `DiscussionTab.is_enabled`
    (`lms/djangoapps/discussion/plugins.py`) returns `False` when
    `DiscussionLtiCourseTab` is enabled, so the `discussion` tab's presence means
    discussions are enabled and **not** LTI-provided — it says nothing about which
    provider. `openedx` and `legacy` both produce this tab; `prefetchDiscussionTopics`
    makes that distinction itself, one layer down (*"Only load topics for the openedx
    provider, the legacy provider uses the xblock"*). Authoring's vocabulary agrees:
    provider ids are `openedx`, `legacy`, or an LTI app, and `AppList.jsx` draws the
    line as `!['openedx', 'legacy'].includes(activeAppId)`. So `hasDiscussionTab(course?.tabs)`
    inlined into the condition states the real gate, and "edx provider" appears
    nowhere.

    A plugin could in principle render a nav entry of its own with a `discussion`
    slug, which would not make this prefetch fire: the gate reads `course.tabs` from
    the metadata payload, and a slot-inserted link never enters that array.

14. **The accessors take `tabs`, not `courseId`, and the hook façade waits for
    B2.** The destination is components that never handle a tab list at all —
    `const progressTabUrl = useProgressTabUrl();` — following the zero-argument
    pattern already established by `useProgressData()` and `useExamsData()` in
    `course-home/progress-tab/hooks.jsx`, which take `courseId` from `useParams()`.
    That is recorded on #2085; the hooks are thin wrappers over these accessors,
    so nothing here is throwaway.

    The suffix is load-bearing: `useDatesTabData`, `useOutlineTabData`,
    `useLiveTabData` and `useProgressTabData` already exist for the tab *content*
    endpoints, so a bare `useProgressTab()` would sit next to `useProgressTabData()`
    returning something entirely different. Naming each hook for what it returns
    keeps them apart: `Data` is what the tab shows, `Url` is a link to it. An
    earlier draft used a `Meta` suffix, from when the accessors returned tab
    objects; they return URLs, so the hooks follow.

    It waits because the source is still moving. Five of the six tab readers
    destructure `tabs` in the same `useModel('courseHomeMeta', courseId)` call as
    `org`, `title` or `verifiedMode`, so converting tabs alone would leave a
    component reading one payload through two mechanisms — the query for tabs, the
    store for the rest. B2 and B3 rewrite those destructures wholesale, which is
    where the hooks cost nothing extra. It is a coherence constraint rather than a
    technical one: the bridge keeps both paths valid, so a hook built now would
    return correct values.

    A `tabs` parameter is also the shape that survives either way.
    `widgets/discussions/widgetConfig.js` keeps calling `hasDiscussionTab` directly
    and permanently — `discussionsPrefetch({ courseId, course, queryClient })` is a
    widget-lifecycle function, not a component, and cannot call a hook.

15. **`CertificateStatusAlert`'s PropTypes were wrong in both directions.** They
    documented `tab_id` while the runtime objects carried `slug`; the camelCased
    field is `tabId`, so the fix is not a consequence of this change so much as a
    thing it made visible.

## What actually changes in the payload

The complete cross-product of what the API sends and what each caller asked for.
One cell moves:

| `tab_id` (from the API) | `rootSlug` (from the caller) | field before | field now |
|---|---|---|---|
| `courseware` | `outline` — the five course-home tabs, `CourseAccessErrorPage` | `slug: `**`outline`** | `tabId: `**`courseware`** |
| `courseware` | `courseware` — `CoursewareContainer`, `CourseExit`, `redirects`, `useIsCourseLoaded` | `slug: courseware` | `tabId: courseware` |
| `dates`, `progress`, `discussion`, `wiki`, `instructor`, `lti_live` | `outline` | `slug: ` same as `tab_id` | `tabId: ` same as `tab_id` |
| `dates`, `progress`, `discussion`, `wiki`, `instructor`, `lti_live` | `courseware` | `slug: ` same as `tab_id` | `tabId: ` same as `tab_id` |

Rows 2–4 were already identity: `rootSlug` was consulted only for the
`courseware` tab, and only on a course-home page did it produce a value
different from `tab_id`. So the old ternary did nothing at all on courseware
routes — it replaced `'courseware'` with `'courseware'`.

That single relabelling existed to make one comparison work. The courseware tab
is the nav entry for both root pages, and consumers asked "is this the page I am
on?" with `slug === activeTabSlug`, which cannot express "active on either of
two pages". Pre-stamping the payload per fetch made the plain equality true.
`isActiveTab` states the same fact directly, so the payload no longer has to
carry it — and once the payload is page-independent, one cache entry serves both
contexts:

| page | before: `slug` vs `activeTabSlug` | after: `isActiveTab('courseware', activeTabSlug)` |
|---|---|---|
| outline | `outline` = `outline` → active | `activeTabSlug === 'outline'` → active |
| courseware | `courseware` = `courseware` → active | `activeTabSlug === 'courseware'` → active |
| dates / progress / discussion / live | `outline` ≠ `dates` … → inactive | neither branch matches → inactive |

## Behaviour changes

- **One cache entry per course instead of two**, verified by the inverted test in
  `apiHooks.test.tsx`: both contexts return the same object and one controlled
  render makes one request.

  **This does not reduce requests in the browser, and the layer should not claim
  it does.** Measured in tutor dev on the outline → courseware crossing (clear the
  network log once the outline settles, click a sequence title, wait for idle,
  count `course_metadata`): **exactly 3, five runs each, on this layer and on
  #2093** — no variance either side. An earlier draft claimed "two requests become
  one"; that was reasoning from the key alone, and it is wrong.

  The reason is `staleTime`. `useCourseHomeMeta` sets none, so the entry is stale
  the moment it lands and `refetchOnMount` fires for each fetching observer that mounts
  after the owner's fetch has settled. Collapsing two keys into one turns a cache
  *miss* into a stale *hit*; it does not remove a fetch. Whether that changes what
  blocks `useIsCourseLoaded` was not measured. An earlier version of this entry
  attributed the three requests to `CoursewareContainer`, `useIsCourseLoaded` and
  `redirects` around a remount across the redirect; #2098 traced them and found no
  remount, those three deduped in one render, and the extra two coming from
  `UnitNavigation` and `UnitNavigationEffortEstimate` through `useSequenceIds`.

  The tab bar is not a client-side path at all: `CourseTabLink` renders a plain
  `<a href>`, so every tab click is a full page load that discards the cache. The
  only crossings that reuse it are a sequence title on the outline (`SequenceTitle`
  renders a router `Link` into courseware) and the home breadcrumb in courseware
  (`CourseBreadcrumbs` links to `/home`).

  Reducing the count is a `staleTime` question rather than a key question, and this
  layer makes it tractable by leaving one key to tune instead of two.
- **Tabs carry the ids the LMS sent** wherever the payload is read, including the
  `courseHomeMeta` model the bridge still writes until #1999. The bridge is a
  passthrough (`model: { id: courseId, ...data }`) and needed no change.
- **No re-render change.** `camelCaseObject` already deep-clones per fetch and
  `useModel` compares `tabs` by reference, so that reference was new on every
  fetch with or without the mapping. Deleting it removes one array allocation.
- **Fields the endpoint adds in future now reach consumers.** The mapping was the
  only allowlist on a tab; `...data` already passed every other field of the
  payload through unfiltered, so this makes tabs consistent with the rest.

Plugins are unaffected: `CourseTabsNavigationSlot` passes no `pluginProps` and
`CourseTabLinksSlot` passes only `activeTabSlug`, so the tabs array never reaches
plugin code.

## Left alone

- **`generic/tabs/Tabs.jsx`** drops `className`/`style` when cloning
  `CourseTabLink` for the overflow menu, so tab overflow does not work. Pre-dates
  this work; touching `CourseTabLink` here was tempting and declined.
- **The stale `tabs` block in the generated `src/pacts/frontend-app-learning-lms.json`**
  under the courseware interaction, carrying the old `slug`/`priority`/`type`
  shape. Unasserted by any test since [#861](https://github.com/openedx/frontend-app-learning/pull/861),
  and describing a response the platform deleted in
  [openedx-platform#30023](https://github.com/openedx/openedx-platform/pull/30023).
  openedx-platform's own `courseware_api/tests/pacts/` fixture carries the same
  fossil, so fixing it properly is a two-repo change.

- **`tab.factory.js`'s home in `src/shared/`.** It was moved there by
  [#400](https://github.com/openedx/frontend-app-learning/pull/400) to serve both
  the courseware and course-home fixtures — and the same commit deleted the
  courseware factory's `tabs` attribute, so it has had exactly one consumer from
  the moment it became "shared". Moving it under
  `course-home/data/__factories__/` would finish the thought, but it is churn this
  layer does not need.

</details>

## Manual testing

<details>
<summary>Checklist</summary>

# Manual testing — take tab identity out of the course-home metadata query (#2084)

In-browser verification against a live backend (tutor dev). The claim is **no
user-visible change at all** — including request counts, which were measured and are
unchanged (see below). Earlier drafts of this doc claimed the layer saved a request;
that was wrong.

Worth knowing while testing: the **tab bar is not** a client-side path.
`CourseTabLink` renders a plain `<a href>` with a server-supplied absolute URL, so
every tab click is a full page load that discards the cache. The two client-side
crossings are a **sequence title on the outline** (`SequenceTitle` renders a router
`Link` into courseware) and the **home breadcrumb in courseware**
(`CourseBreadcrumbs` links back to `/home`).

Two things are specific to this layer and carry the most risk:

- **the nav highlight** is the whole point of the change. `isActiveTab` replaces a
  payload that was pre-stamped per page, so the Course tab being lit on *both* root
  pages — and not lit anywhere else — is the check that matters most;
- **every deep link built from a tab's `url`** now comes from an accessor rather
  than an inline `find`. Those are spread across five components and several are
  only reachable in awkward course states, so they are listed individually below.

Nothing here is type-checked: `useModel('courseHomeMeta')` returns `any`, so a
missed reader compiles and passes CI. The fixtures were corrected for that reason,
but a live click is the only real proof.

## Setup

An ordinary course is enough for most of it — one with **dates**, **progress** and
**discussion** tabs enabled, plus at least one LMS-hosted tab (**wiki** or
**instructor** as staff) to confirm entries this MFE does not route still render.

Harder states, each needed by exactly one check:

- **Hidden-after-due link** — a subsection with "hide after due date" set and a due
  date in the past.
- **Certificate not-passing alert** — a course that has ended where the learner has
  a failing grade, in a verified-style mode.
- **Course exit pages** — `/course/:courseId/course-end`, reachable by completing
  the course (in progress vs non-passing give different buttons).

## Verify by hand

### The nav highlight (the core of this layer)

- [x] **Course tab is highlighted on the outline** — `/course/:courseId/home`.
- [x] **Course tab is highlighted on courseware** — any unit page. Before this
      layer these were two different cache entries stamped with different values;
      now one entry serves both and `isActiveTab` does the work.
- [x] **Course tab is *not* highlighted on other tabs** — dates, progress,
      discussion, live. Only the tab you are on is lit.
- [x] **Each other tab highlights on its own page** — dates on dates, progress on
      progress, and so on.
- [x] **The highlight is correct after client-side navigation** — from the outline,
      click a **sequence title** to enter courseware, then the **home breadcrumb**
      back. The nav unmounts and reappears each way (`TabPage` shows a loading state
      while the courseware queries resolve), so this is not a continuity check: it is
      that the Course tab is highlighted once each page settles. These are the only
      two transitions that reuse the cache, so they are the only ones where a stale
      cached value could show through.

### The page title

- [x] **Helmet title carries the tab name** on the outline and on courseware
      (both should read "Course | …"), and on dates/progress ("Dates | …").
      This is `getActiveTabTitle`, which now returns the string rather than the tab.

### Request count — measured, no difference

Protocol: hard reload the outline, wait for the Network tab to go idle, clear the
log, click a **sequence title**, wait for idle again, count `course_metadata`. The
last wait matters — cutting it short undercounts, which is what produced some
inconsistent early readings.

Result: **exactly 3, five runs each, on this layer and on `4750d1fc` (#2093)**. No
variance on either side. Three hits because fetching observers under
`CoursewareContainer` mount after its fetch has settled and refetch the stale entry.
#2098 traced the extra two to `UnitNavigation` and `UnitNavigationEffortEstimate`,
through `useSequenceIds`; there is no remount across the redirect.

- [x] **No measurable change in request count.** The layer does not reduce requests
      and should not claim to. `useCourseHomeMeta` sets no `staleTime`, so a shared
      key still refetches for every observer that mounts on a stale entry;
      collapsing two keys into one turns a cache miss into a stale hit rather than
      removing a fetch.
Not worth checking: whether the crossing feels faster. `TabPage` gates on
`useIsCourseLoaded`, which requires `useCoursewareMetadata`, `useCoursewareOutline`
**and** `useCourseHomeMeta` to succeed. This layer turns the third from a cache miss
into a stale hit, so it stops holding the spinner — but the first two are misses on
that crossing regardless, since the outline page never fetches them. One fewer
blocker out of three, where the other two still block, is not observable.

### Links built from a tab's url

- [x] **Progress tab → "Course outline"** in Related Links resolves to
      `/course/:courseId/home`. (`getCourseOutlineUrl`)
- [x] **Progress tab → "Dates"** in Related Links resolves to the dates tab.
      (`getDatesTabUrl`)
- [x] **Progress tab → "Course outline" link in the ungraded note** — the line
      reading *"For progress on ungraded aspects of the course, view your Course
      outline."* below the grades table; its inline link resolves. Renders only when
      `showUngradedAssignments()` is false. (`getCourseOutlineUrl` in
      `DetailedGrades`)
- [x] **Hidden-after-due alert → "progress page"** link resolves to the progress
      tab. (`getProgressTabUrl`) — **the one worth setting up**, because it is the
      only live check of `getProgressTabUrl` and the cheapest state to reach. Set it
      up entirely in the authoring MFE: **Course outline → subsection → Configure →
      Visibility**, middle radio option. On an **instructor-paced** course that reads
      "Hide content after due date" and needs a subsection **due date in the past**
      (Basic tab of the same modal); on a self-paced one it reads "Hide content after
      end date" and keys off the course end date instead. View as a **learner** —
      staff bypass the check entirely, and masquerading as a *specific* student
      deliberately shows the content with a banner rather than hiding it, so use the
      generic Learner role or a real learner account.

      If the alert does not appear, check `is_hidden_after_due` in the
      `/api/courseware/sequence/<usage key>` response — that is exactly what
      `Sequence.jsx:161` branches on, and `false` means the course config is not
      taking effect rather than the MFE being wrong.

Deliberately skipped — each is a repeat call site of an accessor already confirmed
above, in a state that costs a lot to reach. With the hidden-after-due check done,
every accessor has a live confirmation: `getCourseOutlineUrl` and `getDatesTabUrl`
from Related Links, `getProgressTabUrl` from the hidden-after-due alert.

- [ ] ~~Certificate not-passing alert → "view grades"~~ (`getProgressTabUrl`) —
      needs enrolled + a verified-family enrollment mode + course ended + not passing
      + no alerting cert status. *Not run.*
- [ ] ~~Course exit (in progress) → "view course schedule"~~ (`getDatesTabUrl`) —
      needs `hasScheduledContent && !userHasPassingGrade` and the course-end page.
      *Not run.*
- [ ] ~~Course exit (non-passing) → "view grades"~~ (`getProgressTabUrl`) — needs
      `isEligibleForCertificate && !userHasPassingGrade && canImmediatelyViewCertificate`.
      *Not run.*

### Discussions

- [x] **Discussion topics still prefetch** — with `DISCUSSIONS_MFE_BASE_URL` set
      and the course using built-in discussions, open a unit and confirm the
      discussions sidebar works as before. This gate lost its `edxProvider` local
      and is now `hasDiscussionTab(course?.tabs)`; it had no test at all before
      this layer, so a live check is worth more here than elsewhere.
- [x] **A course with discussions disabled** still loads units with no errors and
      no discussion topics request.

### Tabs this MFE does not route

- [x] **LMS-hosted tabs still render and navigate** — checked with **Teams**.
      Clicking it leaves the MFE entirely for the LMS teams page, which renders its
      own tab bar matching the one the MFE shows, and every tab there navigates to
      the right place.

      Stronger than the check was aiming for: both sides render from the same
      `get_course_tab_list`, so matching tab sets and working links confirm the URLs
      round-trip correctly rather than only that ours render. Teams also exercises
      `getActiveTabTitle` tolerating an id this MFE has never heard of.

      (Teams is the easiest subject — `TeamsTab` is an `EnrolledTab` with
      `view_name = "teams_dashboard"`, so it reverses to an LMS route and needs no
      staff account. Wiki or instructor work too.)

### Plugin links

- [x] **A slot-inserted `CourseTabLink` still renders and highlights as coded.**
      Checked with a temporary `env.config.jsx` inserting links into
      `org.openedx.frontend.learning.course_tab_links.v1`. They render in the nav,
      the real tabs are unaffected, and `activeTabSlug` reaches the widget as before.
      This layer changes nothing about the slot's props or `CourseTabLink`.

### General

- [ ] **No new console noise** on any of the above. *Not run — the MFE is noisy
      enough at baseline that a small addition would not be distinguishable without
      a before/after capture, which was not worth setting up for this layer.*

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
