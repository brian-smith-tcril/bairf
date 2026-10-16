## Summary

The courseware redirects become declarative. The seven memoized fire-once rules in `redirects.ts` and the render-time `/preview` strip in `Course.jsx` are now eight rule functions in `CoursewareRedirects.tsx`, each returning its redirect URL or `null` from the route, the page's cached queries and the two lookups, applied first match wins and rendered as one `<Navigate replace>` beside `TabPage`, the form every other automatic redirect in the app already uses. The two lookups are queries: the resume block is keyed by the visit to the course root so every visit asks again, and a unit's parent sequence is kept for the session. `CoursewareContainer`'s memoized position guard becomes an effect on the route's unit id. `reselect` and `react-redux` leave `src/courseware/`. Part of the Redux → React Query migration (#1946, Stage 1), on top of #2144 in stack #2141. Closes #2135.

## What changed

- **`CoursewareRedirects.tsx`** (decisions 3–5): `useRedirectInputs` reads the route, the page's queries from the cache and the two lookups, once per render; eight `get…Redirect(inputs): string | null` functions of one shape (destructure, derived values, conditions that each return a URL, `return null`); `CoursewareRedirects` calls the hook once, lists the rules under four group labels (access, errors, the sequence has loaded, the course has loaded) and renders the first result. The resume-block `useQuery` is keyed by React Router's location key (`resumeBlockQuery(courseId, visitKey)`); the parent-sequence one has `staleTime: Infinity`.
- **`CoursewareContainer.tsx`** (decisions 6, 8): `<CoursewareRedirects />` beside `<TabPage>`; the position guard is `useEffect(save, [routeUnitId])`; the container is the page's fetching observer of the minimal course outline (the old redirect hook was).
- **`Course.jsx`** (decision 7): the render-time `navigate` for non-staff on `/preview` is gone; the strip is the first rule.
- **`apiHooks.ts` / `queryKeys.ts` / `api.js`**: `ResumeBlock`, `resumeBlockQuery`, `parentSequenceQuery`; `getSequenceForUnitDeprecated` returns `null`, not `undefined`, when no sequence holds the unit.
- **Tests** (decisions 11, 13): `redirects.test.ts` (rule functions with a mocked `navigate`) goes; `CoursewareContainer.test.jsx` gains 17 end-to-end cases for what it lacked (the unit-as-sequence path, both lookup fallbacks, section + unit, an unknown id, an empty sequence, outline failure, the two-visit resume case, the `/preview` cases). One pre-existing two-hop case now awaits its second hop (decision 10).

## Behaviour

Run against the previous layer's source, 46 of the 49 container cases pass; the three that fail are the deliberate changes (decision 13): a non-staff learner on a `/preview` URL is now redirected to the published URL (the old render-time `navigate` was dropped by React Router and, in that flow, never retried); staff keep the `/preview` prefix through the section → first sequence and empty-sequence redirects (decision 1); an empty sequence at its own URL no longer replaces the history entry with itself (decision 4). Also: outline failure over a loaded sequence goes to the course home in one hop; the two lookups take the app's retry policy and log their errors (decision 2); the parent lookup is reused within a session where it was re-requested after every navigation. ADR 0008 is not touched (decision 9).

## Testing

`npm run types` and `npm run lint` clean; full suite 119 suites, 1185 passed, 0 skipped. Negative checks run: the visit key removed from the resume key fails the two-visit case alone; the empty-sequence rule's unit-segment condition removed fails *should stay on the sequence without a redirect to it* alone; the parent lookup's `enabled` widened makes the unknown-id case request the blocks API; the resume lookup's course-loaded gate removed makes the pending-outline case request the resume block. Manual checks on tutor local, 2026-10-01: 10 of 19 run, all passing, 9 not run and each covered by a container case (the request counts, the in-session resume revisit, the empty sequence, the outline failure, and the five preview checks including the intended prefix change); see the checklist. One finding, pre-existing since #1137 and filed as #2147: crossing a sequence boundary posts `goto_position` twice, the first with `position: 0` for the `/first` or `/last` marker segment (decision 14).

## Decisions

<details>
<summary>Full decision log</summary>

# Decisions — make the courseware redirects declarative and drop their fire-once guards (#2135)

Stacked above #2144 (#2089 layer B) in the running stack. Closes #2135.
Entries 1 and 2 were settled in the plan review (2026-09-30, `plan-2135.md`);
the structure in entries 3–5 was re-planned in review (2026-10-01,
`plan-2135-redirect-structure.md`) after the first shapes failed; the rest
come from the implementation.

1. **Redirect destinations carry the `/preview` prefix wherever a preview
   route exists; the two branches that dropped it are not preserved.**
   Seven branches in `redirects.ts` build a destination without the prefix.
   Four fall back to the course root, which has no preview route
   (`DECODE_ROUTES.COURSEWARE` lists `/preview/course/:courseId/:sequenceId`
   and `/preview/course/:courseId/:sequenceId/:unitId` only), so they must;
   one, the resume rule's first-sequence fallback, cannot run under
   `/preview` for the same reason; two could carry it and do not:
   `sectionToSequenceRedirect`'s first-sequence branch and the unit-marker
   rule's no-units branch, both targeting `/course/:c/:seq`. PR #1501
   (2024-10, "add functionality to see unit draft preview", dependent on
   openedx-platform #35687) introduced `isPreview` to give Studio's Preview
   button an MFE destination for a unit, in place of the Django-template
   preview; its description and testing steps cover only the unit URL. It
   added the parameter to every rule except `sectionToSequenceRedirect`, and
   in the marker rule prefixed the `first` / `last` branches but left the
   no-units branch on the unprefixed `baseUrl` local. Nothing in the PR says
   the prefix should be dropped on any route; the two drops read as omissions
   in a unit-scoped change. The redirect rewrite builds every destination
   through one helper that adds the prefix when the destination has a
   sequence segment, so the root fallbacks come out bare by construction and
   the two branches come out prefixed. Preserving the drops would add code
   to the redirect logic whose only purpose is to keep an absence nobody
   decided on. Observable only for staff (non-staff are stripped of the prefix
   regardless): previewing a section URL, or landing on an empty sequence,
   now stays in draft mode instead of silently switching to the published
   view. The preview-path consumers and entry points were walked during
   implementation (2026-09-30): every in-app builder keys on
   `pathname.startsWith('/preview')` and prefixes only unit- and
   sequence-shaped paths (`UnitButton`, `UnitLinkWrapper`, `NextButton`,
   `PreviousButton`, and `BreadcrumbItem`, which links a section to its first
   sequence, or to the *section id itself* when the section has no sequences —
   so the app produces section-shaped preview URLs of its own, and the
   section rule ran under preview from a breadcrumb click, not only from a
   typed URL); the sequence query key carries `isPreview`, and
   `Unit/index.tsx` sends `preview=1` to the iframe for staff on a prefixed
   path; openedx-platform #35687 builds the unit-shaped URL for Studio's
   Preview button. No consumer builds or expects a prefixed course root, and
   none is affected by the two branches now keeping the prefix.

2. **The two lookups inherit the app's retry policy; neither sets `retry`.**
   Today `getResumeBlock` (on `/course/:courseId`) and
   `getSequenceForUnitDeprecated` (on `/course/:courseId/:unitId` after the
   sequence request's 422) are bare `getAuthenticatedHttpClient().get` calls
   made from inside the memoized rules: one attempt each. On an error the
   resume rule does nothing (its rejection handler is `() => {}`, so the
   learner stays on the course root, which renders the courseware shell with
   no sequence, and nothing re-runs the rule), and the parent-sequence rule
   navigates to the root at once, where the resume rule then lands the
   learner on their resume unit rather than the one they were linked to. As
   queries the lookups get `shouldRetryQuery` from `src/queryClient.ts`
   (#2024), the default for every query in the app: a 4xx or an error
   flagged non-retryable is never retried, anything else is retried up to
   three times on TanStack's default backoff (1s, 2s, 4s), so a persistent
   failure surfaces about seven seconds after the first. Only the sequence
   query and `useProctoringInfoData` opt out with `retry: false`, the latter
   because two readers gate on its pending state and need an immediate
   settle; neither reason applies here. Two opt-outs were weighed and not
   taken. Opting both lookups out preserves today's outcomes exactly, but
   those outcomes are a dead end (resume) and a landing on the wrong unit
   (parent), and one attempt was never a decision, just what a bare call
   does. Opting out only the parent lookup, on the grounds that
   `getSequenceForUnitDeprecated` fetches the whole course tree at depth 3
   and the API comment says not to add uses of it: the retries fire only
   when the endpoint is already failing, at most three more requests from
   one client over seven seconds; the comment is about call sites, not
   retries; and the fallback the retries delay sends the learner to the
   wrong unit, so a retry that succeeds is the better outcome and a
   persistent failure reaches the same fallback seven seconds later. The
   behaviour change is one line: a transient 5xx or network error on either
   lookup is retried before its fallback fires, where today one attempt
   decides. During the retries the page shows what it shows today before
   the fallback (the shell with no sequence for resume, the failed-sequence
   state for the parent lookup). A side effect of the same move: a lookup
   error now reaches the app `QueryCache`'s `onError` logging, where the
   bare calls swallowed it (resume's rejection handler was `() => {}`; the
   parent lookup's navigated without logging).

3. **Eight rule functions of one shape, applied first match wins in one
   list.** `CoursewareRedirects.tsx` sits beside `CoursewareContainer.tsx`
   with a default export and holds `coursewarePath`, the shared
   `useRedirectInputs` hook, eight rule functions and the component. A rule
   is a function of the inputs returning the redirect URL or `null`,
   annotated `(inputs: RedirectInputs): string | null` so a missing
   fall-through is a compile error, with one body shape: its inputs
   destructured at the top, then only conditions that each return a URL,
   then `return null`. The inputs come from one hook, `useRedirectInputs`,
   which the component calls once and passes to every rule. It reads the
   route params (every route in `DECODE_ROUTES.COURSEWARE` has `:courseId`,
   so the cast is structural), the location's pathname and key,
   `useIsPreview`, `useIsCourseLoaded`, the course-home metadata, the
   minimal course outline query and the sequence query from the cache with
   `enabled: false`, the sequence slot looked up as a section, and the two
   lookups (entry 5), each gated on its rule's applicability (`atCourseRoot`,
   `slotHoldsUnit`), which it hands to the rule as well; each rule
   destructures what it uses and derives the rest. Added in review when the
   eight rules each re-read the same four queries: the hook hands back the
   query results themselves, not flattened booleans, so a rule still reads
   `sequenceQuery.isError` and `minimalCourseOutlineQuery.data` by name. In
   the first pushed shape each rule called the hook itself, on the argument
   that its own observers kept TanStack's tracked-property notifications per
   rule; the approving review asked for one call in the component, since
   every rule runs in that one component's render, so a notification to any
   observer re-renders all of them and one observer reading the same
   properties re-renders on exactly the same changes (entry 10), and eight
   calls were about 48 disabled observers on four queries. With the call in
   the component, three rules had kept hooks of their own (the strip's
   `useLocation`, the lookups' `useQuery`) and five had none, a list of
   `use…` names over functions that were not hooks; so the location values,
   the applicability predicates and the lookup queries moved into the inputs
   hook and all eight rules are plain `get…Redirect` functions. The
   course-loaded gate is an input like any other, so there is no gate
   component. One reference comment per rule names its ADR 0008 form
   where one exists; nothing restates a condition. `CoursewareRedirects` lists
   the eight calls in order under four group labels, takes the first result,
   and renders `<Navigate replace>` or `null` (entry 4). The container renders
   it *beside* `TabPage` in a fragment, not instead of it: the container never
   remounts between courseware routes, and a page-replacing `<Navigate>` would
   unmount every observer under `TabPage` at each redirect. The shape was
   reached through a plan after five earlier ones failed review, each on a
   different readability ground: components in `redirects.tsx` beside a pure
   resolver (components belong in their own file); a pure
   `resolveCoursewareRedirect(inputs)` over a fifteen-field input object
   returning `{ to }` / `{ lookup }` / `null` with a `switch` to lookup
   components (two layers of indirection for a list of rules, and flattening
   the queries into inputs); one component with the rules as early
   `<Navigate>` returns and a comment per rule (each rule was self-explanatory
   and the comments restated it, while the order had no name and no comment);
   a nest of `…Redirect` wrapper components where "X wraps Y" meant "X
   redirects, else Y" (nesting reads as gating, "Y happens when X holds", the
   opposite meaning); and seven rule hooks in a list with the course root as a
   separate component after it ("sticks out like a sore thumb"). The rules
   take the hook's results rather than a flattened state object so that each
   reads its inputs by the repo's names (`sequenceQuery.isError`,
   `data?.sections`) instead of through a flattened field; the end-to-end
   suite has a case per rule, so table tests were not worth the indirection.
   The issue's other fallback, one `useEffect` per rule with its inputs as
   dependencies, was not taken either: it keeps eight imperative `navigate`
   calls where `<Navigate>`
   is what every other automatic redirect in the app renders. The seven rule
   functions, `memoize`, `shallowEqual` and the every-render effect are gone;
   `getResumeBlock` and `getSequenceForUnitDeprecated` are now imported only
   by `apiHooks.ts`. In-repo precedent for the form:
   `getAccessDeniedRedirectUrl` (`shared/access.js`) returns a URL or `null`
   and `TabPage` renders it as `<Navigate to replace />`.

4. **Rule order.** The list: `getNonStaffPreviewRedirect` →
   `getOutlineFailureRedirect` → `getEmptySequenceRedirect` →
   `getSequenceUnitRedirect` → `getCourseRootRedirect` → `getSectionRedirect`
   → `getParentSequenceRedirect` → `getUnknownIdRedirect`. One ordering
   changes an outcome, recorded here rather than in the file: the outline
   failure before the sequence rules, so a loaded sequence goes straight to
   the course home (the old effect issued two navigations in one run, the
   second, sequence → unit, won, and outline failure re-fired from the new
   URL; container case *should go to the course home rather than the
   sequence's unit*). The plan review had counted the preview strip's position
   as a second one, "so nothing below builds a `/preview` URL for a learner
   who can't use one"; review doubted it and it does not hold: a non-staff
   learner at a preview sequence URL takes two hops and the same two sequence
   fetches (the sequence query is keyed by `isPreview`) whichever of the strip
   and the sequence rules runs first, so the strip is first because access
   comes before everything else, not because the position changes an outcome,
   and the comment claiming one was dropped. No two of the other rules can
   match at once, since each answers a different state of the sequence slot,
   so they follow ADR 0008's order of forms. The list carries four group
   labels and nothing more: access, errors, the sequence has loaded, the
   course has loaded (naming `useIsCourseLoaded`'s three queries). Longer
   comments on the list, explaining the collision and the one hop, were cut in
   review as too wordy; the two loaded-sequence rules do not wait for the
   course to load (a sequence URL resolves to its unit as soon as the sequence
   loads, as before). The marker rule's old no-units branch navigated to the
   current URL whenever the sequence was loaded, absorbed only because
   `useNavigate` memoizes on the pathname; `getEmptySequenceRedirect`'s
   condition includes the unit segment, so at the sequence's own URL nothing
   matches and the component renders `null`, with no
   destination-equals-pathname check anywhere. Without the segment in the
   condition the URL still stays put, since `<Navigate>`'s effect is keyed on
   the same pathname-memoized `navigate` and a same-URL replace runs once;
   what the condition prevents is that redundant history replace, so the case
   asserts that no history entry is replaced with a URL (React Router's own
   start-up `replaceState({ idx: 0 }, '')` carries none). Negative check, run:
   with the segment removed from the condition, *should stay on the sequence
   without a redirect to it* fails alone.

5. **The lookups are rules like the others; the resume block is keyed by the
   visit.** `resumeBlockQuery(courseId, visitKey)` and
   `parentSequenceQuery(courseId, unitId)` are `queryOptions` builders in
   `apiHooks.ts` beside the others, and `useRedirectInputs` calls `useQuery`
   for each with `enabled` set to the rule's applicability (`atCourseRoot`,
   `slotHoldsUnit`), handed to the rule as an input and the first term of its
   every redirecting `if`, so a cached answer never redirects from a URL
   where the rule no longer applies. The resume block
   must be fetched afresh on every visit to the course root: the learner's
   position moves, the root is re-entered in-session by the fallbacks (empty
   section, unknown id, `CourseExit` with no mode), and TanStack serves a
   re-enabled query's cached data before its refetch lands ("If the query has
   cached data, then the query will be initialized in the `status ===
   'success'` … state", Disabling/Pausing Queries) while a disabled observer
   still holds the entry (`Query.removeObserver` schedules garbage collection
   only when `observers.length` reaches zero). Two implementations were
   weighed. Mounting the `useQuery` call in a component rendered only at the
   root, with `gcTime: 0` so the entry went when it unmounted, is correct and
   is the ordinary React Query idiom, but it is the one rule that cannot then
   be a list entry, and every placement of that component read as messy in
   review. So the key carries the constraint instead:
   `coursewareQueryKeys.resume(courseId, visitKey)`, where `visitKey` is React
   Router's `useLocation().key`, new for every history entry (the initial
   location's is `"default"`; every navigated-to entry's is unique). The entry
   for the current visit is fresh by construction, and the previous visit's
   entry loses its observer the moment the location changes and is
   garbage-collected on the default schedule. A `gcTime: 0` that dropped it at
   once was removed in review: it was hygiene, not correctness (the two-visit
   case fails when the visit key leaves the key, not when `gcTime: 0` does),
   nothing else in the app sets it, and a lone instance invites a sweep that
   is out of this layer's scope. Nothing on the builder explains the key; this
   entry does. Pinned by *should ask for the resume block again on a later
   visit to the course root*, which returns to the root through a real
   `<Link>` click (a second `history.push` from frontend-platform's history
   object does not reach `BrowserRouter` after mount); negative check, run:
   with `visitKey` removed from the key it fails alone, landing on the first
   answer. `enabled: atCourseRoot` includes `isCourseLoaded`, so the resume
   block is not requested while the minimal course outline is pending;
   negative check, run: with the gate removed, *does not resume-redirect from
   the course root* fails alone. When the resume block names no position, the
   rule's second case goes to the course's first sequence, ADR 0008's own rule
   for the course root (Form #1), read from the cached minimal course outline;
   a course with none stays on the root. (The old `resumeRedirect` bundled
   that fallback into the lookup with no name for it; a review pass split it
   into its own component, then found the resulting three-name chain harder to
   parse than the rule, and the one-rule shape makes it a case line under the
   rule's ADR comment.) A resume request that fails leaves the learner on the
   root, as before. The parent-sequence answer is course structure, so
   `parentSequenceQuery` has `staleTime: Infinity`, as
   `useCourseOutlineStructure` does for the same reason: a non-staff learner
   at `/preview/course/:c/:unitId` has the lookup fetched on the preview URL
   and re-enabled on the stripped one, and with the default `staleTime` the
   re-enable served the cache and refetched in the background, two requests
   where the old memo also made two (its `navigate` identity changed after the
   strip); with `staleTime: Infinity` the cached parent is reused and the
   container case *should send a user who is not staff from a unit ID in the
   sequence slot to the unit without the prefix* asserts one blocks request.
   Negative check, run: with `enabled: slotHoldsUnit` widened to any sequence
   slot, *should redirect to the course root* (an id that is none of the
   three) sees a blocks request. `getSequenceForUnitDeprecated` returns
   `parent?.id ?? null`, since query data may not be `undefined` ("On success,
   the resolved value may be anything except `undefined`", Query Functions;
   query-core throws `data is undefined` otherwise), and the old caller only
   tested the result's truthiness. The `null` gives "no sequence holds this
   unit" a value of its own, which `getParentSequenceRedirect` reads: `data`
   is the parent id when found, `null` when not, and `undefined` only while
   the request is pending, so its two conditions are found → the unit URL, and
   `null` or an error → the course root. `ResumeBlock` is typed in
   `apiHooks.ts` in the file's partial form, naming `sectionId` (the
   endpoint's name for the sequence) and `unitId`.

6. **`checkSaveSequencePosition` is `useEffect(save, [routeUnitId])`.** The
   memo keyed on the unit id, called from an every-render effect and reading
   the sequence through a `latest` ref, ran once per change of the route unit
   with the sequence as it was at that moment: nothing on a unit URL's first
   render (sequence pending), nothing when the sequence then loaded (unit
   unchanged), a save on each unit change after that, including the change
   from no unit to a unit the sequence → unit redirect makes. A dependency
   array on `[routeUnitId]` does exactly that, reading `isSequenceLoaded` and
   `sequence` from the render it runs in; `reselect`'s cache size is one, so
   `A → B → A` re-ran for `A`, as the array does. The `latest` and `guards`
   refs went. The one trailing comment states the deliberately partial list
   (`react-hooks/exhaustive-deps` is off in this repo, #1017). Two
   alternatives were behaviour changes and not taken: adding
   `isSequenceLoaded` to the dependencies saves on every page load (a
   `goto_position` POST today's code never sends), and moving the save into
   the Next/Previous handlers misses unit changes made from the outline
   sidebar, the breadcrumbs and jump nav, which navigate by URL. Negative
   check, run: with `isSequenceLoaded` added to the array, *saves the position
   on each unit change* sees a save after load.

7. **`Course.jsx`'s render-time `/preview` strip is the first rule; the
   render-time `navigate` is gone.** React Router's `useNavigate` function
   short-circuits until a layout effect has run (`if (!activeRef.current)
   return;`, with the "You should call navigate() in a React.useEffect()"
   warning), so `Course`'s call was dropped on its first render and fired only
   if something re-rendered `Course` later; run against the previous layer's
   code, the container case *should send a user who is not staff to the same
   URL without the prefix* fails on the URL, the learner still on
   `/preview/…`, because in that flow no later render came. `<Navigate>`
   navigates from an effect and is never dropped. The rule's inputs, the
   pathname and the course-home metadata's `originalUserIsStaff`, were already
   read by the redirect hook. `Course` rendered only under `TabPage`'s loaded
   gate, so the metadata was always present there; the rule now requires the
   metadata to be present explicitly, since `!undefined` would otherwise match
   while it is pending. `Course.jsx` lost the `if`, `navigate`, `pathname`,
   the `useLocation` / `useNavigate` import and the `originalUserIsStaff`
   read, none of which had another use in the file. The container case *should
   send a user who is not staff to the same URL without the prefix* also
   asserts the router warning is not emitted. `OutlineTab`'s `navigate({
   pathname, search, replace: true })`, which pushes a history entry because
   `replace` is read only from the second argument, is course-home, not
   courseware, and by the bug-fix convention wants its own failing-test
   commit; it is filed separately (`issue-body-outline-tab-replace.md`).

8. **The container fetches the minimal course outline; the rules read from the
   cache.** Before this layer the container read the minimal course outline
   with `enabled: false`, as did `useIsCourseLoaded` and `useSequenceIds`, and
   `useCoursewareRedirects` was the courseware page's only fetching observer
   of it: the page's redirects owned the page's fetch. Review asked why the
   redirects would fetch what the container already reads, and the answer was
   that nothing else did. So the container's read lost its `enabled: false`
   and is the page's fetching observer, alongside its course-home metadata and
   sequence observers, and the rules read all three with `enabled: false`
   through `useRedirectInputs`. The first pushed shape called that hook once
   per rule, about six disabled observers per call (three of them inside
   `useIsCourseLoaded`), some 48 on four queries; the approving review asked
   for one call in the component (entry 3), so the redirects now hold eight
   observers, six disabled reads and the two lookups. `CourseExit` fetches
   the minimal course outline for the course-end page as before. One fetching
   observer either way, so the once-per-load case *requests the
   learning-sequences outline once per load* and the outline-pending cases in
   `CoursewareContainer.test` stand as the
   check.

9. **ADR 0008 is not touched.** The issue's task list said to update it, and a
   first version added a dated amendment listing the `first` / `last` markers
   with the no-units rule, the redirect on the minimal course outline request
   failing, and the `/preview` handling, named the implementing file, and
   corrected "Form #5 is the canonical courseware path" to Form #6 in place.
   Review removed all of it. The ADR records where *valid* courseware URLs
   redirect, so neither an error redirect nor an access rule belongs in it; an
   ADR does not name the file that implements it; and this layer changed none
   of the destinations it records, so it has nothing to amend. The markers
   predate this layer and were never in the ADR, but that is not this layer's
   to add. The "Form #5" sentence looks like an off-by-one (the list has six
   forms and the sequence + unit one is #6), but fixing it needs proof that it
   was a typo rather than a change of mind, which would be its own
   investigation, so it stands. The `redirects.ts` header comment the issue
   also named went with the file; `CoursewareRedirects.tsx`'s header points at
   the ADR as the old one did.

10. **Every rule reads all of its inputs before any condition, because
    TanStack notifies an observer only for properties read on the last
    render.** The default `notifyOnChangeProps` is "tracked": a `useQuery`
    observer re-renders its component only when a property the component read
    on its previous render changed. An intermediate shape here (one component
    with the rules as early returns behind a course-loaded gate) read
    `sequenceQuery.isError` only past that gate, so on a render where the gate
    was closed only `isSuccess` was tracked, a sequence request failing while
    the minimal course outline was still pending did not wake the component,
    and the outline loading did, one notification later. The render sequence
    was identical to the earlier resolver version (six renders from the
    section URL to the unit, logged on both) and the end state the same; only
    the tick differed, and nothing could be missed because every later change
    was read on the render that could act on it. It showed up in *should
    choose a unit within the section's first sequence*, a pre-existing case
    that asserted a section → sequence → unit redirect synchronously after the
    page spinner went and had passed only because the second hop's sequence
    request happened to complete first; bisected by reading properties
    unconditionally at the top (`sequenceQuery.status`, `.error` or `.isError`
    alone restored the old tick; the outline's `data` or `status` alone did
    not). The case now awaits its `assertLocation` in a `waitFor`, as the
    layer's other multi-hop cases do. In the final shape the finding is
    structural: `useRedirectInputs` reads every input before any rule runs,
    and the rules read their properties in the same render, so the observers
    track everything the rules depend on and a change to any of it re-renders
    the component at once. Tracking is per observer, not per rule: all eight
    rules run in one component's render, so one observer reading the union of
    their properties re-renders on exactly the changes eight would have, which
    is why the hook is called once (entry 3).

11. **Coverage.** The resolver's table test went with the resolver (entry 3);
    the rules are covered end to end in `CoursewareContainer.test`, where the
    outline, metadata and sequence requests are real fetches against the mock
    adapter and the assertion is the URL. Cases added for what the old
    rule-level suite had and the container suite lacked: the unit-as-sequence
    path through the 422 and the blocks lookup to the parent, the lookup
    finding no parent, the lookup failing, a section id with a unit (drop the
    section, then the parent lookup), an id that is none of the three (the
    root, with no blocks lookup), such an id followed by a unit (nothing), a
    sequence with no units (a marker goes to the sequence; the sequence URL
    stays put), the minimal course outline request failing (the course home,
    and the course home over a loaded sequence), the resume request failing
    (stays on the root), the two-visit resume case of entry 5, the two
    `/preview` cases of entry 7, two prefix cases (a staff section URL keeps
    it through to the unit; a staff unknown-id URL drops it on the way to the
    root), and the one order-sensitive pair not otherwise pinned (a non-staff
    preview URL with a unit id in the sequence slot: the strip, then the
    parent lookup, one blocks request). Each lookup case asserts its request
    count is one. The existing resume, section, marker, sequence → unit,
    no-sections, outline-pending and position-save cases stand, one of them
    now awaiting its second hop (entry 10). Run against the previous layer's
    source, 46 of the 49 cases pass and the three that fail are the layer's
    deliberate changes and nothing else (entry 13). Negative checks run:
    entries 4, 5 (three) and 6. Full suite on this layer: 119 suites, 1185
    tests (#2144's 120 and 1216, less `redirects.test.ts`'s 48 rule-level
    cases, plus 17 container cases).

12. **The outline-failure rule's comment states the rule and nothing else.**
    The old `outlineFailureRedirect` comment (#2074) said the page "can't be
    built without an outline", and #2145 found that stale: since #2139 the
    courseware page renders without the minimal course outline, with its
    sequence navigation disabled. A first rewording here described that
    failure state and pointed at #2145, and review rejected it too: a comment
    that describes what the page looks like without the data is one more claim
    to go stale when the page changes, and the redirect is not where that
    belongs. A third version restated the condition and destination in prose,
    which is the code again; the condition now carries one trailing note on
    the `hasAccess` operand (`// TabPage handles 403s`), the one thing the
    line cannot show (the ADR amendment that also stated the rule was removed,
    entry 9). Whether the courseware page needs the minimal course outline at
    all, and so whether this rule survives, is #2145, sequenced after this
    layer. In code and docs of this layer the query is named in full, the
    *minimal course outline* (`useMinimalCourseOutline`,
    `MinimalCourseOutline`, from `GET
    /api/learning_sequences/v1/course_outline/`), and the locals follow
    `Course.jsx` (`minimalCourseOutlineQuery`, `minimalCourseOutline`), to
    keep it apart from the outline sidebar's `useCourseOutlineStructure`
    (`CourseNavigationOutline`, from `/api/course_home/v1/navigation/`).

13. **The suite against the previous layer's code: 46 of 49 pass, and the
    three that fail are the three deliberate changes.** Run 2026-10-01 with the
    six source files this layer changes checked out from #2144 under this
    layer's test file. "Old" is the result against that source.

    Behaviour preserved. These pass on both old and new code.

    | Case | What it pins |
    |---|---|
    | should ask for the resume block again on a later visit to the course root | A second in-app visit to the root fetches again and lands on the new position. Old code refetched because its memo re-ran after every navigation; new code because the query is keyed by the visit. |
    | should stay on the course root when the resume block request fails | A failed resume request leaves the learner on the root. |
    | should redirect to the unit within its parent sequence | A unit id in the sequence slot: 422, blocks lookup, unit URL, one blocks request. |
    | should redirect to the course root when no sequence holds the unit | The lookup finds no parent. |
    | should redirect to the course root when the blocks request fails | The lookup errors. |
    | should redirect to the unit within its parent sequence (section ID and unit ID) | Section dropped, then the parent lookup. Was only rule-level before. |
    | should redirect to the course root (unknown id) | Not a 422, so no blocks request. |
    | should stay put when a unit ID follows it | Unknown id with a unit segment matches nothing. |
    | should redirect a unit marker to the sequence | Empty sequence, `/first` goes to the sequence URL. |
    | should go to the course home (outline fails) | Outline failure with access. |
    | should go to the course home rather than the sequence's unit | Outline failure over a loaded sequence. Passes on old code too, but by two hops inside the `waitFor`. |
    | should keep staff on the preview URL | Staff keep `/preview` on a unit URL. |
    | should send a user who is not staff from a unit ID in the sequence slot to the unit without the prefix | Strip, then the parent lookup, one blocks request. |
    | should drop the prefix when redirecting staff to the course root | No preview route exists for the root. |
    | should choose a unit within the section's first sequence (pre-existing, now awaits its second hop) | Unchanged behaviour; only the assertion waits. |

    Deliberate changes. These fail on the old code, and nothing else does.

    - **should send a user who is not staff to the same URL without the
      prefix.** Old result: the learner is still on `/preview/…`. The old
      strip called `navigate` during `Course`'s first render, which React
      Router drops, and in this flow nothing re-rendered `Course` afterwards,
      so it never fired. This is the defect the issue listed, and it turns out
      to be worse than a one-render delay (entry 7).
    - **should keep the prefix when redirecting staff from a section to its
      first sequence.** Old result: the prefix is dropped. This is the one
      intended preview change (entry 1).
    - **should stay on the sequence without a redirect to it.** Old result:
      one `replaceState` to the URL the learner is already on. This is the
      redundant same-URL replace the old no-units branch made (entry 4).

    So the test file draws the line exactly where the layer intends: the rest
    of the layer preserves behaviour, and the three changes are the three
    decided on.

14. **Found in manual testing, pre-existing, filed separately: a
    cross-sequence Next or Previous posts `goto_position` twice.** The
    navigation links go to `/course/:courseId/:nextSequenceId/first` (or
    `/last`, since #1137), and the position save runs when the route's unit
    segment changes, so on that render it computes `unitIds.indexOf('first')
    === -1` and posts `position: 0` before the marker redirect lands on the
    real unit and the save posts again. In the class component the bogus post
    went to the sequence being left (`componentDidUpdate` ran
    `checkFetchSequence` and then `checkSaveSequencePosition` with
    `this.props` still holding the previous sequence as loaded); since the
    sequence became a query it goes to the new sequence, and only when that
    sequence's metadata is already cached, since an uncached one is pending on
    that render. Not fixed here: this layer is a refactor whose three
    deliberate behaviour changes are enumerated in entry 13, the effect is a
    faithful port of the memo (entry 6), and the fix is a `fix:` with its own
    failing test first. Filed as #2147, not linked to the epic (nothing in it blocks the migration): the
    condition `sequence.unitIds.includes(routeUnitId)` and a container case
    that warms the next sequence's cache and asserts one post per landing.

</details>

<details>
<summary>Checklist</summary>

Tutor local, 2026-10-01. Checked = run and passing; unchecked = not run, covered by the container case named in the manual-testing doc.

### Request count (unchanged)

- [ ] **Hard-reload a unit, wait for idle:** `api/courseware/course/{id}` **1**, `learning_sequences/v1/course_outline/{id}` **1**, `course_home/course_metadata/{id}` **1**; no `resume` or `blocks` request.

### Redirects, each from a typed URL

- [x] **Course root, visited course:** `/course/{id}` lands on the last-visited unit; one `resume` request.
- [x] **Course root, never-visited course:** lands on the first unit of the first sequence.
- [ ] **Course root revisited in-session** (no page reload between the two visits; a typed URL reloads the app and empties the query cache, so the visit has to be in-app, and no UI link goes to the root): from a loaded unit, in the console run `history.pushState({}, '', '/course/{id}'); dispatchEvent(new PopStateEvent('popstate'));` → one `resume` request, lands on unit A. Click Next to unit B and let it render (completion is what the server's resume block follows). Run the console line again → a **second** `resume` request, lands on B, not A.
- [x] **Section:** `/course/{id}/{sectionId}` lands on the section's first sequence, at that sequence's saved position (its active unit) or its first unit when it has none; a section whose first sequence you were last in lands on the unit you left, any other section on the first unit. An empty section goes to the course root.
- [x] **Section and unit:** `/course/{id}/{sectionId}/{unitId}` lands on that unit within its sequence; one `blocks` request.
- [x] **Unit alone:** `/course/{id}/{unitId}` lands on the unit within its parent sequence; one `blocks` request.
- [x] **Sequence alone:** `/course/{id}/{sequenceId}` lands on its active unit.
- [x] **`/first` and `/last`:** land on those units.
- [ ] **Empty sequence:** `/course/{id}/{emptySeqId}/first` lands on `/course/{id}/{emptySeqId}`; `/course/{id}/{emptySeqId}` stays, and the history length does not change (`history.length` in the console before and after).
- [x] **Unknown id in the sequence slot:** `/course/{id}/not-a-block-id` goes to the course root; no `blocks` request.
- [ ] **Outline failure, with access:** a unit URL goes to `/course/{id}/home`; a sequence URL (`/course/{id}/{sequenceId}`) goes there directly, not via its unit.

### Preview

- [ ] **Staff, section URL under `/preview`:** `/preview/course/{id}/{sectionId}` lands on `/preview/course/{id}/{seq}/{unit}`, prefix kept, and the unit renders the draft (change a unit in Studio without publishing first).
- [ ] **Staff, empty sequence under `/preview`:** `/preview/course/{id}/{emptySeqId}/first` lands on `/preview/course/{id}/{emptySeqId}`.
- [ ] **Staff, unknown id under `/preview`:** goes to `/course/{id}` (no preview route for the root).
- [ ] **Learner, unit URL under `/preview`:** lands on the same URL without the prefix; the console shows no "You should call navigate() in a React.useEffect()" warning.
- [ ] **Learner, unit id in the sequence slot under `/preview`:** `/preview/course/{id}/{unitId}` lands on `/course/{id}/{seq}/{unitId}`; one `blocks` request.

### Position

- [x] **Next and Previous** each POST `goto_position` once per unit change within a sequence; nothing is posted on page load or when the sequence finishes loading. *Observed 2026-10-01:* crossing into another sequence posts twice, the first with `position: 0` for the `/first` or `/last` marker segment; pre-existing since #1137, same in the class component, not this layer's (decision entry 14, #2147).
- [x] **Sequence alone, then Next:** landing on `/course/{id}/{sequenceId}` and being redirected to the active unit posts `goto_position` once (the redirect is a unit change), then once more on Next.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
