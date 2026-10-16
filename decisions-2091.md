# Decisions — suggested-schedule alerts to TypeScript (#2091)

Peel below #2083 (layer A of the model-store dissolution, #1977). Structural
only — the data-source change stays in #2083.

1. **Peeled out rather than folded into #2083.** #2083 gives both alerts new
   props, so without this layer that diff would edit `propTypes` entries
   TypeScript deletes one layer later. Same reasoning as #2065, peeled out of
   #2014: structural change first, conversion second, each reviewable on its
   own.

2. **Scope is the two components that gain props.**
   `UpgradeToCompleteAlert.jsx` keeps the props it has today — #2083 only
   changes where it reads its data — so it stays `.jsx`. Converting the whole
   directory for symmetry would be scope the conversion doesn't need.

3. **`Props` interface with destructuring defaults, not `React.FC` +
   `defaultProps`.** Matches `UnitButton.tsx` (#2065), the epic's most recent
   TypeScript conversion. `Section.tsx` and `SequenceLink.tsx` use
   `React.FC<Props>`, but that predates this effort and `defaultProps` on
   function components is on its way out.

4. **`courseId` is narrowed, not asserted.** `ShiftDatesAlert` feeds it to
   `courseHomeQueryKeys.datesTab`/`outlineTab` and to the reset-deadlines
   mutation, all typed `string`, while `useParams()` yields
   `string | undefined`. Adding `!courseId` to the early return the component
   already has narrows it for the whole body below, including the
   `refreshTabData` and `onClick` closures, so all three `courseId!` go away.
   The repo's other `courseId!` uses all sit in `apiHooks.ts` next to
   `enabled: !!courseId`, where the query cannot run with an undefined id;
   a component-level assertion has nothing backing it.

5. **The guard is unreachable, and that is understood.** With an undefined
   `courseId`, `useModel` returns `{}` and the `datesBannerInfo` destructure
   above the guard throws first, so `!courseId` cannot fire in this layer. It
   becomes reachable only once #2083 passes that data in as a prop, and even
   then only off a course route — where it renders nothing instead of a button
   that would POST `course_key: undefined` and invalidate cache keys containing
   `undefined`. Accepted as the cost of dropping the assertions.

6. **No test changes.** Neither component has its own test file; both are
   covered through `DatesTab.test.jsx` and `OutlineTab.test.jsx`, which stay
   green unchanged.
