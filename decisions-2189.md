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

10. **`unitId` leaves `TabPage` and `LoadedTabPage`.** On `master` the prop
    reaches only the instructor toolbar (`LoadedTabPage.tsx:75`); with the
    toolbar deferred to #2194 nothing reads it, and #2194 brings it back.

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

15. **Tests that go with the deferred pieces.** `TabPage.test.jsx` loses
    the two tour-button cases (#2208); `LoadedTabPage.test.jsx` the
    instructor-toolbar (#2194) and streak-modal (celebrations) cases, its
    `renders correctly` case becoming a frame assertion without the tabs
    slot; `TabWithTimer.test.tsx` keeps one pass-through case, its seven
    timer and attempt cases returning with #2198.

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

