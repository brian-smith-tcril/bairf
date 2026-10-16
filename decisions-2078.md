# Decisions — make the courseware redirect-rule tests actually assert (#2078)

1. **A layer *below* #2074, not inside it and not a PR against master.** The
   13 un-awaited `waitFor` calls predate the migration (#1501, 2024-10-28) and
   #2074 only moves them, so fixing them inside #2074 would blur a faithful
   move with a test rewrite. A plain PR against master would keep #2074 clean
   too, but #2074 would only pick the fix up after that PR landed; as a stack
   layer underneath, #2074 rebases onto it now and lands with the moved tests
   already correct. So: `gh stack unstack`, `gh stack init --base master
   bsmith/redirect-tests-assert bsmith/courseware-slice-teardown
   progress-exam-attempts-query`, fix on the new bottom, `gh stack rebase
   --no-trunk`. The fix is therefore written against master's file
   (`CoursewareContainer.test.jsx`, positional `check*` signatures); #2074's
   move carries it into `redirects.test.ts` (options-object signatures) via
   the conflict resolution: take #2074's side of the container file (the
   tests leave it) and re-apply the same corrections to `redirects.test.ts`
   from a patch prepared earlier in #2074's shape.

2. **`await` alone would have turned vacuous tests into failing ones: the
   unwired mocks become request assertions on `axiosMock.history`.** Six
   tests declared `const getSequenceForUnitDeprecated = jest.fn();` and two
   `const getResumeBlock = jest.fn();` — fresh local mock functions that
   merely share a name with the api functions. Nothing connected them:
   not passed to the rule, no `jest.mock` of the module, no `jest.spyOn` on
   the export. The rules import the real functions from `./data/api` at
   module load and call those regardless of what a local variable in the
   test is named, so `expect(mock).toHaveBeenCalled()` asked whether an
   unused local was called — always no, hidden only because the un-awaited
   `waitFor` dropped the failure.

   What the author wanted to check — "the rule looked up the parent sequence
   / fetched the resume block" — is observable one layer down without any
   mock on the function: the real api function's only side effect before
   parsing is `getAuthenticatedHttpClient().get(url)`, and the tests already
   intercept that transport with `axiosMock.onGet(...)`. axios-mock-adapter
   records each handled request in `axiosMock.history.get` (a fresh adapter
   per test in `beforeEach`, so the history is per test), so the assertion
   becomes "a GET to the endpoint is in the history":
   `expect(axiosMock.history.get.map((req) => req.url)).toContain(apiUrl)`.
   The not-a-unit branch must short-circuit without touching the network, so
   its `not.toHaveBeenCalled()` became `expect(axiosMock.history.get).toHaveLength(0)`
   — stronger than the original would have been even if wired, since it rules
   out any request.

   Why not wire the mock properly instead: `jest.mock('./data/api')` would
   replace the module for the whole file, and the container-rendering tests in
   the same file drive the real api functions against the mocked network;
   `jest.spyOn` on the namespace import works under Babel's CJS interop but is
   fragile and would still need a `mockImplementation` to keep the real lookup
   (or no parent is ever found). The history check needs no module surgery and
   exercises the real function end to end — including its
   `Object.values(data.blocks)` parsing, which is what exposed the
   `parent: {...}` response mocks in the other block as never having matched
   the api (entry 3). It also required the second block's `apiUrl` to be the
   `href` string like the first block's, not a `URL` object, since history
   entries store the URL as a string.

   The two `checkResumeRedirect` "returns" cases wait for the request, flush
   one macrotask (`setTimeout(resolve, 0)`) so the `.then` after the mocked
   response has run, then assert `navigate` was not called — asserting "not
   called" inside `waitFor` would pass trivially on the first poll.

3. **The rule is the source of truth for the four expectations that had never
   matched it.** `git log -S` shows `checkUnitToSequenceUnitRedirect`'s and
   `checkResumeRedirect`'s `navigate` targets unchanged since #1501 (only
   #2074's move touches those lines), and the pre-#1501 version already
   navigated unit-to-sequence to `/course/:courseId/:parentId/:unitId`. So
   every correction is test-side. Direction was decided by reachability and by
   the describe block each test sits in:

   - **Unit id (`isPreview` true › unit-to-sequence).** Expected
     `/course/courseId/sequence_1`. The rule has exactly three `navigate`
     targets — `${sequenceUrl}/${unitId}`, or `/course/:courseId` in the
     no-parent and not-a-unit branches — and none of them is a parent-sequence
     URL without the unit, so no argument values could reach the original
     expectation; the URL side had to be wrong. The test's own name, "parentId
     and sequenceId", is the pair the rule joins (`sequenceId` here is
     `unit_1`). Corrected to include `/unit_1`.
   - **`/preview` prefix (same test).** The prefix depends only on the ninth
     argument, `isPreview`, which the test passes as `true`, and the test sits
     in `describe('isPreview equals true')` — the block #1501 created for the
     prefixed branch it introduced. Params and block agree the scenario is
     preview-on, so the URL must carry `/preview`. Flipping the argument
     instead would make a test in the "true" block exercise the "false"
     branch, which the sibling block covers. Corrected to
     `/preview/course/courseId/sequence_1/unit_1`.
   - **Where params and block disagree, the block wins (`isPreview` false ›
     unit-to-sequence).** Its three tests passed `true` for `isPreview` inside
     `describe('isPreview equals false')`. The block is the author's stated
     intent; the argument is a copy-paste artifact. Flipped to `false`; the
     first test now expects `/course/courseId/sequence_1/unit_1`. Between the
     two blocks both prefix branches are exercised, which the original never
     managed.
   - **Response shape (`isPreview` false › unit-to-sequence).** Those mocks
     answered `parent: { id }` / `parent: { children }`. `getSequenceForUnitDeprecated`
     has read `Object.values(data.blocks)` since #803 (2022-02-17), two years
     before the tests were written, so the "found parent" case threw inside
     the api and hit the error branch — the only reason its sibling "no parent
     id" case coincidentally passed. Both now mock the `blocks` shape the api
     reads; the "no parent" case exercises the real no-parent branch (the
     `apiUrl` type fix is in entry 2).
   - **Resume "returns after calling getResumeBlock" (`isPreview` true).**
     Passed `firstSequenceId: 'sequence_1'` with a response carrying neither
     `sectionId` nor `unitId`, so the rule's `else if (firstSequenceId)`
     fallback navigated to `/course/courseId/sequence_1` — the test's premise
     ("returns") contradicted its inputs. Now passes `null`, the one input
     under which the rule does nothing, which is what the sibling "calls
     navigate with firstSequenceId" case already covers from the other side.
   - **Resume "calls navigate with unitId" (`isPreview` false).** Expected
     `/preview/course/courseId/section_1/unit_1` with `isPreview: false`;
     the rule prefixes only when true. Corrected to
     `/course/courseId/section_1/unit_1`.

4. **Test-only.** `CoursewareContainer.tsx` and `redirects.ts` are untouched;
   the diff is one file (56 insertions, 55 deletions) on this layer, and
   `redirects.test.ts` differs from its upstream version by the equivalent 55/54
   once #2074 is rebased on top. Lint and types clean; `CoursewareContainer.test.jsx`
   70/70 here, `redirects.test.ts` 51/51 at the top with all 13 `waitFor`
   calls awaited and no `jest.fn()` in the file other than `navigate`.

5. **Branch name carries the `bsmith/` namespace.** Stack layers push to the
   openedx `upstream` remote, so the branch is `bsmith/redirect-tests-assert`
   (first `init` used the bare name; re-done). `progress-exam-attempts-query`
   and the parked `retire-course-home-slice` predate that rule.

6. **`gh stack unstack` left the merged history grouped.** It reported that
   some PRs were "queued for merge or have auto-merge enabled" and left local
   tracking alone, but on GitHub the two open PRs did come out of the stack
   while the 13 merged ones stayed grouped — which is what we wanted. Neither
   open PR was queued or auto-merging; the message appears to be the tool
   misreading the merged PRs. Local tracking was then dropped with
   `--local` and re-created with `init`.
