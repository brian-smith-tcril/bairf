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

5. **The validate workflow runs on pushes to `frontend-base`.** Added
   2026-11-10 as the bottom commit of this PR, Brian's call, after #2217
   merged and this PR's `codecov/project` status went red: "96.16%
   (-3.84%) compared to 2764e40". `validate.yml` ran on pushes to
   `master` and on every pull request; `frontend-base.yml` runs on pushes
   to `frontend-base` that touch `frontend-base/`. So the merge commit's
   Codecov report held one upload, the `frontend-base` flag (6 files, 9
   lines, 100%), while this PR's head held that plus the unflagged root
   suite (374 files, 6028 lines, 96.16%), and the project status
   (`target: auto`, `threshold: 0%` in `codecov.yml`) read a whole-repo
   number against a package-only one. #2221 and #2234 compare against
   the PR below each and pass; every PR into `frontend-base` would show
   this once the PR below it merged. With the branch in the push list,
   every merge into it uploads the root suite. GitHub reads the workflow
   file from the pushed commit, so the merge of this PR is the first such
   push and `master`'s file is untouched; the list rides into `master`
   at the swap. Considered and not taken: a project status scoped with
   `flags: [frontend-base]` (Codecov docs, "Commit status", heading
   "flags": "the combined coverage from those flags will be reported"),
   which adds a passing package-only status but leaves the whole-repo
   one red, or with `default: false` drops it for `master` PRs too; no
   status key selects a PR's target branch.

6. **Two commits, landed by rebase merge.** Decided 2026-11-10 with
   entry 5, Brian's call. The validate trigger and the console hook are
   separate facts for `frontend-base`'s history, so the PR lands as a
   rebase merge rather than the squash a layer usually gets. The
   throwaway test and its removal, the branch's first two commits, are
   squashed into the hook commit beforehand, so neither the failing test
   nor its removal lands; the PR's first CI run, red on the throwaway,
   stays the evidence that the hook fails a test. The hook commit's
   package tree is unchanged by the squash.
