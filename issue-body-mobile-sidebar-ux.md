On a narrow viewport, the sidebar's "keep the open panel open across units" rule, which is right on desktop, makes the discussions panel reappear over the unit content after navigating through a unit where it could not show.

**Steps** (tutor dev, a course with the Open edX discussions provider, viewport narrower than 1200px):

1. On a unit with in-context discussions, open the discussions panel from its trigger. It covers the unit content.
2. Scroll down past the panel to the unit navigation and click *Next* (possible because of #2114).
3. The next unit has no in-context discussions. It loads with no sidebar visible.
4. Click *Previous*.
5. The previous unit loads with the discussions panel open, covering the content.

**What is happening.** The right panel's open state is preserved across unit navigation: `useUnitShiftBehavior` and `useSidebarSync` (`src/courseware/course/sidebar/hooks/`) return early on a narrow viewport, "MOBILE: persist state, no auto-switching", so `currentSidebar` stays `DISCUSSIONS` throughout. On the unit without a topic the widget is unavailable, so the open state renders nothing (step 3). On the next unit where it is available, the same open state paints again (step 5). The desktop expectation this implements is wg-build-test-release#574 item 4 and PR #1923; the same steps on a desktop viewport behave as expected, with the panel open beside the content on the previous unit. No expectation for mobile is written down anywhere, and nothing in the state machine was written with a panel that covers the content in mind.

**Related.** This sequence depends on being able to navigate with the panel open, which is #2114. If the panel becomes modal on mobile, this may be a non-issue.

**Not part of #1946.** The Redux → React Query work converts and types the sidebar provider without changing what it does; this is a product question about mobile sidebar behaviour.

**Separate observation in the same code.** On a narrow viewport a stored panel preference never restores on page load: the provider's first render runs before Paragon's `useWindowSize` has measured (`width` is `undefined`), `useInitialSidebar` therefore seeds `null`, and the mobile branches that would correct it return early. On desktop the seed is corrected by `useResponsiveBehavior` and `useSidebarSync`. If the answer to this issue is "never auto-open on mobile", the seed is masking a behaviour nobody wants and should become explicit in `useInitialSidebar`; if mobile should restore the preference, the fix is a one-line fallback (`useWindowSize().width ?? window.innerWidth`, which the pre-#1885 TypeScript provider had). Decide together with the above.

> [!NOTE]
> This issue was authored by Claude (Claude Code) from a manual test the reporter ran, and reviewed before posting.
