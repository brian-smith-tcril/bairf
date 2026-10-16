# Decisions — `useSidebar()` everywhere, `SidebarContext` private, sidebar suites on the real provider (#2112)

The follow-up #2111 filed (its decision 15); the second layer of the running
stack, on top of #2113. A wide layer: many files, each touched lightly.
Entries 1–3 were settled in the plan review on 2026-09-24 and posted to
#2112; the rest landed with the code.

1. **The ten `useContext(SidebarContext)` reads become `useSidebar()`.**
   `LockPaywall.jsx`, `sequence-navigation/hooks.js`, `Sidebar.jsx`,
   `SidebarTriggers.jsx`, `common/SidebarBase.jsx`, `course-outline/hooks.js`,
   `DiscussionsSidebar.jsx`, `DiscussionsTrigger.jsx`, `UpgradePanel.jsx`,
   `UpgradeTrigger.jsx`. Under the provider the hook returns the same value;
   outside it the hook throws its own message instead of a `null` destructure
   error. No other change in those files.

2. **The `!SIDEBARS` / `!SIDEBAR_ORDER` guards go with their tests.**
   `Sidebar.jsx`'s guard is `!currentSidebar || !SIDEBARS[currentSidebar]`;
   `SidebarTriggers.jsx`'s is `SIDEBAR_ORDER.length === 0`. The dropped
   conditions guarded a value the provider never produces —
   `buildSidebarsRegistry` and `getSidebarOrder` always return an object and
   an array, and the types say so — that only a test's hand-rolled context
   could supply. The four cases that existed to hit them go; the real
   conditions each keep one test under the provider: a stored preference for
   a widget that is no longer registered renders no panel, and an empty
   widget list renders no triggers.

   `Sidebar.test.jsx` goes from twelve tests to six. Two tested the
   impossible state; the rest were consolidated where they are the same
   case under the provider (settled in review, 2026-09-25):

   | `master` test | On this branch |
   |---|---|
   | renders null when currentSidebar is null | "renders no panel when nothing is open" |
   | renders null when SIDEBARS is null | dropped: the provider always builds the registry |
   | renders null when SIDEBARS is undefined | dropped, same reason |
   | renders null when SIDEBARS is an empty object | "renders no panel when the stored preference names a widget that is no longer registered": an empty registry with a current sidebar and a missing key are the same condition, `!SIDEBARS[currentSidebar]` |
   | renders null when currentSidebar does not exist in SIDEBARS | that same test |
   | renders COURSE_OUTLINE as null when it is not in SIDEBARS registry | that same test, which stores `COURSE_OUTLINE` |
   | renders the correct sidebar component when currentSidebar matches a key in SIDEBARS | "renders the stored panel" |
   | renders a different sidebar when currentSidebar changes | folded into that test (it stores NOTES) and "switches panels" |
   | switches from one sidebar to another on re-render | "switches panels when another trigger is clicked" |
   | hides sidebar when currentSidebar changes from a valid value to null | "hides the panel when its own trigger is clicked again" |
   | shows sidebar when currentSidebar changes from null to a valid value | "shows a panel when its trigger is clicked with nothing open" |
   | only renders one sidebar at a time | folded into the assertions of "renders the stored panel" and "switches panels" |

3. **One module, `SidebarContext.tsx`, the repo's shape.** The four typed
   contexts (`ToastContext.tsx`, `PluginOverridesContext.tsx`,
   `CoursewareSearchContext.tsx`, `TourContext.tsx`) each keep the context
   object, the provider and the hook in one file and export the provider, the
   hook and the types; nothing imports the objects. `SidebarContextProvider.tsx`
   and `SidebarContext.ts` merge into `SidebarContext.tsx`, named like the
   four; `const SidebarContext = createContext<SidebarContextValue | null>(null)`
   is module-private. `sidebar/index.js` re-exports `SidebarProvider` and
   `useSidebar`. The plan's first draft kept `SidebarContext` exported with
   only the provider importing it, a pattern held together by review;
   rejected for the pattern itself.

4. **The merge surfaced an import cycle; the provider takes `widgets` as a
   prop.** The old provider imported `getEnabledWidgets` from
   `defaultWidgets.js`, which imports the two built-in widget configs, whose
   components import the hook. With the hook in the same module as the
   provider, that is `SidebarContext.tsx → defaultWidgets.js → widgetConfig.ts
   → DiscussionsProvider.tsx → SidebarContext.tsx`, and `import/no-cycle`
   fails. Three ways out were weighed: keep the object and the provider in
   two files (the split #1885 chose, kept only to dodge the cycle); make the
   widget-side imports type-only (not possible — `DiscussionsProvider` and
   `UpgradeWidgetContext` call `useSidebar`); or stop the provider importing
   the built-ins at all. The third is right on its own terms: the framework
   has no reason to know which widgets exist, and the composition root
   already does. `SidebarProvider` now requires `widgets: SidebarWidget[]`,
   and `Course.jsx` passes `useMemo(() => getEnabledWidgets(), [])` — the
   config is read once per mount, as the provider's own `useMemo` on the
   registry did before. `buildSidebarsRegistry` and `getSidebarOrder` move
   from `defaultWidgets.js` into `SidebarContext.tsx` with their tests: they
   operate on the provider's input and the provider needs them without
   importing the file that lists the built-ins. `defaultWidgets.js` keeps
   `DEFAULT_WIDGETS` and `getEnabledWidgets`.

5. **No test-only seam.** The issue anticipated that `DiscussionsProvider.test.tsx`
   and `UpgradeWidgetContext.test.jsx` could not render the provider without
   circularity, because the provider mounts those components. With `widgets`
   a prop, each suite renders `<SidebarProvider widgets={[]}>` around the
   component under test: the provider mounts no widget `Provider` of its own,
   and the component is an ordinary child. The test-only export from the
   issue is not needed. The provider still has its two bridge reads,
   `useModel('coursewareMeta')` and `useModel('discussionTopics')`, and those
   are `useSelector` calls that need a Redux store above them. The suites
   that render without one — `DiscussionsProvider.test.tsx`, which isolates
   one query observer's requests on a bare `QueryClientProvider`, and the
   two upgrade-widget suites — mock `useModel` to return `{}`, as the
   provider's own suite and `UpgradePanel.test.jsx` already did on `master`;
   the provider only feeds those values to `isAvailable`, which nothing calls
   with `widgets={[]}`. Giving those suites a store instead would pull the
   app bootstrap and its axios routes into request-count assertions. The
   mocks go when #2087 and the `coursewareMeta` layer move the two reads
   onto queries.

6. **Suites express sidebar state through what the provider reads.** The
   provider's inputs are the widget list, `window.innerWidth` against
   `breakpoints.extraLarge.minWidth` (Paragon's `useWindowSize` measures it
   in a layout effect; jsdom's default of 1024 is narrow), the `sidebar`
   search param, localStorage `sidebar.{courseId}` (a JSON string) and
   sessionStorage `sidebarClosedByUser`. Every converted suite sets those
   and lets the provider derive `currentSidebar`; none passes a literal
   value. Where nothing in the rendered tree shows the current sidebar (the
   trigger strip, `SidebarBase`, `CourseOutlineTrigger`, `SidebarUnit`), a
   probe component `src/tests/SidebarState.tsx` renders it as text for the
   assertion — the same role `MountCourseQueryHooks` plays for the queries.

7. **Stub widgets in framework suites; the real registry where the registry
   is the subject.** `Sidebar.test`, `SidebarTriggers.test`, `SidebarBase.test`
   and the provider suite build two or three stub widgets inline (`id`,
   `priority`, a `Sidebar` and `Trigger` that render a test id, `isAvailable:
   () => true`). `SidebarTriggers`'s external-widget cases and `Sequence.test`'s
   upgrade-panel cases pass `getEnabledWidgets()`, so `mergeConfig({
   SIDEBAR_WIDGETS })` and the built-in `isAvailable` checks run for real.
   The widget suites (`UpgradePanel.test`, `UpgradeTrigger.test`,
   `CourseOutlineTray.test`, …) pass their own widget's config.

8. **`Sequence.test` only swaps its provider.** Its two upgrade-panel cases
   were the ones that could not fail (an un-awaited `waitFor` and `act`), and
   converting them here first surfaced that, then the suite's broken
   special-exams mock, then the un-awaited `waitFor` in nine more of its
   tests. That is its own problem with its own history, so it became #2118,
   a test-only layer below #2113 that awaits everything, puts the wrapper on
   the course route and the upgrade cases on the real provider. On top of
   it, this layer's change to the suite is the provider swap: the wrapper
   renders `SidebarProvider` with a `widgets` prop instead of the raw context
   with a literal, and the upgrade cases pass `getEnabledWidgets()`.

9. **Two assertions for "closed", because two components close two ways.**
   `Sidebar.jsx` returns `null` when nothing is open, so a closed panel is
   `not.toBeInTheDocument()`. `SidebarBase` inside a mounted widget hides a
   non-matching id with `d-none`, so an open panel is `not.toHaveClass('d-none')`
   and a panel for another id `toHaveClass('d-none')`. The suites use the
   one that matches the component they render. `CourseOutlineTray` is the
   first kind: it returns `null` unless the outline is the current sidebar,
   so its suite asserts a collapse as the absence of the tray's toggle
   button (the trigger, which shares that button's name, is not in the
   suite's tree). `tracks the last window width across resize events` is
   removed (settled in review, 2026-09-25). It came from #1927 (Agrendalath,
   merged 2026-09-10, fixing #1935: mobile browsers fire `resize` when the
   URL bar hides on scroll, and the sidebar closed while the learner
   scrolled it), the same commit that added the `lastWindowWidth` ref and
   the `if (!widthChanged) return` guard to `useCourseOutlineSidebar`. The
   test was the ref's direct unit test in three steps: a resize that stays
   above the breakpoint still writes the ref, a later resize is measured
   against that write, and after a collapsing resize a repeat of the same
   width does not collapse again. The third step read the ref after the
   collapse, which only worked because the faked context kept the tray
   mounted; under the real provider the collapse unmounts the tray, and the
   hook, its listener and its ref with it, so nothing is left for a repeated
   width to reach. Without that step the first two prove nothing about the
   ref (1100 differs from the initial 1300 as much as from 1250) and
   duplicate the two tests above them. The guard's behaviour keeps its
   coverage in `does not collapse sidebar when only the window height
   changes`. A direct test of the ref belongs at hook level, with
   `renderHook` and a mocked `toggleSidebar`, where the hook stays mounted
   after a collapse the way the original assumed; not added here. The #1927
   review thread has no discussion of the test.

   `CourseOutlineTrigger.test`'s three tests are kept as they were, with the
   provider replacing the mocked `toggleSidebar` (noted in review,
   2026-09-25). The first two open the outline from the trigger, on desktop
   and on mobile; the third, `changes current sidebar value on click`,
   starts with the outline open (stored in localStorage) and closes it. That
   direction exists only on mobile: the trigger is shown there whether or
   not the outline is open (`isDisplayForMobileView`), while on desktop it
   unmounts once the outline is open (`currentSidebar !== ID`), which the
   desktop test's last assertion checks. The name does not say that; it is
   left as it is.

10. **The narrow-viewport stored panel surfaced here and was fixed in #2113.**
    `CourseOutlineTray.test` and `CourseOutlineTrigger.test` store
    `COURSE_OUTLINE` on a narrow viewport and expect it open; under the real
    provider `currentSidebar` was `null`. The first render's
    `useWindowSize().width` is `undefined`, so both breakpoint comparisons
    are `false`, `useInitialSidebar` returns `null`, and the two mobile
    early-returns in the hooks never correct it — the same path a learner
    hits refreshing with a panel open on a phone, on `master` since #1885.
    Fixed in the layer below (`useWindowSize().width ?? window.innerWidth`,
    #2113's decision 10) and carried here by the stack rebase; the outline
    suites then pass unchanged.

11. **`test-utils.jsx` drops its wrapper.** `setupDiscussionSidebar` wrapped
    `Course` in a raw `SidebarContext.Provider` with a literal value; `Course`
    renders `SidebarProvider` itself, so the wrapper never reached a consumer.

12. **Docs name the provider and the module, not the old file.**
    `SidebarContextProvider` → `SidebarProvider`; `SidebarContext.ts` →
    `SidebarContext.tsx`. `USE_CASE_VERIFICATION.md`'s "Code Location" links
    carried line anchors into `SidebarContextProvider.jsx`, a file that has
    not existed since the hooks extraction; each now links to the hook that
    holds the fix it describes (`useUnitShiftBehavior.ts`,
    `useInitialSidebar.ts`, `useResponsiveBehavior.ts`) or to
    `SidebarContext.tsx` for the refs it declares, without anchors, and the
    protection-flags table's "Lines" column says where each ref is declared.

13. **Breaking, for operators.** `SidebarContext` is no longer exported from
    `SidebarContext.tsx` or `sidebar/index.js`; a widget reads the context
    with `useSidebar()`. `SidebarProvider` requires `widgets`; nothing outside
    `Course.jsx` renders it. `buildSidebarsRegistry` and `getSidebarOrder`
    keep their `sidebar/index.js` exports from the new module.
