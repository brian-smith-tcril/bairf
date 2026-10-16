# Decisions — courseware Redux slice teardown (#1976, layer B)

1. **`CoursewareContainer` converts whole.** Route params are the id source
   (`courseId`/`sequenceId`/`unitId` straight from `useParams`); statuses come
   from `useIsCourseLoaded(courseId)` and the sequence query
   (`isSuccess`/`isError` + the `sequenceMightBeUnit` predicate); the five
   `createSelector`s become plain `useSelector` model lookups parameterized by
   the route ids, preserving the exact null semantics (`?? null` — stored
   reference or null, stable under default equality; `useModel`'s `{}` would
   break the helpers' `section &&` guards). `nextSequenceId` /
   `firstSequenceId` derive inline with the same guards, including the
   faithful `indexOf === -1` quirk of the old `nextSequenceSelector`. One
   deliberate leniency: the old `firstSequenceIdSelector` crashed if a
   section model was missing while loaded (impossible in practice — the
   outline seeds sections); the inline version yields null instead. The
   model store is untyped JS until #1977, so the three maps this file reads
   are named once (`CoursewareModels` + `readModels`) rather than `as any`-ing
   at each read.

2. **The redirect machinery moves to `src/courseware/redirects.ts`** —
   review-driven, in three rounds. Round one kept positional params with the
   statuses reshaped to booleans; rejected as illegible (6–9 positional args,
   now anonymous booleans). Round two gave each rule a typed options object
   (a base `RedirectArgsBase` + per-rule extenders; the two section-resolving
   rules share `SectionRedirectArgs`, with `sectionToSequenceRedirect`
   accepting-but-ignoring `isPreview` — that rule has never preview-prefixed
   its navigations, a pre-existing gap in the A4 jumpnav family, untouched).
   Round three extracted the subsystem whole: it is ADR 0008's "liberal
   courseware path handling", so the module carries that name and story, the
   six rules drop their class-era `check` prefix (`resumeRedirect`,
   `sectionUnitToUnitRedirect`, …) and keep their route-diagram comments
   attached, and a self-contained `useCoursewareRedirects()` hook owns the
   no-dep-array effect plus the redirect-only derivations
   (`sectionViaSequenceId`, `firstSequenceId`) — the container shrinks to its
   rendering job and calls one hook. The stale "move this into the thunks
   layer (TNL-8182)" comment dies (the thunks layer no longer exists).
   `readModels`/`CoursewareModels` live in `data/modelReader.ts`, shared by
   the container and the hook (both die at #1977).

   The load-bearing detail: the rules are fire-once guards invoked from a
   no-dep-array effect, and `defaultMemoize`'s per-arg `===` never matches a
   fresh object literal — a naive object arg would fire the guards every
   render (an HTTP GET per render from `resumeRedirect`, repeated
   navigations). They are therefore memoized as
   `defaultMemoize(fn, shallowEqual)`: one-level field-wise `===` on the args
   object, exactly the comparison depth the positional args had, including
   reference equality on the `sequence`/`section` model objects — correct
   because RTK's immutable updates make reference-change ⇔ content-change
   (an optimistic `activeUnitIndex` write re-fires the sequence redirect
   rule, as it does today). **Constraint for future edits: no args field may
   be a per-render fresh literal** (an inline array/object would quietly
   defeat the guard) — stated once in the module header. `sequence` stays
   `any` in the interfaces — the untyped model reality named by
   `CoursewareModels` — because its null-ness is guarded by the sibling
   `isSequenceLoaded` boolean, which TS cannot narrow across fields;
   `section` types honestly and narrows via its own `&&` guard. The rules'
   tests move to `redirects.test.ts`; the TS move surfaced slice-era
   `sequenceId: null` test values (the runtime is route-param `undefined`)
   and a `URL` object passed to a mock matcher where its `.href` was meant.

3. **The ids-match race guard is deleted with the race.** Statuses now derive
   from queries keyed by the route ids, so the "redux ids lag the route"
   condition it defended against cannot occur. This also fixes the latent
   stale-bail: after an in-app navigate to `/course/:courseId` (the
   invalid-sequence fallbacks), the slice kept the stale `sequenceId`, the
   guard bailed forever, and the resume redirect never ran; with
   route-derived ids the redirect checks run and the page self-heals.

4. **Outline policy lives with the redirect rules, not TabPage** (the B-prep
   decision, landed here; review moved it from an inline container block into
   `redirects.ts` as the seventh rule, `outlineFailureRedirect`). TabPage
   receives the standard two-slot shape — identical to CourseExit's:
   `{ metadataQuery: courseHomeMetaQuery, tabDataQuery: metadataQuery }`. On
   outline failure with access granted, the rule navigates to
   `/course/:courseId/home` — the destination the bridge's `denied` produced
   through `getAccessDeniedRedirectUrl`'s default branch; the `hasAccess`
   gate keeps a real access denial's specific redirect (TabPage's) winning.
   A 403 outline means no access, which courseHomeMeta also reports, so the
   TabPage denied path covers it. Timing: as an effect-time rule (like its
   six siblings) rather than a render-time `<Navigate>`, the outline-error
   edge can paint one frame of chrome before redirecting; the bridge-era
   DENIED redirected pre-paint. Outline-*pending* needs no handling post-A3:
   everything under `Course` tolerates a not-yet-loaded outline
   (`useSequenceIds` → `[]`, nav defaults, `Sequence`'s spinner rides the
   independent sequence query). Behavior delta: page chrome can render for
   the tail of the outline fetch where the bridge showed a full-page spinner.

5. **TabPage's transitional era ends.** The string branch, the `sliceError`
   param, the fenced slice-reads block, and the `react-redux`/`RootState`/
   constants imports all delete together; `deriveView` is unary and
   `CourseStatus` is the two-slot object only. Its `metadataQuery` member is
   now typed with `RequestError` as the error type — the container is the
   first *typed* caller (every tab is `.jsx`), which surfaced that the
   default `Error` TError rejected `useCourseHomeMeta`'s actual type.

6. **`TabContainer` deletes (+ its test, its `index.js` export, and a stale
   `jest.mock` in `src/index.test.jsx`)** — the Redux-era generic tab wrapper
   (dispatches a `fetch` thunk prop, reads `state[slice]` string status),
   renderer-less since the tab conversions. The `index.test.jsx` mock dated
   from when `index.jsx` wrapped tab routes in `TabContainer` itself; the tab
   conversions moved TabPage usage inside the tab components (all mocked in
   that suite), so the mock stubbed a module nothing in the tested tree
   imports — and with `TabContainer` gone it would have declared `tab-page`'s
   shape as an export that no longer exists. Found in the pre-B audit as the
   only other string-status passer; verified not a plugin surface (internal
   module, no docs references). The `StatusValue` type and the `DENIED`
   constant delete from `constants.ts` with their last consumer (TabPage's
   string branch — found in review); `LOADING`/`LOADED`/`FAILED` stay with
   real consumers outside the retired vocabulary (`course-exit/track.js` uses
   two as analytics labels, `preferences-unsubscribe` as local component
   state).

7. **The slice infrastructure deletes:** `statusBridge.ts` (+ its test — the
   matrix was ported to hook/TabPage tests in A2/A3/B-prep), `slice.js`, the
   `courseware` reducer from `store.ts` and from `setupTest.js`'s test store,
   the `fetchCourseSuccess`/`fetchSequenceSuccess` seeding dispatches (model
   seeding stays), the `courseware/data/index.js` reducer export, and
   CourseExit's `useCourseExitStatusBridge` call (its last two jobs —
   CourseRecommendations' id, TabPage's message — were retired in A1 and
   B-prep). `apiHooks.ts`'s mutation-vars types move from `| null` ("from
   the still-untyped Redux slice") to `| undefined`, including
   `useSaveSequencePosition`'s internal `setPosition`: the ids are route
   params now, typed `string | undefined`. Deliberately `| undefined` rather
   than `?` — the callers always pass these arguments (possibly holding
   undefined), and `?` would additionally let a caller omit one entirely
   without a type error.

8. **The courseHome slice's `fetchTabFailure` reducer deletes too** — flagged
   by the codecov project check (this repo's zero-tolerance `threshold: 0%`):
   the reducer's sole exercisers were TabPage's deleted string-branch tests,
   which hand-dispatched `course-home/fetchTabFailure` to seed the message.
   In production it has been dead since #2006 deleted the shared `fetchTab`
   thunk, its last dispatcher (the fact B-prep's 403-detail fix rests on);
   nothing imports it, nothing dispatches its string type, and it is not
   re-exported from `course-home/data/index.js`. Same posture as the live-tab
   layer's orphaned-reducer deletion: remove the dead code the test deletion
   orphaned, don't pad coverage. The rest of the courseHome slice (its
   now-reader-less `errorMessage`/`errorCode`/`courseStatus` fields) stays
   for #1978, the slice's own teardown.

9. **Tests.**
   - The redirect-helper unit tests transform positionally to booleans
     (`'loaded'`→`true`, `'loading'`→`false`, `'failed'`→`true` in the
     failed slot), with titles renamed to boolean phrasing; the container's
     integration suite (real store, bridged client, real routes) passed
     unchanged — the strongest evidence the rewrite is faithful.
   - TabPage's five string-branch cases delete; `mockData.courseStatus` is
     query-shaped. Removed test → coverage now:

     | Removed (string-era) case | Covered now by |
     | --- | --- |
     | `courseStatus="loading"` shows the spinner | "displays loading while the metadata query is loading" + the tab-data twin — same assertion, query-shaped input |
     | `courseStatus="other"` shows the generic error | "displays the error message when the metadata/tab-data query fails" — the unrecognized-string *input* is unrepresentable now (`CourseStatus` is the two-slot object), the fall-through-to-error behavior is what the query `isError` cases assert |
     | custom message via manual `course-home/fetchTabFailure` dispatch | "displays the 403 detail from the metadata query error" — the slice transport was dead in production (nothing dispatched `fetchTabFailure` since the tab conversions; the test kept it alive by hand-dispatching); B-prep's `getErrorDetail` carries the learner-facing message off the query error instead |
     | custom message via manual `courseware/fetchCourseFailure` dispatch | "displays the 403 detail from the tab-data query error" — same story; the courseware slice (deleted here) has had no dispatcher since A2 |
     | generic message when the failure carries no custom message | "displays the generic message for a non-403 metadata error" + "for a 403 without a body" — finer-grained than the original single case |
   - `Sequence.test`'s load-failure case now mocks an explicit 500 for its
     sequence URL — it had been passing by accident since A2 (the dead
     `fetchSequenceFailure` dispatch did nothing; the failure came from the
     unmatched GET hitting `logUnhandledRequests`' `200 {}` fallback, which
     throws in `normalizeSequenceMetadata`).
   - **Convenience-id sweep:** ~15 suites read `state.courseware` /
     `getState().courseware` purely to learn ids; all re-source via a
     `getTestStoreIds(store)` helper in `setupTest.js` returning
     `{ courseId, sequenceId }` as the first keys of the
     `models.coursewareMeta` / `models.sequences` maps (key order follows
     outline insertion, equal to the slice's value for these single-sequence
     factories — stated once at the helper instead of implied at every call
     site). Process
     note for the record: three successive greps under-counted these (a
     trailing-dot pattern, a path filter that excluded `src/courseware/`'s own
     files, and a `head`-truncated list) — the definitive inventory came from
     the type checker plus the failing suites, which is what a teardown's
     compile/test wall is for.

10. **Behavior deltas:** the outline-pending chrome tail (4); the stale-bail
   fix (3); TabPage surfaces courseware errors as soon as the relevant query
   fails instead of after all three settle (transient ordering, same terminal
   state); the standard mount-refetch posture for the container's
   subscriptions. Otherwise faithful: same redirect rules on the same inputs,
   same denied/failed routing, same messages (via B-prep's `getErrorDetail`).

Closes #1976.
