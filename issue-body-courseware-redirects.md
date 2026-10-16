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
