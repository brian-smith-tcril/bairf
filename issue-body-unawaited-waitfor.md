Fourteen `waitFor` / `act(async …)` calls in the test suite are not awaited, so the assertions inside them cannot fail the test. They are all in two files:

| File | Count | Notes |
|---|---|---|
| `src/courseware/course/Course.test.jsx` | 3 | all inside tests already marked `it.skip`, see #1669 |
| `src/courseware/course/sequence/Sequence.test.jsx` | 11 | 10 `waitFor(() => …)`, 1 `act(async () => …)` |

Thirteen of the fourteen come from #1391 (August 2024, the frontend-build / frontend-platform major upgrade), which removed the `await` from these lines. The fourteenth is the upgrade-panel assertion #1885 (April 2026) rewrote from the notification-tray one, keeping the shape.

**What happens when they are awaited.** On `master`, adding `await` to every one of them:

- `Course.test.jsx`: no change, because the three tests are skipped. #1669 describes them: the test renders the error page where the sequence should be and passes anyway.
- `Sequence.test.jsx`: 11 of 15 tests fail. Six of the blocks contain `expect(screen.findByText(…)).toBeInTheDocument()`, which passes a promise to the matcher and cannot pass on its own. Three cannot find the navigation buttons or links they click. The two `Upgrade Panel feature` cases fail with `Timed out in waitFor` and `Unable to find role="button" and name /Close sidebar/i`.

**Expected.** Every `waitFor` and `act` is awaited, every `findBy*` is awaited, and the affected tests assert what they say: the navigation cases click a rendered button or link and observe the handler, and the upgrade-panel cases see the panel render and close. The `it.skip` cases in `Course.test.jsx` are un-skipped or replaced. Fixing this resolves #1669 as well.

> [!NOTE]
> This issue was authored by Claude (Claude Code) and reviewed before posting.
