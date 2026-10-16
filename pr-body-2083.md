## Summary

The dates and outline tabs have been query-backed since #1984 and #1991, but their readers still went through the model store that the bridge mirrors those queries into. This moves seventeen reads onto the queries directly. **No user-facing change** — every reader keeps its existing shape, so each one's behaviour, including its handling of missing data, is inherited exactly.

One thing does improve: readers subscribe with `enabled: false`, leaving the tab as the only fetcher, so each tab now issues **one** request for its own data instead of two. Part of the Redux → React Query migration (#1946, Stage 1) and the first layer of the model-store dissolution (#1977). Closes #2083. Stacked above #2091.

## What changed

- Seventeen `useModel('dates' | 'outline', courseId)` reads become `useDatesTabData(courseId).data` / `useOutlineTabData(courseId).data`, with a `?? {}` default where the reader destructures, since `useModel` returned `{}` for a missing model.
- Readers pass `{ enabled: false }`. Without it each observes a query that has already resolved by the time it mounts — `TabPage` renders children only once it has — and refetches at the default `staleTime` of 0, which made every tab load fetch its own data twice.
- `useEnrollmentAlert` and `useLogistrationAlert` are called by `LoadedTabPage`, so they run on every tab while only the outline tab fetches that data. They read the cache entry the outline tab fills rather than fetching, the way `useProctoringInfoData` already takes an `enabled` argument.
- `ShiftDatesAlert` and `UpgradeToShiftDatesAlert` selected their model with a `model` prop, so their parents now pass `datesBannerInfo` and `hasEnded` instead. `ShiftDatesAlert` keeps `model` — it is also a request parameter, reaching `postCourseDeadlines` as the reset-deadlines research event location. `UpgradeToShiftDatesAlert` used it only to pick the model, so it drops the prop along with `useParams`.
- `useOutlineTabData` gains a partial type for what its TypeScript readers take, with an index signature so plugins importing the hook are not limited to that list — the full shape is openedx-platform's to describe, and a copy here would drift. The sequence shape is exported as `OutlineSequence` and now types `SequenceLink` and `SequenceTitle`, which had declared it inline and as `object`.
- `Section` guards rather than defaulting. TypeScript will not destructure `OutlineTabData | {}`, so that reader had to be rewritten; dropping the default and throwing keeps the failure in the same component it was in before, with a message naming the section and course.
- `useProctoringInfoData` moves to the same options object, so all three hooks that take an `enabled` argument spell it the same way.
- The bridge keeps mirroring both queries. The access-expiration masquerade banner reads `useModel(tab, courseId)` with a dynamic tab slug, the scoped one-reader bridge the progress tab kept in #1998; all three entries drop together in #1999.

## Testing

`npm run types`, `npm run lint` and the full suite (109 suites, 1112 passed, 3 skipped) are green.

Manually verified on tutor dev. Both request-shape claims were checked directly, being the ones only a browser could confirm: no `course_home/outline` request on a unit page or the dates and progress tabs, and exactly one request per tab on outline and dates where there were two before. The section outline, course dates widget, course tools, start/resume card and dates timeline all render as before, as do the suggested-schedule banners, and the logistration alert still appears for a logged-out learner on a private course. Eight checks were not run for want of the course state they need — each is listed in the checklist with the reason — and rest on the automated suites.

## Decisions

Working notes for this layer, kept out of the tree:

<details>
<summary>Full decision log</summary>

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

</details>

## Manual testing

<details>
<summary>Checklist</summary>

# Manual testing — dates and outline tab reads onto their queries (#2083)

In-browser verification against a live backend (tutor dev). This layer moves
seventeen readers off the model store onto `useDatesTabData` / `useOutlineTabData`,
so the claim is **no user-visible change** on either tab — but unlike #2091 the
data source really does move, so every reader is worth a look.

Two things are specific to this layer and are the highest-value checks:

- the two **cross-tab alert hooks** now read with `enabled: false`, so they must
  keep working *without* causing an outline-tab request on other tabs;
- the **access-expiration masquerade banner** still reads
  `useModel(tab, courseId)`, which is why the `dates`/`outline` bridge entries
  stay until #1999 — dropping them broke this in tests, so it wants a live check.

## Setup

Same Personalized Learner Schedules arming as #2091 — see the Setup section of
`manual-testing-2091.md` for the full recipe (self-paced course with a graded
subsection, `course_experience.relative_dates` on, a relative due date written
to edx-when, and the learner's `Schedule.start_date` backdated). Re-arm between
runs with the one-liner there; clicking "Shift due dates" resets it.

Masquerade checks need a staff user on the course (masquerade bar → "Specific
student") and a learner whose access has expired.

## Verify by hand

### Already covered on this branch

The suggested-schedule banner checks were run on **this** branch (`#2083`
applied) on 2026-09-21, before being repeated against #2091 alone:

- [x] **Shift-dates banner renders on the dates tab.**
- [x] **Shift-dates banner renders on the outline tab.**
- [x] **Its button still resets deadlines** — toast appeared and the dates had
      moved forward, confirmed by navigating between pages and refreshing.
- [x] **Neither banner renders where it shouldn't** — instructor-paced course,
      or self-paced with no missed deadlines.
- [x] **No new console noise.**

### Specific to this layer

- [x] **No outline request off the outline tab** — with the Network tab open and
      filtered to `course_home/outline`, load a **unit page (courseware)** and
      the **dates** and **progress** tabs directly (hard reload on each, not
      navigated-into). There must be **no** request to
      `/api/course_home/outline/<courseId>`. Courseware matters most here:
      `CoursewareContainer` renders `TabPage` → `LoadedTabPage` like any tab, so
      `useEnrollmentAlert` / `useLogistrationAlert` run on every unit page. This
      is their `enabled: false` read; before this layer they took the model store
      and fetched nothing.
      (Live needs extra setup and discussions renders a separate app, so neither
      is worth standing up for this — they run the same two hooks through the
      same `LoadedTabPage`.)

- [x] **One request per tab, not two** — same filter, load the **outline** tab:
      exactly **one** GET to `/api/course_home/outline/`. Then the **dates** tab:
      exactly one to `/api/course_home/dates/`. Before the `enabled: false`
      readers this was two apiece, because every reader mounted after the tab's
      query had resolved and refetched at `staleTime: 0`.
- [ ] **Enrollment alert still appears** — as an authenticated, *unenrolled*
      learner on a private course, the enrollment alert renders on the outline
      tab.
- [x] **Logistration alert still appears** — same course while **logged out**:
      the "sign in to enroll" alert renders.
- [ ] **Cross-tab behaviour is unchanged** — visit the outline tab first, then
      navigate to the dates tab: the enrollment/logistration alerts behave
      exactly as they did before (they read whatever the outline query already
      cached; they must not start fetching it). *Not run.*
- [ ] **Access-expiration masquerade banner** — as staff, masquerade as a
      specific learner whose access has expired, on both the **outline** and
      **dates** tabs: the "this learner no longer has access…" banner renders.
      This is the reader that keeps the bridge alive; if it is blank, the
      `meta` entries are wrong.

### Outline tab readers (twelve converted sites)

- [x] **Section outline** — sections render, expand/collapse works, sequence
      titles link into courseware, **due dates** show on sequences
      (`SequenceDueDate` reads `userTimezone` off the query now), completion
      checkmarks render.
Each widget is an independent reader, so a failure in one points straight at its
converted read — the field it takes off the query is named for that reason.

- [ ] **Welcome message** (`welcomeMessageHtml`) — the course-updates banner
      renders, "Show More"/"Show Less" toggles it, and dismissing hides it.
      (Dismissal is local state plus a fire-and-forget POST, unchanged here.)
- [x] **Course dates widget** (`datesWidget.courseDateBlocks`, `datesTabLink`) —
      the date list renders in the sidebar and the "All dates" link points at
      the dates tab.
- [ ] **Course handouts** (`handoutsHtml`) — renders when the course has
      handouts configured. This is the one reader that renders `null` rather
      than throwing when the field is absent, so an unconfigured course proves
      nothing; note it as unreachable if yours has none.
- [x] **Course tools** (`courseTools`) — the tools list renders, including the
      bookmarks link and the "Launch tour" button.
- [x] **Start/Resume card** (`resumeCourse.hasVisitedCourse`, `.url`) — the card
      renders, its label reads "Start course" before any visit and "Resume
      course" after one, and the button navigates into courseware.
- [ ] **Outline alerts** — certificate status, course end, private course, and
      scheduled content alerts each render when their course state calls for it
      (check whichever your course surfaces; note the ones it can't).

### Dates tab readers

- [x] **Timeline** — date blocks render, grouped by day, with today's marker.
- [ ] **Upgrade-to-complete alert** — the `BannerDatesUpgradeSlot` default child
      now reads the dates query directly. Needs content-type gating and a
      verified upgrade link; note it as unreachable if the course has neither.

### Failure path

- [ ] **Denied learner on the outline tab** — a learner without access: the
      outline endpoint 403s and `getOutlineTabData` returns `{}`, so every
      converted reader sees an empty payload. The page must render the denial
      (or redirect) rather than crashing — the #1997 regression class, worth
      re-checking because this layer typed the outline data as all-optional.
      If it *does* crash, the error should now read
      `Section "<title>" rendered without outline data for <courseId>` from
      `Section`'s guard, not `Cannot destructure property 'sequences' of
      undefined` — same component, same moment, better message.

## Results

Env: tutor dev, `course-v1:OpenedX+PD1+PD1_1`, user `tutorsuper`, branch
`bsmith/dates-outline-query-reads` @ `dfd507ce`.

**Verified.** Both request-shape checks passed, which are the two claims this
layer makes that nothing else could confirm: no `course_home/outline` request on
a unit page or the dates/progress tabs, and exactly one request per tab on
outline and dates where there were two before the `enabled: false` readers. The
section outline, course dates widget, course tools, start/resume card and dates
timeline all render as before, as do the suggested-schedule banners (checked
earlier on this branch), and the logistration alert still appears for a
logged-out learner on a private course.

**Not run**, each for want of the course state it needs, and resting on the
automated suites:

- enrollment alert (authenticated but unenrolled on a private course)
- access-expiration masquerade banner
- welcome message, course handouts (neither configured on PD1)
- the four outline alerts (certificate status, course end, private course,
  scheduled content)
- upgrade-to-complete alert (needs content-type gating and a verified upgrade
  link)
- denied-learner failure path

**One observation, explained.** During this pass the past-due banner appeared on
the dates tab and in the unit, but not on the outline tab. That is pre-existing
gating, not a regression: the two tabs compute `hasDeadlines` from *different*
lists — `OutlineTab` from `datesWidget.courseDateBlocks`, the sidebar's short
window of upcoming dates, and `DatesTab` from the full `courseDateBlocks`. An
assignment whose due date falls outside that window gates the banner out on the
outline tab only. (The in-unit banner is the LMS's own, from `vert_module.html`,
unrelated to either.) This layer changed where those lists are read from, not the
gates, and the banner did render on the outline tab in the earlier pass on this
same branch.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
