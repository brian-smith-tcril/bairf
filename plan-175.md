# Plan: openedx/frontend-lib-special-exams#175 — v5 (React Query, host-agnostic)

One PR from the fork branch `bsmith/v5-react-query` (checkout at
`~/code/claude/frontend-lib-special-exams`, remote `origin` = the fork) to
`openedx/frontend-lib-special-exams` `main`. No stack. The design is
`plan-2018.md` "v5 design"; this doc is the commit-by-commit execution plan
and its decisions. Learning-side docs (`decisions-175.md`) stay untracked
here, as for the learning layers.

**Baseline (2026-10-07, `main` @ `2aa3858`):** `npm run lint` clean;
`npm test` 32 suites, 363 tests, 97.27% statements. The library is
JavaScript (no `tsconfig`); `make build` is `fedx-scripts babel src --out-dir
dist`; semantic-release on `main` with `@semantic-release/commit-analyzer`,
so the major comes from a `!` / `BREAKING CHANGE` in the commit that lands.

**Dev loop (learning side, uncommitted):** `module.config.js` aliases the
package to `../frontend-lib-special-exams/src` for `npm run dev`; the local
block in learning's `jest.config.js` does the same for Jest (see
`plan-2018.md` "Working across the two repos"). Learning's 97 exam tests
(#2163) run against the library source with no build step.

Draft PR: openedx/frontend-lib-special-exams#176 (opened 2026-10-09; description carries the
decision log in three parts, body + two comments, because of GitHub's 65,536-character limit;
its Testing section has a TODO for the learning adoption PR link).

## Commits, in order (reordered 2026-10-07: data layer first, host services last)

0a. **Replace frontend-build with the tools it wrapped, built by `tsc`.**
    Dev-only; makes TypeScript source and shipped declarations available.
    (done: `e37774b`)
0b. **Consumer-facing backend mock**, in TypeScript, exported as
    `@edx/frontend-lib-special-exams/testing`. (done: `2fcb4e1`)
1. **Drop FPF: the submitted-timed-exam slot becomes a component prop.**
   (done: `6301a85`)
1a/1b. **Two `fix:` commits**, each a failing-test commit then the fix:
   `skipProctoringExam`'s create arguments (`857a6a8` → `0cc4945`);
   `startProctoredExam`'s legacy-flag field name (`21e9dbb` → `98b6d25`).
   Done 2026-10-08; decisions 1a.1–1c.
2. **Mutations:** the ten learner-triggered attempt actions become
   `useMutation` hooks; their thunks go. Reads, the poll, the ping and the
   entry check stay thunks. `@tanstack/react-query` arrives as a peer.
   (done: `ac7cc57`, 2026-10-08; decisions 2.1–2.15)
3. **Queries:** the six reads, the poll and the two effects become
   `useQuery` hooks and effects; the read thunks go; the mutations refresh
   by invalidation; `allowProctoringOptOut` moves to the context (decision
   1). The slice keeps only `timeIsOver`, `apiErrorMsg`.
   (done: `597f9a9`, 2026-10-09; decisions 3.1–3.17)
4. **Remove redux:** that client state moves to `SequenceExamContext`;
   `slice.js` and the `reducer` export go; the public hooks read the
   context and the queries. (done: `0781870`, 2026-10-09; decisions
   4.1–4.7)
5. **react-intl:** the 43 `@edx/frontend-platform/i18n` imports become
   `react-intl` imports; `react-intl` becomes a peer. (done: `3a66d9f`,
   2026-10-09; decisions 5.1–5.6)
6. **Host services:** `SpecialExamsProvider`; the hooks hand `config`,
   `httpClient`, `logError` to `api.ts`; `isAuthenticated` replaces
   `AppContext`. No frontend-platform import remains. (done: `41fbf10`,
   2026-10-09; decisions 6.1–6.9)
7. **Drop the dependencies nothing imports any more** (FPF,
   `@edx/frontend-platform`, `react-redux`, `redux`, `@reduxjs/toolkit`,
   `babel-polyfill`, plus the never-imported router and fontawesome
   packages, `dotenv` and `glob`) in one `package.json` change with one
   lock regenerated from scratch, so the code commits read without lock
   churn (the FPF removal alone flipped 1,565 `"dev"` flags in the lock).
   Peers added along the way (`@tanstack/react-query`, `react-intl`) are
   added in the commit that starts using them. (done: `63c1471`,
   2026-10-09; decisions 7.1–7.5)

Why this order (settled 2026-10-07): the first cut put the provider at 2,
which needed a module-level services registry so the thunks could reach
the host's config and client until commit 5 deleted them. Queries-first
was considered next and has the mirror problem: every action thunk reads
`exam` / `activeAttempt` from `getState()` and refreshes through
`updateAttemptAfter`, so with the reads in React Query each thunk would
need the exam from its caller and the `QueryClient` to invalidate, a bridge
built into 19 thunks and deleted one commit later. Mutations-first needs
neither: a `useMutation` hook reads the store with `useSelector` as the
components already do and refreshes by dispatching the existing read
thunk; commit 3 swaps those two lines per hook. The provider then arrives
when only hooks remain, and hooks can read a context.

Each commit leaves lint and the suite green and learning's 97 exam tests
passing against the source (until commit 4 removes the `reducer` export
learning's `store.ts` imports; from there the check runs with learning's
store removed locally, which is its swap layer's change). Commit messages
carry the `!` where the public contract changes (1, 3, 4, 5, 6, 7), with a
`BREAKING CHANGE:` footer naming what consumers must do; the PR lands as a
squash, so the squash message aggregates them and is what semantic-release
reads for the major. New code from 0b
on is TypeScript; existing `.jsx` stays until a file is rewritten anyway.

## Commit 0a — replace frontend-build with direct tooling, `tsc` build (done on `bsmith/v5-base`, 2026-10-07)

### How it works today

`@openedx/frontend-build` ^14.3.3 is a devDependency; nothing at runtime
touches it, and it has no dependency on frontend-platform. It is used in
exactly four places: `make build` (`fedx-scripts babel src --out-dir dist
--source-maps --ignore tests,setupTest --copy-files`, then deletes stray
test files), `npm run lint` / `lint:fix` (`fedx-scripts eslint --ext .js
--ext .jsx .`), `npm test` / `test:watch` / `snapshot` (`fedx-scripts jest`)
and `npm run i18n_extract` (`fedx-scripts formatjs extract`, which appends
`--format <frontend-build>/lib/formatter.js --ignore 'src/**/*.json'
--out-file ./temp/babel-plugin-formatjs/Default.messages.json -- 'src/**/*.js*'`;
the formatter maps messages to `[{ id, defaultMessage, description }]`, ten
lines). CI (`ci.yml`) runs `npm ci`, the lock check, lint, test, build,
`i18n_extract`, `is-es5` (`es-check es5 ./dist/*.js`), codecov and a
semantic-release dry run.

What it supplies: `@babel/cli` 7.24 + presets env/react, `eslint` 8.44 +
`@edx/eslint-config` 4.3 (extends `airbnb`, `airbnb/hooks`; peers
`eslint-config-airbnb` 19, `eslint-config-airbnb-typescript` 17,
`eslint-plugin-import`, `-jsx-a11y`, `-react`, `-react-hooks` 4,
`@typescript-eslint/*` 5.62) with a config setting the TS parser and the
devDependency globs for `import/no-extraneous-dependencies`; `jest` 29.7 with
`jest-environment-jsdom`, `ts-jest` 29.1.4 (`jsWithTs` preset) and a setup
file that loads `.env.test` through `dotenv`, requires `babel-polyfill` and
defines a `PARAGON_THEME` global (Paragon's dist never reads it); mocks for
svg/css/image imports (the library imports none); `@formatjs/cli` 6;
`typescript` 4.9.5 and `@edx/typescript-config` 1.1.0. The library lists only
`jest` itself. `src` has no non-code files besides `assets/.gitkeep`.

### What changes

- **Build: `tsc -p tsconfig.build.json`** replaces babel. `tsconfig.json`
  extends `@edx/typescript-config` (as learning's does) with `allowJs`,
  `jsx: react-jsx`, `declaration`, `sourceMap`, `module: commonjs`,
  `target: ES6` (decision 2), `outDir: dist`; the build config excludes
  `**/*.test.*` and `setupTest`. Output stays CommonJS in `dist/` like
  today's babel output, plus `.d.ts` for every module (inferred for the
  JavaScript ones). `make build` becomes `rm -rf dist && tsc -p
  tsconfig.build.json`. The `is-es5` script and its CI step go (decision 2).
  A `types` script runs `tsc --noEmit` for the type check on its own.
- **Lint:** `eslint`, `@edx/eslint-config` and its peer plugins become direct
  devDependencies; `.eslintrc.js` extends `@edx/eslint-config`, sets the
  TypeScript parser and carries frontend-build's devDependency globs
  (`**/*.config.*`, `**/*.test.*`, `**/setupTest.*`, plus `jest.setup.js`);
  scripts lint `--ext .js,.jsx,.ts,.tsx`.
- **Jest:** `jest.config.js` with `testEnvironment: jsdom`,
  `testEnvironmentOptions.url`, `babel-jest` for `.js`/`.jsx`/`.ts`/`.tsx`
  with `@babel/preset-env` (current node), `@babel/preset-react` (automatic
  runtime) and `@babel/preset-typescript` in a `babel.config.js` used only
  by Jest (decision 6), `transformIgnorePatterns: ['/node_modules/(?!@(open)?edx)']`,
  `collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}']`,
  `coveragePathIgnorePatterns` for `setupTest`; `.env.test` loaded with
  `dotenv` at the top of `jest.config.js` (the `PARAGON_THEME` global is
  dropped; nothing reads it); styles and assets mapped to
  `identity-obj-proxy`; a virtual `jest.mock('env.config')` in
  `src/setupTest.js`, which stays as the `setupFilesAfterEnv` the suites
  import from. No separate `jest.*` support files (decision 0a.5).
- **i18n:** `@formatjs/cli` as a devDependency; `i18n_extract` becomes
  `formatjs extract --format ./i18n/formatter.js --ignore 'src/**/*.json'
  --out-file ./src/i18n/transifex_input.json 'src/**/*.js*' 'src/**/*.ts*'`,
  with `i18n/formatter.js` writing `{ id: defaultMessage }` directly, as
  frontend-base's `tools/cli/utils/formatter.ts` does. The Makefile's
  `i18n.concat` step (frontend-platform's `transifex-utils.js`) and the
  dead Transifex `pull_translations` / `.tx/config` go; `make
  extract_translations` keeps producing the file openedx-translations
  commits.
- **devDependencies added:** `typescript`, `@edx/typescript-config`,
  `eslint`, `@edx/eslint-config`, `eslint-config-airbnb`,
  `eslint-config-airbnb-typescript`, `eslint-plugin-import`,
  `eslint-plugin-jsx-a11y`, `eslint-plugin-react`, `eslint-plugin-react-hooks`,
  `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`,
  `jest-environment-jsdom`, `babel-jest`, `@babel/core`,
  `@babel/preset-env`, `@babel/preset-react`, `@babel/preset-typescript`,
  `@formatjs/cli`, `dotenv`, at the versions frontend-build pinned where it
  pinned them. **Removed:** `@openedx/frontend-build`, `es-check`
  (decisions 2–3).
- **Verify:** lint clean; 364 tests, coverage unchanged; `npm run types`
  clean; `make build` produces `dist/index.js` + `dist/index.d.ts`;
  `make i18n.extract` produces the same keys and values as
  openedx-translations' committed `transifex_input.json` (diff it, order
  insensitive); learning's 97 exam tests against the source; CI's
  workflow loses only the `is-es5` step.
- **Commit:** `build: replace frontend-build with the tools it wrapped and
  build with tsc` (dev-only; no `!`), citing frontend-base ADR 0005 for the
  ES6 target.

### Decisions (settled 2026-10-07)

1. **`tsc` builds, not babel.** One tool gives transpilation and
   declarations; it is what frontend-base's library model uses; consumers'
   bundlers transpile `@edx/*` packages anyway (learning's babel rule in the
   dev *and* prod webpack configs excludes `node_modules` except
   `@edx`/`@openedx`, and its Jest `transformIgnorePatterns` matches).
   Nothing babel does better applies here: no browserslist in the repo, no
   babel-only plugins, no assets to copy. The one thing to watch is
   declaration emit on the existing `.jsx` (`TS9005`/`TS9006`); fix with a
   JSDoc hint if it appears.
2. **`target: ES6`; `is-es5` dropped.** frontend-base's ADR 0005
   ("Modernizing JavaScript transpilation") moved its libraries to `tsc`
   with `target: ES6` because every browser in `@edx/browserslist-config`
   supports ES6; frontend-base has no ES5 check. The published output
   changes from ES5 to ES6, which no consumer observes: learning's webpack
   transpiles the package to its own browserslist in dev and prod. Module
   format stays CommonJS so that is the only output change.
3. **frontend-build is removed in this commit**, not in commit 6. This
   commit *is* the tooling change; its diff is tooling and its lock churn is
   expected here, and leaving the replaced tool installed would make the
   commit lie about what the repo builds with.
4. **`@edx/eslint-config` stays the lint base.** frontend-base ships its own
   ESLint 9 flat config (`createLintConfig`: `@eslint/js` + typescript-eslint
   type-checked + `@stylistic` + react/hooks/a11y/jest/formatjs, with
   `formatjs/enforce-description`), not airbnb; adopting it would move the
   rules under all seventy files (formatting, and a `description` on every
   message). Kept as a follow-up for when the library adopts frontend-base
   tooling outright. `@edx/eslint-config` 4.3 supports ESLint 7–8, so
   `eslint` 8.44 as frontend-build pinned.
5. **Strictness from `@edx/typescript-config`** (`strict`, `noImplicitAny:
   false`, `strictFunctionTypes: false`), identical to frontend-base's shared
   tsconfig on those switches and to learning's footing; `noImplicitAny:
   false` is what lets new TypeScript import the untyped `.jsx` modules and
   `react-redux` without declaration files.
6. **Jest transforms with `babel-jest`, not `ts-jest`.** frontend-base's ADR
   0005 kept babel for Jest because `ts-jest` cannot transform some ES
   module dependencies under `node_modules`, `@openedx/paragon`'s `icons`
   named as the failing case, and this library imports Paragon icons
   (`CountDownTimer`). frontend-build's Jest config dodged it the same way
   (`babel-jest` for `.js`/`.jsx`). One `babel.config.js` with env, react and
   typescript presets, used only by Jest; the type check is `tsc --noEmit`.

### As built (0a)

Things the plan did not foresee, all small: (1) `@edx/eslint-config`'s
type-aware parser needs every linted file inside `tsconfig.json`, so
`.eslintrc.js` is listed in `include` explicitly (the `*.js` glob skips
dotfiles), as learning's tsconfig does; (2) Paragon's barrel pulls in
`Avatar`, which imports an svg, and its `dist` imports an `.scss` module, so
styles and assets map to `identity-obj-proxy`; `@edx/frontend-platform`'s
entry requires an `env.config` module, mocked virtually in
`src/setupTest.js` until commit 2; no separate `jest.*` support files
(decision 0a.5); (3) `Exam.jsx` had a `@constructor` JSDoc tag, which
TypeScript reads as a constructor function and which blocked its declaration
(TS9005); deleting the tag was the whole fix (decision 0a.6); (4) the i18n
extraction's concat step ran frontend-platform's `transifex-utils.js`, so it
was replaced by a one-step formatter as frontend-base does, and the dead
Transifex targets went with it (decision 0a.7). Result: lint and `types`
clean; 32 suites, 363 tests, 97.27% (identical to baseline); `dist/` with
`.d.ts` for every module; `transifex_input.json` matches
openedx-translations' committed file; learning's 97 exam tests against the
source.

## Commit 0b — consumer-facing backend mock (TypeScript) (done on `bsmith/v5-base`, 2026-10-07)

`src/testing/mockSpecialExams.ts` (learning's helper moved: same API, both
URL families, state machine, poll countdown, failure switches),
`src/testing/payloads.ts` (plain builders and payload interfaces replacing
the Rosie factories so nothing in `dist/testing` needs `rosie`), the 11-case
test, `src/testing/index.ts`; `exports["./testing"]` plus `typesVersions`
(consumers on `moduleResolution: "node"` ignore `exports`); the base URLs
are a parameter (`{ lmsBaseUrl, examsBaseUrl }`, the provider's names), so
`src/testing` has no frontend-platform import and commit 2 leaves it alone.
Decisions 0b.1–0b.6. Learning's swap layer imports it from the tarball,
deletes its own copy and passes its config at the `mockCourseRequests` call
site; that layer must also anchor learning's Jest mapper for the package
(`'@edx/frontend-lib-special-exams'` is unanchored today, so it swallows
`/testing` and resolves it to `dist/index.js`).

## Commit 1 — drop FPF, slot → component prop (done: `6301a85` above 0a–0b, 2026-10-07)

### How it works today

`src/plugin-slots/SubmittedTimedExamInstructionsSlot/index.jsx` renders FPF's
`PluginSlot` with id
`org.openedx.frontend.special_exams.submitted_timed_exam_instructions.v1`,
`pluginProps={{ timeIsOver }}` (read with `useSelector` from
`state.specialExams.timeIsOver`), and the default `<h3>` with the two
messages. `instructions/timed_exam/index.jsx` re-exports it as
`SubmittedTimedExamInstructions`; `instructions/SubmittedInstructions.jsx`
renders it for `ExamType.TIMED`. The chain from the public component is
`SequenceExamWrapper → ExamWrapper → Exam → Instructions →
SubmittedExamInstructions → SubmittedTimedExamInstructions`. FPF is a
regular dependency (`^1.7.0`) and brings `react-redux` 8.1.1 with it. Its
test mocks `PluginSlot` and asserts the id and `pluginProps`. `README.rst`
has a "Plugins" section pointing at `src/plugin-slots/`, whose README lists
the one slot; the slot's own README has three screenshots.

### What changes

- **`SequenceExamWrapper` gains one prop, `submittedTimedExamInstructions`**,
  a component rendered with `{ timeIsOver }` in place of the default
  heading. Reaches the submitted page through a React context the wrapper
  provides (decision 1), not by drilling through four components.
- **`SubmittedTimedExamInstructions`** returns to
  `instructions/timed_exam/SubmittedTimedExamInstructions.jsx` as a plain
  component taking `timeIsOver` as a prop, with the same two messages and
  `data-testid="exam.submittedExamInstructions.title"` kept (consumers'
  tests may target it).
- **`SubmittedExamInstructions`** reads `timeIsOver` from the store (this
  commit; from the wrapper's context after commit 4), reads the override
  from the context, and renders `<Override timeIsOver={timeIsOver} />` with
  the plain component as the default.
- **Deleted:** `src/plugin-slots/` (component, test, READMEs, screenshots).
  The `@openedx/frontend-plugin-framework` dependency is left listed, unused,
  for the dependency-removal commit at the end (commit 7). The README's "Plugins" section
  becomes a "Customization" section describing the prop.
- **Tests:** the slot test goes; the plain component gets a two-case test
  by prop; `SubmittedInstructions.test.jsx` gains the override case (a
  component from context receives `timeIsOver`); `ExamWrapper.test.jsx` /
  `SequenceExamWrapper.test.jsx` gains the end-to-end case: the prop on
  `SequenceExamWrapper` renders in the submitted timed state. Coverage must
  not drop (codecov gates the repo).
- **Commit:** `feat!: replace the submitted-timed-exam plugin slot with a
  component prop on SequenceExamWrapper`, with `BREAKING CHANGE:` naming
  the removed slot id and the new prop, and that the host renders its own
  slot around it (learning does, under the same id, in
  openedx/frontend-app-learning#2018).

### Decisions

1. **The override travels by context, provided by `SequenceExamWrapper`.**
   Drilling means a new prop on `ExamWrapper`, `Exam`, `Instructions` and
   `SubmittedExamInstructions` whose only purpose is to pass it on; commits
   3–5 give the wrapper a context anyway (exam identity, `timeIsOver`,
   `apiError`), so the context starts here with this one value and grows
   into that. Name: `SequenceExamContext` (what the wrapper provides for
   its subtree), file `src/core/SequenceExamContext.jsx`, with a
   `useSequenceExam()` hook; the context defaults to `{}` so components
   render outside the wrapper (decisions-175 entry 2). `OuterExamTimer` provides nothing; the
   submitted page never renders under it.
2. **Prop name `submittedTimedExamInstructions`, value a component.**
   camelCase like the wrapper's other props; a component rather than a
   render function because a slot replacement is a component, and learning
   passes its slot component straight through.
3. **JavaScript, matching the library.** New files are `.jsx`/`.js`; a
   TypeScript conversion is not this major's job (plan-2018 D6).
4. **The slot's README and screenshots are not carried in this repo.**
   They move to learning with the slot in #2018's swap layer, from this
   repo's history at `v4.1.0`; the PR body says so.

### Steps

1. `SequenceExamContext.jsx` + `useSequenceExam`; `SequenceExamWrapper`
   provides `{ submittedTimedExamInstructions }` from its prop.
2. Plain `SubmittedTimedExamInstructions.jsx`; `SubmittedExamInstructions`
   renders the override or default with `timeIsOver`.
3. Delete `src/plugin-slots/`.
4. README "Plugins" → "Customization".
5. Tests as above; `npm run lint && npm test`; learning's 97 exam tests
   against the source.
6. Commit.

Result: lint clean; 32 suites, 364 tests (the slot's five replaced by six),
97.30% statements (baseline 97.27); learning's 97 exam tests pass against the
source. Decisions in `decisions-175.md`.

## Commit 2 — mutations: the attempt actions become `useMutation` hooks (done: `ac7cc57`, 2026-10-08)

### How it works today

Ten learner-triggered actions are thunks in `src/data/thunks.js`, each
dispatched from a component (`dispatch(startTimedExam())` and the like; 14
call sites across the instruction pages, `ExamTimerBlock`,
`ReadyToStartProctoredExamInstructions`, `download-instructions`). Every one
follows the same shape: read `exam` and/or `activeAttempt` from
`getState().specialExams`; bail with `logError` plus `setApiError` when the
id it needs is missing; call one `api.js` function; refresh through
`updateAttemptAfter(courseId, sequenceId, promise)`, which sets `isLoading`,
awaits the action (bailing when the response has no `exam_attempt_id`,
routing a rejection to `setApiError`), re-fetches `fetchExamAttemptsData`
into `setExamState`, and clears `isLoading`.

| Thunk | Reads | API call | Extra behaviour |
|---|---|---|---|
| `startTimedExam` | `exam` | `createExamAttempt(exam.id, legacy)` | |
| `createProctoredExamAttempt` | `exam` | `createExamAttempt(exam.id, legacy, false, true)` | |
| `startProctoredExam` | `exam`, `exam.attempt` | `continueAttempt` | with a worker: `workerPromiseForEventNames(start)` first, failure → `logError` + `apiError`, no refetch; without: `notifyStartExam()` when `!exam.useLegacyAttemptApi` |
| `skipProctoringExam` | `exam` | `declineAttempt` if an attempt exists, else `createExamAttempt(exam.id, true, false, legacy)` | |
| `stopExam` | `exam`, `activeAttempt` | `stopAttempt` | attempt from another sequence → call, then `window.location.href = exam_url_path`, no refetch |
| `continueExam` | `exam.attempt` | `continueAttempt` | |
| `resetExam` | `exam.attempt` | `resetAttempt` | |
| `submitExam` | `exam`, `activeAttempt` | `submitAttempt` | same other-sequence redirect; worker `submit` message after, failure → `apiError` |
| `expireExam` | `exam`, `activeAttempt` | `submitAttempt` | refetch with `activeAttempt.course_id`; then `expireExamAttempt()` (sets `timeIsOver`); worker `submit` message |
| `startProctoringSoftwareDownload` | `exam.attempt` | `softwareDownloadAttempt` | no caller in the library or in learning (plan-2018 finding 8) |

Two more thunks end in an action but are not learner-triggered:
`pingAttempt` (from the ticker; worker ping failure → `logError` +
`endExamWithFailure`) and `checkExamEntry` (from `ExamWrapper` after the
first fetch; LTI proctored attempt → `checkAppStatus` raced against 5 s,
loss → `setApiError` + `endExamWithFailure`). They belong with the timer and
the reads (commit 3).

`ExamTimerBlock` subscribes `Emitter.once(TIMER_LIMIT_REACHED, () =>
dispatch(expireExam()))` and "unsubscribes" with `Emitter.off(..., () =>
...)` on a fresh arrow, which removes nothing (plan-2018 finding 11a); each
remount adds a listener, so one expiry can dispatch several submits.

Tests: `src/data/redux.test.jsx` drives each thunk through a real store
with `axios-mock-adapter` and asserts the requests made and the state after;
component tests dispatch through the store from `src/setupTest.js`.

### What changes

- **`src/data/mutations.ts`** (new, TypeScript): one hook per action,
  `useStartTimedExam`, `useCreateProctoredExamAttempt`,
  `useStartProctoredExam`, `useSkipProctoringExam`, `useStopExam`,
  `useContinueExam`, `useResetExam`, `useSubmitExam`, `useExpireExam`, built
  on a shared `useAttemptAction(mutationFn)` that reads `exam` /
  `activeAttempt` with `useSelector`, keys the mutation under
  `['specialExams', 'attempt', action]`, returns
  `dispatch(getExamAttemptsData(exam.course_id, exam.content_id))` from
  `onSuccess` (the existing read thunk: today's refetch; returning its
  promise keeps the mutation pending until the refetch lands), dispatches
  `setApiError` in `onError`. `Exam.jsx` renders its spinner for
  `isLoading || useIsMutating({ mutationKey: ['specialExams'] }) > 0`
  (decision 2). The
  per-action branches above (missing id → `logError` + `apiError` without a
  request; other-sequence redirect without refetch; worker start / submit
  messages; `expireExamAttempt()` after the refetch) live in the individual
  hooks, as today's bodies do.
- **Call sites:** `dispatch(startTimedExam())` becomes `const startTimedExam
  = useStartTimedExam(); … startTimedExam.mutate()`, one line each at the
  14 sites. `ExamTimerBlock` keeps the `once` subscription on a stable
  handler so `off` actually removes it (finding 11a fixed here: with
  mutations a leaked listener means duplicate PUTs).
- **Deleted:** the ten thunks and `startProctoringSoftwareDownload`; their
  `data/index.js` exports. `updateAttemptAfter` stays for the read thunks,
  `pingAttempt` and `checkExamEntry`.
- **`package.json`:** `@tanstack/react-query` as a peer (`^5`) and a
  devDependency; the React peer narrows to what React Query 5 supports
  (decision 1).
- **Test setup:** `render` in `src/setupTest.js` adds a `QueryClientProvider`
  with a fresh client (`retry: false`), inside the store `Provider`; a
  `renderHook` wrapper for the hook tests. `redux.test.jsx`'s action cases
  move to `src/data/mutations.test.tsx`, same requests and same state
  assertions through `renderHook` + the real store; the read-thunk cases stay
  where they are until commit 3.
- **Commit:** `refactor: run the attempt actions through React Query
  mutations`; not breaking (the public API is the wrapper, the timer, the
  three hooks and the reducer, none of which change).

### Decisions to settle

1. **React peer narrows to `^18.0.0`.** `@tanstack/react-query` 5 peers on
   React 18+; the lib's `^16.14 || ^17 || ^18` cannot stay. Not `|| ^19`
   (corrected 2026-10-08 in review): no host allows 19 (frontend-platform
   8 `^16.9 || ^17 || ^18`, frontend-base `^18.3.1`, Paragon 23 `^16.8.6 ||
   ^17 || ^18`). Learning is on 18; ORA stays on 4.x. The major already
   breaks the public contract, so this rides along; the `BREAKING CHANGE`
   footer of commit 4 names it.
2. **The spinner covers the whole action window through `useIsMutating`,
   not a slice write.** Today `updateAttemptAfter` sets `isLoading` before
   the action request and clears it after the refetch, and `Exam.jsx`
   renders the spinner instead of its content for that window, which is
   what prevents a second click. Each mutation gets a `mutationKey` under
   `['specialExams', …]`, its `onSuccess` returns the dispatched read
   thunk's promise so the mutation stays pending through the refetch, and
   `Exam.jsx` shows the spinner for `isLoading ||
   useIsMutating({ mutationKey: ['specialExams'] }) > 0`. A mutation is
   pending from the `mutate()` call, before the request goes out, so the
   window matches today's. The line survives commit 3 unchanged
   (`isLoading` becomes the exam query's pending state). Rejected: `onMutate`
   dispatching `setIsLoading(true)`, which reproduces today's timing but
   has the mutation writing the slice and is deleted in commit 3.
3. **Two of three oddities are fixed in their own `fix:` commits ahead of
   commit 2; the third is carried.** (a) `skipProctoringExam` passes
   `createExamAttempt(exam.id, true, false, legacy)` against
   `(examId, legacyAttempt, startClock, attemptProctored)`: #96 (2023-04)
   inserted `legacyAttempt` and only appended the flag here. edx-proctoring
   declines a proctored exam's new attempt only when `attempt_proctored` is
   false, so today a legacy skip creates a proctored un-started attempt and
   an edx-exams skip posts to the LMS. Unreachable today (learning #2162:
   the opt-out flag is never sent) but live the day the backend sends it,
   so it is fixed here, test-first (POST URL and body per backend), by
   restoring the pre-#96 call `createExamAttempt(exam.id,
   useLegacyAttemptApi)`. Documented in #2162 rather than a library issue.
   (b) `startProctoredExam` tests `exam.useLegacyAttemptApi`, a camelCase
   name no payload has (#108, 2023-05), so `notifyStartExam()`'s
   `window.top.postMessage(['exam_state_change', 'exam_take'], '*')` always
   runs on the no-worker path, legacy exams included. Findings
   (2026-10-08): the exam payload is stored raw and snake_case
   (`camelCaseObject` has never appeared in the repo); the spelling is the
   local-variable name #101 used one file over (`const { …,
   use_legacy_attempt_api: useLegacyAttemptApi } = …; !useLegacyAttemptApi`)
   written against the object instead; #108's only test asserts the
   message is sent for an LTI exam, which an always-true guard passes.
   Reachable change after the fix: a legacy edx-proctoring exam with no
   desktop worker stops posting the message. A GitHub code search for
   `exam_state_change` / `notifyStartExam` finds no sender or listener in
   any Open edX repo besides this library; the consumer is Proctorio's
   browser extension, an edx-exams LTI provider (edx-proctoring's backends
   are RPNow, a generic REST backend, mock and null; Proctorio appears
   nowhere in edx-proctoring), so no known legacy install is affected.
   Decided 2026-10-08: fix test-first by reading
   `attempt.use_legacy_attempt_api`, as the sibling checks and the
   `continueAttempt` call two lines below do. (c) `expireExam` refetches with
   `activeAttempt.course_id` ("this sure looks like a bug", #96); the ids
   can only differ across courses and the attempt is fetched per course,
   so no observable effect; kept, one sentence in the PR.
4. **`startProctoringSoftwareDownload` is deleted here**, not in commit 7.
   Settled 2026-10-08. It has never had a caller: #10 (2021-06-03) created
   the thunk and the download page in one commit, and the page called the
   API function `softwareDownloadAttempt` directly from day one; #23 added
   tests for it as for every thunk; #101 reworked the page's click handler
   and kept the direct call; #107 added the legacy flag to that call and
   left the TODO above it ("This call will circumvent the thunk … There's an
   opportunity to refactor and clean this up a bit"), the only reference
   outside `thunks.js` and its tests. Org-wide code search finds it in no
   other repo; it is not a public export. The two paths differ: the thunk
   would spinner-and-refetch through `updateAttemptAfter`, the page fires
   the request and `window.location.assign`s the provider's download URL,
   so no refetch is wanted. The page's direct call stays; the thunk, its
   `data/index.js` export and its tests go, so commit 2 reads as "every
   action thunk becomes a hook or goes".
5. **Finding 11a is fixed here** rather than carried. Settled 2026-10-08.
   `ExamTimerBlock`'s mount effect registers four `Emitter.once` listeners
   and its cleanup calls `Emitter.off` for each; three are component-body
   arrows (`onLowTime`, `onCriticalLowTime`, `onTimeReachedNull`) so `off`
   receives the reference `once` got, the fourth is an inline
   `() => dispatch(expireExam())` and the cleanup passes a different arrow,
   so nothing is removed. `Emitter` is a module-level singleton and the
   block mounts once per page (inside the exam sequence and via
   `OuterExamTimer` everywhere else), so a learner who moves between pages
   during a timed exam leaves one listener per page, and at the limit every
   one dispatches `expireExam`: one submit request each (learning's
   baseline saw five in one run and asserts "every action is submit, at
   least one" to tolerate it). The fix is a fourth named arrow,
   `onLimitReached`, used by both `once` and `off`; the effect's `[]` deps
   mean `once` and its cleanup close over the same render, which is all
   that matters and is how the other three already work. Done in this
   commit because the file's dispatch lines are rewritten to `mutate()`
   calls anyway and, under mutations, the duplicates become PUTs rather
   than redundant dispatches. Reachable change: one submit at expiry
   instead of several. Test: mount, unmount, remount, emit
   `TIMER_LIMIT_REACHED`, assert one submit request. Learning's assertion
   can tighten to exactly one in the swap layer.

## Commit 3 — queries: the reads, the poll and the two effects (done: `597f9a9`, 2026-10-09)

### How it works today

Six reads write the slice, each a thunk around one `api.js` fetcher:

| Thunk | Triggered by | Fetcher | Writes |
|---|---|---|---|
| `getExamAttemptsData(courseId, sequenceId)` | `ExamWrapper` mount when `sequence.isTimeLimited \|\| isLoading` (`isLoading` starts `true`, so the first sequence of a session always fetches, exam or not); `download-instructions` "start exam" click; every mutation's `onSettled` | `fetchExamAttemptsData`: legacy one GET (`exam` + `active_attempt`); edx-exams the exam GET then `fetchActiveAttempt` (latest) | `setExamState({ exam, activeAttempt })`, `isLoading` around it |
| `getLatestAttemptData(courseId)` | `OuterExamTimer` mount / `courseId` | `fetchLatestAttempt`: legacy course GET without `content_id`; edx-exams `{ exam: {} }` + latest | `setExamState` (overwrites `exam` with the legacy course exam or `{}`), `isLoading` around it |
| `getProctoringSettings()` | `Exam` effect on `examId`, proctored types only | `fetchProctoringSettings(exam.course_id, exam.id)` | `setProctoringSettings`; failure → `apiError` |
| `getExamReviewPolicy()` | `ReadyToStartProctoredExamInstructions` mount | `fetchExamReviewPolicy(exam.id)` | `setReviewPolicy` (stores it as `exam.reviewPolicy`); failure → `apiError` |
| `examRequiresAccessToken()` | learning's `useExamAccess` via `useFetchExamAccessToken()`, on every unit id change while `useIsExam()` | `fetchExamAccessToken(exam.id)`, only with `EXAMS_BASE_URL` | `setExamAccessToken`; failure → `logError` only |
| `pollAttempt(url)` | `TimerProvider` ticker: tick 0 then every 60th tick while `secondsLeft >= 0`; skipped when the attempt is `ready_to_submit` | `pollExamAttempt(url, exam.content_id)`: legacy `exam_started_poll_url` (`{ status, time_remaining_seconds }`); edx-exams latest with `content_id` (renames `attempt_status` → `status`) | `setActiveAttempt({ ...attempt, time_remaining_seconds, attempt_status })` (re-derives `timer_ends`, clears `apiErrorMsg`); `submitted` / `error` → `expireExamAttempt()` + `getExamAttemptsData` |

Plus two effects and one prop write: `pingAttempt(pingInterval, workerUrl)`
from the ticker when `workerUrl && tick % pingInterval === pingInterval / 2`
(worker ping; failure → `logError` + `endExamWithFailure` through
`updateAttemptAfter`); `checkExamEntry()` from `ExamWrapper` after the first
fetch (LTI proctored attempt in a proctored status → `checkAppStatus` raced
against 5 s; loss → `setApiError` + `endExamWithFailure`);
`getAllowProctoringOptOut(sequence.allowProctoringOptOut)` from `ExamWrapper`,
a prop copied into the slice (plan-2018 finding 6).

Readers: `exam` in ~20 components and the three public hooks;
`activeAttempt` in `Exam`, `TimerProvider`, `ExamTimerBlock`,
`OuterExamTimer`, the two submit pages and the mutations; `proctoringSettings`
in six pages (the slice ships a default object with `''` fields, so they
render before the fetch); `isLoading` in `Exam` (spinner) and `ExamWrapper`
(the first-mount fetch condition); `examAccessToken` in `src/api.js`;
`timer_ends` is derived at write time by `appendTimerEnd` (finding 3).

Learning's baseline pins: one exam request on an exam sequence, two after a
start (`Sequence.specialExams.test.tsx`), one on a non-exam sequence (the
`isLoading`-driven first fetch), one latest-attempt request per
`TabWithTimer` mount, one token request per exam unit and none on
a non-exam one. `examRequests()` counts the exam endpoints only, not
`latest`.

### `isTimeLimited` and content hiding, end to end (documented 2026-10-08)

**Where the flag comes from.** `is_time_limited` is a property of the
subsection block in openedx-platform (`xmodule/seq_block.py`), set by the
Studio subsection settings (timed or proctored). `SequenceBlock._get_render_metadata`
puts it in the sequence metadata payload next to `is_proctored`
(`'is_time_limited': self.is_time_limited`), the payload learning fetches
from `GET /api/courseware/sequence/{usage_key}`. Learning's
`sequenceMetadata.ts` normalizes it to `isTimeLimited` (since 2020, #95 /
#102, before the library existed), and `Sequence.jsx` passes the normalized
`sequence` to `SequenceExamWrapper`. The library has taken it as a prop
from its first commit (#5, 2021-05-13: `<Exam isTimeLimited={sequence.isTimeLimited}>`);
it has never fetched it. So the library knows whether a sequence is an exam
before it sends any request.

**It means "special exam of any kind", not "timed".** Studio's subsection
setting is one radio with five values, and frontend-app-authoring's
`AdvancedTab.handleChange` writes the block's four booleans from it: *timed*
sets `is_time_limited` alone; *proctored*, *practice proctored* and
*onboarding* each set `is_time_limited` **and** `is_proctored_enabled`, plus
`is_practice_exam` or `is_onboarding_exam` for the last two; *none* clears
all four. The block itself aliases the pure case as `is_timed_exam =
is_time_limited and not is_proctored_enabled and not is_practice_exam`. So
in the library `isTimeLimited` answers "wrap this sequence as an exam", and
which kind it is comes from the fetched `exam.type`
(`timed` / `proctored` / `practice` / `onboarding`), which is what
`Instructions` and `Exam.jsx` branch on.

**What hides the content on the frontend.** `Exam.jsx` (shape unchanged
since #5; the masquerade and gated exceptions came with #40, 2021-08):

1. while `isLoading`, a spinner and nothing else;
2. then `isTimeLimited && !originalUserIsStaff && !isGated ? <Instructions>{children}</Instructions> : children`.

`Instructions` switches on the fetched attempt's status and renders the
unit (`children`) only for a started attempt (and for a submitted timed
exam past its due date when the section stays visible); every other status
renders an instructions page. With no attempt yet, it renders the entrance
page. So the prop decides *whether* a sequence is wrapped, the fetched
attempt decides *what the wrapper shows*, and the spinner covers the gap
between mount and the fetch on an exam sequence; without it the entrance
page, not the unit, would flash before the real status arrived. On a
non-exam sequence the content renders directly, fetch or no fetch.

**What hides it on the server.** Only for edx-exams LTI providers:
`render_xblock` (`lms/djangoapps/courseware/views/views.py`) checks the
`exam_access` JWT on the unit request when `course.proctoring_provider ==
'lti_external'` and the sequence `is_time_limited`; learning's
`useExamAccess` (`useIsExam()` → `useFetchExamAccessToken()` →
`useExamAccessToken()`) puts that token on the unit iframe URL and blocks
the iframe until it has one. For edx-proctoring there is no server-side
check in `render_xblock`; the legacy courseware did its hiding in
`_time_limited_student_view`, which the MFE never calls. On legacy, the
frontend wrapping is the only gate.

**How the fetch condition got here.** #5 (2021) fetched on every sequence
mount, unconditionally, so `exam` and `activeAttempt` were fresh on every
sequence. #129 (2024-01-08, "feat: reduce unnecessary api calls", no
further rationale in the message) made it `if (sequence.isTimeLimited ||
state.isLoading)` with the comment "fetch exam data on exam sequences or if
no exam data has been fetched yet" and two tests: "does not fetch exam data
if already loaded and the sequence is not an exam" and "does fetch exam
data for non exam sequences if not already loaded". #136 (2024-02) only
moved it to `useSelector`. Since `isLoading` starts `true` and only a fetch
clears it, the retained first-mount fetch is what fills `activeAttempt` in
the courseware tree on a session that starts on a non-exam sequence; after
that, non-exam sequences rely on whatever an earlier sequence left in the
global slice (the in-course timer, `Exam.jsx`'s `showTimer &&
<ExamTimerBlock />`, renders on any sequence from `activeAttempt`). The
same global slice is what leaves an exam sequence's `exam` behind on the
next non-exam one (finding 1), where `useIsExam()` then reports true and
learning fetches a token for a non-exam unit.

### What changes

- **`SequenceExamContext` carries the exam's identity**: `SequenceExamWrapper`
  adds `{ courseId, sequenceId: sequence.id, allowProctoringOptOut:
  sequence.allowProctoringOptOut }` to the context it already provides
  (plan-2018 "exam identity"). `getAllowProctoringOptOut` and the slice field
  go with it (decision 1).
- **`src/data/queries.ts`** (TypeScript): a key factory
  `specialExamsQueryKeys` (`all: ['specialExams']`, `exam(courseId,
  sequenceId)`, `activeAttempt(courseId)`, `poll(attemptId)`,
  `proctoringSettings(courseId, examId)`, `reviewPolicy(examId)`,
  `accessToken(examId)`) and the hooks (plan-2018 "Queries (6)"):
  - `useExamQuery(courseId, sequenceId, { enabled })`: `fetchExamAttemptsData`,
    data kept whole (`{ exam, active_attempt }`; decision 2), `select`
    adding `timer_ends` to the attempt from `dataUpdatedAt` (finding 3);
    `enabled: sequence.isTimeLimited`.
  - `useActiveAttemptQuery(courseId)`: `fetchLatestAttempt(...).active_attempt`
    with the same `timer_ends` `select`; mounted by `OuterExamTimer` only;
    `enabled: isAuthenticated` (the early return today).
  - `useActiveAttempt()`: the exam query's attempt under a
    `SequenceExamContext`, the course query's outside one.
  - `usePollQuery(attempt, sequenceId)`: `pollExamAttempt`, `refetchInterval:
    60_000`, `refetchIntervalInBackground: true` (decision 3); `enabled`
    while the attempt is started, not `ready_to_submit`, and the ticker has
    not passed zero; on data, `setQueryData` on the active-attempt key with
    `time_remaining_seconds` / `attempt_status`; on `submitted` / `error`,
    `timeIsOver` + invalidate the exam key.
  - `useProctoringSettingsQuery(courseId, examId)`: `enabled` for
    onboarding / practice / proctored with an id; `placeholderData` = the
    slice's default object (decision 4).
  - `useReviewPolicyQuery(examId)`: mounted only by
    `ReadyToStartProctoredExamInstructions`.
  - `useAccessTokenQuery(examId)`: `enabled: !!examId && !!EXAMS_BASE_URL`,
    `staleTime: 0` (D3).
- **Components** read the queries where they read the slice: `exam` /
  `activeAttempt` through two small hooks (`useExam()` = the exam query for
  the context's identity, `useActiveAttempt()`), `proctoringSettings`,
  `reviewPolicy` and the token through theirs. `Exam.jsx`'s `isExamLoading`
  becomes the exam query's `isLoading` (pending *and* fetching, so a
  disabled query on a non-exam sequence is not "loading"; decision 5).
- **Mutations** refresh by `queryClient.invalidateQueries` on the exam key
  and the active-attempt key in place of `dispatch(getExamAttemptsData)`;
  `useExpireExam`'s `refetchArgs` becomes the exam key built from
  `activeAttempt.course_id` (1c, carried). `useEndExamWithFailure` joins
  `mutations.ts` for the two effects.
- **Effects**: `useCheckExamEntry()` in `ExamWrapper`, run once when the exam
  query first has data for this sequence (decision 6); `usePingAttempt()`
  called from the ticker in `TimerProvider` on today's cadence.
- **Slice** keeps `timeIsOver` and `apiErrorMsg` only; `setExamState`,
  `setActiveAttempt`, `setProctoringSettings`, `setExamAccessToken`,
  `setReviewPolicy`, `setIsLoading`, `setAllowProctoringOptOut` and the
  seven read / effect thunks, `updateAttemptAfter` and `handleAPIError` go;
  `thunks.js` is deleted (commit 4 then only deletes the slice).
- **Public hooks (`src/api.js` → `src/apiHooks.ts`)** take D3's shape here
  (decision 7): `useIsExam()` = the exam query has an id for the enclosing
  sequence; `useExamAccessToken()` → `{ accessToken, isPending }` from the
  token query; `useFetchExamAccessToken` removed.
- **Tests**: the read cases of `redux.test.jsx` move to `queries.test.tsx`
  (`renderHook`, real `QueryClient`, `axios-mock-adapter`), the file is
  deleted; the ~25 component tests that seed `exam` / `activeAttempt` /
  `proctoringSettings` through `initializeTestStore(preloadedState)` or
  `store.getState = () => …` seed the test `QueryClient` instead through a
  `render` option (decision 8); `src/setupTest.js` grows that option.
- **Commit:** `refactor!: read the exam, the attempt, the settings, the
  policy and the token through React Query`, with a `BREAKING CHANGE`
  footer for `useExamAccessToken`'s shape and the removed
  `useFetchExamAccessToken`.

### Decisions to settle

1. **`allowProctoringOptOut` moves to the context in this commit**, not
   commit 4. Settled 2026-10-08. It is a prop copied into the store by the thunk chain this
   commit deletes; leaving a one-field thunk behind to move it one commit
   later is churn for nothing. Commit 4 then moves only `timeIsOver` and
   `apiErrorMsg`.
2. **The exam query keeps the whole response; the attempt reaches the timer
   from whichever query is mounted.** Settled 2026-10-08 (shape chosen in
   discussion; the alternative was one attempt key filled by the exam
   fetcher through `setQueryData` and read on the exam page with
   `enabled: false`). `fetchExamAttemptsData` returns `{ exam,
   active_attempt }` on both families, so the sequence-keyed exam query
   stores both; on the exam page the attempt readers (`Exam`,
   `TimerProvider`, `ExamTimerBlock`, the submit pages, the mutations) take
   it from there, and only `OuterExamTimer`, on pages with no sequence,
   mounts the course-keyed `latest` query. `useActiveAttempt()` returns the
   exam query's attempt under a `SequenceExamContext` and the course query's
   outside one. Each page therefore makes exactly today's requests (legacy
   one, edx-exams two, outer timer one) and learning's counts hold. The
   poll's patch and the `timer_ends` derivation are shared helpers applied
   to whichever query holds the attempt.
3. **Polling keeps running in a background tab.** Settled 2026-10-08. The
   server owns the clock (`time_remaining_seconds` on every attempt
   payload); the library anchors a deadline from it once (`appendTimerEnd`)
   and the 1-second ticker only does local arithmetic against that
   deadline. The 60-second poll re-anchors the deadline and picks up a
   server-side `submitted` / `error`. Today that poll rides the ticker's
   `setInterval`, which a hidden tab throttles but does not stop; React
   Query's `refetchInterval` pauses in a hidden tab by default, so
   `refetchIntervalInBackground: true` is set to keep today's behaviour.
   The default `refetchOnWindowFocus` stays on: returning to the tab
   resyncs the clock at once, a small new behaviour and a good one. The
   display ticker is untouched.
4. **The proctoring-settings default object becomes `placeholderData`**, so
   the six pages render with `''` fields before the fetch exactly as they do
   today (three of them destructure the object unguarded). Settled
   2026-10-08. Rejected: `initialData`, which the cache would treat as real
   data and not fetch over; and `|| {}` guards on the three pages, which
   would render `undefined` fields before the fetch instead of `''`.
5. **What a non-exam sequence fetches.** Settled 2026-10-09 as proposed,
   against the subsection above: a non-exam sequence never asks for the
   exam and shows no spinner; an exam sequence fetches and shows the
   spinner as today; coming back to a non-exam sequence finds nothing left
   over, because the exam lives under its own sequence's key.
   Facts: the library knows `isTimeLimited` from the prop before any
   request; content hiding on a non-exam sequence never depended on the
   fetch; the first-mount fetch's only effect on a non-exam sequence is to
   fill `activeAttempt` for the in-course timer (and, as a side effect, to
   show a spinner there once per session); on later non-exam sequences
   today's timer reads whatever an earlier sequence left in the global
   slice, and the stale `exam` that comes with it is finding 1.
   Proposal: the exam query is `enabled: sequence.isTimeLimited`; a
   non-exam sequence mounts the course-keyed active-attempt query (the one
   `OuterExamTimer` uses), so the in-course timer shows from a fetch of its
   own rather than from a leftover, and `useIsExam()` is false there
   because its exam key is empty. Spinner only on exam sequences, where it
   covers the attempt fetch as today. Requests: a non-exam sequence sends
   one attempt request per mount (`latest` on edx-exams, the course GET on
   legacy) where today only the first sequence of a session did; learning's
   `examRequests()` counts the exam endpoints only, so its non-exam case
   becomes "never asks for the exam". Alternative: reproduce #129's
   first-mount-only fetch with a module-level "fetched once" flag, which
   keeps finding 1. Optional: `staleTime` on the attempt key matched to the
   60-second poll so quick navigation reuses the last answer; not proposed.
6. **`checkExamEntry` keeps its timing; not a decision.** Today it runs once
   per sequence mount, after that mount's fetch has returned, against the
   fresh attempt, and never after the refetches that actions cause. The
   effect must fire when the mount's fetch has *completed* (data present
   and not fetching), once per sequence, not when data first exists: with
   a cache, returning to an exam sequence shows cached data while a fresh
   fetch runs, and probing against a stale "started" attempt that the
   server has since submitted would end it with an error PUT. Noted
   2026-10-09.
7. **D3's public-hook change lands here, with the token query.** Settled
   2026-10-09. The branch lands as a squash and the lib releases 5.0 from
   that one commit's message, so which internal commit says `!` reaches no
   consumer; what matters is writing the hooks once. `useIsExam()` reads
   the exam query for the enclosing sequence; `useExamAccessToken()`
   returns `{ accessToken, isPending }` from the token query, `isPending`
   false when the query is disabled (no enclosing exam or no
   `EXAMS_BASE_URL`; React Query 5 reports a disabled query with no data as
   pending, so the hook uses the fetching-aware flag); `useFetchExamAccessToken`
   is removed. Commit 3's own message carries the `BREAKING CHANGE` footer
   for it because that is where it happens; the squash message carries the
   aggregate. Rejected: reimplementing the v4 shapes here and rewriting
   them in commit 4, which touches the hooks and their tests twice for a
   distinction the squash erases.
8. **Component tests seed the query cache, not a preloaded store.** Settled
   2026-10-09: learning's `seedQueryData` pattern. A
   `render` option `{ queries: { exam, activeAttempt, proctoringSettings,
   … } }` writes each given payload to its key on the test `QueryClient`
   (as learning's `seedQueryData` does), with `staleTime: Infinity` so
   mounting observers do not refetch over it; the store option stays for
   `timeIsOver` / `apiErrorMsg` until commit 4. Tests that today assign
   `store.getState = () => ({ specialExams: Factory.build('specialExams',
   …) })` pass the same factory output to the option.

### As built (3)

Decisions 1–8 as settled; what building it decided is `decisions-175.md`
3.9–3.17 (`queryKeys.ts` / `defaults.ts` split for `setupTest.js`,
`useIsExamLoading` on `isPending || isFetching`, invalidation in
`useAttemptAction`, the deletions, hook-test hygiene, the learning check,
`useEndExamWithFailure`'s shape, `timer_ends` on read, stable effect inputs).
Readers observe the owner's key with `enabled: false`; `useIsExam` moved
into `queries.ts`; `useEndExamWithFailure` into `mutations.ts`. Learning's
baseline pins change on the non-exam sequence only (decision 5) plus three
timing adaptations and one test-environment fix, listed in plan-2018
"Learning side".

## Commit 4 — remove redux (done: `0781870`, 2026-10-09)

### How it works today (after commit 3)

The slice holds two fields and two reducers:

```js
initialState: { timeIsOver: false, apiErrorMsg: '' },
reducers: {
  expireExamAttempt: (state) => { state.timeIsOver = true; },
  setApiError: (state, { payload }) => { state.apiErrorMsg = payload.errorMsg; },
}
```

Writers: `useApiError` (`mutations.ts`; every action's `onError`, the
"no attempt id" refusals, the worker-notify failure) and
`useReportQueryError` (`queries.ts`; the owner queries' errors) dispatch
`setApiError`; `usePollQuery` dispatches `setApiError({ errorMsg: '' })`
on every reply and `expireExamAttempt` on `submitted` / `error`;
`useExpireExam` dispatches `expireExamAttempt` when the ticker hits the
limit; `useCheckExamEntry` dispatches `setApiError` on a lost probe.
Readers: `Exam.jsx` and `OuterExamTimer.jsx` show `<ExamAPIError />`
when `apiErrorMsg` is set, and `ExamAPIError.jsx` reads the message;
`SubmittedInstructions.jsx` passes `timeIsOver` to the submitted-timed
heading (and to the `submittedTimedExamInstructions` override). The store
is learning's app store (`src/store.ts`, created once per page load and
given to `AppProvider`), mounted on the lib's `reducer` export; the lib's
`setupTest.js` builds its own for tests (`initializeTestStore`, the
`store` option on `render`).

**Latent bug.** Nothing ever sets `timeIsOver` back to `false`, and the
only write of an empty `apiErrorMsg` is the poll's. Because the store
lives for the page session, once a timed exam expires every later
submitted-timed page in that session reads "The time allotted for this
exam has expired." (including an override component's `timeIsOver`
prop), and an error raised on one exam sequence stays on every later exam
sequence until a started attempt's poll succeeds. In-app navigation stays
within one course (another course is a full page load), so the
reproduction is two timed exams in one course in one page session: the
first expires, the second is submitted with time to spare and is told the
time ran out. Messaging only; no request or state transition reads either
field.

### What changes

- `timeIsOver` and `apiErrorMsg` become `useState` owned by the two
  providers, `SequenceExamWrapper` and `OuterExamTimer` (the poll under
  the outer timer's `TimerProvider` can expire an attempt too), through
  one shared hook that builds the state half of the context value;
  `SequenceExamContext` carries `{ ...identity, timeIsOver, apiErrorMsg,
  setTimeIsOver, setApiError }`. `useApiError`, `useReportQueryError`,
  the poll, `useExpireExam` and `useCheckExamEntry` call the setters
  where they dispatched; the four readers use the context.
- `slice.js`, the `reducer` export (`data/index.js`, `index.jsx`) and
  every `react-redux` import go; `setupTest.js` drops `initializeTestStore`
  and the `store` option.
- **Commit:** `refactor!: own the exam's client state in the sequence
  context, not a redux slice`, `BREAKING CHANGE` footer for the removed
  `reducer` export (learning's `store.ts` mounts it).

### Decisions

1. **The client state is scoped to the provider and resets when the
   sequence unmounts.** Settled 2026-10-09. This resolves the latent bug
   above as a side effect: `timeIsOver` and `apiErrorMsg` are created
   with the sequence's wrapper and gone when the learner leaves it, so a
   second exam in the same session starts clean. Recorded as such in the
   decision doc when the commit lands.
2. **One context, not two.** Settled 2026-10-09. The state joins
   `SequenceExamContext` beside the identity fields, with the setters;
   both providers build the state half from one hook and memoize the
   value over identity plus state (the setters are stable). A context
   re-renders every consumer when any field changes, and the exam readers
   (`useExam`, `useActiveAttempt`, `useIsExamLoading`, the mutations) all
   consume this context through `useSequenceExam`; that is affordable
   here because `timeIsOver` changes once per attempt, an error already
   re-renders the page that shows it, and the one frequent write, the
   poll's `setApiError('')` every minute, sets a value that is already
   `''`, which React bails out of without a render. A second context for
   the mutable half would spare the exam readers those rare renders at the
   cost of a second provider in both components and the test wrapper and
   a second hook; the usual reason to split, a high-frequency field next
   to a stable one, is not present. Learning's `SidebarContext` is the
   same shape (state and setters in one context from one provider).
3. **Test seams.** Settled 2026-10-09. Components rendered under the
   provider (13 sites in `Instructions`, `SubmittedInstructions`,
   `ExamAPIError`, `Exam`, `ExamWrapper` tests) take `render(ui, {
   specialExams, clientState: { timeIsOver, apiErrorMsg } })`, which fills
   the state half of the context the test wrapper already provides; the
   hook tests' `clientState()` reads the context through a probe rendered
   beside the hook under test instead of `store.getState()`, with a real
   stateful context in their wrapper so the setters have somewhere to
   write. The provider components own their state after this commit and
   get no test-only prop, so their two preloaded cases go, each covered
   elsewhere and to be listed as such in the decision doc:
   `SequenceExamWrapper.test` "renders the submittedTimedExamInstructions
   component with timeIsOver instead" (preloads `timeIsOver: true`) →
   the wrapper test keeps the pass-through with `timeIsOver: false`, and
   `SubmittedInstructions.test` pins the `true` half in "passes the
   store's timeIsOver to the timed instructions" and "renders the timed
   instructions component the wrapper provides, with timeIsOver" (both
   under `clientState`); `OuterExamTimer.test` "renders error component
   when apiErrorMsg is present" (preloads the message) → merged into its
   "shows the error when the latest-attempt request fails", the behaviour
   that produces that state. Rejected: mocking the state hook in those
   files, which would replace the wiring a provider test exists to prove.
4. **`react-redux`, `redux`, `@reduxjs/toolkit` stay installed and unused
   until commit 7**, per the batching rule, peers included.

The learning source checks from this commit on need learning's `store.ts`
to stop importing the removed `reducer`; that is a local, uncommitted
one-file shim (a store with no reducers) in the learning checkout beside
the jest alias, not a change in this library and not the swap layer's
deletion of the store.

## Commit 5 — react-intl (done: `3a66d9f`, 2026-10-09)

The 43 files importing `FormattedMessage`, `useIntl`, `defineMessages` from
`@edx/frontend-platform/i18n` import them from `react-intl`; `src/setupTest.js`
wraps in react-intl's `IntlProvider`. Those four symbols are plain re-exports
of react-intl's in frontend-platform's `i18n/index.js`, so the swap changes
no behaviour. Mechanical; its own commit so commit 6 shows only the service
plumbing.

Decisions (settled 2026-10-09):

1. **Peer `^6.0.0 || ^10.0.0`**, the majors the hosts carry and nothing
   between: frontend-platform 8.3.3 depends on 6.8.9 and the published
   frontend-base 1.0.1 on `^6.6.6`; the frontend-base 2.0 line the
   migration targets (`2.0.0-alpha.15`, the `alpha` tag, and `main`)
   depends on `^10.1.20`. A first draft spanned `^6` through `^10` on the
   belief that frontend-base shipped 10; no host carries 7, 8 or 9, and
   the peer says what the hosts support (the React peer rule from
   commit 2).
2. **devDependency `react-intl@10`**, not the 6.8.9 already in the tree:
   the lib's suite then runs on 10 while learning's source check runs the
   same code on its own 6.8.9 through the jest alias, so both declared
   majors are exercised on every run. Until commit 7 removes
   frontend-platform (which pins a nested 6.8.9) the lib's `node_modules`
   holds both; nothing in the lib uses frontend-platform's i18n after this
   commit, so they never meet.

## Commit 6 — host services: `SpecialExamsProvider`, no frontend-platform peer (done: `41fbf10`, 2026-10-09)

### How it works today (after commit 5)

Every host-provided thing still comes from `@edx/frontend-platform`:

| Import | Where | Used for |
|---|---|---|
| `getConfig` | `data/api.js` (17 reads), `data/messages/proctorio.js` (1), six instruction components, `exam/ExamAPIError.jsx` | `EXAMS_BASE_URL`, `LMS_BASE_URL`, `SITE_NAME`, `SUPPORT_URL`, `CONTACT_URL`, `PROCTORED_EXAM_FAQ_URL`, `PROCTORED_EXAM_RULES_URL` |
| `getAuthenticatedHttpClient` | `data/api.js` | every request |
| `logError` | the hooks (ex-thunks), `data/messages/handlers.js` | failures and worker errors |
| `AppContext` | `exam/ExamWrapper.jsx`, `core/OuterExamTimer.jsx` | truthiness of `authenticatedUser` |

The library's own test setup (`src/setupTest.js`) is frontend-platform too:
`mergeConfig` from `process.env`, `configureLogging(MockLoggingService)`,
`configureAuth(MockAuthService)`, `AppContext.Provider` with a mock user;
the data tests attach `axios-mock-adapter` to `getAuthenticatedHttpClient()`;
four tests `jest.mock('@edx/frontend-platform')` to stub `getConfig`.

### What changes

- **`SpecialExamsProvider`** (`src/core/SpecialExamsProvider.tsx`, exported):
  props `config` (`{ examsBaseUrl, lmsBaseUrl, siteName, supportUrl,
  contactUrl, proctoredExamFaqUrl, proctoredExamRulesUrl }`, all optional
  strings; `examsBaseUrl` unset selects the LMS edx_proctoring family as
  `EXAMS_BASE_URL` unset does today), `httpClient` (an axios instance that
  authenticates its requests; required), `logError(message, customAttributes)`
  (required), `isAuthenticated` (boolean, required). Exposed through
  `useSpecialExams()`.
- **`api.js`:** each function takes the services it needs as its first
  argument (`{ config, httpClient }`); the query and mutation hooks, which
  have `useSpecialExams()`, pass them. `config.examsBaseUrl` replaces
  `getConfig().EXAMS_BASE_URL` and so on. `proctorio.js`'s origin check and
  `handlers.js`'s logging take theirs the same way from the effect hooks
  that call them. No module-level registry: by this commit nothing outside
  a hook calls `api.js`.
- **Components:** `ExamWrapper` and `OuterExamTimer` read `isAuthenticated`
  from `useSpecialExams()`; `ExamAPIError`, `Footer`,
  `ReadyToStartProctoredExamInstructions`, `RejectedProctoredExamInstructions`,
  `ErrorProctoredExamInstructions`, `Failed.jsx`,
  `SubmitProctoredExamInstructions` and `download-instructions/index.jsx`
  read `config` from it.
- **`package.json`:** `@edx/frontend-platform` leaves `peerDependencies`
  here (the contract change) and the lock in commit 7. `.env.test` /
  `process.env` config reads go; the `env.config` virtual mock in
  `src/setupTest.js` goes with them (decision 0a.5).
- **Test setup:** `render` wraps in `SpecialExamsProvider` (test config, a
  shared `axios.create()` instance exported as `httpClient`, `logError:
  jest.fn()`, `isAuthenticated: true`, all overridable through a `services`
  render option). `initializeMockApp()` keeps its name and returns
  `{ loggingService }` with the same `logError` / `logInfo` jest functions;
  the data tests attach their `MockAdapter` to the exported `httpClient`.
  The four `getConfig` mocks become `services: { config: {…} }` render
  options.
- **README:** a "Setup" section showing the provider with a
  frontend-platform host's values (`getConfig()`, `getAuthenticatedHttpClient()`,
  `logError`, `!!authenticatedUser`) and noting that frontend-base hosts pass
  their equivalents; the Testing section's example passes the same config
  object to `mockSpecialExams`.
- **Commit:** `feat!: take config, the HTTP client, logging and the user from
  SpecialExamsProvider instead of frontend-platform`, `BREAKING CHANGE:`
  naming the required provider and the removed peer.

### Decisions to settle

1. **`config` keys are camelCase on the provider.** Settled 2026-10-09.
   A frontend-platform host maps once at the mount (`{ examsBaseUrl:
   getConfig().EXAMS_BASE_URL, … }`; the README shows it); the ergonomics
   follow frontend-base, where the site config is already camelCase
   (`lmsBaseUrl`, `siteName` in the 2.0 alpha's published code; no
   upper-snake keys), so a frontend-base host passes its values through.
   Rejected: accepting frontend-platform's upper-snake names, which bakes
   one host's vocabulary into the library's API. 0b's mock already uses
   these names.
2. **`httpClient`, `logError` and `isAuthenticated` are all required, no
   defaults.** Settled 2026-10-09. Today `logError` is
   frontend-platform's forwarder to the logging service the host's
   `initialize()` installed, and a host without one fails ("You must
   first configure the logging service"); the library has never had a
   console fallback. The first draft made `logError` optional with a
   `console.error` default; rejected as new behaviour that would hide a
   misconfigured host. A frontend-platform host passes `logError` from
   `@edx/frontend-platform/logging`, a frontend-base host its own.
3. **Test setup keeps the `initializeMockApp()` and `render(ui, …)` names.**
   Settled 2026-10-09. It still stands up a mock app (test config, a shared
   axios instance, a jest logger, an authenticated user), just not a
   frontend-platform one, so the name holds and the suites change only
   where they touched frontend-platform directly.
4. **`api.js` becomes `api.ts`.** Every function's signature changes to take
   `{ config, httpClient }` first, which is a rewrite of the file, and a
   file rewritten anyway becomes TypeScript (plan rule); the hooks then get
   typed request functions in place of the `AttemptResponse` casts.

## Commit 7 — dependency removals (done: `63c1471`, 2026-10-09)

One `package.json` change with one lock regeneration, dropping every
package nothing imports any more, and the `src/setupTest.js` import of
`babel-polyfill`. Whether `axios-mock-adapter` becomes an optional peer for
the `./testing` subpath is decided here (decision 0b.4).

### Decisions

1. **Everything with no importer goes, not only the six the branch
   orphaned.** Settled 2026-10-09. The inventory after commit 6 (importers
   in source, tests and config) adds to the planned
   `@openedx/frontend-plugin-framework`, `@edx/frontend-platform`,
   `react-redux`, `redux`, `@reduxjs/toolkit` and `babel-polyfill`:
   `react-router` and `react-router-dom` (peers and devDependencies; no
   commit in the repo's history imported either from `src`), the four
   `@fortawesome/*` packages (shipped `dependencies`, never imported),
   `dotenv` (its one use went with `.env.test` in commit 6) and `glob`
   (no use). The dropped peers (`react-redux`, `redux`,
   `@reduxjs/toolkit`, `react-router`, `react-router-dom`) go in the
   `BREAKING CHANGE` footer; every host carries its own router and none
   relied on the library for it.
2. **`axios-mock-adapter` and `axios` stay devDependencies and nothing
   more** (closes 0b.4). Settled 2026-10-09. The shipped mock imports
   both as types only, so there is no runtime dependency to declare; a
   plain peer would be auto-installed into every consumer by npm 7+, and
   an optional peer is metadata that neither installs nor warns. The suite
   needs both (the mock's own 11 cases and the hook tests), so they are
   visible as devDependencies to anyone adopting the fixtures, and the
   README's Testing section says to bring an adapter.
3. **`babel-polyfill` goes with its `setupTest.js` import**; the suite is
   the proof. jsdom then has no `setImmediate`, so React's scheduler falls
   back to its captured `setTimeout`, which also removes the fake-timer
   hazard (plan-2018, learning side) from this repository's own test
   environment.
