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
