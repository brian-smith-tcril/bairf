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
