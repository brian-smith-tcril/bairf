## Summary

Fourteen `waitFor` / `act(async …)` calls in `Course.test.jsx` and `Sequence.test.jsx` were not awaited, so their assertions could not fail; thirteen date from #1391 (August 2024) and the last from #1885. Awaiting them is a one-word change per call, and it turns eleven of the fifteen `Sequence` tests red, so this PR is mostly the work of making those tests assert what they claim. Two harness gaps that only the dead assertions had tolerated are closed: `Sequence` now renders at its course route, so the navigation gets its `courseId` param and renders real links and disabled states, and `Course` mounts behind the same loaded-metadata gate `LoadedTabPage` uses, so the celebration modals can open. The `Sequence` suite's 2023 mock of the special-exams thunks module, which a 2024 `moduleNameMapper` entry has been silently redirecting to the package root, is removed; the three `it.skip` tests in `Course.test.jsx` are un-skipped; two learner-tools tests that were vacuous for their own reasons now assert. **Test-only: no runtime change.** Sits below #2113 on the stack so the sidebar layers build on honest tests. Closes #2118. Closes #1669.

## What changed

- **Every `waitFor`, `act` and `findBy*` is awaited.** Six blocks that passed a `findBy*` promise to `toBeInTheDocument()` now await the control they use (decision 4).
- **`Sequence.test`'s wrapper mounts the sequence at `/course/:courseId/:sequenceId/*`** in a `MemoryRouter`, as the suite's hidden-after-due test already did. Without the param, `useSequenceNavigationMetadata` bails out and every Previous/Next renders unlinked and never disabled (decision 1).
- **The assertions target the unit navigation**, which is what the default tree renders since #1713 emptied `SequenceNavigationSlot`: icon buttons above the content, links (or disabled buttons on a first or last unit) below it after `loadUnit()`, both reporting `widget_placement: 'bottom'` (#1918). `handles unit navigation button` is removed: the unit tabs it clicked are not rendered by default and have their own suites (decisions 2–3).
- **The special-exams mock is removed.** It named `dist/data/thunks.js`, but the `moduleNameMapper` regex from #1391 rewrote that path to the package directory, so it replaced the package entry with a spread copy that broke the default import as soon as a test rendered a loaded sequence; its stub was read by nothing. The real thunk returns immediately with no exam attempt in the store (decision 5).
- **The upgrade-panel cases render the real `SidebarContextProvider`** with `UPGRADE` stored on a desktop viewport, and assert the panel region is present and that the close button removes it (decision 7).
- **`Course.test`'s `renderCourse` mounts `Course` once the course-home metadata query has succeeded**, the way `LoadedTabPage` does; `Course` reads `celebrations` on first render. The three `it.skip` tests from #1669 run again (decisions 1, 8). Per review, it also mounts at the course route in a `MemoryRouter`, the `SidebarWrapper` shape, so the navigation gets its `courseId` param there too (decision 11).
- **Two learner-tools tests assert now**: one waited on a `null` captured before the element existed; the other set `innerWidth` to an undefined Paragon breakpoint, so `Course` never mounted (decision 9).

## Testing

`npm run types` and `npm run lint` clean; full suite 116 suites, 1169 passed, 0 skipped (was 3 skipped). On `master`, adding only the `await`s fails 11 of 15 `Sequence` tests and, with the skips removed, the 3 `Course` tests. No manual testing: nothing outside `src/**/*.test.jsx` changes.

## Decisions

<details>
<summary>Full decision log</summary>

# Decisions — await every `waitFor` and `act` in `Course.test.jsx` and `Sequence.test.jsx` (#2118)

A test-only layer at the bottom of the running stack, below #2113. Fourteen
`waitFor` / `act(async …)` calls were not awaited (thirteen from #1391,
August 2024; one carried by #1885), so the assertions inside them could not
fail. Awaiting them is the mechanical part; most of the tests then fail for
reasons the missing `await` had hidden, and the entries below record what each
one was and what the test asserts now. Closes #2118 and #1669.

1. **The two files render the way the app does.** Both suites rendered the
   component straight under `render(…, { wrapWithRouter: true })`, which
   mounts a `BrowserRouter` at `/`. `Sequence`'s navigation reads `courseId`
   from the route params (`useSequenceNavigationMetadata` →
   `useParams()`), and without it every Previous/Next control renders in its
   degenerate form: no link, never disabled, and a `previousLink is marked
   as required` prop-type warning on every render. `Sequence.test`'s wrapper
   now mounts the sequence inside a `MemoryRouter` at
   `/course/:courseId/:sequenceId/*`, the harness the suite's hidden-after-due
   test already used; the `wrapWithRouter` option goes with it. `Course`
   reads `celebrations` from the course-home metadata query on its first
   render (a `useState` initialiser and an effect keyed on `sequenceId`), and
   in the app `LoadedTabPage` mounts it only once that query has succeeded;
   the tests mounted it beside `MountCourseQueryHooks` with the query still
   pending, so both celebration modals could never open. `Course.test`'s
   `renderCourse` now mounts `Course` behind the same `isSuccess` gate. Neither
   change alters what the tests exercise; each removes a way the harness
   differed from the app that only the un-awaited assertions had tolerated.

2. **The navigation the tests click is the unit navigation, not the sequence
   navigation.** The old assertions looked for a top `Previous` *link*, unit
   tabs by title and a `widget_placement: 'top'` event. They described the
   layout the suite's default store selected until #1713 (July 2025): with
   the outline-sidebar flag off, `Sequence.jsx` rendered
   `SequenceNavigationSlot`, whose default content was `SequenceNavigation`
   — the bar with Previous and Next as links (links since #1137, August
   2023) and the unit tabs — plus `UnitNavigation` below the content, also
   links; two Previous links, two Next links, and `'top'` from the bar. With
   the flag on, the bar was not rendered and `UnitTitleSlot` rendered
   `UnitNavigation` above the content instead (#1386, May 2024; icon buttons
   since #1617, March 2025). The two layouts were exclusive. #1713 removed
   the flag and kept the second layout, making `SequenceNavigationSlot` an
   empty `PluginSlot`, so `SequenceNavigation` is not in the default tree.
   What renders is `UnitNavigation` twice: above the content as icon buttons
   (`isAtTop`), and below it, once the unit has loaded, as links, or as
   disabled buttons on a first or last unit — still two Previous and two
   Next controls, which is why the handler-call counts the tests assert did
   not change. Both renders take the same `unitNavigationProps` object,
   whose handlers are `previousHandler('bottom')` / `nextHandler('bottom')`
   (#1918, June 2026);
   `isAtTop` changes the markup, not the handler. The `'top'` handlers still
   exist, as `sequenceNavProps`, but go only to the empty slot, so nothing in
   the default tree ever emits `widget_placement: 'top'`. The tests assert
   what fires: the button above, the link below after `loadUnit()`, and
   `'bottom'` for both. Whether the upper unit navigation should report
   `'top'` is a product question this layer records and does not answer; it
   is runtime behaviour, and the fix would be to give the `isAtTop` render
   its own handlers.

3. **`handles unit navigation button` is removed.** It clicked a unit tab by
   its title. The tabs live in `SequenceNavigation`, which the default slot
   does not render (entry 2), and `Sequence.jsx` marks its `onNavigate`
   handler `istanbul ignore` for that reason. The tab components have their
   own suites (`SequenceNavigationTabs.test`, `UnitButton.test`,
   `SequenceNavigationDropdown.test`).

4. **`expect(screen.findByText(…)).toBeInTheDocument()` becomes an awaited
   `findBy`.** Six blocks passed the promise a `findBy*` returns to the
   matcher, which can never pass. The statements stay in master's order;
   each gets the `await` it needs: the loading text is awaited, the control
   a test clicks is awaited (`await screen.findByRole('button', { name:
   /previous/i })`), and after `loadUnit()` the loading text's absence is
   awaited in a `waitFor` before the lower control is used. A loading state
   and a loaded state inside one `waitFor` callback could never both hold on
   a single retry. The clicks in the rewritten tests go through
   `userEvent` rather than `fireEvent`, the convention the newer suites use;
   the two disabled-button tests click both buttons through `Promise.all`.

5. **The special-exams mock is removed; the mapper stays.** The suite's
   `jest.mock('@edx/frontend-lib-special-exams/dist/data/thunks.js', …)` has
   not mocked that file since #1391 added a `moduleNameMapper` entry whose
   unanchored regex rewrites the subpath to the package directory: the mock
   replaced the package entry with `{ ...realEntry, checkExamEntry }`, whose
   spread drops Babel's non-enumerable `__esModule` marker, so the default
   import in `Sequence.jsx` received the whole object and React failed with
   "Element type is invalid" the moment a test rendered the loaded sequence
   (none did, until now). The stub itself was read by nothing: `ExamWrapper`
   imports the thunk from the library's internal `data` module. With the
   mock gone the real `checkExamEntry` runs, reads `getState().specialExams.exam`
   and returns on its first line, because the test store has no attempt.
   The mapper's regex is left as it is: the package's `exports` map has only
   an `import` condition, so Jest needs the mapping for the root import, and
   anchoring it is a `jest.config.js` change with no remaining user in this
   layer.

6. **Each `Sequence` test that renders a loaded sequence owns its store.**
   `initializeTestStore` registers the axios routes for its own course on a
   shared adapter every time it is called, whether or not it replaces the
   global store, so the routes belong to whichever test called it last.
   `handles loading unit` rendered against the suite-level store and could
   only load its sequence if no earlier test had re-registered the routes;
   it now builds its own store and takes `sequenceId` from it, as the
   navigation and gated tests already did.

7. **The upgrade-panel cases render the real `SidebarContextProvider`.**
   Their faked context (`{ courseId, currentSidebar: 'UPGRADE', toggleSidebar }`)
   had no `SIDEBARS` registry, and `Sidebar.jsx` returns `null` without one,
   so the panel could not render under it. They now mount the provider with
   `UPGRADE` stored in localStorage on a desktop-width viewport, assert the
   panel's region is present, and that the close button removes it. #2112's
   conversion of this suite to the provider builds on this shape.

8. **`Course.test`'s three skipped tests are un-skipped.** `loads learning
   sequence` waits for the loading text, then for the unit's title heading
   before posting the loaded message — the heading mounts in the same render
   as the iframe whose hook listens for that message, and the message is
   lost if posted earlier — then for the loading text to clear, and checks
   the page title. The
   two celebration tests await the dialog. The `it.skip` comments citing
   #1669 go with the skips.

9. **Two learner-tools tests in `Course.test` were vacuous for their own
   reasons.** The wide-viewport test captured `queryByTestId` before the
   element existed and then waited on that `null`; it awaits `findByTestId`.
   The narrow-viewport test set `innerWidth` to `breakpoints.extraSmall.minWidth`,
   which Paragon does not define, so the width was `undefined` and `Course`
   (which returns `null` for an undefined width) never mounted; it now uses
   `breakpoints.extraSmall.maxWidth`, passes a `unitId` like its sibling,
   waits for the sequence to render, and then asserts the tools are absent.
   The suite's default width moves from `beforeAll` to a `beforeEach`, so a
   test added after this one starts from the desktop width rather than
   inheriting the narrow one.

10. **Gated content keeps its assertions, with today's values.** The old block
    asserted the locked-content loading text present and, in the same
    callback, absent, and counted three buttons ("Previous, Prerequisite and
    Close Tray") and one link ("Next"). The loading text is the Suspense
    fallback for the lazy-loaded `ContentLock`; it is present for an instant
    and gone once the chunk resolves, so the test finds it first, then waits
    for "Content Locked", then asserts it has cleared. The counts, under the
    original comment lines, are now two buttons and no links, and the reason
    is #1713 (July 2025): before it, `SequenceNavigationSlot`'s default
    content was `SequenceNavigation`, the bar with Previous, the unit tabs
    (a single lock tab when gated) and Next, which is where the gated view's
    Previous button and Next link came from; #1713 made the slot an empty
    `PluginSlot`, so the bar renders only for an operator who plugs it in.
    In the normal view the unit navigation above and below the content
    stands in for it. In the gated view there is no unit, only `ContentLock`,
    so nothing does: a learner on a locked sequence has had no Previous or
    Next since then. The test could not report it because its counts had
    sat inside an un-awaited `waitFor` since #1391 the year before. Whether
    the gated view should get its navigation back is a product question this
    layer records and does not answer.

11. **`Course.test`'s `renderCourse` mounts at the course route** (review
    suggestion on PR #2120, 2026-09-25, applied 2026-09-28). The helper
    rendered with the shared `render`'s `wrapWithRouter: true`, which is
    `AppProvider`'s `BrowserRouter` at `/`, so `useSequenceNavigationMetadata`
    read no `courseId` from `useParams()` and every Previous / Next control
    rendered without an `href` and never disabled — the same gap entry 1
    closed for the Sequence suite's wrapper, and pre-existing here. The
    helper now wraps its two children in a `MemoryRouter` at
    `/course/{courseId}/{sequenceId}/{unitId}` with a `Route` at
    `/course/:courseId/:sequenceId/*`, the `SidebarWrapper` shape. All
    nineteen cases pass unchanged: the one navigation case, *passes
    handlers to the sequence*, only counts handler calls, which is why the
    hrefless links never failed it.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
