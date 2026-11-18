# Decisions: the modules the outline tab shares (#2251)

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

3. **The cookie domain is read from the app config, and `app.ts` lists
   the key at `null`.** `master` reads `process.env.SESSION_COOKIE_DOMAIN`
   when it removes the `show-account-activation-popup` cookie; here it is
   `getAppConfig(appId).SESSION_COOKIE_DOMAIN`. An operator who sets
   nothing gets a cookie removed on the serving host, as `master` does
   with the variable unset. The site name in the continue button is
   `getSiteConfig().siteName`.
   - The layer's first version gave the key no bundled default,
     following authn, whose
     [`src/app.ts`](https://github.com/openedx/frontend-app-authn/blob/5687d65baf679f977d7439f694a56dda7f0a6a5d/src/app.ts)
     does not list it. arbrandes's review comment
     (https://github.com/openedx/frontend-app-learning/pull/2251#discussion_r4588226383)
     pointed out that it was the only key the package reads that
     `defaultConfig` does not list, and that the list is the nearest
     thing an operator has to documentation of what can be set. Brian
     agreed (2026-11-18).
   - `null` changes no behavior. `js-cookie` leaves a null attribute out
     as it does an absent one (entry 7). `getAppConfig` merges
     `defaultConfig` below the site's `commonAppConfig` and the app's
     `config`, so a site sets the key as before.
   - Listing every key the package reads, at `null`, is the
     `defaultConfig` rule #2189 set for this app. authn lists only its
     real defaults and documents this key in its README; this package
     has no such table.

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
   No test in the package pins the clock, and none does here.

9. **Both `?? {}` after the metadata read are dropped.** Both run only
   if the component renders with no course metadata in the cache, and
   the first push of this layer left both branches untaken, which
   codecov showed as two partially covered lines. Each was rendered
   alone without metadata to see what its default does.
   - `CourseStartAlert.jsx` throws either way: with the default the
     start date is undefined, the distance is `NaN`, and
     `FormattedRelativeTime` raises React's "Too many re-renders";
     without it the destructure throws. The default only moved the
     throw, so it is dropped, as #2234 did in `Timeline` and
     `UpgradeToCompleteAlert` and #2246 in `GetCourseExitNavigation`.
   - `CourseStartMasqueradeBanner.jsx` renders the banner with today's
     date as the start date, since `FormattedDate` formats the current
     time for an undefined value. The layer first kept that default and
     added a case asserting the text. arbrandes's review comment
     (https://github.com/openedx/frontend-app-learning/pull/2251#discussion_r4588226396)
     asked for both to go: the case asserts that staff are told the
     course starts today, which is wrong, and the banner cannot render
     without metadata, since `useCourseStartMasqueradeBanner`, its only
     caller, shows it only when that metadata says the requester is
     masquerading. Brian agreed (2026-11-18).
   - The default was not written for the banner. #2109 added it when it
     converted `useModel('courseHomeMeta', courseId)`, which returned
     `{}` for a model that was not loaded, to the query read. Without it
     a banner rendered without metadata throws, as the alert does.

10. **`js-cookie` is declared at `^3.0.8`**, `master`'s `3.0.8` with a
   caret, as the dates tab layer declared its dependencies. The lock
   gains the one package entry.

11. **Checks at the layer's commit (2026-11-12).** `npm run lint`
    clean, with the package's `.jsx` files included
    (openedx/frontend-base#327). `npm test`: 39 suites, 433 passed, 7 skipped; lines 100,
    statements 99.64, branches 97.65, functions 98.15 for the package.
    Each file this layer adds is at 100 lines, and
    `alerts/course-start-alert/` at 100 branches. `npm run build` and
    `npm run build:ci` pass; `dist/` holds the new modules.

12. **The `SESSION_COOKIE_DOMAIN` line is amended in and pushed
    (2026-11-18).** Entry 3's change is one line in `app.ts`, amended
    into the layer's commit, whose message changes in one clause ("which
    app.ts lists at null" for "which has no bundled default"). Lint and
    the four suites under `src/alerts` pass at the layer; the full run
    and the builds were not rerun for it.
    - `gh stack rebase --upstack --no-trunk` stopped on #2252's port
      commit, which adds `LEGACY_THEME_NAME: null` at the same place in
      `app.ts`; both lines are kept, in alphabetical order.
    - `gh stack rebase --continue` after that conflict dropped the line of
      the port commit's message that begins with `#2195`. `git range-diff`
      showed it. The message was restored from the pushed commit with
      `git commit --amend --cleanup=whitespace -F` at an `edit` stop, and
      the layers above were rebased again. Every message from #2252 up
      then read equal to its pushed one.
    - `gh stack push --remote upstream`, heads read back: #2251
      `755ccb64`, #2252 `7d13fb98`, #2260 `111b34e3`, #2261 `b945ad46`,
      #2262 `b98365da`; #2249 unchanged at `e22c204e`. #2251 and #2252
      still read approved, and GitHub lists both authors on their commits.
    - The bodies of #2251 and #2191 said "no bundled default". Both were
      corrected from their drafts here and read back equal; #2251's
      carries entries 1 to 11 of this log. Brian replied on the review
      thread. The second review thread on this PR (the masquerade
      banner's `?? {}`) is not decided.

13. **Checks for entry 9's drop of the banner's default (2026-11-18,
    working tree, uncommitted).** Brian asked for the whole suite before
    the amend.
    - At this layer: `npm run lint` passes; `npm test`, 39 suites, 430
      passed, 7 skipped, 100% of lines. `CourseStartMasqueradeBanner.jsx`
      and `CourseStartAlert.jsx` are at 100% of lines and branches. The
      patch against #2249, counted the way Codecov counts it: 87 lines,
      none missed or partly covered.
    - At the top of the stack (#2262's branch) with the same two files
      changed: 49 suites, 843 passed, 17 skipped, 100% of lines.
    - Why the banner cannot render without metadata, read from the code:
      `useAlert` adds the alert in an effect only while the hook's
      `isVisible` holds, which needs `isMasquerading` from that course's
      metadata; the banner reads the metadata of the course id in its own
      payload; a failed background refetch keeps the last data; nothing in
      the package removes or resets queries; and the banner observes the
      query, so it is not collected while the banner is mounted. No test
      can drive the banner into that state through the hook.
    - The builds were not rerun.
