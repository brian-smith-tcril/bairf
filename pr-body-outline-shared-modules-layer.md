## Summary

The modules Learning's outline tab shares with other pages now live in the frontend-base package: the effort estimate (`shared/effort-estimate/`), the course start alert and its masquerade banner (`alerts/course-start-alert/`), and the account activation alert with the request it sends. **No user-facing change**: no route renders any of it until the outline tab ports in the next layer of this stack, and the legacy tree under `src/` is untouched.

Part of #1905. Part of #2191. Stacked above #2249; the outline tab follows as the layer above this one.

> [!NOTE]
> **For reviewers:** the ported files are added under `frontend-base/src/` as new files, so this diff cannot show what changed from `master`. The `port-diff` script in #2234's description prints that diff, from `frontend-base/manifest.tsv`. Three of the ported files are identical to `master`'s: `course-start-alert/hooks.js`, `course-start-alert/index.js` and `effort-estimate/index.js`.

## What changed

- **The account activation alert reads its cookie domain from the app config.** `master` removes the `show-account-activation-popup` cookie on `process.env.SESSION_COOKIE_DOMAIN`. Here the domain is `getAppConfig(appId).SESSION_COOKIE_DOMAIN`, an app config key with no bundled default: an operator who sets nothing gets the cookie removed on the serving host, as `master` does with the variable unset. The continue button's site name is `getSiteConfig().siteName`.
- **`sendActivationEmail` and the courseware data index.** The alert imports its request from `courseware/data`, so `courseware/data/api.js` gains `sendActivationEmail` and `courseware/data/index.js` ports exporting that one name. The other two names the index re-exports on `master`, `getResumeBlock` and `getSequenceForUnitDeprecated`, are commented out under #2195's URL until the courseware container ports them.
- **The course start alert ports whole.** The outline tab reads `useCourseStartAlert` and `CourseStartAlert.jsx`. `useCourseStartMasqueradeBanner` and `CourseStartMasqueradeBanner.jsx` come with them and have no caller until the instructor toolbar ports (#2194).
- **`EffortEstimate` drops its `defaultProps`.** React warns about them on a function component. The one default was a `null` class name, which `classNames` skips the same way it skips an absent one.
- **Lint.** The masquerade banner's multi-line `FormattedDate` value gains parentheses, and the effort estimate's `activities` message gains a `description`; its id and default message are untouched.
- **`js-cookie` is declared** at `^3.0.8`, the version `master` installs. The lock gains that one package entry.
- **The test setup's pattern for Paragon's own `defaultProps` warnings gains four names.** `AlertModal`, `ModalDialogBody`, `ModalDialogFooter` and `ModalDialogTitle` are function components declared in Paragon's `src/Modal/`, each setting `defaultProps` there, so they join the pattern under openedx/paragon#3043. The pattern for react-bootstrap's components (openedx/paragon#4523) is untouched.
- **Manifest.** Ten lines for the ported files.

## Testing

In `frontend-base/`: lint, the tests, `build` and `build:ci` pass. 39 suites, 432 tests passed and 7 skipped (cases kept as `it.skip` under the issues that port what they render). Lint ran with the package's `.jsx` files included (openedx/frontend-base#327).

**New tests.** `master` has no test file for any of these modules; it covers them through the outline and progress tab suites. Each gets one here, since no route in this layer renders them:

- `EffortEstimate.test.tsx`: the time in whole minutes, abbreviated on screen and spelled out for screen readers; the activity count; both together; nothing for a block with neither; the class name it is given.
- `course-start-alert/hooks.test.tsx`: the alert's full sentence for a course more than a day away and less than a day away, in the learner's time zone and without one, and nothing for a learner who is not enrolled or a course that has started; the masquerade banner on the progress tab, and nothing on another tab or without masquerading.
- `AccountActivationAlert.test.tsx`: the alert opens when the cookie is set and removes it; stays closed without it; removes it on the domain the app config names; closes on the continue button and stays open on Escape; resends the activation email, with a spinner until the request settles and a check after. The cases set the cookie on the document and let `js-cookie` read and remove it, where `master`'s outline suite replaces the library's functions with mocks.

**Coverage.** The package is at 100% of lines at this layer, against its 96.15% bar, and every file this layer adds is at 100% of lines. Two branches stay untaken, as on `master`: the `?? {}` after the metadata read in `CourseStartAlert.jsx` and `CourseStartMasqueradeBanner.jsx`.

**Manual testing.** None: no route renders these modules yet. The outline tab layer carries the manual pass.

## Decisions

What was decided while building this layer; the scope and the import and config mapping are in #2191.

<details>
<summary>Full decision log</summary>

# Decisions: the modules the outline tab shares (draft; renamed to the PR number when the layer is submitted)

Decisions made while building this layer of #2191. The scope and the
import and config mapping are in #2191's plan and are not repeated.

1. **The outline tab ports as two layers; this is the bottom one.**
   The effort estimate, the course start alert, the account activation
   alert with its request, and the `js-cookie` dependency, in 13 source
   and test files. Accepted cost: nothing here renders on a route, so
   there is no manual pass, and each module gets a test `master` does
   not have, since this layer's CI meets the line threshold alone.

2. **`courseware/data/index.js` ports with one of its three names.**
   `AccountActivationAlert.jsx` imports `sendActivationEmail` from the
   directory, so the index ports and `api.js` gains the function. The
   other two names it re-exports on `master`, `getResumeBlock` and
   `getSequenceForUnitDeprecated`, are commented out under #2195's URL,
   as the factory indexes carry their unported imports.

3. **The cookie domain is read from the app config.** `master` reads
   `process.env.SESSION_COOKIE_DOMAIN` when it removes the
   `show-account-activation-popup` cookie; here it is
   `getAppConfig(appId).SESSION_COOKIE_DOMAIN`, with no bundled default,
   so an operator who sets nothing gets a cookie removed on the serving
   host, as `master` does with the variable unset. The site name in the
   continue button is `getSiteConfig().siteName`.

4. **`EffortEstimate` loses its `defaultProps`.** React warns about them
   on a function component and the suite fails on console output. The
   one default was `className: null`, which `classNames` skips the same
   way it skips an absent one, so no default parameter takes its place.

5. **Lint.** `CourseStartMasqueradeBanner.jsx`'s multi-line
   `FormattedDate` value gains parentheses (the autofixer's change).
   `shared/effort-estimate/messages.ts`'s `activities` message gains the
   `description` the package's lint requires; its id and default
   message are untouched.

6. **Paragon's own modal `defaultProps` warnings are silenced by exact
   pattern.** The account activation alert mounts `AlertModal`, whose
   parts (`AlertModal`, `ModalDialogBody`, `ModalDialogFooter`,
   `ModalDialogTitle`) set `defaultProps` on function components. Their
   names join the setup file's pattern under openedx/paragon#3043, the
   issue for `defaultProps` on Paragon's own components.

7. **The account activation test uses the document's cookie, not a
   mock of `js-cookie`.** `master` covers the alert through the outline
   suite, which replaces `Cookies.get` and `Cookies.remove` with mock
   functions. Here the cases set the cookie on jsdom's document and let
   the library read and remove it.
   - The domain case sets `SESSION_COOKIE_DOMAIN` to a domain that is
     not the test page's. jsdom refuses that write, so the cookie
     remains and the alert stays closed, which is the guard `master`
     wrote against re-rendering forever; the case asserts the string
     written to `document.cookie` carries the configured domain.
   - `mergeAppConfig` cannot remove a key (it merges, and a merge skips
     an undefined value), so the cases restore the key to `null`;
     `js-cookie` leaves a null attribute out as it does an unset one.
   - "stays open on Escape" is the only case that runs the modal's
     `onClose`, which does nothing on `master` and here.

8. **The course start alert's cases compute dates from the current
   time.** The alert's text depends on the distance to the start date,
   so each case sets a start relative to now (7 days and an hour, 2
   hours and a minute) and gives the metadata `userTimezone: 'UTC'`, so
   the expected date string does not depend on the machine's time zone.
   No test in the package pins the clock, and none does here. Two
   branches stay untaken, as on `master`: the `?? {}` after the metadata
   read in `CourseStartAlert.jsx` (line 26) and
   `CourseStartMasqueradeBanner.jsx` (line 16), reached only if the
   metadata the hook just read is gone when the alert renders.

9. **`js-cookie` is declared at `^3.0.8`**, `master`'s `3.0.8` with a
   caret, as the dates tab layer declared its dependencies. The lock
   gains the one package entry.

10. **Checks at the layer's commit (2026-11-12).** `npm run lint`
    clean, with the package's `.jsx` files included
    (openedx/frontend-base#327). `npm test`: 39 suites, 432 passed, 7 skipped; lines 100,
    statements 99.64, branches 97.41, functions 98.15 for the package.
    Each file this layer adds is at 100 lines. `npm run build` and
    `npm run build:ci` pass; `dist/` holds the new modules.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
