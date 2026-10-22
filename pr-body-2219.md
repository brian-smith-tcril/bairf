## Summary

The frontend-base package's test suite now fails any test that prints an unexpected `console.warn` or `console.error`, so every later port lands with a silent suite and the noise `master`'s suite has accumulated (2,101 console blocks in one run) does not move across with the tests. The two react-router 6 future flag warnings, which belong to the shell's router (openedx/frontend-base#325), are silenced by name. **No user-facing change**; test tooling only.

Part of #1905. Resolves #2218. Stacked above #2217.

## What changed

- `frontend-base/package.json`, lockfile: `jest-fail-on-console` as a dev dependency.
- `frontend-base/src/setupTest.js`: `failOnConsole` with a `silenceMessage` list, one regex per silenced message grouped under the URL of the issue that owns it; its only group is the two react-router flags.
- A throwaway test warned once in the first commit so the `test` job showed the failure; the second commit removes it. The PR squashes.

## Testing

In `frontend-base/`: `npm test` with the throwaway fails that one test with "Expected test not to call console.warn()" and passes the other two, the two router warnings no longer printing; without it, 2 tests pass at 100% lines with no console block; lint and build green. CI: run 1 red on the throwaway, run 2 green, recorded below.

## Decisions

What was decided while building this layer; the mechanism and the inventory of `master`'s noise are in #2218.

<details>
<summary>Full decision log</summary>

# Decisions — fail frontend-base package tests on unexpected console output (#2218)

Decisions made while implementing. The mechanism, the inventory of
`master`'s noise and the commit shape are in #2218's plan and are not
repeated.

1. **Silence, not allow.** `jest-fail-on-console` offers `allowMessage`
   (the test passes, the message still prints) and `silenceMessage` (the
   test passes, nothing prints). The two react-router messages go through
   `silenceMessage`: the point of the layer is a silent suite, and a
   message that prints on every run is noise whether or not it fails.

2. **The silenced list names the two flags, not the warning family.** A
   first cut matched the `⚠️ React Router Future Flag Warning` prefix,
   which would also have swallowed a warning for any of the other six v7
   flags react-router 6.30 knows, none of which
   https://github.com/openedx/frontend-base/issues/325 covers. Each entry
   is one regex anchored on the prefix and the flag name in backticks, so
   a warning for another flag fails the test that triggers it.

3. **Shape of the list: inline under `silenceMessage`, grouped by issue
   URL, no prose comment.** Written for the day it holds ten entries from
   several issues: a URL line above the patterns it owns, patterns as
   plain regex literals, the matcher a one-line `some`. Inline rather than
   a file-level constant because nothing else reads the list and the
   `failOnConsole` call is then the one block a reader opens for console
   handling; the per-call allocation of the array is not measurable.
   Code comments cite the issue by full URL, since GitHub's `owner/repo#N`
   shorthand only renders in GitHub markdown. A sentence explaining the
   list was dropped: the option name and the shape already say it.

4. **No muting convention in the setup file.** The issue's draft had the
   "mock the console method in the test" rule written as a comment beside
   the hook; it restates what the library's failure message tells the
   developer at the moment it matters, so the rule lives in #2218 and the
   acceptance box for it was dropped. The jest config does not restore
   mocks automatically, so a test that mocks a console method restores it
   at its end.

</details>

<details>
<summary>Manual testing</summary>

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
- [x] **Run 2, green** — head `8d56fdc5`, commit 2 removes the throwaway:
      `src/app.test.ts` and `src/Main.test.tsx` pass, 2 of 2; zero console
      blocks in the `test` step's log; all eight checks green, with
      `codecov/project` back at "96.16% (+0.00%) compared to f8a64c1".
      The only extra output in the job is a Browserslist notice that the
      package's `caniuse-lite` data is six months old (twice in the Test
      step, once in Build (CI)); that is the package lockfile's pin, not
      a console call, and not something the hook sees. After the
      `caniuse-lite` bump in #2217's first commit, the rerun on `7c35d8c2`
      is green with no Browserslist notice in the job (#2217's rerun on
      `f5b78764` likewise).

## Left to the automated suite

- The hook itself is exercised on every run from now on: any new
  `console.warn` or `console.error` in a test fails that test.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
