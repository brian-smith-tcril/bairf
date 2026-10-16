# Decisions — stop the progress tab data refetching from components under the tab (#2103)

Layer on top of #2104 (PR #2105). The diagnosis, the ownership fix, the
non-fetching reader shape, the plugin contract and the commit type were
settled in the plan on issue #2103; entries here record choices made while
implementing, and confirm the plan's expectations against the code.

1. **`useProgressData()` never fetches and takes no option.** The shape
   `decisions-2098.md` entry 4 settled for `useIsCourseLoaded`: every one of
   the 22 call sites renders under `ProgressTab`, which fetches the same key
   from the same `useParams()` values, so no caller wants the reader to fetch.
   A default-`true` option would let a new reader silently reintroduce the
   duplicate request; always-non-fetching fails loudly instead (a reader with
   no owner reads `undefined` forever). `useExamsData()` reads through it and
   inherits the shape — see entry 3 for why no default serves both of its
   placements.

2. **Plain `enabled`, no `!!courseId` guard.** Every sibling course-home hook
   with the option guards on `courseId`; `useProgressTabData` never has, and
   an undefined `courseId` cannot happen on its route. Adding the guard would
   be a behaviour addition, not a faithful change, so the inconsistency in the
   diff is deliberate.

3. **The plugin contract narrows, and that is `refactor!:`.** `useExamsData()`
   (documented in `progress-tab/README.md`) and `useProgressData()` were
   fetching observers and now only read what `ProgressTab` has fetched. In a
   progress-tab slot — the documented use — they return exactly what they did.
   Anywhere else they now return `null` / `undefined` instead of triggering
   the fetch. Keeping a fetching default so the off-tab use kept working was
   rejected: `useExamsData()` is built on `useProgressData()`, so that shape
   puts the duplicate request back into the documented use (a widget under the
   tab mounts after the gate, finds the data stale, refetches). No default
   serves both placements. The off-tab use gets a migration path instead —
   mount `useProgressTabData(courseId)` alongside the reader, the same
   owner-fetches / reader-reads mechanism `src/tests/MountCourseQueryHooks.tsx`
   uses — stated in the README sentence, the `BREAKING CHANGE` footer and the
   PR's Plugins section. Plugins can observe the change through the import
   path the README gives, and #2075's footer told them to migrate onto
   `useExamsData`, so it gets the footer the epic's three earlier `refactor!:`
   commits got. With #2104 below this layer, the fetch the migration note
   tells plugins to mount has no side effect (the 404 redirect now belongs to
   `ProgressTab`), which is why #2104 was sequenced first.

4. **The README sentence names the fix, not just the constraint.** The README
   was example-only and is the hook's only public contract. After this change
   a widget calling `useExamsData()` off the tab reads `null` with no error
   and no log, so the placement constraint is stated where plugin authors
   read, together with the one-line way out. `decisions-2098.md` entry 4's
   no-comment reasoning is about in-repo readers whose owner is a few frames
   up — a different audience.

   **Wording, after manual testing.** The first draft said the hook returns
   `null` off the tab "unless the widget also calls `useProgressTabData`".
   Testing with both an off-tab reader widget and an off-tab owner widget
   installed showed the reader reporting the count too: the query cache is
   shared, so one fetching observer anywhere on the page populates the entry
   for every reader on that page, and the owner need not be the same widget.
   Removing the owner widget took the reader back to `null`. The sentence
   now says "unless something rendered on the page fetches that data", with
   the self-owning widget as the example, and the `BREAKING CHANGE` footer and
   PR body say the same.

5. **The component-level request count waits for the client to go idle.**
   `fetchAndRender` returns when `TabPage`'s loading indicator disappears,
   which is when the readers mount; any refetch they trigger reaches the mock
   adapter a few microtasks later, so an immediate assertion could read one
   even on the old code. The test waits for `queryClient.isFetching()` to be
   0, then counts. Confirmed against the #2104 source: the count reads **2**
   there and **1** here. Neither #2083 nor #2098 pinned a count at component
   level; this suite already renders the owner against a mocked endpoint, so
   it is the one place the number the manual protocol counts can live in code.

6. **`hooks.test.jsx` hoists the route wrapper, mock adapter and query client
   to module scope.** The new `useProgressData` describe needs the same
   `MemoryRouter` + `QueryClientProvider` wrapper and per-test client the
   `useExamsData` describe had built inside itself. Duplicating them was the
   alternative; hoisting them (plus `courseId` and a `progressRequests`
   helper) lets both describes share one setup, with each describe's
   `beforeEach` registering only its own mocks. The `useExamsData` cases are
   otherwise unchanged apart from the first one also asserting zero progress
   requests — on the #2104 baseline it fired an unmocked GET that the adapter
   answered 404, which the *requests nothing* claim did not count.

7. **The disabled-hook test mocks the endpoint with a 200.** *Stays idle with
   no request when disabled* registers a successful handler for the progress
   URL before rendering the disabled hook, so a zero request count proves the
   option held the fetch back rather than a missing handler failing it.

8. **Negative check.** With `apiHooks.ts` and `hooks.jsx` stashed back to the
   #2104 state, all five new or tightened assertions fail: the disabled hook
   reads `fetching`, `useProgressData` fetches on its own and again beside an
   owner, the first `useExamsData` case fires a progress GET, and the
   `ProgressTab` count reads 2.
