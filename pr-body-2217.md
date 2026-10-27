## Summary

Adds Learning's frontend-base package as `frontend-base/` at the repository root, scaffolded from frontend-template-application `main` at `9ffc229`, with its own CI workflow and coverage bar, and the empty provenance manifest the port PRs will fill. **No user-facing change**: the package registers an app with no routes, and the legacy tree under `src/` is untouched apart from two root ignore lines that keep `master`'s lint and jest off the new directory.

Part of #1905. Resolves #2187.

## What changed

- `frontend-base/`: the template copy minus the template repository's own metadata (`catalog-info.yaml`, its READMEs, `.github/`, `renovate.json`, `docs/`), given Learning's identity: package `@openedx/frontend-app-learning`, app id `org.openedx.frontend.app.learning`, root role `org.openedx.frontend.role.learning`, dev server on port 2000 under `/learning`, empty `routes` and `slots`, the template's example page, slot and header widget removed, and `Main.tsx`'s wrapper around the outlet a `div` rather than the template's `<main>`, since Learning's routes each place their own `<main>`.
- `.github/workflows/frontend-base.yml`: the template's `ci.yml` run from `frontend-base/` on changes under it, uploading coverage under the `frontend-base` flag with repository paths (the codecov step runs from the root and jest's lcov names files as `frontend-base/src/...`). `validate.yml` is untouched and keeps running the legacy suite.
- `frontend-base/jest.config.js`: `coverageThreshold` of 96.15 lines, `master`'s codecov line coverage at branch creation; `src/app.test.ts` covers the entry files no page test imports.
- `.eslintignore` and the root `jest.config.js`: one ignore line each for `frontend-base/`.
- `frontend-base/manifest.tsv`: empty apart from the header comment giving its format.
- A throwaway test proved the workflow runs from the subdirectory (commit 2); the last commit removes it. The PR squashes.

## Testing

From inside `frontend-base/` with no root `node_modules`: `npm run lint`, `npm test` (3 tests, 100% lines against the 96.15 threshold), `npm run build`, `npm run build:ci`, `npm run i18n_extract`, all green. Root `make validate` with the two ignore lines: 124 suites, 1279 tests, lint, types, build and bundlewatch green; without them, root lint fails on every file under `frontend-base/` and root jest collects three of its files. CI on the PR: all checks green, the `frontend-base` flag on codecov lists the package's files under `frontend-base/src/`. Manual: the package's dev server against tutor dev, recorded below.

## Decisions

What was decided while building this layer; the layout, coverage policy and commit shape are in #2187.

<details>
<summary>Full decision log</summary>

# Decisions — scaffold the frontend-base package (#2187)

Decisions made while implementing. The layout, coverage policy, commit
shape and verification environment are in #2187's plan and are not repeated.

1. **The template's `codecov.yml` stays in the copy.** It is byte-identical
   to `master`'s root `codecov.yml` (`target: auto`, `threshold: 0%` for
   project and patch). Codecov never reads a nested file, so it is inert on
   the branch, and at the swap it replaces the root file with the same
   content. Dropping it would be a change for nothing; keeping it means the
   copy is the template minus repository metadata only, as the plan says.

2. **Both jest guards, not one.** `modulePathIgnorePatterns` alone keeps
   `frontend-base/` out of the haste map, which is what hides its tests and
   its `src/__mocks__` from `master`'s run. `testPathIgnorePatterns` is
   added as well, with jest's default `/node_modules/` restated since
   setting the key replaces the default, so that the intent is readable in
   the config without knowing how the haste map works. frontend-build's
   `createConfig` merges with webpack-merge, which concatenates arrays, and
   its base jest config sets neither key, so both land verbatim.

3. **Evidence for the two root guards, taken 2026-10-21 with `master`'s
   root install.** Without them: `npm run lint` exits 1 with
   `Parsing error: ESLint was configured to run on <tsconfigRootDir>/frontend-base/...
   using parserOptions.project` on every file under `frontend-base/`,
   including its `coverage/` output; `jest --listTests` collects three
   files from the subdirectory (`src/Main.test.tsx`,
   `src/example/ExamplePage.test.tsx`, `site.config.test.tsx`). With them:
   lint exits 0, and `--listTests` lists the 124 legacy suites under `src/`
   and nothing under `frontend-base/`. The package's own checks (`npm ci`,
   `lint`, `test`, `build`, `build:ci`) passed first, with no root
   `node_modules` present.

4. **The template's `.dockerignore` stays too.** It is a 2018 cookiecutter
   leftover (last touched 2020, naming `.babelrc`, `.eslintrc.json` and
   `commitlint.config.js`, none present) and does nothing unless the
   package directory is a Docker build context, which the frontend-base
   site build never makes it. Catalog, profile, account and gradebook
   carried it over; learner-dashboard did not. Kept because it is the
   template's and harmless; the copy stays "the template minus repository
   metadata".

5. **The static document title is "Learning Development Site".**
   `public/index.html` is the document of the package's own dev and CI
   site only (`openedx dev` and `openedx build` read it from the package
   directory; a real site brings its own), and every page port brings its
   Helmet title, so the legacy `Course | SITE_NAME` static title has no
   runtime role here. Profile and account name theirs "<App> Development
   Site"; catalog left the template's "Application Template".

6. **Coverage paths carry the `frontend-base/` prefix, and the uploader
   runs from the repository root.** The first CI run filed the flag's six
   files as `src/Main.tsx`, `src/app.ts`, `src/constants.ts`,
   `src/messages.ts`, `src/routes.tsx` and `src/slots.tsx`, and merged
   `constants.ts` into the legacy file of that path (Brian, codecov file
   explorer, 2026-10-21). Jest's lcov names files relative to the package,
   and the codecov CLI, run with `working-directory: frontend-base`, matched
   those names against a git file list rooted there, so it sent
   package-relative paths that codecov took as repository paths. Two
   changes, in the workflow commit: jest's lcov reporter gets
   `projectRoot: '..'` (istanbul-reports writes `path.relative(projectRoot,
   file)`, so `frontend-base/src/Main.tsx`; the `coverageReporters` list
   restates jest's defaults since setting the key replaces them), and the
   codecov step drops `working-directory`, with `disable_search: true` and
   `files: frontend-base/coverage/lcov.info`, so its file list is the whole
   tree and the report's paths match it exactly. Rejected: codecov's
   `fixes:` in the root YAML (rewrites every `src/` path, legacy included);
   uploading only the absolute-path clover or json reports (leaves out the
   canonical lcov and leans on path-fixing). Both changes describe the
   subdirectory layout and leave at the swap with the threshold.

7. **`caniuse-lite` updated in the package lockfile, folded into the first
   commit.** The template's lockfile pinned 1.0.30001790 (2026-04-22), and
   browserslist prints a "browsers data is 6 months old" notice from
   babel and webpack whenever the data it finds is that old; the org's
   `update-browserslist-db.yml` runs in the repository root and never
   touches `frontend-base/package-lock.json`. `npm update caniuse-lite` in
   `frontend-base/` moved the pin to 1.0.30001819 (2026-10-22), a three-line
   lock diff, after which the notice stops for six months, longer than the
   branch will exist, so the workflow is left alone; the swap puts the
   package lock under the root workflow. Noticed by Brian in #2219's run.

8. **The package lockfile is regenerated at the scaffold commit
   (2026-10-26).** The lock the template produced on 2026-10-21 resolved
   Paragon 23.23.0, whose `Icon` still declares `defaultProps`; the console
   hook in #2219 fails on the warning once a Paragon icon renders (#2189's
   frame). openedx/paragon#4136 converted `Icon` (merged 2026-09-08) and
   shipped in 23.23.1 on 2026-10-16, inside frontend-base's `^23.23.0`, so
   the fix is a lock change, not a silence entry. The lock is regenerated
   from scratch (lock and `node_modules` removed, `npm install`) at the
   scaffold commit so no layer carries the old resolution; the one lock
   conflict replaying the stack, #2219's `jest-fail-on-console` addition,
   is resolved by taking the regenerated lock and running `npm install`
   against that commit's `package.json`. `@openedx/frontend-base` moves
   with it from 2.0.0-alpha.5 to 2.0.0-alpha.16 (the template's range is
   `^2.0.0-alpha`); the alpha.6 to alpha.16 release notes are tooling and
   shell fixes (lint exit code, jest crawl, ts-loader rootDir, source-map
   warnings, typescript as a peer, workspace package support) plus role
   resolution in the client (alpha.15), the language menu (alpha.14) and
   authz permission validation (alpha.12). The same commit takes the two
   `package.json` changes the template made on 2026-10-21 after the
   scaffold was copied: `typescript` `^5.9.3` as a dev dependency (alpha.16
   makes it a peer, and with frontend-base as a workspace package npm
   otherwise hoists TypeScript 6; template commit 5301f432), and
   `@openedx/frontend-base` and `@openedx/paragon` as dev dependencies with
   the Paragon peer widened to `^23 || 0.0.0-dev` (workspace support;
   template commit fc61f34d). The package's `package.json` then differs
   from the template's only in its identity fields. The lock and these
   lines share the commit, Brian's call for this case. Lint, tests and
   both builds pass at the stack top.

9. **`Main.tsx` wraps the outlet in a `div`, not the template's `<main>`
   (2026-10-27).** Learning's routes place the `<main>` differently, as
   on `master`: the courseware route renders it inside the sequence
   (`Sequence.jsx`) so the outline sidebar stays outside it, the other
   tabs wrap their content in it (`LoadedTabPage.tsx`), and the
   remaining pages render their own (`GoalUnsubscribe.jsx`,
   `PageNotFound.jsx`); `master`'s root renders none. A `<main>` around
   the outlet would hold every page's own, and the HTML Living Standard
   says: "A document must not have more than one main element that does
   not have the hidden attribute specified." So the root route's element
   wraps the outlet in `<div className="d-flex flex-column flex-grow-1">`,
   in a commit of its own after the identity commit; with no routes yet,
   nothing renders differently. Noticed when openedx/frontend-base#329's
   `runPageRules`, asserted by #2189's route tests, reported two on each
   of #2221's stub routes; until then #2189's frame commit made the
   change. The template is left as it is: whether its `Main.tsx` or its
   example page should render the `<main>` is the template's choice,
   since not every app places it per route.

</details>

<details>
<summary>Manual testing</summary>

# Manual testing — scaffold the frontend-base package (#2187)

This layer claims **no user-visible change on `master`** and no Learning
route at all: the package registers an app with an empty route array. What
is verified by hand is the environment every later layer's record reuses.

## Environment

- Tutor dev: LMS at `http://local.openedx.io:8000`, Studio at
  `http://studio.local.openedx.io:8001`; hosts under `*.local.openedx.io`
  resolve to 127.0.0.1 through public DNS.
- The package's own site: `cd frontend-base && nvm use && npm ci && npm run dev`,
  served at `http://apps.local.openedx.io:2000/` by `openedx dev` with
  `PUBLIC_PATH=/learning`. Its `site.config.dev.tsx` registers `shellApp`,
  `headerApp`, `footerApp` and `learningApp`, with `lmsBaseUrl`, `cmsBaseUrl`,
  `loginUrl` and `logoutUrl` pointing at the Tutor hosts. This is the
  environment for every layer's manual pass; composing the package into a
  frontend-template-site checkout is the epic's close-out check.
- Port 2000 is also the port tutor dev's `mfe` service publishes for the
  legacy Learning MFE (its Caddy listens on 1984, 1993, 2000, 2001, 2002 and
  8080 on the host). With that service up, `openedx dev` cannot bind and a
  request to `:2000` is answered by the container, not by the package. Stop
  the `mfe` service (`tutor dev stop mfe`) before running the dev server.

## Verify by hand

- [x] **The dev server comes up and serves the site under `/learning`** —
      `npm run dev` from `frontend-base/`, the tutor `mfe` service stopped;
      `GET /learning/` (and any deeper path) answers 200 with the built
      document, the bundle script tags under `/learning/`, and a `#root`
      mount point. `GET /` answers 200 with the raw 261-byte
      `public/index.html` from the static directory, no scripts, so the
      browser shows a blank page there: `/` is outside `PUBLIC_PATH` and is
      not the site. The converted apps are the same (catalog and profile
      serve under `/catalog` and `/profile`, no `basename` in their site
      config, root route path equal to the public path).
- [x] **The browser shows the runtime's not-found page at every path**,
      with no header or footer: the shell's router puts its 404 error element
      on the same top-level route as the `Shell` component, so an unmatched
      URL renders `NotFoundPage` ("404", "The page you're looking for could
      not be found.") in place of the shell layout. With no Learning route
      and no app claiming the home role, every path under `/learning` is
      unmatched. The header and footer first appear with the route tree in
      #2188. Nothing in the console from the app: expected entries are
      React Router's "No routes matched location" warning (twice, once per
      render), its v7 future-flag warning, webpack-dev-server and HMR
      messages, and frontend-base's logging service recording the
      authenticated user's id (`userId <n>`), which shows the runtime read
      the user from the LMS cookies.
- [x] **Legacy workflow unaffected**: the PR's `validate` run is green with
      the package in the tree.
- [x] **The new workflow runs from the subdirectory**: the `frontend-base`
      run on the pushed stack executes lint, test (with the throwaway test
      listed), build, build:ci and i18n_extract from `frontend-base/`, and
      codecov shows the `frontend-base` flag with its files under
      `frontend-base/`.

## Left to the automated suite

- The exported app's id and empty routes and slots: `src/app.test.ts`.
- The page title from the message and site name: `src/Main.test.tsx`.
- The coverage bar: jest `coverageThreshold` (`lines: 96.15`), which the
  package meets at 100% with the three tests.

## Results

- **Dev server** — passed, 2026-10-21, Brian's `npm run dev` on the pushed
  layer (head `e0fba61a`), webpack holding `:2000`: `/learning`,
  `/learning/` and `/learning/x` each 200 with the 852-byte built document
  and the `/learning/...` bundle scripts; `/` 200 with the 261-byte static
  `public/index.html` and no scripts. A first attempt earlier that day at
  `f3b5015a` had hit the tutor `mfe` container on the same port (its page
  titled "My Open edX") while the `openedx dev` log had only printed the
  CLI banner; that result was discarded.
- **Browser** — passed, Brian, 2026-10-21: `/` blank, `/learning` and
  `/learning/` show the 404 page. Console: `No routes matched location
  "/learning/"` twice, the React Router v7 future-flag warning, webpack-dev-
  server and HMR start-up lines, a sockjs `unload` permissions-policy
  violation from the dev tooling, four `Permissions-Policy` "Unrecognized
  feature" notices that came from a browser extension (gone with it
  disabled; neither the dev server nor the LMS sends that header), the
  React DevTools hint, and `NewRelicLoggingService.js:50 userId 4`,
  frontend-base's logging service recording the authenticated user's id.
  No error from the app or the shell.
- **Legacy workflow** — passed, head `e0fba61a`: `tests` (validate.yml)
  green in 5m23s and its `coverage` job uploaded; `codecov/project` passed
  with the combined number at 96.16% against `master`'s 96.15%,
  `codecov/patch` passed; `commitlint` passed after commit 2's type was
  changed from `ci` to `build` (the org config has no `ci` type).
- **New workflow** — passed, same head: the `test` job (frontend-base.yml)
  green in 1m26s; jest ran `src/ci-smoke.test.ts`, `src/app.test.ts` and
  `src/Main.test.tsx`, 3 of 3, 100% lines; the codecov step ran with
  `working-directory: frontend-base` and uploaded `frontend-base/coverage/lcov.info`
  with `--flag frontend-base`. Codecov's flag totals for the commit: 6
  files, 9 lines, 9 hits, 100%; the repo now lists the `frontend-base`
  flag. **Not passed on paths**, found by Brian in the codecov file
  explorer the same day: the flag's six files are stored as `src/Main.tsx`,
  `src/app.ts`, `src/constants.ts`, `src/messages.ts`, `src/routes.tsx`
  and `src/slots.tsx`, without the `frontend-base/` prefix, and
  `src/constants.ts` merged into the legacy file of the same path (11 lines
  on the base, 12 on the head). Cause and fix in the decision log (entry
  6). Passed on the next push, head `7022a2db`: all eight checks green;
  the flag's six files are `frontend-base/src/Main.tsx`, `app.ts`,
  `constants.ts`, `messages.ts`, `routes.tsx` and `slots.tsx`, 9 lines, 9
  hits; legacy `src/constants.ts` back at 11 lines; combined 374 files and
  6020 lines at 96.16%; `codecov/patch` "100.00% of diff hit (target
  96.15%)"; Brian confirmed the `frontend-base/` tree in the codecov file
  explorer.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
