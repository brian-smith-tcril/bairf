## Summary

Make four `useIsCourseLoaded` tests in `courseware/data/apiHooks.test.tsx` actually assert. Each registered its special handler (a pending request, a 403, a 500, `has_access: false`) and then called `mockHappyPath()`, which replaced it, and each asserted `false` as soon as three requests had been dispatched, before any response arrived. So they never exercised the state they are named for: deleting the four special handlers left all four green. Test-only; `apiHooks.ts` is untouched. Stacked on #2099 (its one-argument metadata key) and below #2098, whose owner/reader split is what exposed them. Part of #1946 as test hygiene on code the migration touches. Closes #2100.

## What changed

- **Special handlers are registered after `mockHappyPath()`.** axios-mock-adapter keeps one handler per method and URL and splices a new one over an existing match, so registering last is what makes the pending/403/500/no-access handler the one that answers.
- **The tests wait for the queries to settle, not for requests to be sent.** The failure and no-access cases wait for `queryClient.isFetching()` to reach 0; the pending case, whose client never goes idle, waits for the other two queries to succeed.
- **Each test asserts its own precondition before the result**: the metadata query is `pending`; the outline or metadata query is in `error`; `courseAccess.hasAccess` is `false`. A test whose setup stops applying now fails instead of passing.
- **`renderLoaded` takes the client as an optional argument**, so the tests can inspect the client the hook is using; the two tests that only read `result.current` are unchanged. A small `statusOf` helper reads `getQueryState(…)?.status`.

## Testing

`npm run types` and `npm run lint` clean; `apiHooks.test.tsx` 38/38; full suite 113 suites, 1137 passed, 3 skipped. Checked both directions on this layer's base: with the old tests, deleting the four special handlers leaves them green; with the new ones, deleting any special handler fails its test.

## Provenance

All four arrived in #2071 ("derive the courseware loaded gate and sequence ids from queries"). They surfaced while implementing #2098: splitting `useIsCourseLoaded`'s observers into an owner that fetches and a reader that does not changes when the queries settle relative to the old assertion, so the reader saw the happy-path `true` and all four failed. Split out as its own layer, like #2078 / #2079, so #2098 stays about who fetches.

## Decisions

<details>
<summary>Full decision log</summary>

# Decisions — make the useIsCourseLoaded tests actually assert (#2100)

1. **A layer of its own, between #2084 and #2098.** The four vacuous tests came
   from #2071; #2098 only exposed them. Its owner/reader split changes when the
   gate queries settle relative to the old assertion, so all four went red on
   that layer without the hook doing anything wrong. Fixing them inside #2098
   would mix a repair of #2071's tests into a change about who fetches, so it
   is split out the way #2078 (PR #2079) was for the redirect-rule tests. It
   sits above #2084 because the precondition assertions build
   `courseHomeQueryKeys.metadata(courseId)`, the one-argument key #2084
   introduced (master's still takes `rootSlug`), and below #2098 so that layer
   lands on tests that already check something.

2. **Two defects, and fixing either alone is not enough.**
   - **The special handler never applied.** Each test registered it first and
     then called `mockHappyPath()`. axios-mock-adapter 2.1.0 keeps one handler
     per method and URL: `addHandler` (`src/index.js:272-277`) splices a new
     handler over an existing match rather than adding a second, so the
     happy-path 200 replaced the pending, 403, 500 or `has_access: false`
     handler before the hook rendered.
   - **The assertion ran before any response arrived.**
     `waitFor(() => expect(axiosMock.history.get.length).toBeGreaterThanOrEqual(3))`
     passes once three requests have been *dispatched*, which happens as the
     hook's observers subscribe on mount. The mock responses resolve
     asynchronously after that, so the queries were still `pending` and
     `useIsCourseLoaded` was `false` for every input. The `false` the tests
     checked was the hook's answer before anything had loaded.

   Deleting the four special handlers outright left all four green, on this
   layer's base with no other change. Swapping the order alone would still
   assert before anything settled; waiting alone would wait for the
   happy-path responses and find `true`.

3. **The special handler is registered after `mockHappyPath()`.** It then
   replaces the happy-path handler for its URL instead of being replaced by it.
   `mockHappyPath()` still registers all three URLs, so the two queries a test
   is not about keep succeeding.

4. **Wait for the queries to settle, not for requests to be sent.** The three
   failure and no-access tests wait for `queryClient.isFetching()` to reach 0,
   so the `false` they assert is the hook's answer to the real outcome, and a
   hook that treated a failed query as loaded would read `true` there and fail.
   The pending test cannot wait for idle, because its never-resolving request
   keeps the client fetching; it waits for the other two queries to succeed
   and then checks that the metadata query is still `pending`.

5. **Each test asserts its own precondition before the result.** The metadata
   query is `pending`; the outline or metadata query is in `error`;
   `courseAccess.hasAccess` is `false`. This is what stops defect 1 from
   coming back unnoticed: if the handlers are reordered again, or a URL stops
   matching, the precondition assertion fails instead of the test silently
   running the happy path. Deleting any one special handler now fails its
   test.

6. **`renderLoaded` takes the client as an optional argument.** The tests have
   to inspect the client the hook is using (`isFetching`, `getQueryState`,
   `getQueryData`), and `renderLoaded` built one inline, inside the wrapper,
   with no reference out. It now accepts one, defaulting to
   `createTestQueryClient()`, so the two tests that only read `result.current`
   (*is true once all three queries resolve*, *is false without a courseId*)
   are unchanged. As a side effect the client is created once per test rather
   than inside the wrapper's render — that inline construction was only safe
   because `renderHook` re-renders the hook's component and not its wrapper.
   `statusOf` is a small local helper for the three `getQueryState(…)?.status`
   reads.

7. **The explicit per-test waits were kept over two shorter shapes.**
   - *Returning the query results from `renderHook`*, so each test waits on
     `result.current.outline.isError` and needs no client reference. Rejected
     because it changes the shape of every test in the block — the two
     healthy tests would move to `result.current.isLoaded` — and a single
     precondition wait does not guarantee the other two queries have settled;
     making it as strict as `isFetching() === 0` puts the lines back.
   - *A `renderSettled` helper* that creates the client, renders and waits for
     idle. Rejected as a new helper for three uses that the pending test
     cannot share.

   Flushing promises or timers (`await act(() => new Promise(setImmediate))`)
   was not considered further: it is a timing assumption, the kind that made
   the old tests vacuous. Hand-resolved `reply` promises give more control but
   cost more code than either shape above.

8. **Test-only.** `courseware/data/apiHooks.ts` is untouched; the diff is
   `src/courseware/data/apiHooks.test.tsx` alone (36 insertions, 14
   deletions). `npm run lint` and `npm run types` clean;
   `apiHooks.test.tsx` 38/38; full suite 113 suites, 1137 passed, 3 skipped.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
