Part of #1946 — Redux → React Query migration (Stage 1). Follow-up from the #2089 plan review, which found that after #2089 the last Redux-ecosystem imports in `src/courseware/` are the courseware redirects' fire-once guards: `defaultMemoize` from `reselect` (`redirects.ts`, `CoursewareContainer.tsx`) and `shallowEqual` from `react-redux` (`redirects.ts`).

**Goal:** decide how the courseware redirects should fire, based on the redirect cases themselves, and replace the memoized guards with that — leaving no `reselect` or `react-redux` import in `src/courseware/`.

**Context — what the guards do.** `useCoursewareRedirects` runs a `useEffect` with no dependency array, so on every render it calls all seven rules in `redirects.ts`. Each rule is `memoize(rule, shallowEqual)` over one arguments object, so it re-runs only when a field of its arguments changes; without that, every render while a rule's condition holds would navigate again, and the two rules that make a request would repeat it. `CoursewareContainer`'s `checkSaveSequencePosition` is the same pattern per instance, keyed on the unit id, guarding the `goto_position` POST. History: #115 (2020) made `CoursewareContainer` a class component and used `memoize` from `componentDidUpdate` as a deliberate alternative to hooks' dependency arrays; #120 swapped `lodash.memoize` for `reselect`'s `defaultMemoize` (TNL-7387: lodash compared only the first argument); the de-class (#2008 / #2019) moved the calls into the every-render effect; #2074 bundled the positional arguments into per-rule objects and added `shallowEqual` so the objects compare by field.

**Findings from the plan review** (React Router 6.30.6, this app's routes):

- **The guards are dependency arrays by another name.** `CoursewareContainer` does not remount between the five courseware routes — React Router renders each match as `<RenderedRoute match children={route.element}>` with no key, and every courseware route's element is `<DecodePageRoute><CoursewareContainer /></DecodePageRoute>`. `useNavigate`'s function is a `useCallback` over the location's pathname (among others), so it is new on every navigation and on every mount; since `navigate` is a field of every rule's arguments, the module-scope memo never suppresses a call across a remount. Within a mount, `memoize(rule, shallowEqual)` is `useEffect(rule, [each input])`.
- **The seven rules.** Five navigate synchronously once their inputs settle: outline failure → course home; section/unit → unit; section → first sequence; sequence → active unit; `first` / `last` marker → that unit. Two make a request first and navigate on its result: the resume redirect (`getResumeBlock`) and unit → parent sequence (`getSequenceForUnitDeprecated`, when the sequence request's 422 marks the id as a possible unit; otherwise it navigates to the course root at once). ADR 0008 documents the section, unit and sequence forms; the `first` / `last` marker form and the outline-failure rule are not in it.
- **The other automatic redirects are already declarative:** `CourseExit`, `TabPage`, `CourseAccessErrorPage`, `DecodePageRoute` and `PathFixesProvider` each render `<Navigate replace>`. Two sites are not, and each has a defect:
  - `Course.jsx` calls `navigate` during render to send non-staff learners off `/preview`. React Router drops a `navigate` made during a component's first render (`if (!activeRef.current) return;`, with the "You should call navigate() in a React.useEffect()" warning), so the redirect takes effect only on a later render.
  - `OutlineTab.jsx` strips the `start_course` query parameter with `navigate({ pathname, search, replace: true })`. `replace` is read only from the second argument, so this pushes a history entry instead of replacing it.
- **Several redirect branches drop the `/preview` prefix:** both branches of the section → sequence rule, the resume rule's first-sequence fallback, and the unit → sequence rule's three fallbacks to the course root. Whether that is intended for staff preview is undecided.

**Tentative plan (pending a deeper planning pass):** make the redirects declarative, with React Query for the lookups.

- The five synchronous rules become one pure resolver, inputs → redirect URL or `null`, rendered as `<Navigate replace>` — the form the other automatic redirects already use.
- The two lookups become queries (`useQuery`, `enabled` on each rule's condition) whose results feed the same resolver, so fetching once is the query cache's job rather than a memo's.
- `memoize`, `shallowEqual` and the every-render effect go; `checkSaveSequencePosition` is replaced the same way.

The fallback, if the deeper pass finds a behavior difference worth keeping, is one `useEffect` per rule with its inputs as dependencies — equivalent to today by the findings above.

**Tasks**
- Deeper planning pass: the resolver's rule order and precedence (today all seven are evaluated on every render and more than one can match), the lookups' loading and error states, `checkSaveSequencePosition`'s replacement, and the test plan against every case above.
- Decide, for each defect above, whether it is fixed here or gets its own issue: `Course.jsx`'s navigate during render, `OutlineTab`'s ignored `replace`, the dropped `/preview` prefixes, and ADR 0008's two missing forms.
- Implement; update the `redirects.ts` header and ADR 0008 to match.

**Sequencing:** stacked above #2089, which moves the rules' inputs onto the courseware queries; this layer then works on the inputs the rules will keep.

**Not in scope:** the redirect destinations themselves (ADR 0008's rules), except where a defect above is decided in; the user-action navigations (sequence and unit navigation, jump nav, content lock, honor code, the iframe's auto-advance).

**Verify:** every rule and every automatic redirect above still lands where it does today (or where a decided defect fix says), each lookup is requested once per redirect, `git grep -E "from '(reselect|react-redux)'" src/courseware` is empty, and `npm run types`, `npm run lint` and the full suite are green.

> [!NOTE]
> This issue was authored by Claude (Claude Code) and reviewed before posting.


---

> [!NOTE]
> The plan below was generated by Claude (Claude Code) and reviewed before posting.

**Plan summary.** One layer stacked above #2144 (#2089 layer B). The seven rules and `Course.jsx`'s render-time `/preview` strip become one pure resolver, inputs → `{ to }` / `{ lookup }` / `null`, rendered by a `CoursewareRedirects` component beside `TabPage` (not instead of it, so the page stays mounted through a redirect as it does today) as `<Navigate replace>`; the two lookups become queries owned by components mounted only while their rule matches, the resume one with `gcTime: 0`, because a re-enabled query serves its cached answer before refetching and the course root is re-entered in-session by the fallbacks; `checkSaveSequencePosition` becomes `useEffect(save, [routeUnitId])`, which is what the memo keyed on the unit id already was. Findings beyond the issue: the rules are mutually exclusive except outline-failure against a loaded sequence, so precedence changes exactly one case (one hop instead of two); the marker rule's no-units branch navigates to the current URL and is absorbed today only by `useNavigate`'s pathname memo, so the resolver treats a destination equal to the pathname as no redirect; there are seven prefix-dropping branches, not six, four forced by the absence of a `/preview/course/:courseId` route, one unreachable, two avoidable. Review outcomes: the two avoidable drops are not preserved (#1501 added `/preview` for Studio's unit Preview button and decides nothing about other routes); both lookups take the app's retry policy from #2024 with no opt-out; `Course.jsx`'s strip is fixed here by becoming the resolver's first rule; `OutlineTab`'s ignored `replace` gets its own issue; ADR 0008 is amended.

<details>
<summary>Full plan</summary>

# Plan: #2135 — make the courseware redirects declarative and drop their fire-once guards

Stacked above #2144 (`bsmith/courseware-mirrors-removal`, #2089 layer B) in the
running stack; closes #2135. Planned 2026-09-30 against the code as #2144 left
it (`5ee63667`). Settled choices move to `decisions-2135.md` as the
implementation confirms them. Versions: react-router 6.30.6,
@tanstack/react-query 5.102.8.

## How it works today

**Eight automatic courseware redirects, in two places.**

- `src/courseware/redirects.ts` holds seven rule functions, each
  `memoize(rule, shallowEqual)` (`defaultMemoize` from `reselect`,
  `shallowEqual` from `react-redux`) over one arguments object.
  `useCoursewareRedirects`, called by `CoursewareContainer`, runs a `useEffect`
  with no dependency array that calls all seven on every render. The memo
  re-runs a rule only when a field of its arguments changes; `navigate` is a
  field of every rule's arguments, and `useNavigate` returns a new function
  whenever the location's pathname changes (its `useCallback` deps include
  `locationPathname`), so every rule re-evaluates after every navigation.
  Within one location, a rule fires once per change of its other inputs.
- `src/courseware/course/Course.jsx:45` is the eighth: during render, when
  `originalUserIsStaff` is false and the pathname starts with `/preview`, it
  calls `navigate(pathname without the prefix, { replace: true })`.
  `useNavigate`'s function short-circuits until a layout effect has run
  (`if (!activeRef.current) return;`, with the "You should call navigate() in a
  React.useEffect()" warning), so the call is dropped on `Course`'s first
  render and lands on its next one. `pathname`, `navigate`, `useLocation` and
  `useNavigate` have no other use in the file.

**The seven rules' conditions** (`isCourseLoaded` is
`useIsCourseLoaded`: courseware metadata, course-home metadata with
`hasAccess`, and the outline all succeeded; `section` is
`outline.sections[sequenceId]`, i.e. the route's sequence slot looked up as a
section; `sequence` is the loaded sequence; `unitId` is the route's unit slot):

| Rule | Fires when | Goes to |
|---|---|---|
| outline failure | outline `isError` && `hasAccess` | `/course/:c/home` |
| resume | `isCourseLoaded` && no `sequenceId` | `getResumeBlock` → `[/preview]/course/:c/:section/:unit`, else `/course/:c/:firstSequence` if any, else nothing; request error → nothing |
| section + unit → unit | `isCourseLoaded` && sequence `isError` && `section` && `unitId` | `[/preview]/course/:c/:unit` |
| section → sequence | `isCourseLoaded` && sequence `isError` && `section` && !`unitId` | `/course/:c/:section.sequenceIds[0]`, else `/course/:c` |
| unit → sequence + unit | `isCourseLoaded` && sequence `isError` && !`section` && !`unitId` | 422 (`mightBeUnit`): `getSequenceForUnitDeprecated` → `[/preview]/course/:c/:parent/:unit`, not found or error → `/course/:c`; not 422 → `/course/:c` |
| sequence → unit | sequence `isSuccess` && !`unitId` && units non-empty | `[/preview]/course/:c/:seq/:unitIds[activeUnitIndex]` |
| unit marker | sequence `isSuccess`; units non-empty && `unitId` is `first` / `last` | `[/preview]/course/:c/:seq/:first-or-last` |
| (same rule) | sequence `isSuccess`; units empty, any `unitId` or none | `/course/:c/:seq` |

**`CoursewareContainer`'s `checkSaveSequencePosition`** is the same pattern
per instance: `memoize` keyed on the route unit id, called from an
every-render effect, reading `courseId`, `sequenceId`, `isSequenceLoaded` and
`sequence` through a `latest` ref. So it runs once per change of the route
unit, with whatever the sequence query holds at that moment: on the first
render of a unit URL the sequence is pending, nothing is saved, and when the
sequence loads the unit id is unchanged so nothing is saved then either. It
saves on unit changes after that, including the change from no unit to a
unit that the sequence → unit redirect makes (the sequence is loaded by then).
`CoursewareContainer.test`'s *saves the position on each unit change* pins
`[]` after load, then `[2]`, `[2, 3]` after two Next clicks.

**The declarative sites** render `<Navigate replace>`: `DecodePageRoute`
(instead of its children), `TabPage` (instead of the page, when denied),
`CourseExit` (twice), `CourseAccessErrorPage`, `PathFixesProvider`. React
Router's `Navigate` returns `null` and calls `navigate` from a `useEffect`
keyed on `[navigate, jsonPath, relative, replace, state]`, so it fires after
the layout effect that arms `navigate` — never dropped, and re-fired when the
pathname changes while it is still rendered.

**Tests.** `redirects.test.ts` (879 lines) calls each rule with explicit
arguments and a `jest.fn()` navigate, with axios mocked for the two lookups.
`CoursewareContainer.test.jsx` drives six rules end to end through real
fetches (resume with and without a unit, section → first sequence, empty
section → root, `/first`, `/last`, sequence → active unit, the course with no
sections, the outline-pending gate for resume and section URLs); the
unit-as-sequence path is covered only at rule level. Nothing tests
`Course.jsx`'s preview strip (`git grep -i preview` over the courseware
suites is empty).

## Findings beyond the issue body

**F1 — The rules are mutually exclusive by construction except in one
pairing.** Resume and the three failed-sequence rules need `isCourseLoaded`
and are split by `sequenceId`, `section` and `unitId`; the two loaded-sequence
rules are split from those by the sequence query's status, and from each other
by `unitId`. Outline failure makes `isCourseLoaded` false, so it excludes the
middle four, but the sequence query is independent of the outline, so
*outline failure + sequence loaded + no unit* fires two navigations in one
effect run (outline failure first, sequence → unit last, so the last wins),
and outline failure then fires again from the new URL. A resolver with outline
failure at the top reaches the same page in one hop. That is the only place
precedence changes anything.

**F2 — The unit-marker rule's no-units branch navigates to the current
URL.** With the sequence loaded and `unitIds` empty it calls
`navigate('/course/:c/:seq')` whatever the unit slot holds, including when
the page is already at `/course/:c/:seq`. That is a same-pathname `replace`,
absorbed today only because `useNavigate` memoizes on the pathname, so the
memo key does not change and the rule does not re-fire. A resolver must make
this explicit: a destination equal to the current pathname is no redirect.

**F3 — Seven branches build a destination without the prefix; only two of
them could carry it.** The issue lists six (the resume fallback, both
section → sequence branches, unit → sequence's three root fallbacks) and
misses the seventh, the marker rule's no-units branch (`navigate(baseUrl)`,
where its sibling branches use `sequenceUrl`). `DECODE_ROUTES.COURSEWARE`
has no `/preview/course/:courseId` route, so a preview URL for the course
root would be a 404: the four root fallbacks *must* drop the prefix, and the
resume rule can never run under `/preview` at all, so its fallback is
unreachable with `isPreview` true. The two avoidable drops are
section → sequence's first-sequence branch and the marker rule's no-units
branch, both targeting `/course/:c/:seq`, a shape that has a preview route.
#1501 (2024-10, "add functionality to see unit draft preview"), which
introduced `isPreview`, gave every rule the parameter except
`sectionToSequenceRedirect`, and in the marker rule prefixed the two
unit-marker branches but not the no-units one; nothing in the PR discusses
section or sequence-only preview URLs. `Course.jsx` strips the prefix for
non-staff anyway, so the drop is observable only for staff, for whom the
prefix is what selects draft content (`Unit/index.tsx`'s
`shouldDisplayUnitPreview` and the sequence query's `preview=1` are both
keyed on it).

**F4 — `Course.jsx`'s strip is a courseware redirect rule with the
effect-vs-render defect the issue describes.** Its inputs are the pathname
and `originalUserIsStaff` from the course-home metadata, which the redirect
hook already observes for `hasAccess`. `Course` renders only under
`TabPage`'s loaded gate, so the metadata is always present there; in the
resolver the rule needs an explicit success gate, since `!undefined` would
otherwise match while the metadata is pending.

**F5 — A lookup as a plain `useQuery` with `enabled` cannot be kept fresh
enough for the resume rule.** The resume answer changes with the learner's
activity, and the root is re-entered *in-session* by the fallbacks in F3 and
by `CourseExit`'s `<Navigate to="/course/:c">`. TanStack serves cached data
immediately when a query is re-enabled and refetches in the background
("If the query has cached data, then the query will be initialized in the
`status === 'success'` or `isSuccess` state" — Disabling/Pausing Queries,
"enabled is false"; and re-enabling fetches only when stale:
`shouldFetchOptionally` in `queryObserver.js`). So a resolver reading
`resumeQuery.data` would navigate to the *previous* answer before the refetch
lands. A disabled observer still counts as an observer: `Query.removeObserver`
schedules garbage collection only when `observers.length` reaches zero, so
toggling `enabled` never drops the entry. What does drop it is the observer
unmounting with `gcTime: 0` ("By default, 'inactive' queries are garbage
collected after 5 minutes" — Important Defaults; the Caching guide's example:
"Since there are no more active instances of this query, a garbage collection
timeout is set"). Hence the lookup lives in a component mounted only while its
rule matches. The parent-sequence answer is course structure, so for it the
default caching is fine and reusing a cached answer for the same unit is
correct.

**F6 — Query data may not be `undefined`.** "On success, the resolved value
may be anything except `undefined`" (Query Functions); query-core throws
`data is undefined`. `getSequenceForUnitDeprecated` returns `parent?.id`, so
the query function returns `parent?.id ?? null`.

**F7 — The lookups pick up the app's retry policy.** Today both are bare
calls. As queries they get #2024's retry (skip 4xx, retry 5xx and network
errors; "Queries that fail are silently retried 3 times, with exponential
backoff delay" — Important Defaults). A transient 5xx on the resume lookup
then resolves after a retry instead of leaving the learner on the root.

**F8 — `checkSaveSequencePosition` is `useEffect(save, [routeUnitId])`.**
Per the trace above: run once per change of the route unit, reading the
sequence as it is at that moment, never re-run when the sequence loads later.
`reselect`'s cache size is one, so `A → B → A` re-runs for `A`; a dependency
array does the same.

## Decisions to settle before writing code

**D1 — Shape: one pure resolver, one component, two lookup components.**

- `resolveCoursewareRedirect(inputs): CoursewareRedirect | null`, pure and
  synchronous, is the precedence table (D2) and the URL builder. Its result is
  a tagged union: `{ to: string }` for the six rules that know their
  destination, `{ lookup: 'resume', courseId, firstSequenceId, isPreview }`
  and `{ lookup: 'parentSequence', courseId, unitId, isPreview }` for the two
  that must ask. It returns `null` when no rule matches or when the
  destination equals the current pathname (F2).
- `<CoursewareRedirects />`, rendered by `CoursewareContainer` **beside**
  `TabPage`, not instead of it, so the page stays mounted through a redirect
  as it does today (the container never remounts between courseware routes;
  a page-replacing `<Navigate>` would unmount every observer under `TabPage`
  and remount them at the destination). It reads what
  `useCoursewareRedirects` reads today (route params, `useIsPreview()` in
  place of the hand-rolled `startsWith`, `useIsCourseLoaded`, the outline,
  course-home metadata and sequence queries), derives the inputs, calls the
  resolver, and renders `<Navigate to replace />`, one of the lookup
  components, or `null`.
- `<ResumeRedirect />` and `<ParentSequenceRedirect />` each own one
  `useQuery` and render `<Navigate replace>` from its result, or `null`.
  `ResumeRedirect` sets `gcTime: 0` (F5); `ParentSequenceRedirect` keeps the
  defaults, keyed on `(courseId, unitId)`. Keys join `coursewareQueryKeys`
  (`resume(courseId)`, `parentSequence(courseId, unitId)`). Neither sets
  `retry`; both take the app's policy (F7; settled 2026-09-30,
  `decisions-2135.md` entry 2).
- `redirects.ts` becomes `redirects.tsx`; `useCoursewareRedirects`, the seven
  rule functions, `memoize`, `shallowEqual` and the every-render effect go.
  The header comment is rewritten for the resolver.

Rejected: one `useEffect` per rule with its inputs as dependencies (the
issue's fallback). Equivalent to today, but keeps eight imperative
`navigate` calls and leaves the lookups as effect-launched promises with no
cache to reason about; the resolver form is what every other automatic
redirect in the app already uses.

**D2 — Precedence.** In order: strip `/preview` for non-staff (F4) →
outline failure → resume → section + unit → unit → section → sequence →
unit → parent → sequence → unit → unit marker (incl. its no-units branch).
Only the first two can overlap with the last two (F1); the rest are exclusive.
Putting the strip first means a non-staff learner at `/preview/course/:c/:seq`
goes to `/course/:c/:seq` and *then* resolves the unit on the un-prefixed
URL, instead of today's race between `Course.jsx`'s render-time call and the
container's effect (same end state either way).

**D3 — `checkSaveSequencePosition` becomes a `useEffect` on
`[routeUnitId]`** (F8), reading `sequence` and `isSequenceLoaded` from the
render it runs in. The `latest` and `guards` refs and the `memoize` import go.
The deliberately partial dependency list gets one terse trailing comment
(the sequence loading later must not save; `react-hooks/exhaustive-deps` is
off in this repo). Two alternatives, both rejected as behaviour changes:
adding `isSequenceLoaded` to the dependencies (saves on every page load, a
`goto_position` POST today's code never sends) and moving the save into the
Next/Previous handlers (misses unit changes made from the outline sidebar,
breadcrumbs and jump nav, which navigate by URL).

**D4 — Defects, one call each:**

- **`Course.jsx`'s navigate during render: fixed here**, by becoming the
  resolver's first rule (F4). The fix is a deletion in `Course.jsx` (the
  `if`, `navigate`, `pathname`, and the `useLocation` / `useNavigate`
  imports). The observable defect is a console warning and a one-render
  delay, so no end-to-end test fails today; the container gains the two
  cases in Tests instead.
- **`OutlineTab`'s ignored `replace`: its own issue.** It is course-home,
  not courseware; the fix is one line
  (`navigate({ pathname, search }, { replace: true })`) and by the bug-fix
  convention wants its own failing-test commit first, which is a history
  assertion this layer has no other reason to write.
- **The dropped `/preview` prefixes: settled 2026-09-30, the prefix is kept
  wherever a preview route exists** (`decisions-2135.md` entry 1). Every
  destination is built through one helper,
  `coursewarePath(isPreview, courseId, sequenceId?, unitId?)`, which adds the
  prefix only when a sequence segment is present, because that is the shape
  the preview routes have; the four root fallbacks then come out bare by
  construction, with the route table named once in the helper's comment,
  and the two avoidable branches come out prefixed. Two `redirects.test.ts`
  expectations change (*calls navigate with base url when no unit id*, which
  passes `isPreview: true` and expects the bare URL; the section → sequence
  cases gain a preview variant). **Implementation task:** before writing the
  helper, walk every consumer of the prefix and every way a preview URL is
  reached, looking for a shape the helper would get wrong: the in-app
  builders (`UnitButton`, `NextButton`, `PreviousButton`, `UnitLinkWrapper`,
  `BreadcrumbItem`, `bookmark/data/apiHooks.ts`, `Unit/index.tsx`, all keyed
  on `pathname.startsWith('/preview')`), the sequence query key, Studio's
  Preview link (the only entry point #1501 names), and the LMS-side
  `jump_to` / `get_learning_mfe_home_url` shapes in openedx-platform
  #35687's neighbourhood. Findings go in the decision entry.
- **ADR 0008: amended in this layer**, since the issue names it. Add the
  `first` / `last` marker form, the no-units rule, the outline-failure rule
  and the preview-strip rule; correct "Form #5 is the canonical courseware
  path" to Form #6 (the list has six forms and #6 is the sequence + unit
  one). Amendment as a dated section, not a rewrite.

**D5 — `CoursewareRedirects` keeps the fetching observers
`useCoursewareRedirects` holds today** (the outline in particular: the
container's own outline observer is `enabled: false`, so the redirect hook is
the outline's fetching owner on the courseware page). Moving from a hook in
the container to a child component mounted in the same commit changes no
request count; the once-per-load cases in `CoursewareContainer.test` stand
as the check. Making the container the outline's owner is a separate tidy-up,
not taken here.

## The change

1. `courseware/data/queryKeys.ts`: `resume(courseId)` and
   `parentSequence(courseId, unitId)`.
2. `courseware/redirects.tsx`: the `CoursewareRedirectInputs` type, the
   `CoursewareRedirect` union, `coursewarePath`,
   `resolveCoursewareRedirect`, `ResumeRedirect`, `ParentSequenceRedirect`,
   `CoursewareRedirects`. The eight rules' comments move onto the resolver's
   branches; the header describes the resolver and points at ADR 0008.
3. `CoursewareContainer.tsx`: `<CoursewareRedirects />` beside `<TabPage>`
   in the returned tree; the `useEffect([routeUnitId])` save; drop `latest`,
   `guards`, `useRef`, `memoize`.
4. `Course.jsx`: delete the strip and its imports.
5. `courseware/data/api.js`: `getSequenceForUnitDeprecated` returns
   `parent?.id ?? null` (F6).
6. `docs/decisions/0008-liberal-courseware-path-handling.md`: the amendment.

## Tests

**`redirects.test.tsx` becomes a table test of the resolver**: pure inputs
in, `{ to }` / `{ lookup }` / `null` out, no axios, no navigate mock. One
case per row of the table above plus: the strip rule (non-staff preview →
bare URL; staff → no match; metadata pending → no match); outline failure
over a loaded sequence (F1); the no-units branch at its own URL → `null`
(F2); each `isPreview` variant of the branches that keep the prefix and,
per the D4 decision, the two that do or do not; `isCourseLoaded` false
disables the middle four; a failed sequence with a unit slot and no section
matches nothing.

**`CoursewareContainer.test.jsx` gains the lookup and strip cases** (real
fetches, URL assertions as the existing cases do): unit-as-sequence → 422 →
blocks lookup → `/course/:c/:parent/:unit`; the lookup finds no parent →
`/course/:c`; the lookup errors → `/course/:c`; the resume request errors →
stays on `/course/:c`; a non-staff user at `/preview/course/:c/:seq/:unit`
lands on `/course/:c/:seq/:unit`; a staff user stays. Each lookup is
requested once (`axiosMock.history.get` filtered by URL, `toHaveLength(1)`).
The existing resume, section, marker, sequence → unit, no-sections,
outline-pending and position-save cases stand unchanged and are the
regression check for D1–D3.

Negative checks to run: the no-op guard removed → the no-units case
navigates to its own URL (a resolver case fails); `gcTime: 0` removed from
`ResumeRedirect` → a two-visit resume case (first answer A, root re-entered
via an empty-section fallback, second answer B) lands on A; the effect's
dependency array widened to include `isSequenceLoaded` → *saves the position
on each unit change* sees a save after load.

## Commit and PR

One `refactor:` commit (no `!`: nothing plugin-facing changes; the rule
functions were internal exports). The PR's behaviour section lists the
differences this plan decides: outline failure resolves in one hop (F1); the
two lookups are retried on 5xx and network errors (F7); the parent lookup is
cached per unit within a session (today re-requested after every
navigation, since `navigate`'s identity changed); the preview strip happens
on the first render (D4); and the prefix decision (D4). The decision doc is
embedded verbatim.

## Implementation order

1. `queryKeys.ts` (change 1); `api.js` (change 5).
2. `redirects.tsx`: resolver + `coursewarePath` first, table test alongside.
3. The two lookup components and `CoursewareRedirects`.
4. `CoursewareContainer.tsx` (change 3); `Course.jsx` (change 4); container
   cases.
5. ADR 0008 amendment.
6. `npm run types`, `npm run lint`, full suite; the negative checks.
7. Confirmed choices into `decisions-2135.md`.

## Verify

`git grep -E "from '(reselect|react-redux)'" src/courseware` is empty;
`git grep -n "useNavigate\|navigate(" src/courseware/course/Course.jsx` is
empty; `git grep -n "memoize" src/courseware` is empty; every rule in the
table lands where it does today, or where D4 says; each lookup is requested
once per redirect; `npm run types`, `npm run lint` and the full suite green.

## Review outcomes (2026-09-30)

- **The two avoidable `/preview` drops are not preserved** (D4;
  `decisions-2135.md` entry 1). #1501 added `/preview` so Studio's Preview
  button could open a unit in the MFE instead of the Django-template preview;
  nothing in it decides against the prefix on any route, and the two drops
  are an unparameterised rule and a wrong local in a unit-scoped change.
  Adding code to the redirect logic to keep them would preserve an absence
  nobody chose. The preview consumers and entry points are walked during
  implementation for shapes the path helper would get wrong.
- **Both lookups inherit the app's retry policy; neither sets `retry`**
  (D1; entry 2). One bare attempt was never a decision either. The parent
  lookup's endpoint weight does not justify an opt-out: retries fire only
  when it is already failing, and the fallback they delay lands the learner
  on the wrong unit.

## Manual test, tutor local

Each row of the table from a typed URL: root (resume, with a visited and an
unvisited course), section, section + unit, unit alone, sequence alone,
`/first`, `/last`, an empty sequence, a bad id in the sequence slot, and the
outline failing (500) with access; as staff, the same under `/preview` where
a route exists, watching whether the prefix survives per D4; as a non-staff
learner, a `/preview` unit URL lands on the bare URL without the
"You should call navigate() in a React.useEffect()" warning in the console;
Next/Previous still POST `goto_position` once per unit change and not on
load; the network tab shows each lookup once.

</details>


---

> [!NOTE]
> The structure plan below was generated by Claude (Claude Code) in review of the first implementation and reviewed before posting; it is updated to match what landed in #2146.

**Structure plan summary.** The plan above's pure resolver was built and then rejected in review, with four further shapes, each on a different readability ground (the table in the plan). What landed: eight rule hooks of one shape (`use…Redirect(): string | null`: destructure the shared `useRedirectInputs`, derive, conditions that each return a URL, `return null`), listed under four group labels in `CoursewareRedirects` and applied first match wins into one `<Navigate replace>`. The two lookups are rules like the others, with `useQuery` enabled by the rule's own applicability: the resume block is keyed by the visit to the course root (React Router's location key), so every visit fetches afresh without a mount-only component; the parent lookup has `staleTime: Infinity`. Review outcomes recorded in the plan's last section: no `gcTime: 0`, no ADR 0008 change, no `coursewarePath` table test.

<details>
<summary>Full structure plan</summary>

# Plan: a readable structure for the courseware redirects (#2135)

Planned 2026-10-01 in review of the first implementation, updated afterwards to
match what landed in PR #2146; the deltas are listed at the end.

## Context

#2135 replaces the seven memoized fire-once redirect rules in `redirects.ts` (plus
`Course.jsx`'s render-time `/preview` strip) with declarative `<Navigate replace>`
redirects. The behaviour is settled and pinned end to end by
`CoursewareContainer.test.jsx`, including both lookups, the two-visit resume
freshness case, the empty-sequence no-op, and the `/preview` cases. What was not
settled was the shape of `src/courseware/CoursewareRedirects.tsx`: five shapes were
tried in review and each failed on readability for a different reason. This plan
picks a structure in which every rule has the same shape, the order is one list,
and nothing sticks out.

### What was rejected, and why

| Shape | Why it failed |
|---|---|
| Pure resolver over a 15-field input object returning `{ to } \| { lookup } \| null`, with a `switch` to lookup components | "two layers of indirection for a list of rules" |
| One component, rules as early `<Navigate>` returns, a comment per rule | each rule is self-explanatory; the comments restated code; the *order* had no name and no comment |
| Nested chain of `…Redirect` wrappers ("X wraps Y" = "X redirects, else Y") | nesting reads as *gating* ("Y happens when X holds", like a `CourseLoadedGate`), the opposite meaning |
| `AtCourseRoot` wrapping `FailedSequenceRedirects`; a three-component chain for the root; comments justifying the resume mount wrapper | a condition-named wrapper reads as a gate; three names for one rule; "adding comments doesn't make that any clearer" |
| Seven rule hooks in a list plus the course root as a separate component after the list | "the course root redirect still sticks out like a sore thumb … why is it after the rest" |

### What the reviewer wants

- Comments explain the **order**, not the code. Each redirect is self-explanatory.
- Named pieces for the rules, all the same shape: deps (reads) → conditions that
  redirect → fall-through. No "condition that leads to children".
- No special case in the composition.

### Hard constraints

- **The resume block must be fetched afresh on every visit to the course root.**
  The learner's position moves, and the root is re-entered in-session by the
  fallbacks (empty section, unknown id, `CourseExit` with no mode). TanStack serves
  a cached answer before refetching, so a query keyed only by course would redirect
  a later visit to the old position. Pinned by *should ask for the resume block
  again on a later visit to the course root*.
- **First match wins** across eight rules, and React cannot do that across sibling
  components (a parent cannot see whether a child rendered `<Navigate>`), so the
  match is one ordered expression. Rules are hooks returning a URL or null, so each
  reads its inputs by the repo's real names rather than through a flattened field.
- **Precedence:** access and errors above everything; the two loaded-sequence
  rules do not wait for the course-loaded gate; only outline failure overlaps a
  loaded sequence and must win; everything else is mutually exclusive by
  construction.
- TS 4.9.5: components return `ReactElement | null`.
- TanStack tracked props: an observer re-renders only on a property it read last
  render, so every rule reads all its inputs at the top.
- In-repo precedent: `getAccessDeniedRedirectUrl` (`shared/access.js`) returns a
  URL or null and `TabPage` renders it as `<Navigate to replace />`.

## Structure

### The resume block is keyed by the visit

`src/courseware/data/queryKeys.ts`: `resume: (courseId, visitKey) => [..., 'resume', courseId, visitKey]`.
`src/courseware/data/apiHooks.ts`:

```ts
export const resumeBlockQuery = (courseId: string, visitKey: string) => queryOptions({
  queryKey: coursewareQueryKeys.resume(courseId, visitKey),
  queryFn: (): Promise<ResumeBlock> => getResumeBlock(courseId),
});
```

`visitKey` is React Router's `useLocation().key`, new for every history entry. This
is what lets the course-root rule be an always-mounted hook with `enabled` like the
parent-sequence rule: the entry for the current visit is fresh by construction, and
the previous visit's entry has no observer the moment the location changes. The
parent lookup is course structure and keeps its answer for the session:

```ts
export const parentSequenceQuery = (courseId: string, unitId: string) => queryOptions({
  queryKey: coursewareQueryKeys.parentSequence(courseId, unitId),
  queryFn: (): Promise<string | null> => getSequenceForUnitDeprecated(courseId, unitId),
  // Re-enabled whenever its rule applies again, and a unit's parent never changes mid-session:
  staleTime: Infinity,
});
```

### One file: a shared inputs hook, eight rule hooks of one shape, one list

`src/courseware/CoursewareRedirects.tsx`, in this order: header comment,
`coursewarePath`, `useRedirectInputs`, the eight rule hooks in list order,
`CoursewareRedirects`. `CoursewareContainer.tsx` renders `<CoursewareRedirects />`
beside `<TabPage>` and owns the fetches, including the minimal course outline's.

`useRedirectInputs` reads once what every rule needs, from the route and the cache
(`enabled: false` throughout): the params, `useIsPreview`, `useIsCourseLoaded`, the
course-home metadata, the minimal course outline query, the sequence query, and the
sequence slot looked up as a section. Nothing inside it depends on anything before
it: every hook takes only the route params, so it can run in full for every rule.

Every rule is `(): string | null`: a destructure of the inputs it uses, derived
values, conditions that each return a URL, `return null`. One reference comment per
rule names its ADR 0008 form where one exists.

```tsx
// ADR 0008 forms #2 and #3: the sequence slot holds a section id.
const useSectionRedirect = (): string | null => {
  const {
    courseId, unitId, isPreview, isCourseLoaded, sequenceQuery, section,
  } = useRedirectInputs();

  if (isCourseLoaded && sequenceQuery.isError && section && unitId) {
    return coursewarePath(isPreview, courseId, unitId);
  }
  if (isCourseLoaded && sequenceQuery.isError && section) {
    return coursewarePath(isPreview, courseId, section.sequenceIds[0]);
  }
  return null;
};

// ADR 0008 form #1: the course root goes to the learner's last position, else the course's first sequence.
const useCourseRootRedirect = (): string | null => {
  const {
    courseId, sequenceId, isPreview, isCourseLoaded, minimalCourseOutlineQuery,
  } = useRedirectInputs();
  const { key: visitKey } = useLocation();
  const atCourseRoot = isCourseLoaded && !sequenceId;
  const resumeBlock = useQuery({ ...resumeBlockQuery(courseId, visitKey), enabled: atCourseRoot }).data;
  const minimalCourseOutline = minimalCourseOutlineQuery.data;
  const firstSectionId = minimalCourseOutline?.courses[courseId].sectionIds[0];
  const firstSequenceId = firstSectionId && minimalCourseOutline?.sections[firstSectionId].sequenceIds[0];

  if (atCourseRoot && resumeBlock?.sectionId && resumeBlock.unitId) {
    return coursewarePath(isPreview, courseId, resumeBlock.sectionId, resumeBlock.unitId);
  }
  if (atCourseRoot && resumeBlock && firstSequenceId) {
    return coursewarePath(isPreview, courseId, firstSequenceId);
  }
  return null;
};
```

The lookup rules' applicability (`atCourseRoot`, `slotHoldsUnit`) is both the
query's `enabled` and part of every redirecting `if`, so a cached answer never
redirects from a URL where the rule no longer applies.

### The composition is the order

```tsx
const CoursewareRedirects = () => {
  const to = [
    // Access
    useNonStaffPreviewRedirect(),
    // Errors
    useOutlineFailureRedirect(),
    // The sequence has loaded
    useEmptySequenceRedirect(),
    useSequenceUnitRedirect(),
    // The course has loaded (useIsCourseLoaded: courseware metadata, course-home metadata, minimal course outline)
    useCourseRootRedirect(),
    useSectionRedirect(),
    useParentSequenceRedirect(),
    useUnknownIdRedirect(),
  ].find((redirect) => !!redirect);

  return to ? (<Navigate to={to} replace />) : null;
};
```

Four group labels and no other comment; the one ordering that changes an outcome
(outline failure before the sequence rules, so a loaded sequence goes to the course
home in one hop) is recorded in the decision log rather than the file. No
destination-equals-pathname check anywhere: the empty-sequence rule's condition
includes the unit segment, so at its own URL nothing matches.

### Alternatives considered

- Pure rule functions over a state object built by one hook, table-testable:
  rejected because the state object is the flattening the reviewer disliked, and the
  end-to-end suite already has a case per rule.
- The course root as a component mounted only at the root (so its `useQuery`
  unmounts between visits): correct, but it is the one piece that cannot be a list
  entry, and every placement of it read as messy. Keying by the visit moves the
  constraint into the query.

## Files

- `src/courseware/data/queryKeys.ts`: `resume(courseId, visitKey)`.
- `src/courseware/data/apiHooks.ts`: `ResumeBlock`, `resumeBlockQuery(courseId, visitKey)`,
  `parentSequenceQuery` with `staleTime: Infinity`.
- `src/courseware/CoursewareRedirects.tsx`: as above (~190 lines).
- `src/courseware/CoursewareContainer.test.jsx`: one added order case, a non-staff
  user at `/preview/course/:c/:unitId` lands on `/course/:c/:seq/:unitId` with one
  blocks request.
- `decisions-2135.md` (untracked): entries 3, 4, 5 and 8 for this shape; entry 13 for
  the run of the test file against the previous layer's code.
- ADR 0008: not touched (decision entry 9).

## Verification

- `npm run types`, `npm run lint`, full suite: 119 suites, 1185 tests.
- `CoursewareContainer.test.jsx` is the end-to-end check of every redirect. Run
  against the previous layer's source, 46 of 49 pass and the three that fail are the
  layer's deliberate changes (decision entry 13).
- Negative checks: `visitKey` removed from the resume key → the two-visit case fails
  alone; the empty-sequence rule's `unitId` condition removed → *should stay on the
  sequence without a redirect to it* fails alone; `enabled: slotHoldsUnit` widened →
  the *not a sequence, section or unit* case sees a blocks request;
  `enabled: atCourseRoot` without the course-loaded gate → *does not resume-redirect
  from the course root* sees a resume request.

## Changed during implementation

As reviewed, the plan had: `gcTime: 0` on `resumeBlockQuery` (removed: the visit
key alone carries freshness, nothing else in the app sets `gcTime`, and a lone
instance invites an out-of-scope sweep); `parentSequenceQuery` with default caching
(now `staleTime: Infinity`, because the new order case fetched the parent twice when
the lookup's `enabled` flipped back on after the preview strip); a `useCoursewareParams`
hook and each rule reading its own queries (now one `useRedirectInputs` hook, after
eight rules each re-read the same four queries); a four-line ordering comment on the
list (now four group labels); a `coursewarePath` table test (dropped; the container
cases cover its three shapes); an ADR 0008 amendment (dropped: the ADR records where
valid URLs redirect, not errors, access or implementation, and this layer changed
none of its destinations).

</details>
