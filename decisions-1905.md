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

4. **Header and footer are shell concerns, not ported slots.** The header
   and footer slots and the five direct imports of
   `@edx/frontend-component-header` / `-footer` go in epic 1, since those
   packages leave with frontend-platform and the frontend-base shell
   provides both.

5. **PR targets.** Epic 1 and epic 2 PRs target the `frontend-base` branch
   on openedx/frontend-app-learning. The closing PR of epic 2 merges
   `frontend-base` into `master`. Epic 3 PRs target `master`.

6. **This effort covers epics 1 and 2.** Epic 3 gets its own effort once
   the branch has landed on `master`.

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

15. **The swap is the last commit of epic 2.** Delete `src/` and the root
    config, move `frontend-base/` to the root, add the template's
    `release.yml` with a `master` trigger. Nothing rebases after it.

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

18. **Unit of a port.** One route-level page per PR, with what only it
    uses; shared code moves with its first consumer. A page too big for one
    reviewable layer splits further, courseware being the expected case;
    split points are decided when that page's ticket is written.

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
    portal.
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
    is folded. The sidebar precedes exams because exam test
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

31. **Roles: one on the root, one per tab.** Learning provides a single
    `learning` role under both `providesCourseBarRolesId` and
    `providesCourseBarMasqueradeRolesId`, exactly as instructor dashboard
    does, which is all the shell course bar and masquerade bar need since
    ancestor roles are active and `/learning` prefix-matches every tab. The
    per-tab roles from the config table go on the child routes so other
    apps can resolve a specific tab by role.

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
