# Spec: convert Learning to frontend-base, epic 1 (openedx/frontend-app-learning#1905)

Status: ready-for-agent
Source: wayfinder map `wayfinder/learning-frontend-base/map.md`; decisions 1–31 in `decisions-1905.md`; research under `wayfinder/learning-frontend-base/research/`.

## Problem Statement

Learning is the last large frontend app still built on frontend-platform, frontend-build and frontend-plugin-framework. A site assembled with frontend-base can install the account, profile, catalog, gradebook, learner dashboard and instructor dashboard apps, but not the courseware and course home that learners spend their time in. Every course tab click is a full page load, the header course bar's client-side navigation never reaches Learning, and operators must run Learning as a separately deployed MFE beside a frontend-base site. Maintainers carry 237 files of frontend-platform imports, 52 environment variables and a plugin mechanism the rest of the ecosystem has left.

## Solution

Learning becomes a frontend-base app that a site installs like the others: an npm package exporting an `App` with routes, roles, `provides` and slot operations, running inside the frontend-base shell with the shell's header, footer and router. The conversion lands on a long-lived `frontend-base` branch, one reviewable layer at a time, with every current route rendering under the shell by the end. Plugin slots are reduced to placeholder slots for this epic; their port to the frontend-base Slot API and the merge to `master` are the next epic (#2185). Tabs become widgets in the epic after that (#2186).

## User Stories

1. As a learner on a frontend-base site, I want the course home, dates, progress and courseware pages to render inside the site, so that I do not leave the site's header, footer and navigation to take a course.
2. As a learner, I want every URL I use today under the `/learning` prefix to keep working, so that bookmarks, emails and course content links do not break.
3. As a learner, I want switching between course tabs to be a client-side navigation, so that tab changes are fast and keep the page state the shell owns.
4. As a learner, I want the course's org and title shown in the header on every course page, so that I know which course I am in, as today.
5. As a learner, I want the outline sidebar to be my navigation in courseware, so that I can move between units and sections the way I do today.
6. As a learner, I want previous and next, the bare course URL and the bare sequence URL to land me on the right unit, so that resume and deep links behave as today.
7. As a learner in a timed exam, I want the timer, the exam access checks and exam submission to work, so that proctored and timed exams are unaffected by the conversion.
8. As a learner, I want the auxiliary sidebar with discussions (the upgrade panel follows in #2185, its content being a slot), the calculator and notes, bookmarks, and the celebration modals, so that no courseware feature I use today disappears.
9. As a learner reaching the course end, I want the passing, in-progress and non-passing course exit pages, so that completion behaves as today.
10. As a learner who follows an old discussion link into Learning, I want to arrive at the discussions app, so that the link still works.
11. As a learner using a goal or preferences unsubscribe link from an email, I want the unsubscribe page to work under the new site, so that email preferences stay manageable.
12. As a learner without access to a course, I want the access-denied page with its explanation, so that I know why and what to do.
13. As course staff, I want the masquerade bar to work on every course page, so that I can view the course as a learner or a specific user.
14. As course staff, I want the instructor toolbar's extra controls kept or re-homed, so that nothing I rely on silently vanishes.
15. As a learner, I want product tours to keep working, so that onboarding is unchanged.
16. As an operator of a frontend-base site, I want to install Learning by adding its app to the site config, so that it composes with the other apps without a separate deployment.
17. As an operator, I want Learning's configuration expressed as site-config fields, route roles, external routes and app config, so that it follows the same model as every other app in the site.
18. As an operator, I want each cross-app destination Learning links to (discussions, enterprise learner portal, insights) to be a role I can satisfy with an external route today and an installed app later, so that I am never locked into an iframe or a URL assumption.
19. As an operator, I want to know which plugin-era contracts stop working on the branch and which the next epic restores, so that I can plan my customizations.
20. As an operator, I want a DEPR to be filed for any feature a layer drops, after the layer merges, so that I get the standard notice and window.
21. As a maintainer, I want the `frontend-base` branch to rebase cleanly on `master` every week, so that the conversion never falls behind the app's ongoing changes.
22. As a maintainer, I want master's changes to already-ported files to become re-port issues rather than merge conflicts, so that each re-port is a reviewed change.
23. As a maintainer, I want every layer to pass types, lint and tests for the new package, keep the legacy workflow green, and carry a manual-testing record, so that each layer is mergeable on its own evidence.
24. As a maintainer, I want the new package's coverage held to master's number from the first layer, and each port's directory compared against master's, so that the swap to master is not the first time a shortfall appears.
25. As a maintainer, I want the frame layer and courseware's first layers to ship stub routes and stub components, so that routing, roles and redirects can be verified before any page is ported.
26. As a maintainer, I want each page port to replace one stub and keep its tests at the same seams, so that the layer's diff and its evidence stay small.
27. As a maintainer, I want a provenance manifest that maps every legacy file to its ported location or marks it dropped, so that the rebase audit and the eventual swap are mechanical.
28. As a maintainer, I want the courseware port to stub inward, container first, so that each courseware layer has a screen to test.
29. As a reviewer, I want the layer order, the stub rule and the done criterion written in the epic and the decisions doc, so that I can review a layer against a stated plan.
30. As a reviewer of the discussion-tab layer, I want the redirect proposal stated in its sub-issue, so that the review round is where "iframe instead" can be argued.
31. As another frontend app, I want to resolve Learning's tabs by role, so that a dashboard can link to a course's progress page without knowing Learning's URLs.
32. As the frontend-base shell, I want Learning to provide its course-bar and masquerade roles, so that the header's course bar renders and navigates Learning's tabs.
33. As the frontend-base shell, I want Learning's route array to carry no site basename assumption, so that the site decides where Learning mounts.
34. As a contributor to the next epic, I want each placeholder slot to keep its file and name and the list of props it used to pass recorded, so that the Slot API port is a per-slot replacement.
35. As a contributor to the widgets epic, I want Learning's tabs to be child routes under one root with their own roles, so that the split into widgets starts from a route tree that already names each tab.

## Implementation Decisions

The numbered decisions in `decisions-1905.md` are authoritative; this section states them as the shape of the work.

**Repository layout and branch.** The existing tree stays untouched at its paths. The new app is its own npm package in a `frontend-base` directory with its own package manifest, lockfile, jest, TypeScript and lint configuration, scaffolded from frontend-template-application's main branch. The root files stay master's until the swap, which is the last commit of #2185. The `frontend-base` branch on upstream is rebased on `master` and force-pushed; layers are a gh-stack stack pushed to upstream with the `bsmith/` prefix, re-synced after each rebase. Decisions 11, 12, 15, 19.

**Provenance manifest and rebase audit.** Ports keep relative paths. Each port PR appends lines to a plain-text, tab-separated manifest sorted by legacy path: one line per legacy path per target, several lines for a split or a merge, `dropped` for a file not ported. Before each rebase the audit script resolves master's changes under the legacy tree through the manifest; a mapped hit becomes a re-port issue, an unmapped file in a ported directory is looked at, a dropped file is ignored. Path-changing moves wait for #2185. Decisions 13, 14; ticket 05.

**CI and coverage.** One new workflow file for the new package, copied from the template's, running from the subdirectory with path filters; master's legacy workflow is never edited. Coverage uploads under a `frontend-base` flag with its own config, with an absolute project target equal to master's percentage at branch creation; each port's manual-testing record compares its directory against a master baseline. Decisions 16, 17.

**App identity and routes.** The app id, route ids and role ids follow the converted apps' conventions (config table, ticket 02). The route array has one root route at `learning` whose element is a layout: it mounts the Learning-wide providers (user messages, toast, notices, plugin overrides) and an outlet. The shell's query client is used; Learning's own is dropped. Child routes are the eleven route-level pages: outline tab, dates, progress, discussion, live, courseware, course exit, access denied, goal unsubscribe, redirect landing, preferences unsubscribe. The URL-decoding wrapper and the path-fixes provider port verbatim as layout routes around the course routes; the preview paths port as extra patterns on the courseware route; the catch-all is the shell's, and Learning's not-found page serves in-app cases only. Decisions 21, 22, 30.

**Roles and `provides`.** One `learning` role on the root route, provided under both the course-bar and the masquerade course-bar keys, exactly as instructor dashboard does. One role per tab on the child routes for resolution by other apps. Decision 31.

**Header and footer.** The shell's. Learning's header component, its course tabs navigation and the header and footer plugin slots are not ported. The org and title line becomes a widget Learning inserts into a shell header slot through its slot operations, reading course metadata from the shared query cache by Learning's key and rendering on course routes only. The instructor toolbar is re-homed against the shell's masquerade bar in its own layer; the courseware search toggle's candidate home is the course bar's extra-content slot. Decision 20; ticket 01 and its correction.

**Configuration.** The 52 variables and 26 bootstrap keys map per the reviewed table: required and optional site-config fields, route roles and external routes for cross-app destinations (named by destination, resolved through the role resolver, never assumed to be a foreign origin), app default config for Learning's flags under their existing names, and shell-managed values dropped with operator-facing notes. The session cookie domain is an app config key as in authn. Only real defaults go in the app's default config; the support URL keeps its name because the shell's help button reads it. Decisions 24, 25; ticket 02.

**Placeholder slots and plugin-era contracts.** Every plugin slot module keeps its file and name and renders its default content in a bare fragment; a slot with no default content renders nothing. Breadcrumbs and the unit tab strip are therefore absent on the branch, matching master out of the box. The plugin framework, the environment plugin configuration and the test mock leave with the first layer that touches them. The contracts this breaks are listed in ticket 03 with the layer that carries each note; a DEPR is filed after a layer that drops something. Decisions 3, 9; ticket 03.

**Special exams.** The library's current major already takes its configuration, HTTP client and auth state from the host; Learning wires it in its own courseware layer. Decision 10.

**Stub routes and stubbing inward.** The frame layer ships a stub route per page: an element rendering one line naming the page as not ported. Courseware's container layer stubs the course component to print the resolved course, sequence and unit ids; its sequence layer stubs the exams provider as a pass-through. Each later layer deletes one stub. Decisions 26, 29.

**Layer order.** Scaffold; frame (routes and roles only); dates (brings the tab-page frame and the course-metadata fetch); progress; outline tab; access denied; then, any time after dates, the header title widget, the instructor toolbar and product tours; courseware as a chain, container and redirects, sequence and unit, outline sidebar, exams, right sidebar and widgets, unit extras, course exit; then the URL-only pages, live, discussion as a redirect route, redirect landing, goal unsubscribe, preferences unsubscribe. Decisions 27, 28, 29; ticket 04.

**Discussion tab.** Ported as a redirect route through the discussions role to the discussions app, replacing the iframe; proposed as such in its sub-issue, where the review round can decide otherwise. Decision 28.

## Testing Decisions

A good test drives a page through Learning's exported route array under a test router at a course URL, with the HTTP client mocked, and asserts what the learner sees; it does not assert how the page fetched or which hook it called. Stub layers assert that each path renders its stub. Hook, utility and redirect tests call their subject directly, as they do on master.

Tests port with their files at the seams they already use; no new seam is introduced. The setup file calls frontend-base's mock-app initializer and adds app configs at top level, as profile and account do. Each test file mocks frontend-base by spreading the real module and overriding what it needs; no shared mock module; no Mock Service Worker; the HTTP client is a per-file mock function. A shared render helper supplies the query client, intl provider and memory router. Assertions that only test shell responsibilities are dropped. Profile's Pact test is the precedent for keeping Learning's contract test by pointing its provider at the site-config merge. A port that deviates says why in its PR. Decision 23.

Prior art: the converted apps' route tests (profile, account, catalog), their page tests, and Learning's own page and hook tests on master.

The done criterion for a layer is decision 8: types, lint and tests of the new package pass, the legacy workflow stays green, every route ported so far renders under the dev server, the layer's route has been exercised by hand in the verification environment, and the observations are in the PR's manual-testing record, with any behavior the manual pass found untested given a test in the same PR.

## Out of Scope

- Porting plugin slots to the Slot API, slot id renaming, the swap of the new package to the repository root, publishing to npm, inclusion in frontend-template-site and tutor-mfe, and the merge of `frontend-base` into `master`: #2185.
- Splitting tabs into widgets and the shared-query-key and `provides` experiment: #2186.
- Deciding on this map that any feature is dropped; drops are decided in the PR that would otherwise port the feature, with a DEPR filed after (decision 9).
- Breadcrumbs and the unit tab strip as rendered content; they are operator plugins today and return with #2185.
- Rewriting the URL-decoding wrapper or the path-fixes provider as route loaders.
- The manual verification environment; known, recorded in the scaffold layer's manual-testing record.

## Further Notes

- The plugin-override consumer `@edx/unit-translation-selector-plugin` is already broken on master; the conversion changes nothing that works today there (ticket 03).
- The header's course bar fetches course metadata under its own query key, so a frontend-base site makes two requests for it per course page; this predates the conversion and is #2186's territory, with the title widget reading Learning's key in the meantime.
- Counts used in planning (237 frontend-platform import files, 114 config read sites, 52 variables, 34 slot directories, 29 files passing slot props) are from master at the charting commit and will drift.
- The effort glossary fixes "placeholder slot", "stub route" and "outline tab"; bare "placeholder" and bare "outline" are avoided in ticket titles.
