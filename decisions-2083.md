# Decisions — dates and outline tab reads onto their queries (#2083)

Layer A of the model-store dissolution (#1977). Entries 1, 2, 4 and 5 were
settled in the plan (issue #1977 body); the rest landed with the code.

1. **Readers take the query result with a `?? {}` default, keeping each
   reader's existing shape.** `useModel` returns `{}` for a missing model while
   a pending query returns `undefined`, and every reader destructures straight
   off the result, so each converted site reads
   `useOutlineTabData(courseId, { enabled: false }).data ?? {}` (or the dates
   equivalent; see entry 3 for the second argument). Because `{}` is what
   `useModel` already returned, preserving the destructure preserves the
   behaviour exactly — including the no-data case, which these readers handle
   inconsistently and always have:

   | reader | destructure | no data, before **and** after |
   |---|---|---|
   | `CourseHandouts` | single-level | renders `null` |
   | `CourseTools` | single-level | throws at `courseTools.length` |
   | `WelcomeMessage` | single-level | throws in the `useMemo` |
   | `CourseDates` | nested | throws at the destructure |
   | `StartOrResumeCourseCard` | nested | throws at the destructure |

   Four of the five throw, each somewhere slightly different, and that variety
   predates this work; the conversion inherits it rather than tidying it. The
   only readers that could not keep their shape are the two `.tsx` ones, because
   `data ?? {}` widens to `OutlineTabData | {}`, which TypeScript refuses to
   destructure — see entry 10 for what that cost and how `Section` restores it.

2. **The two cross-tab alert hooks disable the query instead of getting their
   own hook.** `useEnrollmentAlert` and `useLogistrationAlert` are called by
   `LoadedTabPage`, so they run on *every* tab, but they read the outline
   model, which only the outline tab fetches. Fetching there would fire the
   outline request on every tab, so they call
   `useOutlineTabData(courseId, { enabled: false })`: a disabled query still
   subscribes to the cache entry and returns whatever is there — faithful to
   today's "empty until the learner has visited the outline tab" behavior, and
   reactive, unlike `queryClient.getQueryData`. This started as a second
   exported hook, `useCachedOutlineTabData`, which was rejected in review: every
   other query read in these modules is named for the data it returns, never for
   fetch mechanics, and `useProctoringInfoData` already establishes a
   conditionally-run query as this module's idiom (`ProductTours.jsx` passes
   `outlineTabActive`). It is spelled as an options object rather than
   `useProctoringInfoData`'s positional flag because these call sites pass a
   literal: a bare `false` says nothing at the call site, while
   `{ enabled: false }` is React Query's own vocabulary and needs no comment.

3. **In-tab readers pass `enabled: false`; the tab owns the fetch.** Converting
   the readers turned twelve outline components into observers of a query that
   previously had one — and because `TabPage` renders children only once the
   query resolves, they all mount *after* the fetch settles, hit the default
   `staleTime: 0`, and refetch on mount. That made the outline tab issue **two**
   GETs to `/api/course_home/outline/` per load instead of one, and the dates
   tab likewise once `Timeline` and `UpgradeToCompleteAlert` became observers.
   The readers therefore pass `{ enabled: false }`, so they subscribe to the
   cache entry the tab fetched without fetching again; the tab's own query keeps
   its default behaviour, so refetch-on-remount is unchanged.

   Rejected: `staleTime` on the tab query, the shape the courseware sidebar uses
   (`staleTime: Infinity` on `useCourseOutlineStructure`, added in #2064
   alongside `useCheckBlockCompletion`'s `setQueryData`). It doesn't transfer
   here for two reasons. First, three writers of this payload are
   fire-and-forget — `useDismissWelcomeMessage`, `useSaveWeeklyLearningGoal` and
   `useRequestCert` all render their immediate feedback from local component
   state and never touch the cache, so they depend on refetch-on-mount to
   resync; the sidebar's one writer had to maintain the cache anyway, because
   the cache *is* its render source. Second, and not fixable by writer
   discipline: the outline payload also changes without the app doing anything —
   certificate generation completing server-side, instructor edits, deadlines
   shifted elsewhere — so "only invalidation should refetch" is not a true
   statement about this data the way it is about course structure. The fully
   idiomatic answer is optimistic updates with the cache as the single render
   source for those three widgets; that is a rewrite of the widgets, not a
   reader conversion, so it stays out of this layer.

4. **`ShiftDatesAlert` / `UpgradeToShiftDatesAlert` take their data as props.**
   Both were keyed off a `model` prop (`"outline"` from `OutlineTab`, `"dates"`
   from `DatesTab`) which selected the model to read. Their parents own the
   query, so they now pass `datesBannerInfo` and `hasEnded` down. Reading the
   query inside the alert instead would mean calling both tab hooks
   unconditionally and picking one — firing both requests on both tabs.

5. **`ShiftDatesAlert` keeps its `model` prop; `UpgradeToShiftDatesAlert` drops
   it.** `model` is not only a data selector in `ShiftDatesAlert`: it is also a
   request parameter, reaching `postCourseDeadlines` as
   `research_event_data: { location: '<model>-tab' }`. `UpgradeToShiftDatesAlert`
   used it only to pick the model, so the prop goes.

6. **The `dates` and `outline` bridge `meta` entries stay — the plan was wrong
   to drop them here.** `useAccessExpirationMasqueradeBanner` reads
   `useModel(tab, courseId)` with a *dynamic* tab slug, so it resolves to the
   outline or dates model even though no literal `useModel('outline')` remains.
   Removing the `meta` broke `OutlineTab.test.jsx`'s "renders page banner on
   masquerade". This is exactly the scoped one-reader bridge the progress tab
   kept in #1998, and all three entries drop together in #1999 (layer E). The
   `meta` lines carry a comment naming that reader.

7. **`UpgradeToCompleteAlert` reads the dates query directly.** It is the
   default child of the `org.openedx.frontend.learning.banner_dates_upgrade.v1`
   slot, which `DatesTab` is the only renderer of, so the dates query is already
   loaded where it renders — no prop threading, no new request. The slot's
   `pluginProps` (`courseId`, `logUpgradeLinkClick`) are unchanged.

8. **`usePrivateCourseAlert` reads `.data` with no `?? {}`.** Unlike the other
   readers it puts the whole outline object into a `useMemo` dependency array.
   `useModel` returned a referentially stable `{}` for a missing model, but
   `?? {}` would allocate a fresh object every render and bust the memo while
   the query is pending. `undefined` is stable, and the hook's existing
   `outline && outline.courseBlocks` guards already treat it exactly like `{}`.

9. **`useOutlineTabData` is typed to what its TypeScript readers take, and all
   of it is optional.** Following `useCourseHomeMeta`'s precedent, the generic
   names only `courseBlocks.sequences` (`Section.tsx`) and `userTimezone`
   (`SequenceDueDate.tsx`); the sequence shape is `OutlineSequence`, shared with
   the components `Section` passes it to (entry 12). Every field is optional
   because `getOutlineTabData` returns `{}` on a 403 — the access-denied branch
   — so a required `courseBlocks` made the `queryFn` unassignable.

10. **The two TypeScript readers use optional chaining instead of `?? {}`, and
    `Section` guards.** `data ?? {}` widens to `OutlineTabData | {}`, which
    TypeScript will not let you destructure, so `Section` reads
    `data?.courseBlocks?.sequences` and `SequenceDueDate` reads
    `data?.userTimezone` — a single value, so property access rather than
    destructuring.

    `Section` then guards on the result, after its hooks, and **throws**:

    ```ts
    if (!sequences) {
      throw new Error(`Section "${title}" rendered without outline data for ${courseId}`);
    }
    ```

    An earlier version defaulted to `?? {}`, which type-checked but changed the
    failure mode: previously the nested destructure
    (`courseBlocks: { sequences }`) threw a `TypeError` in `Section` the moment
    the model was empty, whereas an empty map instead yields `undefined` from
    `sequences[sequenceId]` and throws one component deeper, inside
    `SequenceLink`'s destructure — or renders an empty section and throws
    nowhere, if `sequenceIds` is empty. TypeScript would not have caught either,
    because index access on a `Record` is typed as present without
    `noUncheckedIndexedAccess`.

    Dropping the default makes the type `Record<…> | undefined`, so the compiler
    forces the case to be handled *here*, and the guard restores the original
    behaviour — same component, same loudness, a message that names the section
    and course instead of "Cannot destructure property 'sequences' of
    undefined". `SequenceDueDate` needs no guard: `userTimezone` is genuinely
    optional and its callers already treat it that way.

11. **The outline type stays partial, with an index signature.** `OutlineTabData`
    names only the fields this repo's TypeScript readers need and adds
    `[key: string]: unknown`. Without the index signature the generic would
    *narrow a plugin-facing surface*: plugins import these hooks from
    `@src/course-home/data/apiHooks`, so closing the shape would make
    `data.welcomeMessageHtml` a compile error for a TypeScript plugin even
    though the endpoint returns it — and #1977 removes `useModel`, the untyped
    escape hatch they have today. Writing out the full endpoint shape was
    rejected for now: it belongs to openedx-platform, and a copy here would
    drift. When the platform ships types we can import, this is what they
    replace. The same question returns, larger, when B2/B3 convert the 53
    `courseHomeMeta` readers against `useCourseHomeMeta`'s equally narrow
    generic.

12. **The sequence shape is shared, and lives on the data side.** It was
    duplicated: `SequenceLink` declared the six fields it renders inline, and
    `SequenceTitle` typed the same object as `object`. `OutlineSequence` is now
    exported from `apiHooks.ts` and imported by both, so the dependency runs
    component → data rather than the type being derived from a consumer. Typing
    `SequenceTitle` surfaced two more fields it needs: it passes the sequence to
    `EffortEstimate`, which reads `effortActivities` / `effortTime`. Those are
    optional (the API omits them) — and note these exist on the *course-home*
    outline normalizer, unlike the identically-named courseware one, which is
    why `UnitNavigationEffortEstimate` is the unreachable case in D2.

13. **`useOutlineTabData` takes `string | undefined` and gates on `enabled` —
    the established convention, not a new call.** #2009/#2010 settled this as a
    migration-wide convention when `CoursewareContainer` became the first `.tsx`
    caller of these hooks: *hooks* take `string | undefined` with
    `enabled: !!courseId`, *key factories* stay strict `string`, and the seam is
    a `!` at the key call inside the hook — deliberate, because `queryKey` is
    evaluated eagerly whether or not the query is enabled, so the factory is
    called even when disabled. The `!` is purely type-level; the adjacent
    `enabled` guard is what makes the absent-id case safe at runtime. The point
    of picking it was to stop casts and guards proliferating at call sites as
    each `.tsx` conversion hits the same `useParams()` typing.

    `Section.tsx` and `SequenceDueDate.tsx` are this layer's first typed callers
    and are why the outline hook widened; `useDatesTabData` has no `.tsx` caller
    yet and so keeps `string`. The two guards compose as
    `enabled: enabled && !!courseId` — an AND, so a caller can further restrict
    the query but never relax the id guard. Reviewed again here and kept:
    asserting at the two call sites, or adding a guarding `useCourseId()` hook,
    are both the shape the convention exists to prevent.

14. **`useProctoringInfoData` standardised on the same options object.** It was
    the one hook here taking a positional `enabled` flag, and this layer makes
    two more hooks take one, so leaving it would have created exactly the
    inconsistency the options object was chosen to avoid. Out of scope for a
    reader conversion, strictly — but it is a signature change plus one call
    site (`ProductTours.jsx`, which now reads
    `{ enabled: outlineTabActive }`) and one test, and all three of its call
    sites get visited by B2/B3 anyway, so doing it here costs less than
    recording it as a follow-up.
