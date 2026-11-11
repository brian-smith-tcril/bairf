## Summary

The modules Learning's progress tab shares with other pages now live in the frontend-base package: the dashboard, profile and ID verification links (`shared/links.jsx`), the course exit mode helper and messages, the course-tabs URL hooks, and a new `getSequenceUrl`. **No user-facing change**: no route renders any of it until the progress tab ports in the next layer of this stack, and the legacy tree under `src/` is untouched.

Part of #1905. Part of #2190. This is the bottom layer of a new stack; the progress tab and its entrance exam fix follow as the layers above it.

> [!NOTE]
> **For reviewers:** the ported files are added under `frontend-base/src/` as new files, so this diff cannot show what changed from `master`. The `port-diff` script in #2234's description prints that diff, from `frontend-base/manifest.tsv`.

## What changed

- **The dashboard and profile links resolve route roles.** `master` links to `${LMS_BASE_URL}/dashboard` and `${ACCOUNT_PROFILE_URL}/u/<username>`. Here `DashboardLink` and `ProfileLink` resolve the roles the learner dashboard and profile apps declare (`org.openedx.frontend.role.dashboard`, `org.openedx.frontend.role.profile`) with `getUrlByRouteRole`, and render through `getLinkProps`: a path in this site is a react-router `Link`, an external route a plain anchor. A site that declares no route for the role gets no link, as in the shell's menus. `IdVerificationSupportLink` reads `SUPPORT_URL_ID_VERIFICATION` from the app config.
- **The profile link appends `/u/<username>` to the role's URL**, minus a trailing slash, as the shell's `ProfileLinkMenuItem` does. The shell does not export that component, and its exported `LinkMenuItem` cannot carry the `Hyperlink` props these inline links have. The append exists because an external route ignores params (openedx/frontend-base#349); a role that took the username as a param would replace the line, which says so.
- **The course-tabs hooks resolve Learning's own roles.** On `master` `useCourseOutlineUrl`, `useDatesTabUrl` and `useProgressTabUrl` return the URL the course metadata lists for the tab. Here each returns the URL of Learning's route for the tab's role, for the course on the page, when the metadata's `tabs` list has the tab, and `undefined` otherwise. The metadata's URL is never read, so the three URL getters in `course-tabs/utils.ts` that only these hooks called become presence checks (`hasCourseOutlineTab`, `hasDatesTab`, `hasProgressTab`) beside `hasDiscussionTab`.
- **`courseware/urls.ts` is new.** `getSequenceUrl(courseId, sequenceId)` is the URL of a sequence's courseware page. The courseware role is declared on three routes (the course's index route, `:sequenceId`, `:sequenceId/:unitId`) and resolves to the first, so the function resolves the role for the course and appends the sequence id. It throws when no route provides the role. Its test matches the returned URL against the exported route array, which holds Learning's routes to that layout.
- **The course exit helper and messages port whole.** `course-exit/utils.js` and `messages.ts` move as they are: the progress tab's certificate status reads `getCourseExitMode` and `COURSE_EXIT_MODES`, and the links read three of the messages. The helper's two courseware queries are stubs in `courseware/data/apiHooks.ts` that return no data: `useCoursewareMetadata` until the entrance exam layer of this stack, `useMinimalCourseOutline` until #2195. For the package's lint, eight messages gain a `description` and two `indexOf` comparisons become `includes`.
- **App config.** `CREDIT_HELP_LINK_URL`, `SUPPORT_URL_ID_VERIFICATION` and `SHOW_UNGRADED_ASSIGNMENT_PROGRESS` join `defaultConfig` at `master`'s defaults, and the test site sets the two URLs as `master`'s `.env.test` did.
- **Manifest.** Lines for the ported files; the hooks' `dropped` lines become port lines.

## Known gaps

- **A site cannot point the outline, dates, progress or courseware role somewhere else.** `getUrlByRouteRole` returns an installed app's route for a role before it reads the site's `externalRoutes`, and Learning declares these roles on its own routes. The override works once openedx/frontend-base#348 is resolved. An external route for one of them could not name the course in any case (openedx/frontend-base#349).

## Testing

In `frontend-base/`: lint, the tests, `build` and `build:ci` pass. 31 suites, 283 tests passed and one skipped (the streak-celebration case kept as `it.skip` under #2201). Lint ran with the package's `.jsx` files included (openedx/frontend-base#327).

**New tests.** `links.test.tsx` (each link with its role declared as an app route and as an external route, the profile link's username suffix, nothing rendered for an undeclared role, the support link with and without its config key), `urls.test.ts`, cases for `logClick` and `logVisit` in `course-exit/utils.test.ts`, the absent-tab case in `course-tabs/hooks.test.tsx`, and the presence-check cases in `course-tabs/utils.test.ts`.

**Coverage.** The package is at 97.55% of lines against its 96.15% bar. The lines no test in this layer runs are all in `course-exit/utils.js`:

| Lines | What | Tested with |
|---|---|---|
| 42, 46, 58-60, 64, 72 | the branches of `getCourseExitMode` beyond the one `master`'s `utils.test.ts` covers | the progress tab's suite, in the layers above (#2190) |
| 83-116 | `GetCourseExitNavigation` | the sequence and unit navigation suites, #2196 |

**Manual testing.** None: no route renders these modules yet. The progress tab layer carries the manual pass.

## Decisions

What was decided while building this layer; the scope and the import and config mapping are in #2190.

<details>
<summary>Full decision log</summary>

# Decisions: the modules the progress tab shares (#2246)

Decisions made while building this layer of #2190. The scope and the
import and config mapping are in #2190's plan and are not repeated.

1. **The progress tab ports as three layers; this is the bottom one.**
   The shared modules, the tab and the entrance exam fix are each a PR
   of one stack. Squashing a single PR would fold the fix into the
   port; as its own layer it lands as a separate commit on
   `frontend-base`. This layer holds the design questions (which URL
   a link resolves, entries 2 to 5) in 16 files, ahead of the tab's
   port. Accepted costs: nothing here renders on a route, so there is
   no manual pass, and the lines waiting on a later suite (entry 9)
   are a large share of a small patch.

2. **A link to a page Learning serves resolves Learning's role for it;
   the course metadata only says whether the tab exists.** On `master`
   `useCourseOutlineUrl`, `useDatesTabUrl` and `useProgressTabUrl`
   return `tabs[].url` from the course metadata response, rendered as
   anchors. Here each returns `resolveRouteByRole(role, { courseId })?.url`
   for `courseOutlineRole`, `courseDatesRole` or `courseProgressRole`
   when the `tabs` list has the tab, and `undefined` otherwise.
   - The rule, settled in review: if Learning has a role for the
     destination, the role gives the URL and the URL in the metadata
     does not matter. Having the hooks follow `tabs[].url` the way the
     shell's course bar does for the tabs themselves was written,
     weighed and dropped: it needs a copy of frontend-base's
     unexported `isClientRoute`, and it contradicts the rule.
   - What `tabs` can hold, read in openedx/openedx-platform at
     `d3a86602dc`: `CourseHomeMetadataView` serializes
     `get_course_tab_list` (`lms/djangoapps/courseware/tabs.py`), every
     tab type registered under the `openedx.course_tab` entry point,
     which a plugin can add to. Some point at Learning pages
     (`courseware`, `dates`, `lti_live`, and `progress` when its waffle
     flag is on), some at another frontend or a Django template page
     (`discussion`, `instructor`, `static_tab`, `wiki`, `teams`, the
     textbook tabs), and some at a URL the course author typed
     (`external_link`, `external_discussion`). Rendering every tab is
     the course bar's job, which it does from `tabs[].url`; the hooks
     here only ever point at tabs Learning serves.
   - The base of those URLs cannot differ by course:
     `get_learning_mfe_home_url` and `make_learning_mfe_courseware_url`
     (`openedx/features/course_experience/url_helpers.py`) read one
     value, `LEARNING_MICROFRONTEND_URL`, through
     `configuration_helpers.get_value`, which can differ by site and
     never by course.
   - The `?.` covers a site whose `apps` no longer carry Learning's
     routes, which cannot be the site running this code; no test feeds
     it.
   - Known gap: a site cannot point one of these roles elsewhere,
     because `getUrlByRouteRole` returns an installed app's route
     before it reads `externalRoutes` (openedx/frontend-base#348).

3. **The three URL getters in `course-tabs/utils.ts` become presence
   checks.** `getCourseOutlineUrl`, `getDatesTabUrl` and
   `getProgressTabUrl`, whose only caller is `hooks.ts`, become
   `hasCourseOutlineTab`, `hasDatesTab` and `hasProgressTab`, the
   shape of the existing `hasDiscussionTab`. With entry 2 the
   metadata's URL is never read, and a hook that called a URL getter
   only to test its result hid that behind a URL's truthiness.
   - `hooks.ts` keeps `master`'s `useTabs`, and the three exported
     hooks are one line each over a shared `useTabUrl(hasTab, role)`,
     which returns `undefined` when the tab is absent and the role's
     URL otherwise. Turned down on the way: a lookup hook called ahead
     of the check (the rules of hooks force that order, and it read
     backwards), non-null assertions on the course id and the resolved
     route, and three spelled-out hooks that repeated each other.
   - `hooks.test.tsx` keeps `master`'s two cases and gains the
     absent-tab case. The first case matches the returned URL against
     the exported route array and expects the matched route to carry
     the tab's role with `{ courseId }` as its params; it keeps
     `master`'s name, "returns the tab's url from the course metadata
     on the page", which still holds: there is no URL unless the
     metadata lists the tab.

4. **`getSequenceUrl(courseId, sequenceId)` builds a sequence's URL
   from the courseware role.** The first plan for the progress tab's
   subsection link was `resolveRouteByRole(coursewareRole, { courseId,
   sequenceId })`. That returns the course's courseware path with the
   block key dropped: `coursewareRole` is on three routes (the index
   route, `:sequenceId`, `:sequenceId/:unitId`), `getUrlByRouteRole`
   returns the first, as `src/app.test.ts` pins, and react-router's
   `generatePath` ignores a param the path does not name (measured on
   6.30.6).
   - The function resolves the role for the course and appends the
     sequence id. That rests on one assumption, that the role's URL is
     the base of `/:sequenceId`; `urls.test.ts` holds Learning's routes
     to it by matching the returned URL against the exported route
     array.
   - It builds the one form #2190 calls. A first version took optional
     sequence and unit ids and joined whichever it was given, which
     was hard to read. The unit form (`UnitButton.tsx`,
     `UnitLinkWrapper.tsx`, `JumpNavMenuItem.jsx` and the sequence
     navigation's `hooks.js` on `master`) is added beside it with its
     first caller, in #2196.
   - It throws when no route provides the role, in place of a non-null
     assertion. That cannot happen while Learning's routes are
     installed. Returning `undefined`, as the tab hooks do, would give
     every caller a no-URL branch for a case that cannot occur; the
     hooks' callers already render nothing for an absent tab.
   - Weighed and not taken: a role of its own on the `:sequenceId`
     route (a new public role string, and an external route for it
     could not carry the block key), and keeping `master`'s `jump_to`
     anchor (a full page load for one link).
   - Nothing is asserted for the role as an external route: a site
     cannot point the role at one while Learning is installed
     (openedx/frontend-base#348), and an external route ignores the
     course id (openedx/frontend-base#349).

5. **The profile link builds `<the profile role's URL>/u/<username>`
   itself.** The shell's
   [`ProfileLinkMenuItem`](https://github.com/openedx/frontend-base/blob/72d70535cf77e98be8f859aa5746c3dddb4d02d2/shell/menus/ProfileLinkMenuItem.tsx#L15-L24)
   does the same, but
   [`shell/index.ts`](https://github.com/openedx/frontend-base/blob/72d70535cf77e98be8f859aa5746c3dddb4d02d2/shell/index.ts#L14)
   does not export it, and the exported `LinkMenuItem`
   [renders a bare `Hyperlink`](https://github.com/openedx/frontend-base/blob/72d70535cf77e98be8f859aa5746c3dddb4d02d2/shell/menus/LinkMenuItem.tsx#L42-L46)
   with no props passed through, so the `variant="muted" isInline` of
   `master`'s links would be lost.
   - The trailing slash is dropped because the role's URL has two
     forms. The profile app's own route resolves to `/profile`
     ([`src/routes.tsx`](https://github.com/openedx/frontend-app-profile/blob/c4ff88501d36a60fef8761b0a2dfcee07ba1dd09/src/routes.tsx#L12-L32)).
     A site's `externalRoutes` entry is whatever the site wrote, and
     the six dev site configs a code search of the openedx org finds
     for the role all write `http://apps.local.openedx.io:1995/profile/`:
     [account](https://github.com/openedx/frontend-app-account/blob/87dcc393142b0a8882bb17706458d9a1a1763417/site.config.dev.tsx#L35-L36),
     [learner dashboard](https://github.com/openedx/frontend-app-learner-dashboard/blob/a943af914a4cd5c7617cddd1d6e29d4ba8ffbb3c/site.config.dev.tsx#L24-L25),
     [admin console](https://github.com/openedx/frontend-app-admin-console/blob/117ec9513710bfcb8d4ec80ebb5d0b4e24098ce1/site.config.dev.tsx#L26-L27),
     [catalog](https://github.com/openedx/frontend-app-catalog/blob/586f5f6d7f76f92dfc4f0014cafc7f318d9914ab/site.config.dev.tsx#L37-L38),
     [instructor dashboard](https://github.com/openedx/frontend-app-instructor-dashboard/blob/60c03ad3510c4c692d2528e46b024c4c30d36b6d/site.config.dev.tsx#L30-L31)
     and
     [frontend-base's shell](https://github.com/openedx/frontend-base/blob/72d70535cf77e98be8f859aa5746c3dddb4d02d2/shell/site.config.dev.tsx#L20-L21).
   - The append exists because the profile page is a route with a
     param (`profile/u/:username`) and an external route ignores
     params, so the role sits on `profile` and each caller finishes
     the URL (openedx/frontend-base#349, which names the shell's
     case). The URL is built on its own line under a comment with
     that issue's URL, so a `resolveRouteByRole(profileRole,
     { username })` can replace the line.
   - `links.test.tsx` restores the site config after each case with
     `setSiteConfig` of the object read at load: `mergeSiteConfig`
     builds a new object and leaves the old one untouched.

6. **`GetCourseExitNavigation` gets no test here.** Its first statement
   destructures `entranceExamData: { entranceExamPassed }` from
   `useCoursewareMetadata(courseId, { enabled: false }).data ?? {}`,
   which throws when the data is missing, and in this layer both
   courseware hooks are stubs that return no data. `master` has no
   direct test of it either: it runs through the suites of its two
   callers, `SequenceNavigation.jsx` and `UnitNavigation.jsx`, which
   port with #2196. By the coverage policy in #2234 (its decision log,
   entry 32), lines `master` tests only through a suite not ported yet
   wait for that port.

7. **`logClick` and `logVisit` get direct cases.** On `master` (a
   coverage run of 2026-10-29) their `sendTrackEvent` calls run only
   through `CourseExit.test.jsx`, which asserts neither the event name
   nor the payload and ports with #2202, and the two falsy-guard
   `return` lines run in no test. By the same policy the guard cases
   belong here and the two "sends" cases could have waited for #2202;
   all four are kept, since a suite that tests a guard and not the
   call it guards reads worse than either extreme. Nothing in #2190
   calls either function; they ride along because the file ports
   whole.

8. **The courseware stub is a hook type with two functions assigned to
   it**, `(courseId, options?) => { data: undefined }`, not functions
   with unused parameters: the package's lint reports an unused
   parameter even with a leading underscore
   (`@typescript-eslint/no-unused-vars`), and the instructor toolbar
   stub declares its props the same way.

9. **`getCourseExitMode` is mostly covered from the layers above.**
   `master`'s `utils.test.ts` has one case for it; the rest of the
   function runs through the progress tab's suite on `master`, and
   that suite ports in the next layer. At this layer lines 42, 46,
   58-60, 64 and 72 of `course-exit/utils.js` run in no test, beside
   `GetCourseExitNavigation`'s (83-116, entry 6). The package is at
   97.55% of lines against its 96.15% bar.

10. **Lint.** Eight messages in `course-exit/messages.ts` had no
    `description` on `master`, which `formatjs/enforce-description`
    requires. Each is written for translators: what kind of text it
    is and what it is for, at the level of the descriptions the file
    already has ("Link to user’s dashboard"), with no account of the
    code path that renders it. `upgradeButton` takes `master`'s own
    description of the same string in
    `course-home/progress-tab/grades/messages.ts`. Ids and default
    messages are untouched. `getCourseExitMode`'s two `indexOf`
    comparisons become `includes`, the autofix for
    `@typescript-eslint/prefer-includes`, which is an error in the
    package's lint.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
