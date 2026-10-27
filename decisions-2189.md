# Decisions — port the dates tab (#2189)

Decisions made while implementing. The scope, the import and config
mapping, the root providers and the test conventions are in #2189's plan
and are not repeated.

1. **The mock user is `MockUser` with a numeric id.** `master`'s test user
   is `{ userId: 'abc123', username: 'MockUser', roles: [], administrator: false }`;
   frontend-base's `User` type requires `userId: number`, `name` and
   `email`. The package's user keeps the username, since later ports'
   tests build URLs from it (product tours, courseware), and takes
   `userId: 123`, a name and an email to satisfy the type. It lives in
   `src/tests/authenticatedUser.ts`, imported by the setup file, so a test
   that needs the identity imports it from there rather than from the
   setup file as on `master`.

2. **Test helpers under `src/tests/` are excluded from coverage.** With
   `collectCoverageFrom: ['src/**/*']`, the query-client helpers counted
   as uncovered product lines before any page used them and tripped the
   96.15 threshold. They are test infrastructure like the setup file and
   the mocks, which the template already excludes, so `src/tests` joins
   `coveragePathIgnorePatterns`; the build already excludes the directory.

3. **Caret ranges for the two test dependencies.** `master` pins
   `axios-mock-adapter` to exactly `2.1.0`; the package takes npm's
   default `^2.1.0` (and `^13.2.0` for Pact), the caret convention the
   template and OEP-67 use. The exact pin dates from the dependency's
   arrival with the 2020 data integration tests (`eac9bf9c`) and was only
   ever moved by renovate (`19b8df35`, 2024-11-20), which keeps whatever
   range style it finds; no commit names a reason for it.

4. **The Pact consumer test is dropped, with its contract.** `master`'s
   `src/course-home/data/pact-tests/lmsPact.test.jsx` runs in the suite
   and was maintained (last touched by #2099), but what it produces is
   unconsumed: the contract it writes, `src/pacts/frontend-app-learning-lms.json`,
   is in merge mode and still carries interactions for courseware
   endpoints whose tests were deleted years ago and an old
   `/api/course_home/v1/course_metadata` path; nothing publishes or
   verifies it (openedx-platform's one Pact verifier,
   `lms/djangoapps/courseware/tests/pacts/verify_pact.py`, loads its own
   xblock-handler contract; `master` has no broker, stub script or CI
   step). The two functions it exercised are covered by `api.test.js`.
   The test, `src/pacts/constants.js` and the contract file get `dropped`
   manifest lines and `@pact-foundation/pact` is not added; a later layer
   can bring them back from `master`'s history if a provider-side
   verifier appears. The epic's "Pact is a per-port check" stands, with
   the check answered here.

5. **The app bundles a `defaultConfig` with the keys it reads, at `null`.**
   `getAppConfig(appId)` returns `undefined` for an app with no
   `defaultConfig`, no `config` and no site `commonAppConfig`, so
   `getAppConfig(appId).EXAMS_BASE_URL` threw in the first run of the
   ported data tests, and would throw at runtime on a site that sets
   nothing. Account and profile bundle their keys at `null` for this
   reason, and `null` is what `master`'s `mergeConfig` gave these keys
   (`process.env.X || null`). The epic's "only real defaults in
   `defaultConfig`" is read as "a key the app reads, with the value
   `master` defaulted it to"; `defaultConfig` sits below
   `commonAppConfig`, so it cannot shadow a site-wide value the way an
   app's own `config` would. This layer adds `ENABLE_NOTICES` and
   `EXAMS_BASE_URL`; each later layer adds the keys its files read.

6. **The real app is registered from the setup file, not the test site
   config.** Importing `learningApp` into `site.config.test.tsx` made the
   `provides` ids `undefined`: frontend-base's `initializeMockApp` imports
   `site.config` while frontend-base itself is still loading, so the
   app's imports from `@openedx/frontend-base` resolved to a half-built
   module. The test site config keeps the template's inline stub (the
   how-to's reason for it), and `setupTest.js` runs
   `mergeSiteConfig({ apps: [learningApp] })` before `addAppConfigs()`,
   after frontend-base is loaded, which is what profile's app test does
   locally. The stub's `config` survives the merge, so the test config
   is still where test-only values live.

7. **`.env.test` becomes the test site config.** `master`'s tests ran
   with `EXAMS_BASE_URL=http://localhost:18740`, `LMS_BASE_URL=http://localhost:18000`
   and `BASE_URL=http://localhost:2000` from `.env.test`, and the hook
   tests filter requests by the exams-service URL shape. The test site
   config carries those three (`lmsBaseUrl`, `baseUrl`, and
   `EXAMS_BASE_URL` in the stub app's `config`), the way account's test
   config carries only the keys its tests rely on; later layers add
   theirs as their tests need them.

8. **The factories register from the setup file, and the shared course
   factories come with the course-home ones.** rosie factories exist
   only once their module runs; `master`'s setup file imports the
   factory index, so does the package's. The course-home factories
   import `shared/data/__factories__` (course metadata base, tabs,
   blocks), so those five files port here rather than with courseware;
   the `eslint-disable-line import/no-extraneous-dependencies` comments
   on their rosie imports go, since the base lint config has no `import`
   plugin and reports the unknown rule.

9. **The `main` landmark stays on the loaded tab page; `#main-content` goes.**
   The shell's `DefaultLayout` wraps the content slot in `div#main-content`,
   the target of the header's skip link, and renders no `main` element.
   `LoadedTabPage` keeps `master`'s `<main>` and drops `id="main-content"`
   from its inner `div`, which would be a second element with the id; the
   template's `Main.tsx` renders a `div` instead of its `<main>` so the
   page's landmark is not nested in another.
   Amended 2026-10-27: since #2026 `master` puts the `<main>` on the inner
   container of non-courseware tabs, around the tab content only, and the
   sequence renders it on courseware (entry 23); the port follows, still
   without the id. With openedx/frontend-base#329 the shell's skip link
   moves focus to the page's `<main>` element, so the skip target becomes
   the same element as on `master`; until it ships, the link lands on the
   shell's wrapper.

10. **`unitId` stays on `TabPage` and `LoadedTabPage`.** First removed,
    since on `master` the prop reaches only the instructor toolbar
    (`LoadedTabPage.tsx:75`); with the toolbar a stub (entry 22) the prop
    threads through to it as on `master` and the files keep their shape.

11. **`defaultProps` become default parameters, and `null` defaults go.**
    `master`'s setup file silences React's `defaultProps` deprecation for
    the whole suite; under the console hook `UserMessagesProvider`,
    `AlertList` and `Alert` are fixed instead. A `= null` default on a
    `.jsx` parameter is typed `null` by tsc (strict, `allowJs`), which made
    `.tsx` callers unable to pass a string `topic` or `className` or element
    children; those props keep no default (undefined when omitted), and no
    reader tells the two apart (`!topic`, `className`, `children`,
    `onClose`). `dismissible`, `stacked`, `customAlerts` and `customProps`
    keep theirs.

12. **Third-party `defaultProps`: Paragon by a lock regeneration,
    react-fontawesome by an upgrade.** Paragon 23.23.0's `Icon` still
    declared `defaultProps` and was first silenced under
    openedx/paragon#3043; openedx/paragon#4136 had already converted it and
    shipped in 23.23.1, inside frontend-base's range, so the scaffold
    commit's lock is regenerated instead (the scaffold layer's decision
    log) and no Paragon pattern is silenced. react-fontawesome removed its
    `defaultProps` in 0.2.1 (its changelog, 2024-05-16), so the package
    takes `^0.2.6`, the version profile and account pin, in place of
    `master`'s `^0.1.4` (installed as 0.1.19).

13. **The package declares the dependencies its files import.**
    `@fortawesome/react-fontawesome`, `@fortawesome/free-solid-svg-icons`
    and `prop-types` resolved through the parent repo's `node_modules`
    (`prop-types` also through frontend-base's own dependency) with no line
    in the package's `package.json`; the two FontAwesome packages were not
    installed in the package at all. They are declared at `master`'s
    versions apart from react-fontawesome (decision 12):
    `free-solid-svg-icons` `^5.15.4` (profile and account are on the 6.x
    pack, which changes glyphs; not this port's change),
    `fontawesome-svg-core` `^6.7.2` (react-fontawesome's peer, and what
    `master`'s lock installs beside the 5.x icons), `prop-types`
    `^15.8.1`. Twenty `master` files import FontAwesome, two in the dates
    tab, so the dependency arrives with this layer either way.

14. **The render helper keeps an `ErrorBoundary` where `AppProvider`
    stood.** `master`'s wrapper is frontend-platform's `AppProvider`, whose
    outermost element is its `ErrorBoundary`, and `LoadedTabPage.test.jsx`
    depends on it: a render before the metadata loads throws, and the test
    asserts the `logError` call the boundary makes. frontend-base's
    `ErrorBoundary` reports the same way, so it takes that place; the rest
    of `AppProvider` is the shell's (`SiteContext`, locale) or the helper's
    `wrapWithRouter`. The query client is created once per `render` call,
    as on `master`, not once per render of the wrapper.

15. **Tests of the deferred pieces stay, through the stubs.** First cut
    with the pieces; with the stubs (entry 22) `master`'s tests return:
    `TabPage.test.jsx` keeps its two tour-button cases and
    `LoadedTabPage.test.jsx` its instructor-toolbar case, since both mock
    the module by path and the stub sits there; `LoadedTabPage.test.jsx`'s
    `renders correctly` only loses the course-tabs assertion (the slot is
    dropped); its streak-modal case renders the real modal and is kept
    whole as `it.skip` under #2201's URL. `TabWithTimer.test.tsx` keeps one
    pass-through case, its seven timer and attempt cases returning with
    #2198, since the library import cannot be stubbed in place.

16. **Two fixes amended into earlier commits.** frontend-base's `User`
    requires `avatar: string`, which the CI build's type check over the
    test files (not `tsconfig.build.json`) reported; the mock user takes
    the value frontend-base's `authenticatedLoader.test.ts` uses (commit 1).
    ESLint 9 reports the `no-return-assign,no-sequences` disable in
    `courseBlocks.factory.js` as unused under the base config, so it goes
    (commit 2).

17. **rosie stays for the port.** The factories and their 192 `Factory.build`
    call sites move as they are, so each test file is rewritten once, after
    the port; the library's maintenance status (last release 2023-11-11)
    and the replacement options are #2222.

18. **The plugin override registry is dropped, not carried.** The frame
    commit first ported `generic/plugin-overrides/` and mounted its
    provider on the root route as the faithful port of `index.jsx`. On a
    frontend-base site no plugin can reach the registry: `usePluginOverrides`
    is not among the package's exports (`learningApp`, `learningRoutes`),
    and until #2185 restores the slots there is no slot to mount a widget
    in; carrying the provider preserved nothing observable. The four files
    get `dropped` manifest lines, `Main.tsx` and the render helper mount
    three providers, the unit (#2196) calls `getIFrameUrl` directly, and
    #2223 holds the Slot API replacement (the #2082 review's sketch and the
    survey of other plugin authors).

19. **Font Awesome stays for the port.** The frame and dates files render
    their icons through `@fortawesome/react-fontawesome` as on `master`, and
    the package declares the three dependencies (decision 13). Replacing
    Font Awesome with Paragon icons is one change across twenty files, with
    a product question on the Creative Commons marks, so it is a follow-up
    after the port rather than a change inside each layer: #2224.

20. **The package lints its `.jsx` files itself.** frontend-base's base lint
    config names no `**/*.jsx` pattern, so ESLint 9 never lints `.jsx` files
    under `createLintConfig` (openedx/frontend-base#327, a regression of its
    ESLint 9 upgrade; reproduced in every converted app with `.jsx` files).
    This layer brings the first eleven. The `files: ['src/**/*.jsx']` block
    that lints them is not committed: it stays a local, uncommitted change
    to `frontend-base/eslint.config.js` (the patch is `local-eslint-jsx.patch`
    in the effort worktree, reapplied after every stack operation), and
    every commit from this one on is linted with it in place, so the branch
    needs nothing when frontend-base ships the fix. Linting them surfaced
    four findings, fixed in this commit: an airbnb-era
    `react/forbid-prop-types` disable in `AlertList.jsx` for a rule the base
    config does not enable, an unused `act` import and a double blank line
    in `LoadedTabPage.test.jsx`, and a nameless mocked component in
    `TabPage.test.jsx` (named `LoadedTabPage`, as `TabWithTimer.test.tsx`
    names its).

21. **`AlertList` gets the tests its FIXME deferred.** `master`'s
    `AlertList.test.jsx` renders the list empty and a 2020 FIXME (#214) says
    the alerts are tested in `OutlineTab.test` and `Course.test` because a
    provider for testing would be boilerplate; the shared render wrapper
    has mounted `UserMessagesProvider` since before that FIXME was written,
    and on the branch neither of those tests exists yet. The file gains a
    `renderAlertList(props)` helper that renders the list under the shared
    wrapper beside a component capturing the provider's context, and
    returns the provider's own `add` wrapped in `act`; each case adds its
    message through that rather than through `useAlert` from a per-message
    component (review: no invented name, no component per message, no test
    ids; queries are by role and text). Cases: nothing with no message, an
    added message as a `role="alert"` with its variant class under the
    list's class, the topic filter and a list without a topic, a
    `customAlerts` component receiving the payload and `customProps`, and
    dismiss. `user-messages` line coverage goes from 58.06 to 88.7 against
    `master`'s 89.77; `useAlert` itself (70%) is exercised by the alert
    hooks once the dates tab renders them.

22. **The frame is redone with stubs instead of removals.** Reviewed
    2026-10-26: cutting the toolbar, tours and streak modal out of
    `LoadedTabPage.tsx` and `TabPage.tsx` meant their later layers would
    re-add the lines in their own shape, so the effort log now says a
    deferred piece is stubbed at `master`'s import path (effort decision
    37). Five stubs: `instructor-toolbar/InstructorToolbar` (#2194),
    `product-tours/ProductTours`, `TourContext` and
    `newUserCourseHomeTour/LaunchCourseHomeTourButton` (#2208),
    `shared/streak-celebration/StreakCelebrationModal` (#2201), each a
    TypeScript `FC` typed with the props `master` passes (so the host's
    JSX type-checks) that renders nothing, the provider returning its
    children, with the issue URL as its one comment, plus the two index
    re-exports `master` has. `LoadedTabPage.tsx` and `TabPage.tsx` now
    differ from `master` only in the import rewrites, the dropped shell
    pieces, the redirect prefix and the autofixer's wrapping of one-line
    `if` bodies. Stubs are new files, not moves, so they get no manifest
    line; the plan's "stubbed here" table is their record.

23. **Rebased on `master` at `230799eb`, with two re-ports folded into the
    frame.** The `frontend-base` branch had no commits of its own and was
    fast-forwarded to `master` (#2225, #2026, #1938, #2229); the stack
    rebased onto it without conflicts. The rebase audit flagged four ported
    files, all in this layer's frame commit, folded in rather than filed
    (effort decision 14 as amended):
    - #1938: `alerts/enrollment-alert/data/api.js` and its test post to
      `/api/enrollment/v2/enrollment/`, the same one-line change.
    - #2026 and #2229: `LoadedTabPage.tsx` and its test are regenerated
      from `master`'s new versions with the same port edits as before. The
      alerts sit in a plain `div`; the `<main>` is the inner container on
      non-courseware tabs and a `div` on courseware, where the sequence
      renders the `<main>` (#2196). The `id` prop goes, since the shell
      owns `#main-content` (entry 9), and the code comment loses
      `id="main-content"`, which became false. In the test the two
      landmark cases port without their `#main-content` assertions and the
      non-courseware case without "excludes the tab navigation", whose
      subject, the tabs slot, is dropped (the shell's course bar renders
      the tabs); its title says what is left, "wraps the page children".
      `renders correctly` loses the tabs assertion as before.
    `master`'s removal of the `#main-content` flex rules from `index.scss`
    has nothing to apply: the package has no `#main-content` styling, and
    `index.scss` is unported; its layer starts from the post-#2026 file.
    The `Sequence.jsx` and `CourseOutline.tsx` changes land with #2196 and
    #2197, whose bodies now say so.

