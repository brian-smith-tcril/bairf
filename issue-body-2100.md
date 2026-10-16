Part of #1946 — Redux → React Query migration (Stage 1). Not a conversion: a test-hygiene fix, filed here because the `useIsCourseLoaded` tests it repairs are the ones #2098 builds on, and they should assert something before that layer changes the hook.

**What's wrong.** Four `useIsCourseLoaded` tests in `src/courseware/data/apiHooks.test.tsx` never set up the state they are named for:

- *is false while any query is pending*
- *is false when the learner lacks access*
- *is false when the outline fails*
- *is false when a query fails*

Each registers its special handler — a never-resolving metadata request, `has_access: false`, a 403 outline, a 500 metadata request — and **then** calls `mockHappyPath()`. axios-mock-adapter (2.1.0) replaces an existing handler with the same method and URL rather than adding a second one (`addHandler`, `src/index.js:272-277`), so the special handler is gone before the hook renders and all three queries succeed.

They still pass because they assert `false` as soon as three requests have been *dispatched* (`waitFor(() => expect(axiosMock.history.get.length).toBeGreaterThanOrEqual(3))`), before any response settles — `useIsCourseLoaded` is `false` at that moment for every input. Deleting the four special handlers outright leaves all four tests green.

**How it surfaced.** #2098 splits the hook's observers into an owner that fetches and a reader that does not. That changes when the queries settle relative to the assertion, so the reader sees the happy-path `true` and all four fail — not because #2098 broke anything, but because the scenarios they name were never set up.

**Provenance.** All four arrived in #2071 ("derive the courseware loaded gate and sequence ids from queries", 2026-09-18).

**Precedent.** #2078 (PR #2079) fixed the same class of problem in the courseware redirect-rule tests — un-awaited `waitFor` calls and mocks wired to nothing, from #1501 — as its own `test:` layer, so that the layer building on those tests stayed about its own change. 65dbeb86 (PR #2060) did the same for four fire-and-forget `waitFor` calls in `Course.test.jsx`.

**Tasks**
- Register each special handler **after** `mockHappyPath()`, so it replaces the happy-path handler instead of being replaced by it.
- Wait for the queries to settle before asserting, instead of for requests to be dispatched: the pending case waits for the other two queries to succeed, and the others wait for the client to go idle (`queryClient.isFetching() === 0`) on a client the test passes to `renderLoaded`.
- Assert each test's own precondition before asserting `false` — the metadata query is `pending`; the outline and metadata queries are `error`; `courseAccess.hasAccess` is `false` — so a test whose setup silently stops applying fails instead of passing.
- Keep the change test-only; `courseware/data/apiHooks.ts` is not touched.

**Verify:** the `useIsCourseLoaded` block is green, and deleting any one test's special handler makes that test fail.

> [!NOTE]
> This issue was authored by Claude (Claude Code) and reviewed before posting.
