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
