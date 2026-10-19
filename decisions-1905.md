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
   and read `approved` in `UPSTREAM.md`. Implementation happens outside the
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
