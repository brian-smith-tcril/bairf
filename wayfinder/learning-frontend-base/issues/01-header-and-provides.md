# What Learning's header does that the shell's does not, and how `provides` reaches the course bar

Type: research
Status: resolved

## Question

Decision 20 takes the shell's header and footer and declares Learning's course-bar roles through `provides`. What, concretely, does that lose, and what does Learning have to declare?

1. Inventory what `LearningHeader` (`@edx/frontend-component-header`) renders for Learning today, and what the preferences-unsubscribe page's plain `Header` renders: course title and org line, course tabs, masquerade bar and its placement, menus, logo and links, anything driven by Learning's `courseHome.*` data. Compare each against frontend-base's shell header on `main` (`shell/header/`, including `course-bar/` and `masquerade/`). Classify each item: shell already provides it / Learning declares it through `provides` / absent, note as a possible breaking change.
2. How `provides` works for the course bar: the two ids in `shell/header/constants.ts`, what `CourseTabsNavigation` and `MasqueradeBar` do with them, what the shell renders for a tab whose role no installed app provides, and what Learning must put in its `App.provides` for each of its tabs (outline, dates, progress, discussion, live, courseware). Cite ADR 0013 and the code.
3. Footer: what Learning's `FooterSlot` usages render that the shell footer does not.

## Answer

Findings: `../research/header-and-provides.md` (Learning master @ 7522f9c; header 8.3.0 and footer 14.9.5 per Learning's lockfile; frontend-base main @ 83a1752; instructor-dashboard @ 2740284).

**Absent from the shell header** (each a possible breaking change, or epic-1 work to re-home, decided per port):
1. The course title and org/number line. Nothing under `shell/header/` reads it; the shell's course-bar fetch keeps only `tabs`. Learning renders it from course metadata in `TabPage.tsx`.
2. Masquerade toolbar extras: the Insights button, the course-author gate on the Studio button (the shell gates on `cmsBaseUrl` only), and the two banners on the `instructor-toolbar-alerts` topic. The gate differs too: Learning shows the toolbar on `originalUserIsStaff`; the shell shows its bar when the masquerade GET returns success.
3. The courseware search toggle and dialog in Learning's tab bar, and the product-tour target `#courseTabsNavigation`. The shell bar exposes `courseNavigationBar.extraContent.v1` as the place for extra content.
4. The notifications tray (`@edx/frontend-plugin-notifications` through the header actions slot).
5. User-menu deltas: the shell has Profile, Account and Logout by role; Learning's Dashboard and Order History items, the plain header's "Courses" link, and the goal-unsubscribe page's hidden dropdown have no equivalent. Nearest is the chromeless-roles provide, which drops header and footer together.
6. Tab behaviour: the shell's active tab is the longest pathname-prefix match, so unit pages mark no tab active where Learning marks "Course"; the shell collapses with a `Navbar` instead of a "More..." overflow; it renames `courseware` to `outline`; and it refetches `course_metadata` under its own key, the duplication already on #1905.

**`provides` mechanics.** `getProvidesAsStrings` collects string or string-array values across apps; the course-bar and masquerade checks test provided roles against the active route's roles, which include ancestor routes' `handle.roles`; `isClientRoute` resolves each role to its first route path and prefix-matches the tab pathname. A tab whose role no app provides is still listed (the list comes from the LMS) and renders as a plain `<a href>` full-page load; when no app provides any role, the bar is not mounted. The masquerade redirect falls back to `window.location.assign` the same way.

**Learning's declaration.** Six roles (outline, dates, progress, discussion, live, courseware) under both the course-bar and masquerade ids, since the toolbar renders on every tab page, each role also placed in its route's `handle.roles`. Two facts for ticket 04: the discussion route pattern requires `:path`, so its tab would not prefix-match and would render as an `href`; and a single role on the root `learning` route would satisfy both checks, because ancestor roles are active and `/learning` prefix-matches every tab. Worked example: instructor-dashboard's `src/provides.ts`, `routes.tsx:62`, `app.ts:7-12`.

**Footer.** Learning's footer slot renders a logo link, a track event and the footer plugin slot; the shell footer adds copyright, trademark, Powered By, language menu and link columns, and renders on every non-chromeless route, including the two unsubscribe pages that have no footer today. The help link is registered through `helpButtonSlotOperation({ appId, role })` as a slot operation, not through `provides`.

**Correction (Brian, 2026-10-19).** "Absent from the shell header" describes the shell's defaults, not Learning's options. The shell header is composed of slots, and an app inserts widgets into them through `App.slots` (slot operations); learner dashboard does this for its whole header (`src/slots.tsx` spreads `learnerDashboardHeaderApp.slots` into the app's `slots`). Header slot ids on frontend-base main: `desktop`, `desktopLeft`, `desktopRight`, `mobile`, `mobileLeft`, `mobileCenter`, `mobileRight`, `mobileMenu`, `mobileMenuLinks`, `primaryLinks`, `secondaryLinks`, `anonymousMenu`, `authenticatedMenu`, `courseNavigationBar`, `courseNavigationBar.extraContent`, `courseNavigationBar.tabs.label`, `masqueradeBar` (all `org.openedx.frontend.slot.header.<name>.v1`). The six items are therefore epic-1 re-homing work for the port that owns them, each into a shell header slot, and a breaking change only where no slot fits. Candidate homes, to be decided in ticket 04 or the port: course title and org line → `courseNavigationBar.extraContent.v1` or `desktopLeft.v1` / `mobileCenter.v1`; courseware search toggle → `courseNavigationBar.extraContent.v1`; masquerade extras → operations on `masqueradeBar.v1`; notifications tray → `desktopRight.v1`; Dashboard and Order History items → `authenticatedMenu.v1`. The active-tab rule and the `courseware` → `outline` rename are shell behaviours, not slots, and stay as notes.

**Correction 2 (2026-10-19).** `LearningHeader` itself is only: logo, course info lockup, an actions area (notifications slot and Help link), and the user menu. The course tabs, masquerade controls and courseware search in the list above are Learning page components rendered below the header, not parts of the header component. Issue #1905's header sub-issue replicates `LearningHeader`'s parts; the others stay with their own issues.
