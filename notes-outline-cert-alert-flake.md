# Notes: the intermittent "Certificate Available Alert › appears" failure

The effort's working log for the follow-up owed after the #2195
review (`decisions-2195.md` entries 6 and 12). Findings in order,
written as they are confirmed.

## What was seen before (2026-11-17, 2026-11-18)

Twice in about twenty full runs of the package's tests on the #2195
layers, `OutlineTab.test.jsx` "Outline Tab › Alert List › Certificate
Available Alert › appears" failed
(`queryByText('Your grade and certificate status will be available
soon.')` null), passing on the next full run both times and never
failing when its suite ran alone. The case is `master`'s, unchanged,
and came into the package with #2252.

## 1. Reproduced on `bsmith/outline-tab` under load (2026-11-18)

On `bsmith/outline-tab` at `84f00e55`, the head of #2252, in
`frontend-base/`, node v24.22.1.

- The suite alone, once, 17:51 UTC: 127 passed, 4 skipped, 24 s.
- The loop: `npm run test -- src/course-home/outline-tab/OutlineTab.test.jsx
  --coverageDirectory=<a directory per copy>`, eight copies at a time
  on eight cores, five rounds, 17:52 to 17:57 UTC. Coverage on, as the
  `test` script has it. Script: `loop.sh <tag> <rounds> <parallel>
  [jest args]` in the session scratchpad.
- Result, 40 runs: 20 passed whole. **18 failed "Certificate Available
  Alert › appears"**, with the assertion and message of the earlier
  sightings (line 825, `Received has value: null`). **5 failed
  "Scheduled Content Alert › appears correctly"** (line 1005,
  `queryByText('More content is coming soon!')` null), 3 of them in
  runs that also failed the certificate case. No other case failed.
- By round: certificate 3, 3, 5, 5, 2 of 8; scheduled content 0, 4, 0,
  1, 0 of 8.
- Under that load a copy took 40 to 88 s.

So the failure is this branch's, not something the #2195 layers
added; it needs contention, and eight copies of the one suite give a
45% rate for the certificate case. A second case fails the same way.
Both assert with `queryByText` on the line after `await
fetchAndRender()`.

## 2. Minimised: the one case, under load (2026-11-18, 17:58 to 18:10 UTC)

Each line is the same loop with one thing changed; `-t` picks cases.

| Run | What ran | Copies at once | Result |
|---|---|---|---|
| `cert-alone` | `-t 'Certificate Available Alert appears'`, coverage on | 8 | **40 of 40 failed** |
| `cert-alone-solo` | the same | 1 | 0 of 4 failed |
| `cert-alone-nocov` | the same, `--coverage=false` | 8 | 14 of 16 failed |
| `cert-block` | `-t 'Certificate Available Alert'` (five cases), coverage off | 8 | "appears", the block's first case, failed 24 of 24; "renders verification alert", the second, 1 of 24 (line 858, the same `null`); the other three 0 |
| `master-cert-alone` | `master`'s own case, from the repo root: `src/course-home/outline-tab/OutlineTab.test.jsx -t 'Certificate Available Alert appears'`, coverage off | 8 | **0 of 24 failed** |

Confirmed:

- The case fails without the cases before it, so nothing earlier in
  the suite causes it. Alone it is worse (every run) than inside the
  suite (45%).
- It needs load: the same command with no other copy running passes.
- Coverage is not needed.
- Order inside one test file matters: the first case to show the
  certificate alert fails every time, the next one to show it almost
  never.
- `master`'s case under the same load does not fail. The case's body
  is the same in both trees; what differs is the helper it calls and
  what the helper renders.

The loop to debug against: `loop.sh <tag> 1 8 -t 'Certificate
Available Alert appears' --coverage=false`, red in about a minute.

## 3. Read, not yet tested

- The two helpers. `master`'s `fetchAndRender` is `await act(async ()
  => render(<… <OutlineTab /> …>))` and then a `waitFor` for no
  spinner. The port's is `renderRoutes(routes, path)` with no `act`,
  then `findByRole('heading', { level: 1 })` and the same `waitFor`:
  the route is lazy, so nothing is on the page when the render
  returns.
- The alert reaches the page in steps after the tab's first commit:
  `useAlert` adds it in a `useEffect`; `AlertList` renders each alert
  inside `<Suspense fallback={null}>`; the alert's component is
  `React.lazy(() => import('./CertificateStatusAlert'))`
  (`certificate-status-alert/hooks.js`), which suspends the first time
  it renders in a test file and never again. Neither of the port
  helper's waits is for any of that: the heading and the absent
  spinner are true before the alert is on the page, and the fallback
  is `null`.
- Both failing cases assert with `queryByText` on the line after the
  helper. In the whole suite, they are the only two cases that do so
  on a lazy alert no earlier case has shown (certificate status at
  line 825, scheduled content at line 1005; the later certificate
  cases at 858, 1051 and 1076 show a component already loaded). The
  course start alert's cases use `findByText`.

Leading explanation, untested: `master`'s `act` flushes the effect,
the lazy component and the re-render before the helper returns; the
port's helper returns while they are still scheduled, and a
synchronous assertion wins or loses a race with them depending on
load. The first showing of a lazy alert is the long window; the 1 of
24 on the second case is the short one left by the effect alone.

## 4. The empty `act` question (2026-11-18)

Brian, on fixing the helper with `await act(async () => {})`: "is
that a known pattern for this type of thing?"

- **Not in the official docs.** React's `act` page shows no empty
  callback: every example wraps a render or an interaction ("`async
  actFn`: An async function wrapping renders or interactions for
  components being tested",
  https://react.dev/reference/react/act#parameters). Testing Library's
  guidance for content that appears later is to wait for it: "`findBy`
  queries work when you expect an element to appear but the change to
  the DOM might not happen immediately"
  (https://testing-library.com/docs/dom-testing-library/api-async/#findby-queries),
  and its FAQ on act warnings: "Wait for the result of the operation
  in your test by using one of the async utilities like waitFor or a
  `find*` query … Generally speaking, approach 1 is preferred".
- **In this codebase, yes, for a different job.** `master` has ten
  `await act(async () => {});` lines, in
  `courseware/data/apiHooks.test.tsx` (five),
  `courseware/course/bookmark/data/apiHooks.test.tsx` (one) and
  `widgets/discussions/DiscussionsProvider.test.tsx` (four), added by
  the React Query conversion (#2113 to #2140). Each lets pending work
  settle before asserting that something did not happen ("fetches
  nothing on its own"), where there is nothing to wait for. None waits
  for content to appear. The package has none on this branch.
- **What the docs do show is `master`'s own helper shape**: `await
  act(async () => { root.render(…) })`
  (https://react.dev/reference/react/act#await-act-async-actfn).
  `master`'s `fetchAndRender` is `await act(async () => render(…))`;
  the port's dropped the `act`.

Correction to section 3: both trees run React 18.3.1 and
`@testing-library/react` 16.3.3, and in `master` too the tab's content
can arrive after the `act` has returned (the query observers are
notified from a timer). So "`master`'s `act` flushes the alert" is a
guess the reading does not establish. What makes `master`'s case
immune is not known; the loop can test it.

Candidates for the loop, one at a time, as uncommitted edits to the
port's `fetchAndRender`:

- A: `master`'s shape, `await act(async () => renderRoutes(…))`.
- B: an empty `await act(async () => {})` after the two waits.

## 5. Candidate A does not hold (2026-11-18, 18:29 to 18:33 UTC)

Brian: "yeah, let's try A". The port's `fetchAndRender` with its
first line as `await act(async () => renderRoutes(routes, …))`, an
uncommitted edit, reverted after the run.

- `A-cert-alone`: `-t 'Certificate Available Alert appears'`, coverage
  off, eight copies, three rounds. **7 of 24 failed**, the same
  assertion and `null` (by round: 0, 3, 4 of 8).
- The same loop without the edit was 14 of 16 (section 2).

So putting `master`'s `act` back around the render lowers the rate
and does not remove it. `master`'s immunity is not explained by the
`act` alone, and a helper that only flushes is still racing.

## 6. Waiting for the alert in the two cases holds (2026-11-18, 18:50 to 19:10 UTC)

Brian chose it over more work on the helper: "go ahead and do option
1 but don't commit/amend it in yet, i want to see the diff after we
verify it works".

The change, uncommitted on `bsmith/outline-tab`: in "Certificate
Available Alert › appears" (line 825) and "Scheduled Content Alert ›
appears correctly" (line 1005), `expect(screen.queryByText(…))`
becomes `expect(await screen.findByText(…))`. Two lines; no other
case touched.

Baseline taken first for the second case alone, which section 2 did
not have: `sched-alone-before`, `-t 'Scheduled Content Alert appears
correctly'`, coverage off, eight copies: 15 of 16 failed.

With the change, eight copies at a time:

| Loop | Before | With the change |
|---|---|---|
| certificate case alone, coverage off | 14 of 16 failed | 0 of 24 |
| scheduled content case alone, coverage off | 15 of 16 failed | 0 of 24 |
| the certificate block's five cases, coverage off | first 24 of 24, second 1 of 24 | 0 of 24 for all five |
| the whole outline suite, coverage on | 20 of 40 runs with a failure | **0 of 40**; each run 127 passed, 4 skipped |

Not settled by this: the three later certificate cases (lines 858,
1051, 1076) keep `queryByText` on the line after the helper. One of
them failed once in 24 before the change and none in 64 runs after
it (24 of the block, 40 of the suite), which is too few to call the
exposure gone. Not run: lint, the full package suite, the builds.

## 7. Amended into #2252 and pushed (2026-11-18)

Brian: "ok, it looks good, let's amend that in and get the stack
updated", then "ok, so we should push the stack".

- The two lines went into the layer's port commit, where the cases
  they change are (the layer's second commit only adds tests), as a
  fixup squashed by `git rebase -i --autosquash`. The port commit's
  message gained one paragraph. `bsmith/outline-tab`: `84f00e55` to
  `0e9a8e22` (port commit `74b0eb31` to `296118dd`).
- A slip on the way: the first reword went through git's editor path,
  whose cleanup deleted the message line beginning "#2195, whose
  suites…". `git range-diff` showed it; the message was set again with
  `git commit --amend --cleanup=whitespace -F` and now differs from
  the old one by the added paragraph alone.
- `gh stack rebase --upstack --no-trunk --remote upstream` replayed
  the three layers above: #2260 `35bdb046` to `2a1754c3`, #2261
  `e0cef2b8` to `aa5cc29b`, #2262 `53eaf560` to `371a0e6a`. Each
  layer's own patch (`git patch-id`) and message are unchanged, and
  each tree differs from the one it replaces by the two lines.
- Checks before the push: lint on the amended layer and at the port
  commit alone; tests, `build` and `build:ci` at all four layers and
  at the port commit alone, all passing with the counts they had
  (42/569/11, 43/643/11, 46/792/11, 49/846/17; port commit 41/525/11,
  lines 98.39). The four-layer run took eight minutes; for a change to
  one test file the amended layer and the top would have been enough.
- `gh stack push --remote upstream` pushed the six open branches; the
  remote heads and the six PRs' heads equal the local ones, and
  GitHub credits both authors on `296118dd`. #2249 and #2251 did not
  move.
- `decisions-2252.md` has entries 20 (the change) and 21 (the checks);
  `pr-body-2252.md` carries them and one sentence under Testing. The
  body on GitHub was updated from it on Brian's word ("ok, update
  the PR body for 2252"), one `gh pr edit`, read back equal to the
  file.
