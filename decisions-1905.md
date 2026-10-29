# Decisions — convert Learning to frontend-base (#1905)

Settled 2026-10-18, before implementation.

1. **Three sibling epics, not one epic with sub-epics.** The conversion is
   broken into three issues at the same level: #1905 (epic 1: run on
   frontend-base with every slot reduced to a placeholder), a second epic
   (port the slots to the Slot API and merge the `frontend-base` branch to
   `master`), and a third (split the tabs into widgets). Sub-epics were
   rejected because implementation issues sit directly under their epic and
   never two levels down. #1905 is epic 1 because its body already names the
   long-lived `frontend-base` branch as the end state of the converted code.

2. **"Initial conversion" means epics 1 and 2 together.** The 2026-09-24 FWG
   outcome recorded on #1905 defines the initial conversion as "slots
   converted and things render and work". Epic 1 alone does not meet that;
   the split is a work breakdown, not a change of scope. The `frontend-base`
   branch merges to `master` at the end of epic 2, so publishing to NPM,
   inclusion in frontend-template-site and inclusion in tutor-mfe are epic 2
   exit criteria and move off #1905's list.
   Amended 2026-10-21 (landing moved): the branch lands on `master` at the end of
   epic 1, agreed between Brian and arbrandes on 2026-10-21, so publishing,
   frontend-template-site inclusion and tutor-mfe inclusion return to #1905's
   exit criteria. The FWG's "initial conversion" still completes with #2185,
   on `master`.

3. **Epic 1 breaks every slot on purpose.** Each slot module keeps its file
   and name and renders its default content in a bare fragment, with no
   plugin-framework import; a slot with no default content renders nothing.
   This is the pattern openedx/frontend-app-catalog#137 used before its
   per-slot port commits (fragment to `<Slot id>` plus README and site-config
   example). It removes `@openedx/frontend-plugin-framework`, the
   `env.config.jsx` slot configuration and the `setupTest.js` mock in one
   step, and leaves epic 2 a mechanical per-slot replacement. The sites
   that pass plugin props or slot options (29 files, 34 attributes per
   wayfinder ticket 03; "45" was a grep line count) lose that contract in
   epic 1; the
   `frontend-base` branch absorbs the break until epic 2 restores each slot.
   Amended 2026-10-21 (landing moved): `master` carries the break from the landing until
   #2185 restores each slot, and a `legacy-mfe` branch cut from the last
   pre-swap `master` carries the old behavior, as every converted app did.
   Two of the parked items are more than a slot rendering its default:
   `SIDEBAR_WIDGETS` registration stops doing anything (decision 33) and the
   upgrade widget is absent. The swap PR's breaking section names both
   beside the slots; the DEPRs of decision 9 are filed after the landing.

4. **Header and footer are shell concerns, not ported slots.** The header
   and footer slots and the five direct imports of
   `@edx/frontend-component-header` / `-footer` go in epic 1, since those
   packages leave with frontend-platform and the frontend-base shell
   provides both.

5. **PR targets.** Epic 1 and epic 2 PRs target the `frontend-base` branch
   on openedx/frontend-app-learning. The closing PR of epic 2 merges
   `frontend-base` into `master`. Epic 3 PRs target `master`.
   Amended 2026-10-21 (landing moved): epic 1 PRs target `frontend-base`; the
   closing PR of epic 1 merges `frontend-base` into `master`; epic 2 and
   epic 3 PRs target `master`.
   Amended 2026-10-22: GitHub reads closing keywords only on a PR that
   targets the default branch, and linked issues auto-close only on merge
   into it. GitHub Docs, "Linking a pull request to an issue"
   (https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue),
   section "About linked issues and pull requests": "When you merge a
   linked pull request into the default branch of a repository, its linked
   issue is automatically closed", and its note: "If the pull request
   targets any other branch, then these keywords are ignored, no links are
   created, and merging the PR [...]"; section "Manually linking a pull
   request to an issue using the pull request sidebar": "Anyone with write
   permissions to a repository can manually link a pull request to an
   issue from the pull request sidebar." So for every PR against
   `frontend-base`, the
   "Resolves #N" line stays for readers, Brian links the issue by hand from
   the PR sidebar when the draft goes up (no API for that link), and the
   issue is closed by hand when the PR merges. The swap PR into `master` is
   the first that links on its own.

6. **This effort covers epics 1 and 2.** Epic 3 gets its own effort once
   the branch has landed on `master`.
   Amended 2026-10-21 (landing moved): this effort covers epic 1 through the
   landing. Epics 2 and 3 each get their own effort, since both now sit on
   `master` after the landing.

Settled 2026-10-19, while charting the wayfinder map.

7. **The map's destination is an approved ticket set, not code.** The map
   is cleared when epic 1's sub-issues exist as direct sub-issues of #1905
   and read `settled` in `UPSTREAM.md`. Implementation happens outside the
   map, one issue per layer, as the React Query epic ran.

8. **Done for epic 1.** A `frontend-base` branch on upstream where every
   route Learning serves today renders under `npm run dev` in the
   frontend-base shell; types, lint and tests are green;
   `@edx/frontend-platform`, `@openedx/frontend-build`,
   `@openedx/frontend-plugin-framework`, `@edx/frontend-component-header`
   and `-footer` are gone from the new package; every plugin slot is a
   placeholder; and the package composes into a local
   frontend-template-site checkout. That composition is verification only;
   the default-config PR to frontend-template-site is #2185's.
   A port PR is mergeable when, in addition, the ported route has been
   exercised by hand in the verification environment and the observations
   are in the PR's manual-testing record; a behavior the manual pass finds
   untested gets its test in the same PR.
   Amended 2026-10-21: per-layer manual testing runs on the package's own
   `npm run dev` site (shell, header, footer and Learning, against tutor
   dev), the way the converted apps are developed. The template-site
   composition is the epic's close-out check only. Never a bind mount into
   the site's `packages/`: a checkout or a git worktree goes there directly,
   and because the package is a subdirectory of its repository, the site's
   `packages/*` glob would pick up the legacy root `package.json`, so the
   layout (an explicit `workspaces` path, or a checkout outside the glob)
   is settled at close-out.
   Amended 2026-10-21 (landing moved): done also requires the landing: a
   `legacy-mfe` branch cut from the last pre-swap `master`; a tutor-mfe PR,
   merged before the swap, adding `alternate_master: "legacy-mfe"` to
   Learning's entry in `CORE_MFE_APPS` (every converted app has one; without
   it tutor's nightly builds the new `master` as a webpack MFE) and listing
   Learning in the site target's config; the swap adding the template's
   `release.yml` and `.releaserc` with `master` in place of `main`, so the
   alpha channel publishes as the other apps do; and the
   frontend-template-site default-config PR after the first publish.

9. **Breaking changes are decided in PRs, not on the map.** As in the React
   Query epic, a feature the branch stops carrying ships as a `refactor!:`
   PR with a DEPR filed after. The map notes "may need a breaking change"
   on the ticket that touches the feature and never carries a ticket whose
   resolution is "drop X".

10. **Special exams is not a dependency decision.**
    `@edx/frontend-lib-special-exams` 5.0.1, which master already uses, has
    no frontend-platform, redux or plugin-framework peer; the host passes
    config, HTTP client and auth state through `SpecialExamsProvider`.
    Exams work at the end of epic 1 like any other runtime feature.

11. **Layout: legacy stays put, the new app lives in `frontend-base/`.**
    The inverse of catalog's overlay. The existing tree stays at its paths
    under `src/` and is never edited on the branch; the new app is its own
    package in `frontend-base/` with its own `package.json`, lockfile, jest,
    tsconfig and eslint config, scaffolded from frontend-template-application
    `main` (its `frontend-base` branch no longer exists). The root files stay
    master's until the swap. Rationale: the branch is rebased on `master`,
    and a branch whose commits touch only `frontend-base/**` and new files
    rebases without conflicts, including over renovate's weekly root
    `package.json` and lockfile bumps. The one consequence of two
    `package.json` files is Node's upward module resolution: CI for the new
    package runs with no root install present so a missing dependency cannot
    resolve from the root `node_modules`.
    Amended 2026-10-21: two root files take one additive line each, because
    master's tooling runs on the whole tree: `npm run lint` is
    `fedx-scripts eslint ... .` and `.eslintignore` does not list
    `frontend-base/`; frontend-build's jest config sets `rootDir` to the
    working directory with no `roots` or ignore patterns, so it would collect
    `frontend-base/src/*.test.tsx` and fail them. `.eslintignore` gains
    `frontend-base/` and the root `jest.config.js` ignores
    `<rootDir>/frontend-base/`. Root `tsconfig.json` needs nothing; its
    `include` is scoped to `src/`, `plugins/` and root `*.js`. Neither file is
    touched by renovate (`.eslintignore`: three commits ever, last 2024;
    `jest.config.js`: last 2026-10-15), so the rebase argument stands.

12. **Rebase, not merge.** `frontend-base` is rebased on `master` and
    force-pushed; Brian is the only one pushing it and the open stack is
    re-synced with gh-stack after each rebase. Gradebook and authn merged;
    the layout in 11 is what makes rebase cheap here.

13. **Ports keep relative paths; a manifest records provenance.**
    `src/<path>` ports to `frontend-base/src/<path>`. Path-changing moves
    (`plugin-slots/` to `slots/`) wait for #2185. Each port PR adds lines to
    a manifest in `frontend-base/`: legacy path to new path(s), or
    `dropped`; a split lists several targets, a merge several sources. The
    manifest is complete by construction because the reviewer sees it with
    the diff, and it is the deletion list for the swap: every `src/` file is
    mapped or dropped, or the swap does not proceed.
    Format (wayfinder ticket 05): one plain-text `frontend-base/manifest.tsv`,
    two tab-separated columns, sorted by legacy path so a port's lines sit
    beside their directory instead of at a shared end of file; the audit
    script is `bin/rebase-audit` in the effort worktree.

14. **The rebase audit resolves master's changes through the manifest.**
    Before each rebase, a script in the effort worktree lists the files
    master changed under `src/`, resolves each through the manifest, and
    flags any unmapped file in a directory that has manifest entries (a new
    file master added into a ported area). Each hit becomes a re-port issue
    through the usual export. Master's edits to ported files therefore never
    conflict; they become reviewed PRs.
    Amended 2026-10-27: a hit in a file that exists only in an open layer
    of the stack (not yet merged into `frontend-base`) is folded into that
    layer's commit instead of becoming an issue, since the layer's PR is
    where it gets reviewed; the layer's decision log records it. First
    case: #1938 and #2026 against #2189's frame.

15. **The swap is the last commit of epic 2.** Delete `src/` and the root
    config, move `frontend-base/` to the root, add the template's
    `release.yml` with a `master` trigger. Nothing rebases after it.
    Amended 2026-10-21: the swap also removes the branch-only coverage bar,
    the `coverageThreshold` in the package's `jest.config.js` (decision 17),
    since an absolute target is not a policy master has (master's codecov
    status is `auto` against the base commit). The two root ignore lines from
    decision 11 go with the root config they live in. Added 2026-10-21: so do
    the lcov `projectRoot: '..'` in the package's jest config and the
    workflow's codecov step form (`files: frontend-base/coverage/lcov.info`,
    no `working-directory`), both of which describe the subdirectory layout;
    the step returns to the template's plain form.
 Amended 2026-10-21 (landing moved): the swap is the last commit of epic 1,
    in the PR that merges `frontend-base` into `master`.

16. **CI is one new workflow file.** `.github/workflows/frontend-base.yml`,
    copied from frontend-template-application's `ci.yml`, with
    `defaults.run.working-directory: frontend-base`,
    `node-version-file: frontend-base/.nvmrc`, and `paths` filters on
    `frontend-base/**`. Master's `validate.yml` keeps running the legacy
    suite unchanged and is never edited on the branch. The template's other
    workflows are already identical to Learning's or act on the root package
    until the swap; `release.yml` arrives with the swap.

17. **Coverage: an absolute flag target plus a manual per-area check.** The
    new workflow uploads with `flags: frontend-base` from
    `frontend-base/coverage`, configured by `frontend-base/codecov.yml`
    through the action's `codecov_yml_path` input (unverified; on the
    prototype ticket). The flag's project target is a literal equal to
    master's project coverage at branch creation, not `auto`, so the swap PR
    is not the first comparison against master. The legacy upload stays
    unflagged, so the PR comment's combined number is noise; the flag's
    status check is the number read. Each port's manual-testing record
    compares its directory's coverage against a master baseline captured at
    branch creation; this stays manual, since per-directory thresholds in
    codecov would be a maintenance burden across 34 slot directories and
    nine route areas.
    Amended 2026-10-21: the bar is a jest `coverageThreshold` in the
    package's `jest.config.js`, not a codecov status. `codecov_yml_path` is
    "ONLY used for automated test selection" (codecov-action `action.yml`);
    the YAML must sit at the repository root, `dev/` or `.github/`, so a
    flag status would be a root `codecov.yml` edit, needing a
    `flag_management` carryforward block for PRs that upload no flag, and
    an unwind at the swap. The jest threshold fails `npm test` locally and
    in CI, uses the same lcov line numbers codecov reports, and takes a
    per-path map, so the per-directory check stops being manual: each port
    PR adds its directory's baseline line beside its manifest lines, read
    from `coverage-baseline-master.tsv` in the effort worktree (codecov's
    line coverage of master @ `50faa452`, project 96.15%). The global
    threshold is `lines: 96.15`. The upload still carries
    `flags: frontend-base`, so codecov shows the package's number
    separately; it is informational. Cost accepted: a partial local run
    (`npm run test -- <path>`) collects coverage for all of `src/` and trips
    the global threshold, so partial runs pass `--coverage=false`. Removed
    at the swap (decision 15).

18. **Unit of a port.** One route-level page per PR, with what only it
    uses; shared code moves with its first consumer. A page too big for one
    reviewable layer splits further, courseware being the expected case;
    split points are decided when that page's ticket is written.
    Amended 2026-10-29: the unit is the file, not the directory. A
    factory moves with the first test that builds it, not with its
    directory's first consumer (decisions-2189 entry 28).

19. **Layers push to upstream.** gh-stack cannot target an upstream branch
    from a fork, so the stack's layers are pushed to upstream as
    `bsmith/<name>`, targeting `frontend-base`, and re-synced after each
    rebase of the base.

20. **Header and footer are the shell's.** Learning declares its course-bar
    roles through `provides` (frontend-base ADR 0013) so the shell's course
    bar handles tab navigation; Learning's own header component, its tabs
    navigation, and the header and footer plugin slots are not ported. A
    research ticket diffs what Learning's header renders today against the
    shell header, and each gap becomes "shell provides it", "declared
    through `provides`", or a possible-breaking-change note.

21. **Root route is `learning`.** Every converted app keeps the first
    segment of its old URL as its root route (`/catalog`,
    `/gradebook/:courseId`, `profile`, `account`); the shell concatenates
    app routes as written under one site basename, with no per-app mount
    point. Learning's array therefore has one root route at `learning` with
    the course routes and the three non-course routes as children, so every
    existing deep link resolves. Learning's source already contains no
    `/learning` literal; the per-port check is any absolute `<Link to>` or
    `window.location` write the port touches.

22. **Wrappers become layout routes; the catch-all is the shell's.**
    `DecodePageRoute` and `PathFixesProvider` port verbatim as parent routes
    with an `element` and `children`, as instructor dashboard structures
    its tabs; the `/preview/course/...` paths port as extra patterns on the
    courseware route. The shell's router renders its not-found page for any
    unmatched path, so Learning's `*` route is not ported; Learning's 404
    component stays for in-app cases such as a bad course id, as profile's
    index child does. Whether either wrapper becomes a route loader later
    is a ticket, not an epic-1 change.

23. **Test-port conventions.** Learning starts from the rules the converted
    apps share (catalog's `port-the-tests.md`, confirmed in profile #1408
    and account #1470): each test file mocks `@openedx/frontend-base` by
    spreading `jest.requireActual` and overriding what it needs; no shared
    mock module for frontend-base; no Mock Service Worker; the HTTP client
    is a per-file `jest.fn()` on `getAuthenticatedHttpClient`; assertions
    that only test shell responsibilities are dropped. Two points follow the
    recent conversions rather than catalog: the setup file calls
    `initializeMockApp({ authenticatedUser })` and `addAppConfigs()` at top
    level, as profile and account do, instead of merging site config by
    hand; and a shared render helper (query client, intl provider, memory
    router) is kept, as four of the five converted apps do. A port that
    deviates says why in its PR. Profile's Pact test runs under
    frontend-base by pointing the provider at `mergeSiteConfig`, so Pact is
    a per-port check, not an open question.
    Amended 2026-10-22 (openedx/frontend-app-learning#2188): route-level
    tests render the exported route array through `createMemoryRouter`,
    the data-router twin of the shell's `createBrowserRouter`, so `lazy`
    routes and loaders run in tests; the package's jest environment
    (`jsdom-environment-with-node-fetch.mjs`) forwards Node's Fetch classes into jsdom for
    that, since jsdom has none and the data router builds a `Request`.
    Page tests ported from `master` keep their component-router seams
    (`MemoryRouter` with the page mounted on its own path patterns); the
    redirect layers' loaders are unit-tested directly, which needs the
    same globals for the `Response` that `redirect()` returns. Sources
    and the rejected `whatwg-fetch` are in the layer's decision log.
    Amended 2026-10-23 (openedx/frontend-app-learning#2189): the HTTP
    client in tests is the real mock-app client wrapped in
    `axios-mock-adapter`, not a per-file `jest.fn()` on
    `getAuthenticatedHttpClient`. None of the eight converted apps has the
    adapter; profile, account, catalog, gradebook and learner dashboard
    replace the client with a fake per file. Learning stays with the
    adapter because frontend-base's `MockAuthService` hands out a real
    `axios.create()` client and its docstring's own example wraps it in
    `axios-mock-adapter`; master's 124 suites, its `mockCourseRequests`
    harness and the React Query epic's HTTP-boundary assertions on
    `axiosMock.history` are written for it, so porting is a move; and
    the error-path tests depend on real axios error shapes (`TabPage`
    branches on `response.status`), which a hand-built fake does not
    produce. The deviation is stated in #2189's PR body. The rest of the
    convention stands: `initializeMockApp` and `addAppConfigs` at top
    level, per-file `jest.requireActual` mocks of frontend-base, no
    shared mock module, no Mock Service Worker.

24. **Cross-app URLs are route roles.** `DISCUSSIONS_MFE_BASE_URL`,
    `ENTERPRISE_LEARNER_PORTAL_URL` and `INSIGHTS_BASE_URL` become
    consumer-named role ids that Learning resolves through
    `getUrlByRouteRole` and a site supplies through `externalRoutes`, the
    form the how-to prescribes and admin-console used for the authoring app
    (`org.openedx.frontend.role.courseAuthoring`). Catalog's alternative,
    a sibling app's URL as app config with `null` hiding the feature, was
    rejected because an unresolved role already yields nothing. An iframe
    `src` is no exception: the role resolves to a URL string. The role ids
    are named in the config table review (wayfinder ticket 02).
    A role is not a synonym for an external URL: `resolveRouteByRole` reads
    both installed apps' routes and `externalRoutes`, so when the
    discussions app is converted and installed in the same site, the same
    role resolves to its in-site route and the site drops the external
    entry, with no change in Learning. Two rules keep that path open: name
    each role by destination (the id the destination app would itself
    declare), never by mechanism; and treat the resolved value as a URL
    only, never as a known-foreign origin. Learning's iframe is its current
    rendering of the discussion tab, revisited by the discussions
    conversion and #2186, not by epic 1.
    Amended 2026-10-19: `INSIGHTS_BASE_URL` leaves this list. Insights is
    deprecated platform-wide (openedx/public-engineering#221; repositories
    moved to the unsupported org under #227), so the Insights button is
    dropped under that DEPR and the variable has no frontend-base
    equivalent. The two roles are discussions and the enterprise learner
    portal. Amended 2026-10-20: the enterprise learner portal is not a
    role. Neither enterprise denial code is emitted by openedx-platform;
    both come from the edx-enterprise plugin's `CourseStartDateValidationFailed`
    filter (`enterprise/filters/courseware.py`), and the portal URL is that
    plugin's deployment, not an Open edX destination. `ENTERPRISE_LEARNER_PORTAL_URL`
    stays a plain URL key in Learning's app config, unset by default as the
    `.env` ships it; when unset, the enterprise denial falls back to the
    dashboard redirect the plain course-not-started case uses (on `master`
    the unset case calls `location.assign('')` and reloads into the same
    denial). The enterprise redirect and the enterprise-only access-denied
    page (#2192) are the two branches Learning carries for that filter and
    are deprecation candidates together, decided outside the port. The one
    role is discussions. The discussions role id is `org.openedx.frontend.role.discussions`
    (named 2026-10-20 with the discussion redirect; the destination-named
    form of `dashboard`, `profile`, `courses`), used by #2199 and the
    redirect route.
    Amended 2026-10-19 (auxiliary sidebar): the discussions widget keeps its
    iframe, built from the role-resolved URL plus `inContextSidebar`, the
    parameter that tells the discussions app it is in a sidebar. An
    installed, converted discussions app is a drop-in for the external route
    as long as it keeps honoring that parameter; an iframe of an in-site
    route otherwise loads the whole shell inside the shell. Replacing the
    iframe (the installed app rendering its own panel, plausibly by
    inserting a widget into the auxiliary sidebar slot) is for the
    discussions conversion or a follow-up to it, not this effort. The
    manual test covers both resolutions: the real discussions app as an
    external route, and a stub installed app providing the role.

25. **Config table reviewed; `SESSION_COOKIE_DOMAIN` is an app config key.**
    The 52-row table in wayfinder ticket 02 stands with the precedents its
    addendum records. `SESSION_COOKIE_DOMAIN` follows authn: an app config
    key under the same name, set by the operator in the app's `config`, not
    in `defaultConfig`; unset scopes the cookie to the serving host.
    frontend-base has no cookie-domain field. Two conventions ride along:
    flag keys keep their SCREAMING_SNAKE names so MFE config API values keep
    flowing (account #1470), and only real defaults go in `defaultConfig`,
    since a key in the app's own `config` cannot be overridden by the site's
    `commonAppConfig` (catalog #156); `SUPPORT_URL` stays under that name
    because the shell's help button reads it from the app's config.

Settled 2026-10-19, wayfinder ticket 04 (port order).

26. **The frame layer is routes and roles only, with a stub route per
    page.** The layer after the scaffold adds the root `learning` layout
    route with a bare outlet, a stub route for each of the eleven
    route-level pages (an element rendering one line naming the page as not
    yet ported), `handle.roles` per route, and `provides`. Nothing fetches
    and no provider mounts. Its manual pass is tab switching in the shell
    course bar. Everything else arrives with its first consumer or as its
    own layer. A "stub route" is in the effort glossary; the bare word
    "placeholder" stays ordinary usage, with "placeholder slot" the fixed
    term.

27. **Page order is by reachability, not size.** Dates first (it brings the
    tab-page frame and the course-metadata fetch), then progress, outline
    tab; then courseware; then the pages a tester can only reach with
    setup or a typed URL: live, discussion, redirect landing, goal
    unsubscribe, preferences unsubscribe, and access denied (moved here
    2026-10-19: only the `incorrect_active_enterprise` code reaches it, so
    its content needs an enterprise learner), each with a recipe in its
    manual-testing record. The header title widget, instructor toolbar and
    product tours are their own layers any time after dates. "Outline tab"
    is the canonical name for the course home tab (glossary), never bare
    "outline", which collides with the courseware outline sidebar.
    Amended 2026-10-22: a layer sits between the scaffold and the frame,
    openedx/frontend-app-learning#2218, which makes the package's suite fail
    on unexpected `console.warn` and `console.error` (`jest-fail-on-console`
    in the setup file, an allowlist by message holding only react-router's
    two future flag warnings until frontend-base decides on the flags,
    openedx/frontend-base#325). Reason: one run of master's suite prints 2,101
    console blocks; half vanish by construction under frontend-base and the
    rest are app or test defects that each port fixes, and a failing hook is
    what makes a port fix them rather than carry them. The inventory is
    `test-warnings-master.md` in this worktree. Decision 23's conventions
    gain the rule: a port that mutes the console in a test says why.

28. **Discussion is ported as a redirect route.** No code path in
    edx-platform builds Learning's `/discussion` URL (the LMS tab links
    straight to the discussions app), but course content may, so the route
    stays. Its port is a loader redirecting through the discussions role
    (24) to the discussions app, replacing the 2022 iframe (#879) that
    existed to keep the then-new discussions app inside Learning's chrome.
    The sub-issue proposes the redirect; its review is where "as an iframe"
    would win instead. The in-context discussions sidebar is unaffected.

29. **Courseware stubs inward, in a fixed chain.** CW1 container and
    redirects with the course component stubbed to print the resolved ids;
    CW2 sequence and unit with the exams provider stubbed as a pass-through;
    CW3 outline sidebar; CW4 exams; CW5 right sidebar and widgets; CW6 unit
    extras; CW7 course exit. Amended 2026-10-20: the bookmark leaves CW6
    for CW2 (openedx/frontend-app-learning#2196), since the bookmark button
    is the unit title slot's default content and ports with it; ticket 15
    is folded. Amended 2026-10-20: the course-exit mode helper and messages
    (`course-exit/utils.js`, `messages.ts`) port with CW2's unit
    navigation, which reads them for the next button; CW7 ports the page.
    Amended 2026-10-20: the streak celebration modal joins CW6
    celebrations (it is rendered by the tab-page frame, which #2189 ported
    without naming it; #2189 now says the frame leaves it out until then),
    and social share (ticket 17) folds into celebrations, since the share
    buttons render only inside the first-section modal and the course-exit
    celebration. The streak discount line is a deprecation candidate
    (openedx/public-engineering#22 archived the ecommerce stack; #1763's
    discount-code service is unnamed; neither URL key is set by
    openedx-platform or tutor-mfe); the port carries it unless the pull
    request decides otherwise. The sidebar precedes exams because exam test
    cases need a way out to another section. CW5 and CW6 may swap; the rest
    is a chain. Breadcrumbs and the unit tab strip are not rendered on the
    branch: since #1716 and #1685 both are operator-inserted plugins with no
    default content, so master out of the box has neither either.

30. **Learning-wide providers go on the root route.** The user-messages,
    toast, notices and plugin-overrides providers become the root `learning`
    layout route's element, added by the first page that needs each, as the
    faithful port of what `index.jsx` wraps today. Not `App.providers`,
    which frontend-base hoists site-wide (ADR 0013's objection), and not per
    page. The query client provider is dropped; the shell owns one. A
    widget mounted in the shell header cannot read these and reads the
    shared query cache instead (the title widget).
    Amended 2026-10-23: three providers, not four. The plugin-overrides
    provider is dropped with its module (#2223 reshapes the override onto
    the Slot API): on a frontend-base site no plugin can reach the registry,
    since `usePluginOverrides` is not a package export and, until #2185,
    there is no slot to mount a widget in; carrying it preserved nothing
    observable. The unit (#2196) calls `getIFrameUrl` directly.

31. **Roles: one on the root, one per tab.** Learning provides a single
    `learning` role under both `providesCourseBarRolesId` and
    `providesCourseBarMasqueradeRolesId`, exactly as instructor dashboard
    does, which is all the shell course bar and masquerade bar need since
    ancestor roles are active and `/learning` prefix-matches every tab. The
    per-tab roles from the config table go on the child routes so other
    apps can resolve a specific tab by role.
    Amended 2026-10-20: a route carries a role when another app would
    resolve it to link there, and otherwise none. Redirects (discussion),
    internal states (access denied, redirect landing) and pages reached
    from emailed URLs (goal and preferences unsubscribe) lose theirs; the
    six destination pages (course home, dates, progress, live, courseware,
    course exit) keep theirs. A role on a redirect would send a resolving
    app through Learning's hop instead of to the destination.
    Amended 2026-10-22 (openedx/frontend-app-learning#2188): four, not
    six. Live is reached only from the course bar, which navigates by the
    tab URLs `course_metadata` supplies rather than by role, and course
    exit only from inside courseware (the next button on the last unit);
    neither has a consumer outside Learning. Course home, dates, progress
    and courseware keep theirs: each has a plausible outside consumer
    (the learner dashboard resumes into courseware and course home, the
    instructor side links to a learner's progress page, the platform
    points learners at dates from outside the app) and each is also a
    course-bar tab. The landing tab's role is `courseOutline`, not the
    config review's `courseHome`: the repo glossary's "course home" is the
    whole tab-page side, the effort glossary's name for the page is
    "outline tab", and the shell's course-bar slug is `outline`; the
    collision with the navigation sidebar that the glossary guards against
    is not a risk inside a role id.
    Amended 2026-10-22 (openedx/frontend-app-learning#2188, manual pass):
    the role provided for the course bar and the masquerade bar is not
    the root's. A course-bar role says "this route is a course page"
    (ADR 0013's example and instructor dashboard's role sit on a
    `:courseId` route), and the root `learning` role is active on the
    three non-course pages too, where the shell's masquerade bar then
    requested `/courses//masquerade`. Two course layout routes,
    `course/:courseId` and `preview/course/:courseId`, carry
    `org.openedx.frontend.role.learningCourse`, which is what `provides`
    lists; `learning` stays on the root as the app's role, unprovided.
    The layout routes are the parents the courseware-container layer's
    URL-decoding wrapper was going to need.

32. **The two courseware sidebars are the navigation sidebar and the
    auxiliary sidebar.** Direction names describe the left-to-right
    rendering only: both sidebars sit in one flex row in `Sequence.jsx`,
    frontend-platform sets `dir="rtl"` on the document for an RTL locale,
    and Brian observed the navigation sidebar on the right under an RTL
    language on `master` (2026-10-19; the auxiliary side not yet observed,
    no course with discussions at hand). Content names ("discussions sidebar") name a plugin's
    output rather than the panel. The platform's own names come from the
    waffle flags `courseware.enable_navigation_sidebar` and
    `courseware.always_open_auxiliary_sidebar` (removed by
    openedx/frontend-app-learning#1713); the release notes and learner docs
    say "navigation sidebar", and openedx/frontend-app-learning#1923 uses
    both. Everything else is an alias (GLOSSARY.md). The placeholder slot
    modules keep their legacy file and component names (`RightSidebarSlot`,
    `CourseOutlineSidebarSlot`); the frontend-base slot ids are named in
    openedx/frontend-app-learning#2185 along with every other id.
    Published bodies and titles for #2196 and #2197 are updated to the terms;
    the tickets, spec and map keep the aliases they were written with.

33. **The auxiliary sidebar ports with placeholder slots and the
    discussions widget hard-registered; widget registration from config
    waits for the Slot API (#2185), and the upgrade widget's fate is
    settled there too.** Registering
    widgets from `SIDEBAR_WIDGETS` is a plugin mechanism of the same kind
    as a slot, so it belongs with the slots: `defaultWidgets.js` (the
    built-ins merged with the config) does not port before #2185, and the
    course component passes `[discussionsWidgetConfig]` to the provider
    directly where `master` passes `getEnabledWidgets()`; under
    frontend-base the slot itself is the likely registry, with a Tutor plugin (tutor-forum, which
    today only sets `ENABLE_DISCUSSION_SERVICE` on the LMS) inserting the
    discussions widget. Revisited in #2186 when tabs become widgets. The
    two slot modules are the one rename in the port, `RightSidebarSlot` →
    `AuxiliarySidebarSlot` and `RightSidebarTriggerSlot` →
    `AuxiliarySidebarTriggerSlot`, an exception to the placeholder-slot
    rule because the effort retires "right" for this panel (decision 32);
    the manifest carries the mapping and the legacy slot ids wait for
    #2185. The upgrade widget's panel has been a plugin slot with no default
    content since 14c662dc (2025-04-14): on a stock site it is a trigger
    with a red dot that opens a titled, empty panel, available only on
    verified-mode courses and never auto-opened since
    openedx/frontend-app-learning#1923. Porting it without slots ports a
    frame around nothing. The auxiliary sidebar issue ports the framework
    and the discussions widget and keeps the several-registered-widgets
    path working (one trigger per available widget, one panel open), which
    the framework's mock-widget suites already pin. Whether the upgrade
    widget ports at all, and if so whether it stays registered by default,
    is settled in #2185 in line with
    DEPR openedx/frontend-app-learning#1902 (awais-ansari, 2026-04-20),
    which lists the default-on registration for removal and has stalled
    since July 2026.

34. **Dashboard and profile links resolve roles.** `master` links to the
    learner dashboard as the LMS `/dashboard` URL (shared `DashboardLink`,
    the course-exit view-courses and dashboard-footnote slot defaults) and
    to the profile through `ACCOUNT_PROFILE_URL`. Both are cross-app
    destinations with roles the destination apps declare,
    `org.openedx.frontend.role.dashboard` (frontend-app-learner-dashboard
    `src/constants.ts`) and `org.openedx.frontend.role.profile`
    (frontend-app-profile `src/constants.ts`), so per decision 24 they
    resolve through `resolveRouteByRole`. The shared links module ports
    with the progress tab (openedx/frontend-app-learning#2190, first
    user), named there by amendment; the course exit page reuses it and
    its two slot defaults follow the same mapping.
    Amended 2026-10-20: the redirect landing page's `dashboard` child
    resolves the same role, with no query string, instead of
    building the LMS `/dashboard` URL and relying on the LMS to bounce to
    the learner dashboard app (which it does without the query when its
    `learner_home` flag points at the learner dashboard app). `notlive` and `access_response_error`
    are read only by the legacy LMS dashboard template; frontend-app-
    learner-dashboard has never read them (full history, 815 commits since
    2021-09-16, checked 2026-10-20), and the legacy template is deprecated
    (openedx/openedx-platform#35326, reopened 2026-07-31; umbrella
    openedx/openedx-platform#38921). The access helper's two query-building
    lines are dead under that DEPR; their removal is a pull-request call.
    A site that wants the LMS hop points the role at the LMS URL as an
    external route.

35. **Redirect-only routes port as route loaders.** A route whose only
    job is to send the learner elsewhere (the five children of the
    redirect landing page, the discussion redirect of
    openedx/frontend-app-learning#2204) gets a `loader` returning
    react-router's `redirect`, the mechanism frontend-base itself uses
    (`authenticatedLoader` to the LMS login, the shell's home redirect in
    `getAppRoutes.ts`), not a component calling `location.assign` during
    render as `master`'s `RedirectPage` does. The landing page's
    interstitial is dropped with it: its visible part is a spinner that
    reads as loading, and its "Redirecting..." text is screen-reader only.
    A faithful port that departs from frontend-base's own practice needs a
    justification, and the interstitial is not one. Decision 22's wrappers
    are untouched: they are not redirects.

36. **The tour's upgrade step is a deprecation candidate, revisited with the
    notifications slot in #2185.** The new-user course home tour has a
    checkpoint on `#courseHome-upgradeNotification`, an id that lived inside
    `UpgradeNotification`, the outline tab notifications slot's default
    content until 14c662dc (2025-04-14); Paragon's `ProductTour` prunes a
    checkpoint whose target is absent, so on a stock site the step is
    skipped and only an operator's upsell plugin rendering that id brings it
    back. #1968's smoke test did not cover the step. Deprecating a core
    tour step that only a plugin can target needs a way for an operator to
    add a step to the tour, so the question is parked with #2185's port of
    that slot. The port carries the step as it is.

37. **A deferred piece is stubbed at `master`'s import path, never cut out
    of the file that renders it.** Set 2026-10-26 while reviewing #2189's
    frame, which had removed the toolbar, tours and streak modal from
    `LoadedTabPage.tsx` and `TabPage.tsx` with their tests: lines cut now
    come back in a later layer's diff, in whatever shape that layer gives
    them, and the port's file stops matching `master`. Instead the host
    file ports whole and the module it imports is a stub at the same path
    (renders nothing or passes children through, declares the props the
    host passes, carries the replacing issue's URL), deleted by the layer
    that ports the real module. #2188's stub pages and #2196's planned
    stubs are the same pattern; #2189 is redone to it. Removal is for what
    the shell owns (header, footer, course tabs) and is recorded as
    `dropped` in the manifest. A `master` test that renders a stubbed
    module for real is kept whole as `it.skip` under the issue's URL. A
    library import that cannot be stubbed at its path (the special-exams
    timer in `TabWithTimer`) is the exception and is said so in the plan.

