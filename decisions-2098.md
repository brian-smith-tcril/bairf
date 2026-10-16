# Decisions — stop the courseware gate queries refetching from components under the gate (#2098)

Layer on top of #2084. The diagnosis and the ownership fix were settled in the
plan on issue #2098; entries here record choices made after it.

1. **`QueryOptions` is declared locally in `courseware/data/apiHooks.ts`, not
   shared.** `course-home/data/apiHooks.ts:28-30` already declares
   `interface QueryOptions { enabled?: boolean; }` as a module-private type, and
   this layer needs the same shape for `useCoursewareMetadata` and
   `useCoursewareOutline` (`useIsCourseLoaded` and `useSequenceIds` take no
   option; see entry 4). The courseware module declares a matching local copy.

   Sharing it was considered. The best home would be a new
   `src/data/query-options.ts`, beside `http-error.ts`, whose `RequestError` is
   already a type both feature hook modules import from `@src/data/`. It was
   rejected because no such module exists yet: `src/` has no shared types module
   at all, so sharing would mean creating a file for a one-field interface that
   mirrors React Query's own option name and is unlikely to drift. If a suitable
   shared module appears later, importing from it becomes the right move and
   both copies should fold into it.

2. **The commit type is `refactor:`.** The change restructures who fetches the
   courseware gate queries — the owner fetches, readers under the gate
   subscribe — and nothing is broken today, so `fix:` would imply a bug that
   isn't there. `perf:` describes the outcome (three requests per gate query
   become one) and is allowed by the shared openedx commitlint config, but this
   repo has not used it, while the rest of the React Query migration landed as
   `refactor:`; staying consistent with those commits wins.

3. **Suites that render a gated component on its own mount the owner, not a
   seeded cache — the plan was wrong to expect `seedQueryData`.** Three suites
   (`CourseBreadcrumbs`, `SequenceNavigation`, `UnitNavigation`; 13 cases)
   relied on the component under test fetching the gate queries itself, against
   the endpoints `initializeTestStore` already mocks. Seeding did not fit: the
   two navigation suites use `setupTest`'s `render`, which builds its client
   internally with no way to reach it, and seeding would mean writing each
   query's normalized result shape by hand, while the components read only
   `isSuccess` and `courseAccess.hasAccess` — a stand-in shape would let those
   tests claim more than they check. Instead `src/tests/MountCourseQueryHooks.tsx`
   exports a component that calls `useCoursewareMetadata`,
   `useCoursewareOutline` and `useCourseHomeMeta` for the course, and each
   suite renders it beside the component under test. That is the production
   shape — `CoursewareContainer` fetches, the components under it read — using
   the real hooks and the existing mocks. `apiHooks.test.tsx` calls the three
   hooks directly inside `renderHook`, alongside the gate hook, so each test
   shows what it mounts; a shared hook for that was tried and read worse than
   the three calls it hid.

   **Naming.** The helper is named for what it does — it mounts query hooks —
   not for the state it produces or the hook that reads its results. Names
   built on `useIsCourseLoaded` (`CourseLoadedQueries`) pointed at the reader
   rather than the fetcher and read as "the queries of a loaded course";
   `Courseware…` claimed the wrong set (one of the three is course-home's, and
   courseware has sequence and sidebar queries this does not mount); verb-led
   hook names (`useFetch…`, `usePopulate…`) read awkwardly. A generic
   `MountHook` (one element per hook, the hook passed as a value) was sketched
   and set aside as more machinery than three call sites need, but it gave the
   vocabulary: *mount* for the action, *query hooks* for what is mounted, and
   *course* for the course-level queries as opposed to the sequence query
   `CoursewareContainer` also mounts.

   **Home.** It lives in its own TypeScript file beside
   `src/tests/MockedPluginSlot.jsx`, the existing place for render-tree test
   helpers. `setupTest.js` was the first home, but it is JavaScript, so
   `react/prop-types` required a `propTypes` declaration for `courseId` —
   more PropTypes to remove later. `src/courseware/course/test-utils.jsx`
   (the courseware test helpers, closer in scope) has the same problem, and
   converting it is out of scope. A prop-less local copy in each suite would
   have avoided the rule too, at the cost of three copies. In a `.tsx` file
   the prop is typed and the rule is satisfied, which is why no `.tsx` file in
   the repo declares `propTypes`; a one-component file was judged better than
   either new PropTypes or duplication.

4. **`useIsCourseLoaded` never fetches; `useSequenceIds` follows, and neither
   takes an option.** The plan gave both an `{ enabled }` option, with the
   gated components passing `false` — the per-call-site shape #2083 uses for
   the tab readers. But no caller wants it on. The two that took the default
   `true`, `redirects.ts:248` and `CoursewareContainer.tsx:46` (through
   `useSequenceIds`), run inside `CoursewareContainer`'s own render, which
   already fetches all three queries directly (`CoursewareContainer.tsx:32-33`,
   `redirects.ts:249-250`), so their observers only deduped. Three shapes were
   weighed:
   - *Keep the option, default `true`.* Clearest at the call site, but an
     option nobody needs, and forgetting `{ enabled: false }` silently brings
     back the duplicate requests this change removes — nothing fails, and the
     trace showed it only turns up when someone counts requests.
   - *Default it to `false`.* Still an option nobody needs, and it inverts
     React Query's own default, so `{ enabled: true }` at a call site would
     read as the surprise.
   - *Always non-fetching* (chosen). The simplest, and its misuse fails
     loudly: a caller with no owner above it stays `false` forever, which
     breaks the page and any test of that component. The name already fits a
     read — it asks whether the course is loaded.

   It carries no comment. A draft named `CoursewareContainer` as the owner, but
   "never fetches" restated the `{ enabled: false }` below it, "every caller
   runs inside `CoursewareContainer`" read as a restriction when any fetching
   observer of the same queries will do, and a trimmed version ("stays false
   until something else fetches these queries") still only described what a
   disabled query does. #2083's disabled readers carry none either, since
   `{ enabled: false }` is React Query's own vocabulary; the owner is recorded
   here and in `MountCourseQueryHooks`' comment, where the tests mirror it.

   `useSequenceIds` has no query of its own — `useIsCourseLoaded` is its only
   link to React Query, and its other reads are model-store selectors — so it
   became non-fetching with no change of its own, and its pass-through option
   went with it. The four gated call sites are back to their original
   argument lists. The three query hooks keep `{ enabled }`:
   `useIsCourseLoaded` uses it internally, and B2 (#2085) and B3 (#2086) need
   it on `useCourseHomeMeta` for their gated readers.

   **For #2089 (D3):** it converts `useSequenceIds`' model-store reads onto the
   outline query, which gives the hook a query observer of its own. By the
   same reasoning that observer should read without fetching —
   `CoursewareContainer` owns the outline fetch, through
   `useCoursewareRedirects`.

   The hook tests were checked by making the gate fetch again: with the three
   internal `{ enabled: false }` flipped to `true`, *fetches nothing on its
   own* (both the `useIsCourseLoaded` and the `useSequenceIds` case) and
   *reads the owner's result without fetching again* fail — 0 requests
   becoming 3, and 3 becoming 6, one refetch of each gate endpoint.

5. **Four #2071 tests got their own layer, #2100 (PR #2101), below this one.**
   With the owner/reader split, four `useIsCourseLoaded` tests from #2071
   (*pending*, *lacks access*, *outline fails*, *a query fails*) failed. The
   hook was not at fault: each registered its special handler and then called
   `mockHappyPath()`, which replaced it, and asserted before any response
   settled, so they had never tested the states they name — deleting the
   special handlers left them green. That repair is #2100's, split out the way
   #2078 was so this layer stays about who fetches. This layer builds on its
   version of the block: `renderLoaded` keeps #2100's optional `queryClient`
   argument and additionally calls the three query hooks, and
   `makeWrapper` lets the reader test mount a second hook on the same client.
