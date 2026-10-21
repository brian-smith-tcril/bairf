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
