# Manual testing — fail frontend-base package tests on unexpected console output (#2218)

Test tooling only; nothing renders differently. The evidence is two CI
runs on openedx/frontend-app-learning#2219, in the fail-then-pass shape.

## Verify

- [x] **Run 1, red** — head `09afe9ba`, commit 1 with the throwaway test.
      The `frontend-base` workflow's `test` job fails:
      `FAIL src/console-noise.test.ts` with "Expected test not to call
      console.warn()" and the printed `unexpected`; `src/app.test.ts` and
      `src/Main.test.tsx` pass; the job log contains no React Router
      future flag warning, so the two silenced messages are gone from the
      output as well as from the failures. `codecov/project` is red on
      this run, "96.15% (-0.01%) compared to f8a64c1": the test step
      failed before the coverage step, so the commit has only the legacy
      upload and the combined number lost the package's lines; the legacy
      `tests` job, commitlint, version-check and the CLA are green.
- [ ] **Run 2, green** — commit 2 removes the throwaway: 2 tests pass,
      no console block in the `test` job log, every check green.

## Left to the automated suite

- The hook itself is exercised on every run from now on: any new
  `console.warn` or `console.error` in a test fails that test.
