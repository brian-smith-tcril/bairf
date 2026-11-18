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

Not yet known: whether either case fails when it runs without the
cases before it; whether coverage matters; the cause.
