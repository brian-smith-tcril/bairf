## Summary

Retire the `courseHome` Redux slice. After the tab conversions and #2077 it held one live field, `proctoringPanelStatus` — a hand-rolled loading flag for the proctoring onboarding fetch, written by `ProctoringInfoPanel` and read by `OutlineTab` (defer the weekly-goal card) and `ProductTours` (hold the outline tour) — plus four dead fields. The fetch becomes a `useProctoringInfoData` query and both readers gate on its `isPending`; the slice, its `index.js`, and the `courseHome` registration in `store.ts` and the test store are deleted. `store.ts` is now `models` + `specialExams` + `plugins`. Part of the Redux → React Query migration (#1946, Stage 1), stacked on #2077. Closes #1975.

## What changed

- **`course-home/data/apiHooks.ts`: `useProctoringInfoData(courseId, username, enabled = true)`** over the unchanged `getProctoringInfoData` (404 → `{}` stays in the api), with `retry: false`. Why no retry: the panel's `.catch`/`.finally` pair (PR #727, 2021) was designed so the goals widget never stays hidden because of this request — settle on any outcome, immediately. The app default would hold the card and tour through ~7s of 5xx retries. What #727 did *not* intend was silence: its catch swallowed real failures (its "API throws 404" comment was already wrong when written; the api mapped 404 → `{}` before the catch existed). The query keeps the intent and drops the accident: readers gate on `!isPending`, and a non-404 failure now reaches the app `QueryCache.onError` → `logError`.
- **`ProctoringInfoPanel.jsx`** derives its display from `data`: the six `useState`s become six `const`s in the same place. The readable-status chain (the status map, the raw-status → bucket mapping, the expiry checks, and the new `getReadableStatus`) moves to `outline-tab/utils.ts` (the repo's per-feature `utils` pattern) as `readableProctoringStatuses` / `getReadableProctoringStatus`, so the derivations can sit at the top of the component; the other helpers stay put. Same rendered output for every payload, including `{}` and a missing release date. `useDispatch`, the slice import, and the `exhaustive-deps` disable leave.
- **`OutlineTab.jsx`** reads `isPending` from the same hook (same key as the panel → one request) for the weekly-goal gate; `useSelector` leaves.
- **`ProductTours.jsx`** reads the hook with `enabled: outlineTabActive` (the panel only ever mounted on the outline tab) for the outline-tour gate. It keys on the `courseHomeMeta` model's username, read via `useModel` exactly as the panel does (it follows masquerade), not its own authenticated `username`, which would fork the query key under masquerade. `useSelector` leaves.
- **Deleted:** `course-home/data/slice.js`, `course-home/data/index.js`; `courseHome` removed from `store.ts` and `setupTest.js`'s `initializeTestStore`.
- **Tests:** four `useProctoringInfoData` cases in `apiHooks.test.tsx`; `OutlineTab.test.jsx` gains the weekly-goal deferral case the gate never had (deferred onboarding reply → no card; resolve `[200, {}]` → card, no panel). The eight existing panel cases and `ProductTours.test.jsx` pass unchanged.

## Testing

`npm run types` (0 errors), `npm run lint` (clean), full jest suite green at head (108 suites, 1101 passed / 3 pre-existing skips). Coverage on touched files is flat or better than the base (the panel's two uncovered lines are the same two, renumbered; `OutlineTab` lost its uncovered gate branch). Manual pass on tutor local: five of six checks by hand, deferral by the automated case — see the details block below.

## Decisions

<details>
<summary>Full decision log</summary>

# Decisions — retire the `courseHome` Redux slice (#1975 close-out)

Entries 1–3 were settled before implementation (2026-09-18); 4 onward landed
with the code.

1. **The last slice field becomes query status, not lifted state.**
   `proctoringPanelStatus` was a hand-rolled loading flag for one fetch
   (`getProctoringInfoData`), written by `ProctoringInfoPanel` and read by
   `OutlineTab` (defer the weekly-goal card) and `ProductTours` (hold the
   outline tour). The tab conversions already replaced such flags with query
   state, so the fetch becomes `useProctoringInfoData(courseId, username)` and
   both readers gate on its `isPending`. Same key → one fetch; no context, no
   lifted `useState`. The four other initial-state fields (`courseStatus`,
   `courseId`, `errorMessage`, `errorCode`) had no writer or reader and go with
   the file.

2. **`retry: false` and `!isPending`: preserve "always settle", drop the
   silent swallow.** PR #727 (2021-11-09) added the panel's
   `.catch(() => {})` and `.finally(resolve)` together so the goals widget
   would never stay hidden because of this request — settling on any outcome
   is the intent. The catch's "API throws 404" comment was already wrong when
   written (the api had mapped 404 → `{}` since the panel's first commits), and
   before #727 a 5xx surfaced as an unhandled rejection — so silencing real
   failures was a side effect, not a choice. The query therefore: gates
   readers on `!isPending` (a persistent 5xx must not hide the card or block
   the tour); sets `retry: false` so a failure settles immediately as #727
   designed, instead of after the app default's ~7s of 5xx retries; and does
   *not* swallow in `queryFn`, so the error reaches the app
   `QueryCache.onError` → `logError`. Rendered output on error is unchanged
   (no data → panel hidden).

3. **`ProductTours` reads the panel's username from the `courseHomeMeta`
   model itself.** The panel keys its fetch on the `courseHomeMeta` username
   (the user the LMS is serving the page as — follows masquerade);
   `ProductTours` only had frontend-platform's authenticated user, which it
   rightly keeps for the per-user tour endpoint. Using it for this hook would
   fork the query key under masquerade (a second fetch for the staff member's
   own onboarding status, and a "settled" that isn't the panel's). The plan
   had `LoadedTabPage` pass the username down as a `courseHomeUsername` prop;
   review dropped that — a prop whose only job is to carry a value the
   component can read itself, named to explain the plumbing. `ProductTours`
   now does `const courseHomeMeta = useModel('courseHomeMeta', courseId)` and
   passes `courseHomeMeta.username` (property access, so no second local
   `username` next to the authenticated one); the query result is held as
   `proctoringInfoQuery` and the gate reads `.isPending` off it, the same
   single-value property-access shape. Same field the panel reads, so the key
   matches by construction. It adds one `useModel('courseHomeMeta')` site to
   the fifty-odd #1977 already sweeps onto `useCourseHomeMeta`.

4. **The panel derives its display from `data`: the six `useState`s become
   six `const`s in the same place and order, and the readable-status
   derivation moves to `outline-tab/utils.ts`.** `link`, `onboardingPastDue`,
   `showInfoPanel`, `status`, `readableStatus`, `releaseDate` are plain
   derivations from the query result, declared where the `useState`s were and
   in their order, so the diff reads "same six values, now computed from the
   query" rather than "a block removed, something similar added elsewhere"
   (review feedback: the first draft had the block below the helpers and read
   as a deletion). Putting them at the top requires the functions
   `readableStatus` depends on to be importable rather than declared later in
   the component (airbnb `no-use-before-define` covers functions), so the
   status map and the raw-status → bucket mapping moved to
   `outline-tab/utils.ts`, the per-feature `utils` file the repo already uses
   (progress-tab, dates-tab, course-exit), together with the new
   `getReadableProctoringStatus(response)` — the expiry → status chain that
   lived in the old `.then`, with the single-use `isExpired` /
   `isExpiringSoon` helpers inlined into it (on their own in a shared file
   their purpose wasn't clear; the comparisons use `.getTime()` on both sides
   because TypeScript rejects the `Date >= number` coercion JavaScript
   allowed — same semantics). Because that file sits at the outline-tab level,
   the names gained the qualifier the component made implicit: exports
   `readableProctoringStatuses` and `getReadableProctoringStatus`, internal
   `getReadableProctoringStatusClass` ("class" there means category, not CSS
   — a rename for another day). The component's local `readableStatus` keeps
   its short name; inside the proctoring panel the qualifier adds nothing.
   The remaining helpers (`isCurrentlySubmitted`, `isSubmissionRequired`,
   `isNotYetReleased`, `getBorderClass`) stay in the component untouched; two
   of their lines were wrapped for `max-len` after the rename.

   Faithfulness details kept on purpose: an empty `{}` response (404, or
   the LMS attempt endpoint's 200-with-nothing) still yields `showInfoPanel === false` while
   `readableStatus` becomes `notStarted` (the `!examStatus` branch) exactly as
   the old setters produced; `releaseDate` is still `new Date(undefined)` (an
   invalid Date, which `isNotYetReleased` treats as "released") when the
   payload has no release date. The response stays raw snake_case (no
   camelCase in the hook), so the reads are byte-identical. Deeper
   restructuring — normalizing in `api.js` like `getProgressTabData` does, or
   replacing the `${readableStatus}ProctoringStatus` message-key
   concatenation with an explicit table — is deliberately left for a
   follow-up; it's a different review conversation from the de-Redux.

5. **`enabled` is a positional third argument on `useProctoringInfoData`.**
   Its `apiHooks.ts` siblings take no options object, and `useCourseHomeMeta`
   computes `enabled` internally from its own arguments. This hook can't: the
   panel always wants the fetch, `ProductTours` wants it only on the outline
   tab, and that knowledge belongs to the caller. A single boolean, defaulting
   to `true`, is the smallest surface that lets both callers share the key.

6. **`LOADED` stays in `constants.ts`.** The slice was one of three importers;
   `course-exit/track.js` and `preferences-unsubscribe` still use it.

7. **Tests.** `apiHooks.test.tsx` gains four `useProctoringInfoData` cases:
   payload + username in the URL, 404 → `{}` (error built with
   `customAttributes`, the file's convention), non-404 → `isError` after
   exactly one request, and `enabled: false` idle. `OutlineTab.test.jsx`
   gains the deferral case the gate never had: with `enable_proctored_exams`
   and the weekly goal enabled, a deferred onboarding reply keeps the goal
   card off the page, and resolving it with `[200, {}]` (the shape the LMS attempt endpoint returns for
   a course without proctoring — not a bare 404, which in this harness would
   exercise the api's catch through a TypeError) brings the card in with no
   panel. The existing proctoring block (eight cases) passed unchanged, as did
   `ProductTours.test.jsx`, whose outline renders populate the `courseHomeMeta`
   model through the bridge. `LoadedTabPage.test.jsx` mocks `ProductTours`
   wholesale and is unaffected.

8. **Deferral verified by test, not by hand.** Watching the weekly-goal card
   wait for the panel needs a course with proctored exams *and* weekly
   learning goals enabled; DemoX has neither, and stubbing both server flags
   locally verifies the stub more than the page. The other five manual checks
   passed on tutor local (one onboarding request on the outline tab, none
   elsewhere, panel content under a stub, masquerade username, failure path);
   the deferral gate rests on the new `OutlineTab.test.jsx` case, which
   drives it with a deferred onboarding reply against the real component
   tree.

9. **Codecov patch: one line, the `started` bucket.** Moving the readable-status
   mapping into the new `outline-tab/utils.ts` made every line of it "patch"
   lines, and the `started` / `ready_to_submit` → `started` branch had never
   been exercised (the panel's own tests covered `created`, `verified`,
   `rejected`, `submitted`, `second_review_required`, `other_course_approved`
   and empty) — a pre-existing gap the move surfaced. Covered with an
   "appears for started" case in the existing `OutlineTab.test.jsx`
   proctoring block, asserting the rendered status line, message and the
   onboarding link, rather than a new `utils.test.ts` (no sibling `utils`
   module in the repo has one). `utils.ts` is at 100% lines and branches.

</details>

<details>
<summary>Manual testing</summary>

# Manual testing — retire the `courseHome` Redux slice (#1975 close-out)

In-browser verification against a live backend (tutor local). This layer
claims **no user-visible change**: the proctoring info panel renders the same
content from a query instead of six `useState`s; the weekly-goal card still
waits for the panel to settle; the outline tour still waits for the card; and
the only new observable is that a non-404 failure of the onboarding request is
now logged instead of swallowed.

## Setup (DemoX on tutor local)

Course id: `course-v1:OpenedX+DemoX+DemoCourse`; outline tab at
`/course/course-v1:OpenedX+DemoX+DemoCourse/home`.

- DemoX has no proctored exams: `enable_proctored_exams` is false in the
  outline payload, so the weekly-goal gate is open regardless of the panel,
  and the onboarding request answers with no proctoring info → panel hidden.
  Tutor local has no `EXAMS_BASE_URL`, so the request is the LMS one:
  `/api/edx_proctoring/v1/user_onboarding/status?is_learning_mfe=true&course_id=...&username=...`
  (with `EXAMS_BASE_URL` it would be `/api/v1/student/course_id/.../onboarding?username=...`). Seeing the deferral by
  hand needs a course with proctored exams enabled, or a throttled network on
  a course where the request is slow enough to catch.
- Weekly learning goals must be enabled on the course for the goal card to
  render at all (`course_goals.weekly_learning_goal_enabled`).

## Verify by hand

- [x] **Outline tab renders as before** — header, outline, sidebar widgets
      (dates, handouts, tools); no console errors; exactly **one** onboarding
      request in the Network tab (the panel and `OutlineTab` share the query;
      `ProductTours` too on this tab).
- [x] **No onboarding request off the outline tab** — dates / progress /
      courseware: zero onboarding GETs (`ProductTours` is `enabled` only on
      outline; the panel doesn't mount elsewhere).
- [x] **Panel content** (course with proctoring, or stub the endpoint to a
      200 with `onboarding_status` / `onboarding_link` / `onboarding_release_date`):
      "This course contains proctored exams" section with status text and the
      onboarding / review-requirements buttons, same as before.
- [ ] **Deferral** (course with proctoring + weekly goals, throttled): the
      goal card appears only after the onboarding request completes; the
      outline tour (new user) starts only after that too.
- [x] **Masquerade** (staff → learner via the masquerade bar): one onboarding
      request, with `username=<masqueraded learner>`, not the staff username.
- [x] **Failure path** (block the onboarding URL or force a 500): the panel is
      hidden, the goal card and tour still unblock immediately (no retry
      delay), and the failure appears in the logging output.

## Left to the automated suite (not re-done by hand)

- Query semantics — `apiHooks.test.tsx` (`useProctoringInfoData`): payload,
  404 → `{}`, single-request error settle, disabled idle.
- Panel rendering per status — `OutlineTab.test.jsx` `Proctoring Info Panel`
  (eight existing cases, unchanged).
- The deferral gate — `OutlineTab.test.jsx` `defers the weekly learning goal
  card until the proctoring info has settled`.
- Tour gating on the outline tab — `ProductTours.test.jsx` (unchanged; the
  prop flows through the real `LoadedTabPage`).

## Results

Env: tutor local (no `EXAMS_BASE_URL`, so the LMS `edx_proctoring` URLs), DemoX,
local branch @ `a9171c30` (no PR yet). Run 2026-09-18. The same commit was
cherry-picked unchanged onto the restructured stack (#2080) as `b60da47e` on
2026-09-19; the diff is identical, so the results carry over.

- **Outline tab renders as before; one onboarding request** — passed:
  filtering the Network tab on `onboar` shows exactly one GET, to the LMS
  `/api/edx_proctoring/v1/user_onboarding/status?...` URL (the panel,
  `OutlineTab` and `ProductTours` share the query). This also established
  that the env has no `EXAMS_BASE_URL`; the #2075 comments and docs that had
  attributed the earlier empty attempt responses to edx-exams were corrected.
- **No onboarding request off the outline tab** — passed.
- **Panel content** — passed, with a dev-only stub on `getProctoringInfoData`
  (3 s delay, then `onboarding_status: 'submitted'`, a link, a release date
  7 days back, not past due, no expiration) and `enableProctoredExams` forced
  on in `getOutlineTabData`: the panel renders the proctored-exams section
  with the submitted status and messaging. Stub removed afterwards
  (`proctoring-dev-stub.patch` in the session scratchpad).
- **Masquerade** — passed.
- **Failure path** — passed.
- **Deferral** — not run by hand: it needs a course with both proctored
  exams and weekly learning goals enabled, and DemoX has neither. Rests on
  `OutlineTab.test.jsx` (`defers the weekly learning goal card until the
  proctoring info has settled`).

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
