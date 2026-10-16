On a narrow viewport (below 1200px), a right-sidebar panel such as discussions renders full screen over the unit content, but the page still scrolls underneath it. A learner can scroll past the panel to the unit navigation buttons and move to the next or previous unit with the panel open.

**Steps** (tutor dev, a course with the Open edX discussions provider, viewport narrower than 1200px):

1. On a unit with in-context discussions, open the discussions panel from its trigger. It covers the unit content.
2. Scroll down. The unit content continues underneath the panel until the unit navigation buttons are reached.
3. Click *Next*. The next unit loads.

**Expected**: one of two things, and which is a product call. Either the panel is modal on mobile, so the unit cannot be navigated until the panel is closed; or the panel does not cover the content, so navigating with it open is a deliberate, visible action. Today it is neither: the panel covers the content and the navigation stays reachable by scrolling.

**Where it lives.** The full-screen presentation is `SidebarBase`'s `shouldDisplayFullScreen` branch (`src/courseware/course/sidebar/common/SidebarBase.jsx`: `fixed-top vh-100`), which positions the panel over the page without preventing the page from scrolling behind it.

**Related.** Navigating with the panel open is what leads to the unexpected reopening in #2115. If the panel becomes modal on mobile, that issue may be a non-issue.

> [!NOTE]
> This issue was authored by Claude (Claude Code) from a manual test the reporter ran, and reviewed before posting.
