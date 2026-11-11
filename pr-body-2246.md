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

The role links, the tab hooks, `getSequenceUrl` and the test changes are decided in #2190's plan.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
