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
   authz permission validation (alpha.12); lint, tests and both builds
   pass at the stack top on it.

