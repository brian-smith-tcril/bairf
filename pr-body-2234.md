## Summary

The Dates tab now runs in Learning's frontend-base package: at `/learning/course/:courseId/dates` a learner sees the course's dates timeline and the suggested-schedule alerts, inside the ported tab-page frame (loading, errors, access-denied redirects, the enrollment and logistration alerts, user messages, notices and toasts). It is the first page port, so it also brings the course-home data module and sets the test conventions later ports follow. **No user-facing change on `master`**: the legacy tree under `src/` is untouched.

Part of #1905. Resolves #2189. Stacked above #2221.

> [!NOTE]
> **For reviewers:** each commit adds the ported files under `frontend-base/src/` as new files, so `git show` cannot show what changed from `master`. I've been using the following script to see each commit's diff against `master`, based on `frontend-base/manifest.tsv`.
>
> <details>
> <summary><code>port-diff</code></summary>
>
> ```bash
> #!/usr/bin/env bash
> # A patch of the files a commit changed under frontend-base/src, as they stand at that commit,
> # against their legacy files in master, per the provenance manifest at that commit.
> #
> #   port-diff <rev> [-C <repo>] [--master <ref>] [-o <file.patch>]
> #
> # A file with a manifest line is diffed against master's file at the legacy path; a file
> # without one has no legacy file and shows as added. Deleted files are not listed.
> # Files identical to their legacy file are left out of the patch and named on stderr.
> # A merge (several legacy files for one target) stops the script: there is no single base to show.
> # Defaults: -C ., --master upstream/master, the patch to stdout.
> set -euo pipefail
> repo=.; master=upstream/master; out=
> args=()
> while [ $# -gt 0 ]; do
>   case "$1" in
>     -C) repo=$2; shift 2 ;;
>     --master) master=$2; shift 2 ;;
>     -o) out=$2; shift 2 ;;
>     -h|--help) sed -n '2,11p' "$0"; exit 0 ;;
>     *) args+=("$1"); shift ;;
>   esac
> done
> [ ${#args[@]} -eq 1 ] || { echo "usage: port-diff <rev> [-C <repo>] [--master <ref>] [-o <file.patch>]" >&2; exit 2; }
> rev=${args[0]}
> manifest=$(git -C "$repo" show "$rev:frontend-base/manifest.tsv") || { echo "no manifest at $rev" >&2; exit 2; }
>
> tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
> mkdir -p "$tmp/master" "$tmp/port"
>
> while IFS= read -r target; do
>   [ -n "$target" ] || continue
>   rel=${target#frontend-base/}
>   legacy=$(printf '%s\n' "$manifest" | awk -F'\t' -v t="$target" '$2 == t { print $1 }')
>   if [ "$(printf '%s' "$legacy" | grep -c '')" -gt 1 ]; then
>     echo "$target is a merge of several legacy files:" >&2; printf '  %s\n' $legacy >&2; exit 1
>   fi
>   mkdir -p "$tmp/port/$(dirname "$rel")"
>   git -C "$repo" show "$rev:$target" > "$tmp/port/$rel"
>   if [ -n "$legacy" ]; then
>     mkdir -p "$tmp/master/$(dirname "$rel")"
>     git -C "$repo" show "$master:$legacy" > "$tmp/master/$rel"
>     cmp -s "$tmp/master/$rel" "$tmp/port/$rel" && echo "identical to $legacy: $target" >&2
>   fi
> done < <(git -C "$repo" diff-tree --no-commit-id --name-only -r --diff-filter=d "$rev" -- frontend-base/src)
>
> patch=$(cd "$tmp" && git diff --no-index --no-prefix master port || [ $? -eq 1 ])
> if [ -n "$out" ]; then printf '%s\n' "$patch" > "$out"; else printf '%s\n' "$patch"; fi
> ```
>
> </details>

## What changed

- **Course-home data module.** `course-home/data/` (API functions, query hooks, outline normalizer, the factories its tests build), `utils.ts`, `data/http-error.ts`, `course-tabs/utils.ts` and `generic/ToastContext.tsx`, each with its test. The setup file starts frontend-base's mock app with a signed-in user and adds the app configs, as profile and account do. Tests wrap the mock app's real client in `axios-mock-adapter`, which none of the converted apps do (they replace the client with a per-file fake): frontend-base's `MockAuthService` hands out a real `axios.create()` client, `master`'s suites and their `axiosMock.history` assertions are written for the adapter, and the error-path tests depend on real axios error shapes. `src/tests/location.ts` stubs `window.location`. The test site's LMS URLs move to `http://localhost:18000`, which the ported factories build on. The Pact consumer test and its contract, and the dead `upgradeNotificationData` factory, are dropped; the outline factories wait for #2191.
- **The frame.** `tab-page/` (`TabPage`, `LoadedTabPage`, `TabWithTimer`), the enrollment and logistration alerts, the user-messages and notices providers, `PageLoading`, `shared/access.js`, the local-storage helper; `Main.tsx` mounts the notices, user-messages and toast providers around the outlet. Access-denied redirects are prefixed with the learning role's URL and tested where they are made (`shared/access.test.ts`, `TabPage.test.jsx`). What later layers port is stubbed at `master`'s import paths: the instructor toolbar (#2194), product tours (#2208) and the streak celebration modal (#2201); `TabWithTimer` passes through until the exam timer returns (#2198). The plugin override registry is dropped (#2223). `LoadedTabPage`'s content wrapper is Paragon's `Container size="xl"` in place of `master`'s `container-xl`, so the page lines up with the shell's header and course bar, and it takes `mt-3` for the 1rem `master`'s own course tabs left below them (decision log entries 34 and 35).
- **The dates tab.** `course-home/dates-tab/` and `course-home/suggested-schedule-messaging/`, the dates route replacing its stub and loading lazily, and `BannerDatesUpgradeSlot` as a placeholder until #2185. The package's `style.scss` loads the timeline's `Day.scss`, unscoped until openedx/frontend-base#333 settles how apps scope their styles (decision log entry 33). `Timeline` drops a check its own loop makes always true, and it and `UpgradeToCompleteAlert` drop a `?? {}` that only moved a throw (decision log entry 32). The dates test renders through the route array and asserts frontend-base's page rules at the dates path.
- **Query retry and focus refetch.** Learning's queries run on the shell's query client, which has the library's defaults. `master`'s retry policy (no retry on a 4xx) and its `refetchOnWindowFocus: false` move onto each query through a shared `queryDefaults` spread, as the converted apps set per-query retry.
- **Query error logging.** `Main.tsx` listens on the shell's query cache and logs each Learning query's final failure, at the level its `meta.logStatusAs` names, as `master`'s query cache did.

## Known differences from `master`

- **Course tabs.** The tabs are the shell's course bar, added in #2221 and styled as Paragon's `tabs` nav: the active tab is dark text over a thin underline, where `master`'s is primary-colored with a 4px primary underline. openedx/frontend-base#332 asks whether the course bar should match `master`.
- **Course metadata refetched on focus.** The shell's course bar, added in #2221, fetches `course_metadata` under its own query key, on the shell's query client with TanStack's defaults, so it fetches again whenever the window regains focus. Learning's own queries keep `master`'s `refetchOnWindowFocus: false` (the query retry and focus-refetch commit).

## Testing

At each of the five commits, in `frontend-base/`: `npm ci`, lint, the tests and `build:ci` pass. Lint ran with the package's `.jsx` files included (openedx/frontend-base#327; decision log entry 20).

**Coverage.** The package meets its 96.15% line bar at every commit: 97.57% at the data commit, 100% at the top (258 tests, one skipped: the streak-celebration case kept as `it.skip` under #2201).

**Codecov's patch lines.** Codecov's first report on this PR listed 21 lines with a miss or a branch no test takes (decision log entry 32):

- Twelve lines no `master` test fully covers get a test in the commit that ports their file: `getProgressTabData`'s locked-grades conditions, `getProctoringInfoData` without a username, `courseHomeOutline.ts`'s `|| []` and `Array.isArray` on a block's `children`, `reportTimeZone` with no browser time zone, the user-messages provider over a saved value that is not a list, `PageLoading` with an empty `srMessage`, and `UpgradeToCompleteAlert` with no click handler.
- Three lose their branch: `Timeline`'s `if (groupedDates.length)`, which the loop above it makes always true (its body stays), and the `?? {}` after `useDatesTabData(...).data` in `Timeline` and `UpgradeToCompleteAlert`, which only moved a throw to the next line.
- Six lines keep a branch no test takes. `master` tests each through a suite a later port brings:

| Line | Branch no test takes | Tested with |
|---|---|---|
| `course-home/data/api.ts:53` | `isMasquerading`'s `!data.isStaff`, read only when `originalUserIsStaff` is true | `OutlineTab.test.jsx`, #2191 |
| `tab-page/TabPage.tsx:94` | a denied learner `getAccessDeniedRedirectUrl` gives no redirect, as on the outline tab | `OutlineTab.test.jsx`, #2191 |
| `course-home/suggested-schedule-messaging/ShiftDatesAlert.tsx:26` | the `hasEnded = false` default, for a render whose `hasEnded` is undefined | `OutlineTab.test.jsx`, #2191 |
| `tab-page/LoadedTabPage.tsx:57` | `celebrations.streakLengthToCelebrate`, read only when the metadata has `celebrations` | the streak celebration, #2201 |
| `tab-page/LoadedTabPage.tsx:58` | `celebrations.streakDiscountEnabled && verifiedMode`, likewise | the streak celebration, #2201 |
| `tab-page/LoadedTabPage.tsx:75` | the page title with no tab title, when the metadata's tabs have none for the active slug | the live tab's suite, #2203 |

**Manual testing** on tutor dev has not been done yet; its record will be added here.

## Decisions

What was decided while building this layer; the scope, the test conventions, the coverage policy and the query client settings are in #2189.

<details>
<summary>Full decision log</summary>

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
   Amended 2026-10-29: the exclusion moves to #2221, which creates
   `src/tests/` (#2221's decision log, entry 5), and the query-client helpers
   arrive with the frame commit, their first user (entry 31).

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
    `renders correctly` loses the course-tabs assertion (the slot is
    dropped; entry 23 replaces it with the page title); its streak-modal case renders the real modal and is kept
    whole as `it.skip` under #2201's URL. `TabWithTimer.test.tsx` keeps one
    pass-through case, its seven timer and attempt cases returning with
    #2198, since the library import cannot be stubbed in place.
    Amended 2026-10-27: those seven cases are not deleted but kept as
    `master`'s file, verbatim, in one block comment under #2198's URL,
    after the pass-through case. Neither a stub nor `it.skip` can hold
    them: they run on `master`'s `mockCourseRequests()` and its
    `specialExams` mock from `@edx/frontend-lib-special-exams/testing`,
    neither of which exists in the package until #2198, so a skipped case
    would still fail the CI build's type check over the tests. A block
    comment rather than `//` lines keeps the text byte-identical (the file
    has no `*/`), so its diff against `master` is the two comment markers
    and the pass-through case, and #2198's restore is deleting those and
    porting the imports. A third form, after stubs and `it.skip`, for a
    test whose harness cannot exist yet.

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
    to `frontend-base/eslint.config.js`, reapplied after every stack
    operation, and
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
      `master`'s title, "wraps only the page children, not the alerts or
      tab navigation", claimed more than it asserted: its assertions were
      the `#main-content` id, the children inside, and the tabs `<nav>`
      outside. No assertion checked the alerts, and none could pass or
      fail on them: both alert hooks show only when a private outline is
      cached, and the test seeds only the course metadata, so the alert
      list renders empty. The shorter title drops that untested claim,
      not a check; the alerts still render outside the `<main>` in
      `LoadedTabPage.tsx`, as on `master`.
      `renders correctly` loses the tabs assertion, which left it asserting
      only absences (no instructor toolbar, no dialog) that an empty render
      also satisfies; it now first waits for the document title the page
      sets from the metadata, "Course | Demonstration Course | Learning
      Test Site" (the active tab's title, the course title, the site
      name), as `Main.test.tsx` checks its title.
    `master`'s removal of the `#main-content` flex rules from `index.scss`
    has nothing to apply: the package has no `#main-content` styling, and
    `index.scss` is unported; its layer starts from the post-#2026 file.
    The `Sequence.jsx` and `CourseOutline.tsx` changes land with #2196 and
    #2197, whose bodies now say so.


24. **frontend-base is vendored from openedx/frontend-base#329 until an
    alpha carries it, and every route test asserts the page rules.**
    2026-10-27. #329 adds `runPageRules` (exported from the package root)
    and its first rule, `mainLandmark`; its how-to tells apps to assert
    `expect(runPageRules(document)).toEqual([])` in route tests once the
    page has rendered. Rather than wait for a release, the package takes
    the whole frontend-base from #329's branch: `npm pack` of its head
    commit `da3af1a1` (alpha.16 plus a docs commit and #329, neither
    touching `package.json`), packed from a clean `dist/` so no output
    of an earlier draft rides along, committed as
    `vendor/openedx-frontend-base-da3af1a1.tgz` (the package's ignore
    list covers `/*.tgz` at its root only) and named as the dev
    dependency with `file:`. The peer range, `^2.0.0-alpha || 0.0.0-dev`,
    already admits the packed `0.0.0-dev`. Copying the rule into
    `src/tests/` was the alternative; the tarball tests against the code
    that will ship, and leaving it is one lock-only commit.
    Placement: two commits between the data module and the frame, since
    the frame is the first commit of this layer that renders ported code
    (the vendor commit, then `routes.test.tsx`'s assertions). The route
    test asserts the rules in a `describe('page rules')` of its own, one
    case per path the file covers, rather than inside `expectStub`, so
    the "renders at" titles keep claiming only the route match. The stubs
    each render one `<main>`, and `renderRoutes` renders no shell, so the
    document holds only Learning's markup. A page's port moves its paths
    out of that list and asserts the rules in its own route test; the
    dates tab is the first. When an alpha with #329 is published, the
    vendor commit is replaced by a lock-only bump to it and the tarball
    goes.
    Done 2026-10-29: #329 merged 2026-10-27 as `ae5ec935`, and
    `2.0.0-alpha.17`, published four minutes later, has that commit as
    its `gitHead` and exports `runPageRules` from `dist/shell/rules`. The
    vendor commit becomes a lock-only bump from `2.0.0-alpha.16` to
    `2.0.0-alpha.17`; `package.json` keeps the range it had before the
    vendoring, which admits it, and the tarball is gone from the branch.
    Then, by Brian's call, the bump is not a commit of this layer: it
    folds into #2217's scaffold commit (#2217's decision log, entry 8), and this
    layer's commits drop to seven, the page rules third.
    Then the page-rules commit moves to #2221 as its second commit
    (#2221's decision log, entry 8): it tests only #2221's route tree, and both
    reasons it sat here, the vendored dependency and the template's
    `<main>`, are gone.
    Finding, 2026-10-27: placed before the frame, every one of the 17
    cases fails with `mainLandmark`'s error, "The page has 2 <main>
    elements without the hidden attribute". `Main.tsx` keeps the
    template's `<main className="d-flex flex-column flex-grow-1">` around
    the outlet from #2217, where the route list is empty, and #2221's
    `StubPage` renders a `<main className="p-4">` inside it. The frame
    commit turns `Main.tsx`'s wrapper into a `div`, which is what makes
    the rule pass from there on.
    The `div` moves down to #2217 (its decision log, entry 9), where the
    root route's element is created, so the frame commit no longer
    touches that line.

25. **The dates commit, in progress (2026-10-27).** Made while porting:
    - The dates route is `lazy`, with a `learning-dates` chunk name, as
      account, catalog and profile load each page route
      (`src/routes.tsx` in openedx/frontend-app-account,
      openedx/frontend-app-catalog and openedx/frontend-app-profile, read
      2026-10-27). Imported eagerly, it broke every test that mocks a
      tab-page module by path: `setupTest.js` registers the app, `app.ts`
      imports `routes.tsx`, and the real `LoadedTabPage` was in the module
      registry before any test file's `jest.mock` ran.
    - `master`'s access-denied block is not ported (entry 27). The
      request-count case waits for the
      page's title before waiting for fetches to settle, since a lazy
      route has nothing fetching until it loads; the page-rules case waits
      for the same title. `TabPage` renders the tab only once its data has
      loaded, so the title (`messages.title`, a level-one heading) arrives
      with the timeline and the `<main>`, and the wait names no fixture
      date (`Sun, May 3, 2020` is the factory's `2020-05-04T02:59:40Z` in
      the test's `America/New_York`).
    - `master`'s request-count case replied with whatever `courseMetadata`
      the access-denied cases left (`enrollment_required`), so it measured
      a redirect, not a dates load; the port gives it fresh metadata with
      the file's timezone.
    - "does not render UpgradeToCompleteAlert" waits for the suggested
      schedule header before its absence checks; `master`'s ran before
      the page could have rendered, and under the lazy route the test
      ended mid-load (React's `act` warning).
    - The two upgrade-button cases stub `location.replace` with
      `mockLocation` (entry 26): the buttons call it, jsdom reports the
      navigation as not implemented, and the console hook fails on it.
    - `Day` and `UpgradeToCompleteAlert` move `defaultProps` to default
      parameters (entry 11).
    - `classnames` is declared (`^2.5.1`; `master` pins 2.5.1), entry 13.
    - `Day`'s tooltip renders Paragon's `OverlayTrigger`, which wraps
      react-bootstrap 1.6.8's, and React 18.3 warns three times from
      inside react-bootstrap: `defaultProps` on its `OverlayTrigger` and
      `Overlay`, and `findDOMNode` from `react-overlays` under its
      `Overlay`. `setupTest.js` silences the first two under
      openedx/paragon#4523, filed for warnings from the react-bootstrap
      1.x components Paragon wraps (openedx/paragon#3043 and #3744 cover
      Paragon's own components), and the third under
      openedx/paragon#3425, which tracks `findDOMNode` in that trigger.
      Each pattern names the exact message.
    - Lint under the base config, as in entries 7, 16 and 20: the
      autofixer wraps `utils.jsx`'s one-line `if` bodies and the
      `UpgradeToShiftDatesAlert` test's `render` call; `badgelist.jsx`
      loses an `import/prefer-default-export` disable for a rule the base
      config does not know; `DatesTab.test.jsx` loses its unused `React`
      import.
    - The commit lands without the plan's per-directory thresholds; how
      coverage is held is decided separately, and the plan's Coverage
      section and commit 6 change with that decision.
    Open: the per-directory thresholds
    at `master`'s baseline are not met: `course-home/data` 81.27 of 99.64,
    `alerts/logistration-alert` 53.84 of 84.44, `generic/user-messages`
    88.7 of 89.77, `course-home/dates-tab` 97.89 of 98.39, global 63.78
    of 96.15. `master`'s baseline is its whole suite, so files whose
    consumers are later tabs (the outline factories and functions, the
    logistration alert) were covered by tests this layer does not port.

26. **Tests stub `window.location` through `mockLocation`.** jsdom cannot
    navigate (`location.replace`, `assign` or a new `href` reports
    "Not implemented: navigation", which the console hook fails on), and
    its `Location` members are non-configurable, so a test that stubs one
    swaps the whole object. `master` does that in eleven files, four ways:
    `defineProperty` with a copy of the real location plus stubbed members,
    restored in `afterEach` (`TabWithTimer.test`, and
    `Sequence.specialExams.test`, whose `stubLocation` wraps it);
    `defineProperty` with a bare `{ replace }` or `{ reload }` and a
    `try`/`finally` restore (`apiHooks.test`, `ProgressTab.test`,
    `EnrollmentAlert.test`); `delete` and assignment, restored at the end
    of the case (`OutlineTab.test`) or never (`NoticesProvider.test`,
    `CoursewareRedirectLandingPage.test`); `defineProperty` with a bare
    object, never restored (`RedirectPage.test`,
    `MasqueradeWidgetOption.test`, `useIFrameBehavior.test`).
    `src/tests/location.ts` exports `mockLocation(members)`, which takes the
    first shape, installs `{ ...window.location, ...members }` and returns
    it, and
    `restoreLocation`, which the setup file runs after each test, so no
    case restores by hand and none leaks. The spread keeps `href` and the
    other values as plain readable, writable properties (the timer test
    reads the `href` the exam library writes); a member not passed is
    jsdom's method detached from its `Location`, which throws when called.
    - The helper comes in commit 2 with `apiHooks.test`'s case, the first
      that stubs navigation; commit 5's `EnrollmentAlert` and
      `NoticesProvider` tests and commit 6's dates test use it.
      `TabWithTimer.test`'s timer cases stay `master`'s, verbatim, in the
      #2198 block comment (entry 15); #2198 brings them through the helper.
    - `NoticesProvider.test`'s "does not redirect on no data" ended with
      `expect(window.location.toString() === 'http://localhost/')`, an
      `expect` without a matcher since the test arrived (`3fcc0d87`,
      openedx/frontend-app-learning#667); against the bare mock a matcher
      would have read `[object Object]`, and against the copy `toString`
      throws. The case now asserts what the line meant: `href` is still
      the one the case started at, which a redirect by `href` assignment
      would change.

27. **Access-denied redirects are tested where they are made.**
    `getAccessDeniedRedirectUrl` (`shared/access.js`) maps
    `courseAccess.errorCode` to a path; `activeTabSlug` matters only on
    the fallback, where the outline gets `null` (no redirect). `TabPage`
    is its only caller, and the frame commit's `TabPage` prefixes the
    learning role's URL before its `<Navigate>` (the plan's Paths
    bullet). On `master` the redirect is tested only by two page suites,
    both from c667e294 (#558): `DatesTab.test.jsx`'s "when receiving an
    access denied error" (six codes; "These tests could go into any
    particular tab, as they all go through the same flow. But dates tab
    works.") and `CoursewareContainer.test.jsx`'s "when receiving a
    course_access error_code" (the same six plus
    `data_sharing_access_required`, `incorrect_active_enterprise`,
    `course_not_started_enterprise_learner`). `TabPage.test.jsx`'s denied
    cases assert the loading text and the absent tab, not the redirect;
    `access.js` has no test. Starting from server-shaped metadata, the
    page blocks were also the only check that `course_access` arrives as
    `courseAccess`.
    - Commit 6 drops the Dates block, and `renderDenied` with it.
    - Commit 5 adds `shared/access.test.ts` beside `access.js` (a `.ts`
      test of a `.js` module, as `EnrollmentAlert.test.tsx` is): every
      code's path, the fallback, and the outline's `null`. `TabPage.test.jsx`
      gains the redirect assertion: a denied course leaves the router at
      the learning role's URL plus the function's path, which tests the
      prefix where it is made. `renderRoutes` returns the router and the
      query client it creates from this commit on, since this case is the
      first to read the router; the dates test reads both.
    - Commit 2's `api.test.js` gains a `getCourseHomeCourseMetadata`
      case: the response's `course_access` comes back as `courseAccess`.
    - #2195 drops `CoursewareContainer.test.jsx`'s block when it ports
      that test. A drafted follow-up issue for moving the blocks was
      dropped: the move is this.

28. **A factory moves with the first test that builds it.** The plan
    ported `course-home/data/` whole, reading "shared code moves with its
    first consumer" (#1905's unit of a port) per directory, and so took
    every factory with it. Against the 96.15 bar, kept global
    (2026-10-29), four factories no ported test builds were 61 of the 130
    missed lines: `courseBlocks` 41 of 44, `block` 14 of 15,
    `outlineTabData` 5 of 6, `upgradeNotificationData` 1 of 2. An
    uncovered factory is an unused one, so factories stay counted and get
    no tests of their own; the unused ones leave.
    - The three source files still port whole, since splitting them would
      cut a file: `apiHooks.ts` imports every `api.ts` function, the
      enrollment and logistration alert hooks call `useOutlineTabData`
      with `enabled: false`, and `ShiftDatesAlert` invalidates
      `outlineTabDataQuery`.
    - `outlineTabData` is first built by `OutlineTab.test.jsx` and
      `ProductTours.test.jsx` on `master`, and builds on `courseBlocks`,
      which builds on `block`; all three come with #2191. Their imports in
      `course-home/data/__factories__/index.js` and
      `shared/data/__factories__/index.js` stay in place, commented out
      with #2191's URL: the index files keep `master`'s lines and order,
      the arriving port uncomments its line, and a commented import left
      afterwards names a factory that never arrived.
    - `upgradeNotificationData` is dropped with a `dropped` manifest line
      and its index import deleted. Nothing on `master` builds it (a
      whole-tree search finds only its definition and the index import,
      and no `Factory.build`, `buildList` or `attributes` call takes a
      non-literal name): its only user, `UpgradeNotification.test.jsx`,
      was deleted with the component in `14c662dc` (#1675, 2025-04-14),
      which left the factory and its import behind.
    - The same reading applies outside the factories (2026-10-29):
      `alerts/logistration-alert/messages.ts` came with the frame commit
      as part of its directory, but its only reader on `master` is
      `AccountActivationAlert.jsx`, which `OutlineTab.jsx` renders. Both
      come with #2191.

29. **Coverage: the global bar, met by tests beside the code.** Decided
    2026-10-29. The plan's per-directory thresholds at `master`'s baseline
    are not added; the global `lines: 96.15` from #2187 is the bar. At the
    top before entries 27 and 28 the package was at 82.53% (744 lines, 130
    missed). `master`'s 96.15 averages the whole app, but a port is held
    to it on its own: code a commit ports is covered by tests in that
    commit, beside the code, and code nothing covers is either unused
    (entry 28) or tested only through a later tab's suite on `master`, a
    placement gap like entry 27's.
    - The data module's own tests on `master` leave out the bodies of
      `getOutlineTabData` and `getProgressTabData`,
      `unsubscribeFromCourseGoal` and `getCoursewareSearchEnabled` (no
      caller in the port), and `normalizeCourseHomeOutline` (35 lines);
      `api.test.js` and `courseHomeOutline.test.ts` gain them in commit 2.
    - The used files #2189 ports that its tests leave short (34 lines:
      `getNotices` 11, `LogistrationAlert` 6, `user-messages` 7, the
      dates timeline and utilities 4, `ToastContext` and `http-error` 2
      each, `localStorage` and `PageLoading` 1 each) are covered in the
      commit that ports each. A line whose test would be contrived may
      stay uncovered while the bar is met, named in the PR.
    - The commit messages' "coverage bar is not met at this commit" lines
      stay where it still holds; the bar is met at the top.
    - Outcome, 2026-10-29: 99.85% of lines at the top (245 tests), the bar
      met from commit 5 on. `master`'s `ToastContext.test.tsx` had been
      left behind when commit 2 ported `ToastContext.tsx`; it ports now,
      the only `master` test of a ported file that was missing. Of the
      lines first found uncovered, `messages.ts` moved to #2191 (entry 28)
      and `http-error.ts`'s `NonRetryableError` and `isNonRetryable` are
      covered by the ported `shouldRetryQuery` tests (entry 30). One line
      stays uncovered: `PageLoading`'s `return null` when `srMessage` is
      absent, since the prop is required and reaching it means a
      prop-types error.

30. **Learning's query client settings move off the client.** Decided
    2026-10-29. Found through coverage: `isNonRetryable` had no reader,
    since `master`'s `queryClient.ts` was not ported when epic decision 30
    dropped Learning's query client provider. The shell's client is a bare
    `new QueryClient()` (`dist/shell/site.js` in the vendored build;
    `shell/site.tsx` on frontend-base `main` at `ae5ec93`), so under it a
    4xx is retried three times (query-core 5.105.0's default `retry: 3`
    with 1, 2 and 4 second delays), queries refetch on window focus, and
    a failed query is not logged: frontend-base's request-error
    interceptor logs only 401 and 403, as info, and the mutations' own
    `onError: logError` are unaffected. The test query client sets
    `retry: false` and `refetchOnWindowFocus: false`, so no test showed it.
    - Retry and focus refetch are per query, the converted apps' pattern,
      checked on each default branch 2026-10-29: account and profile set
      `retry: retryUnlessClientError` on each query (openedx/frontend-app-account#1468,
      openedx/frontend-app-profile#1407), gradebook spreads
      `gradebookQueryOptions` with `refetchOnWindowFocus: false` too
      (openedx/frontend-app-gradebook#635), learner-dashboard writes the
      4xx check inline, catalog sets nothing. Learning spreads
      `queryDefaults` first in each `queryOptions(...)`, so a query's own
      option wins.
    - Mutations need nothing, checked 2026-10-29: `master`'s client set
      only `defaultOptions.queries`, with no `mutations` entry and no
      `MutationCache` (the only `mutations:` in `master`'s `src/` is the
      test setup's `retry: false`). TanStack does not retry a mutation by
      default ("By default, TanStack Query will not retry a mutation on
      error",
      https://tanstack.com/query/latest/docs/framework/react/guides/mutations#retry;
      query-core 5.105.0's `mutation.js` passes `retry: this.options.retry
      ?? 0`), so a mutation runs once under either client; focus refetch
      is a query option only; and each Learning mutation logs through its
      own `onError: (error) => logError(error)` in `apiHooks.ts`, ported
      as is.
    - Logging is a query-cache listener in `Main.tsx`, the only Learning
      code mounted on every Learning page. query-core dispatches the
      `error` action once, after retries, just before the cache's
      `onError`, so the listener logs where `master`'s cache did. It
      keeps the queries whose key starts with Learning's `appId`, which
      every Learning query key on `master` does, through
      `matchQuery({ queryKey: [appId] }, query)`, the documented query
      filter's prefix match
      (https://tanstack.com/query/latest/docs/framework/react/guides/filters#matchquery). No converted app does
      this; none had logging to lose.
    - The listener's event shape is typed but not documented, checked
      2026-10-29. The QueryCache reference
      (https://tanstack.com/query/latest/docs/reference/QueryCache)
      documents `subscribe` "to be informed of safe/known updates to the
      cache, such as queries being added, removed, or updated", and its
      example reads only `event.type` and `event.query`;
      `QueryCacheNotifyEvent` and its `action` are exported types of
      `@tanstack/query-core`, so a renamed action fails the type check.
      TanStack's documented route for global error handling is the
      `QueryCache` `onError` of a client the app creates (the v5
      migration guide's "Callbacks on useQuery (and QueryObserver) have
      been removed" points to
      https://github.com/TanStack/query/discussions/5279, where the
      maintainer answers "That's what the global cache callbacks are
      for"), which under frontend-base belongs to the shell's client. The
      same thread suggests setting `queryCache.config.onError` from an
      effect, but that is one slot the shell and every app would share.
      Prior art for the shape, each read at the commit linked:
      TanStack's own broadcast client branches on `updated` with a
      `success` action
      (https://github.com/TanStack/query/blob/8de245ba1/packages/query-broadcast-client-experimental/src/index.ts#L129-L138,
      since the v4 release); Automattic/wp-calypso subscribes from a
      `useEffect` to the context client's query and mutation caches and
      handles `updated` with an `error` action as an expired login
      (https://github.com/Automattic/wp-calypso/blob/72a3fc84f67e8ac0ea8527a96490f6f3eed8db30/client/dashboard/app/auth/index.tsx#L271-L299);
      msupply-foundation/open-msupply does the same to show the error,
      commented "replaces onError query default removed in v5"
      (https://github.com/msupply-foundation/open-msupply/blob/f8edd26b94b03f8780faf6188877fc0d08099fa0/client/packages/host/src/QueryErrorHandler.tsx#L35-L47);
      streamshub/console's `QueryErrorHandler` component sets up its
      global query error handler the same way
      (https://github.com/streamshub/console/blob/c92e0f1702f0f09513796d6dc7853303c727fb61/api/src/main/webui/src/components/auth/QueryErrorHandler.tsx#L13-L16).
    - Possible later move: if frontend-base gave apps a way to register
      query-cache handlers with the shell's client (for instance the
      shell's `QueryCache` `onError` forwarding to handlers apps
      register), Learning could log through TanStack's documented
      `onError` instead of the listener. Not filed.
    - Two commits after the dates commit, retry and focus first, logging
      second.

31. **The stack audit, 2026-10-29.** Brian asked for every commit in the
    four layers to be checked for a change sitting above the earliest
    layer or commit where it belongs.
    - The page-rules commit moves to #2221 (entry 24) and the `src/tests`
      coverage exclusion to #2221's route-tree commit (entry 2).
    - The test site's `baseUrl` (`http://localhost:2000`) moves to #2217's
      identity commit (#2217's decision log, entry 10). Its LMS URLs
      (`http://localhost:18000`) and `EXAMS_BASE_URL` stay in the data
      commit: they are not identity but the LMS the ported factories and
      tests build URLs on (`courseHomeMetadata.factory.js`'s `host`
      option, `tab.factory.js`, `api.test.js`), so the data commit's
      message names that reason.
    - The test-setup commit is dropped, its pieces moving to their first
      users: `axios-mock-adapter`, `initializeMockApp` with
      `src/tests/authenticatedUser.ts` and the Pact `dropped` lines to
      the data commit, whose tests wrap the mock app's client and whose
      module the Pact test covered; `src/tests/queryClient.ts` to the
      frame commit, where `render.tsx`, `EnrollmentAlert.test.tsx` and
      `LoadedTabPage.test.jsx` first use it. No reason for the separate
      commit was recorded; its likely purpose was letting a reviewer
      weigh the test conventions alone, and the data commit grows by
      about 50 lines, every one used by its own tests.
    - `course-tabs/utils.test.ts` moves from the frame commit to the data
      commit, beside `utils.ts`, which the data commit ports for
      `api.ts`'s `TabMetadata` type.
    - The layer's commits drop to five. Commit numbers in earlier entries
      refer to the lists in force when they were written.

32. **Codecov's patch lines: tested here, or named with the issue that
    tests them.** Decided 2026-10-29. With the bar met (entry 29),
    Codecov's comment on #2234 still listed 21 patch lines: 3 missed and
    18 partials, a partial being a line with a branch no test takes. Each
    listed line is either tested in this PR or named in it with the issue
    whose port brings `master`'s test for it.
    - Lines `master` tests only through a suite this PR does not port wait
      for that port: `api.ts`'s `isMasquerading` read, `TabPage.tsx`'s
      line 94 and `ShiftDatesAlert`'s `hasEnded` default (`master`'s
      `OutlineTab.test.jsx`, #2191), `LoadedTabPage.tsx` lines 57-58
      (#2201) and line 75 (the live tab's suite, #2203).
    - Lines no `master` test fully covers get a test in the commit that
      ports the file.
    - `Timeline.jsx`'s `if (groupedDates.length)` is dropped and its body
      kept, in the dates commit. The guard came in with the grouping loop
      in #70 (bdb1afe9), when an empty `courseDateBlocks` left
      `groupedDates` empty. #94 (1471abe7) then pushed today after the
      loop whenever no block had placed it (`if (!foundToday)`), directly
      above the guard, which it left in place. Since then the list is
      never empty there: `foundToday` turns true only on a block dated
      today, which line 43's push then groups since nothing in the
      callback skips it, or on one dated after today, right before the
      push of today's group; otherwise the `!foundToday` push runs. No
      code removes an entry, and an invalid date makes `daycmp` return 0,
      taking the first path. The guard's false branch cannot run, so
      dropping it changes no behavior.
    - `Timeline.jsx`'s and `UpgradeToCompleteAlert.jsx`'s `?? {}` after
      `useDatesTabData(courseId, { enabled: false }).data` are dropped, in
      the dates commit. #2093 (218c9dfb) added them when its readers moved
      from `useModel('dates', courseId)` to the query, keeping `useModel`'s
      `{}` for a missing model. Both render only inside `TabPage`'s
      children on the dates tab (`master` renders `UpgradeToCompleteAlert`
      only through `BannerDatesUpgradeSlot` in `DatesTab`), and `TabPage`
      renders children only once `deriveView` finds the metadata and dates
      queries neither pending nor failed, and on the dates tab a denied
      learner is redirected first (`getAccessDeniedRedirectUrl`'s default
      case for any tab but the outline). A query in v5's `success` state
      holds defined data, `DatesTab` observes the entry so it is not
      collected, and an `invalidateQueries` refetch keeps the old data.
      Without data both components threw on the next line anyway
      (`courseDateBlocks.forEach`, destructuring `datesBannerInfo`), so
      dropping the default only moves that throw. `DatesTab.jsx`'s two
      reads and `TabPage.tsx`'s keep theirs: they render while the
      queries load.
    - A guard, a condition or default for an input today's callers or
      the LMS do not send, is judged by what it changes when that input
      arrives, not by whether it arrives today. One its own function
      makes always true, like `Timeline`'s `if (groupedDates.length)`
      above, is removed. One that only moves a throw, like the two
      `?? {}` above, is dropped: making those components render without
      data is a larger refactor than the port. One that changes the
      outcome gets a test that feeds it the input. `courseHomeOutline.ts`
      reads the outline response as `getOutlineTabData` receives it, and
      its guards turn a malformed block into an empty child list where
      the parent walk would throw:
      `block.children || []` (lines 188 and 199) for a block with no
      `children`, and `Array.isArray` (lines 230 and 239) for a
      `children` that is not an array. openedx-platform's
      `CourseBlockSerializer.get_blocks` sends a list on every block
      today; `courseHomeOutline.test.ts` gains both cases in the data
      commit.
    - `PageLoading`'s `return null` for a falsy `srMessage`, which entry
      29 left uncovered as a prop-types error, is such a guard: it passes
      the spinner no screen-reader text instead of an empty `sr-only`
      span. `srMessage=""` passes `PropTypes.node.isRequired`, which
      rejects only `null` and `undefined`, so a `PageLoading.test.jsx`
      case reaches it in the frame commit.

33. **`Day.scss` loads from `style.scss`, unscoped.** Decided
    2026-10-30. The manual pass found the dates timeline unstyled:
    `master` loads `Day.scss` only through `@import
    "course-home/dates-tab/timeline/Day.scss"` in `src/index.scss`, which
    is not ported, and the dates commit copied `Day.scss` with nothing
    importing it.
    - The package's `style.scss` `@use`s it, in the dates commit. This
      continues `master`'s single stylesheet, as the converted apps that
      had one did: openedx/frontend-app-gradebook and
      openedx/frontend-app-catalog `@use` their component partials from
      `src/style.scss`, while learner-dashboard, instructor-dashboard and
      authn, whose components imported their own SCSS before conversion,
      still do. `Day.scss` uses only its own variables, so it compiles
      under `@use` unchanged.
    - It is not scoped. The shell keeps an app's stylesheet in the page
      after a soft navigation (openedx/frontend-app-account's b3476d4),
      so the `.dates-*` rules apply to every app a site shows afterwards,
      including apps from outside the `openedx` org whose class names
      Learning cannot know. The converted apps scope differently (account
      and profile wrap their rules in a class on their `<main>`, the
      others do not), and openedx/frontend-base#333 asks how an app
      should scope its selectors. Learning waits for that answer rather
      than choosing a wrapper ahead of it, and revisits scoping if a
      collision shows up first.

34. **The frame's content wrapper is Paragon's `Container size="xl"`.**
    Decided 2026-10-30. The manual pass found the dates page starting left
    of the shell's header, masquerade bar and course tabs, by up to 68px
    above a 1464px viewport. `LoadedTabPage` kept `master`'s
    `container-xl`, which Paragon 23.23.1 caps at 1600px from a 1200px
    viewport; the shell's bars use `<Container fluid size="xl">`, capped
    at 1440px plus the 24px gutter. `master` lined up because its own
    course tabs and `InstructorToolbar` used `container-xl` too; both are
    now the shell's.
    - The wrapper becomes `<Container as={ContentWrapper} size="xl">`,
      keeping its other classes and `master`'s `main`/`div` switch for
      courseware. Both containers pad half the grid gutter, so the
      negative margins `master`'s `index.scss` gives `.unit-iframe-wrapper`
      to cancel "the padding of the parent div with 'container-xl'" still
      fit when courseware is ported.
    - The container stays on the page, not around `Main.tsx`'s outlet;
      #2188's decision log, entry 9, records why, and the stubs take the
      same container there.

35. **The frame's container restores `master`'s 1rem below the course
    tabs.** Decided 2026-10-30. With entry 34's edges lined up, the
    manual pass found the "Important dates" heading closer to the course
    tabs than on `master`. `master`'s `CourseTabsNavigation` wrapped its
    tabs in `<div id="courseTabsNavigation" className="mb-3
    course-tabs-navigation">`, so every tab page began 1rem below the bar,
    and the dates heading's own `my-3` added another 1rem. The shell's
    course bar, a Paragon `Navbar` with `course-tabs-navigation pb-0`, sets
    no bottom margin.
    - `LoadedTabPage`'s `Container` takes `mt-3`, in the frame commit, so
      every tab page gets back the 1rem `master`'s bar gave it.
      `AlertList` renders nothing when it has no message, so on a page
      without alerts nothing else sits between the bar and the container.
    - The shell is left as it is: openedx/frontend-app-instructor-dashboard
      sets its own spacing below the same course bar (`PageWrapper`'s
      heading, `m-4`), and a margin on the bar would move its content too.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
