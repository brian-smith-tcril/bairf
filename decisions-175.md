# Decisions — frontend-lib-special-exams v5: React Query, host-agnostic (openedx/frontend-lib-special-exams#175)

One PR from the fork branch `bsmith/v5-react-query` to `main`, no stack;
commit plan in `plan-175.md`. The design decisions behind the major are in
`plan-2018.md` ("Decisions settled so far"); this log holds the decisions
made while implementing, by commit.

## Commit 0a — replace frontend-build with direct tooling, `tsc` build (`e37774b`, 2026-10-07)

0a.1. **frontend-build is dev-only here and is replaced, not kept.** It is a
   devDependency with no dependency on frontend-platform; consumers never
   see it, so it does not bear on the host-agnostic goal. It is replaced
   because frontend-base names it among the libraries it supersedes and
   because everything it supplies (about ten dev tools and three config
   files) a library can declare directly. frontend-base's own CLI is not
   adopted: it is pre-1.0 and built around apps and sites.
0a.2. **`tsc` builds; `target: ES6`; CommonJS output; declarations shipped.**
   frontend-base ADR 0005 is the precedent for `tsc` at ES6; learning's dev
   and prod webpack and its Jest all transpile `@edx/*` packages themselves,
   so the ES5 → ES6 change in `dist` is unobservable to consumers. Module
   format stays CommonJS so the syntax target is the only output change.
   The `is-es5` script and CI step go with it. That check was never a
   decision of this repo: it arrived with the scaffold in the first commit
   (`e6edf5c`, 2021-04-05, "Create special exam lib empty project") and no
   later commit touched it. The template it came from removed it in
   openedx/frontend-template-application#516 (2022-12-12): "Removes
   `is-es5` check in CI since ES5 was only needed for IE 11 support which is
   dropped. The supported browsers defined by the shared configuration all
   natively support ES6." This lib never chose ES5 either: it has no
   browserslist of its own, and its `dist` was ES5 only because Babel 7's
   `preset-env` falls back to ES5 when nothing names a target. The
   `is-es5` step was guarding that accident for a browser nobody supports
   any more. Across the org only this lib and
   `frontend-component-cookie-policy-banner` still carry it; the template,
   header, footer, frontend-platform, paragon, FPF and frontend-base do not.
   The Makefile's post-build cleanup (`find dist -name '*.test.js*'
   -delete`, `rm ./dist/setupTest.js`) goes too: it existed because Babel's
   `--copy-files` copied everything under `src` that Babel did not process.
   `tsc` emits only what `tsconfig.build.json` includes, and that config
   excludes the test files, snapshots and `setupTest.js`, so `dist` has
   nothing to delete. Dropping `--copy-files` also stops copying non-code
   files; the only ones under `src` are the plugin-slot READMEs and
   screenshots (deleted with the slot in commit 1) and `assets/.gitkeep`,
   none of which a consumer imports.
0a.3. **`@edx/eslint-config` stays** (frontend-base's flat config would move
   the rules under every file); **`@edx/typescript-config` strictness**
   (same switches as frontend-base's); **`babel-jest` for Jest** (ADR 0005's
   `ts-jest` caveat, Paragon icons). Details: `plan-175.md` commit 0a.
0a.4. **`.eslintrc.js` is frontend-build's `config/.eslintrc.js` inlined, with
   three edits.** Dropped: `parserOptions.requireConfigFile` and
   `babelOptions` (they pointed the parser at frontend-build's babel preset;
   the parser is `@typescript-eslint/parser` regardless), the
   `import/no-unresolved` exception for `env.config`, the `newrelic` and
   `PARAGON_THEME` globals (nothing here references either), and the
   `ignorePatterns` for `module.config.js` / `env.config.*` (files this repo
   never has). Added: plain `parserOptions` (`ecmaVersion`, `sourceType`,
   `jsx`) and an `import/no-extraneous-dependencies` devDependency glob for
   `i18n/formatter.js`, which requires a devDependency.
   Kept verbatim: `extends: ['@edx/eslint-config']`, the `@typescript-eslint`
   plugin and parser, `jsx-a11y/anchor-is-valid` for `Link`,
   `import/no-import-module-export: off`, and
   `react/function-component-definition` as arrow functions. The rules under
   the existing code did not move; lint stayed clean with no source change.
   `.eslintignore` is untouched (a `temp/` line was added and removed: ESLint
   lints only `.js,.jsx,.ts,.tsx`, and nothing writes `temp/` any more).
0a.5. **Jest's support files fold into `jest.config.js` and
   `src/setupTest.js`; no separate stub files.** frontend-build kept three
   helpers under its own `config/jest/`: a `setupFiles` entry that loaded
   `.env.test` with `dotenv`, an asset file mock, and a fallback
   `env.config`. Reproducing them as `jest.setup.js`, `jest.fileMock.js` and
   `jest.envConfig.js` put four `jest.*` files at the repo root, so each was
   replaced. `.env.test` is loaded at the top of `jest.config.js`; Jest
   workers inherit the parent's environment, so no `setupFiles` entry is
   needed. Assets map to `identity-obj-proxy` together with styles: the one
   asset any test loads is Paragon's `Avatar/default-avatar.svg`, pulled in
   by the `@openedx/paragon` barrel that both the library and
   frontend-platform import from, and nothing renders it, so the module
   only has to load (the plan had assumed no asset imports; the library's
   own code has none, its dependency does). `env.config`, which
   `@edx/frontend-platform/initialize` requires, is a virtual `jest.mock`
   in `src/setupTest.js`; that line goes with frontend-platform in
   commit 2. Verified: 32 suites, 363 tests, coverage unchanged (97.27%).
0a.6. **`Exam.jsx` loses its `@constructor` JSDoc tag; nothing else is
   annotated.** `tsc` inferred `.d.ts` for every other `.jsx` module but
   refused `Exam` (TS9005, "requires using private name 'Exam'"). The cause
   was the component's doc block: TypeScript reads `@constructor` as marking
   a constructor function, so the arrow component's inferred type became a
   class-like type whose instance type is the unexported `Exam`. A first
   attempt added an explicit `@type {import('react').FC<…>}`, which worked
   by overriding that inference but described every prop a second time
   beside the existing `@param` lines. Deleting the tag alone unblocks
   emit. The emitted props are `any` because the `@param` lines were never
   typed; that is left as is because `Exam` is internal (the package entry
   exports `SequenceExamWrapper`, `OuterExamTimer`, the hooks and the
   reducer), so its declaration never reaches a consumer.
0a.7. **Message extraction writes `src/i18n/transifex_input.json` in one
   step; the Transifex-era targets go.** The library ships no translations:
   `src/i18n` was deleted in 2023 (`9888ecf`) and components carry only
   English `defaultMessage`s. openedx-translations'
   `extract-translation-source-files.yml` clones this repo, runs `make
   extract_translations` and commits the resulting `transifex_input.json`;
   consumers pull the translated files from there with atlas. The old
   target got there in two steps, `formatjs extract` into
   `temp/babel-plugin-formatjs/*.json` via frontend-build's formatter, then
   frontend-platform's `transifex-utils.js` concatenating that into the
   `{ id: defaultMessage }` file. `transifex-utils.js` is a `bin` of
   `@edx/frontend-platform`, which the final commit removes, so the concat
   step would have broken then. frontend-base dropped the same step by
   having its formatter emit the final shape straight to `--out-file`
   (`tools/cli/openedx.ts`, `tools/cli/utils/formatter.ts`); this repo now
   does the same. Verified against openedx-translations' committed file:
   same 146 ids and values, order-insensitive (ours is sorted by id, as
   frontend-base's output is). `pull_translations` (`tx pull`), the
   `tx_url*` / `transifex_langs` variables and `.tx/config` were leftovers
   from before the atlas migration that nothing ran; removed.

## Commit 0b — consumer-facing backend mock as `@edx/frontend-lib-special-exams/testing` (`2fcb4e1`, 2026-10-07)

0b.1. **Shipped under `src/testing/`, published as the `./testing` subpath,
   with a `typesVersions` entry for the types.** The runtime path goes
   through the `exports` map (Jest 28+ and webpack 5 honour it). The types
   need `typesVersions` because consumers on `@edx/typescript-config` compile
   with `moduleResolution: "node"`, which ignores `exports` and would look
   for `testing.d.ts` or `testing/index.d.ts` at the package root. The root
   entry keeps its existing `import`-only condition, now spelled under `"."`.
   Verified from learning; see 0b.7.
0b.2. **Plain builders replace the Rosie factories.** `buildExam`,
   `buildAttempt`, `buildProctoringSettings`, `buildExamAccessToken` carry
   the same defaults as the library's own `src/data/__factories__`, so
   `dist/testing` needs no runtime dependency beyond the library's; the
   library's own tests keep Rosie untouched. The payload interfaces end in
   an index signature because the endpoints return fields the defaults do
   not list (`passed_due_date`, `use_legacy_attempt_api`,
   `attempt_ready_to_resume`) and a scenario must be able to set them.
0b.3. **The mock takes its base URLs as a parameter; nothing under
   `src/testing` imports `@edx/frontend-platform`.** The first cut read
   `LMS_BASE_URL` / `EXAMS_BASE_URL` from `getConfig()`, as the library's
   own code still does, which made a consumer-facing helper depend on the
   package v5 exists to drop and would have been rewritten in commit 2.
   Instead `mockSpecialExams(axiosMock, courseId, { lmsBaseUrl,
   examsBaseUrl })` takes the same two values, named as the provider's
   config will name them, so a consumer passes one config object to both;
   `examsBaseUrl` unset or empty means the LMS `edx_proctoring` family
   only. 0b is final as committed; commit 2 does not touch it.
0b.4. **`axios-mock-adapter` and `axios` are type-only imports in the
   shipped code and not dependencies of the package.** A consumer calling
   the mock has an adapter instance to pass in, so both are installed where
   the types are read; declaring an optional peer was left for the
   dependency commit (6) to decide. `axios` is added as a devDependency
   (pinned, as the others are) because the mock's own test now builds its
   adapter on a plain axios instance rather than frontend-platform's
   authenticated client; the lock change is the one-line root entry.
0b.5. **The mock and its 11-case test are learning's `src/tests/mockSpecialExams.ts`
   and `.test.ts` moved here**, with the Rosie calls swapped for the
   builders, the config reads replaced by the parameter, and one test
   title losing the word "ported". Learning's swap layer deletes its
   copies, imports from the subpath, and passes its config values at the
   one call site in `mockCourseRequests`.
0b.6. **README gains a "Testing" section** showing the registration and
   `setExam` call with the base URLs and naming what the mock answers.
0b.7. **Verified from frontend-app-learning before moving on.** With two
   uncommitted edits in learning, `src/setupTest.js` importing
   `mockSpecialExams` from `@edx/frontend-lib-special-exams/testing` instead
   of `./tests/mockSpecialExams` and the call in `mockCourseRequests`
   passing `{ lmsBaseUrl: getConfig().LMS_BASE_URL, examsBaseUrl:
   getConfig().EXAMS_BASE_URL }`, the two suites that drive the library
   (`Sequence.specialExams.test.tsx`, `TabWithTimer.test.tsx`; 86 tests)
   were run twice. (1) Against the library source through learning's local
   `module.config.js` alias (its Jest block maps `^pkg/(.*)$` to
   `../frontend-lib-special-exams/src/$1`, so the subpath lands on
   `src/testing/index.ts`): 86 pass. (2) Against `npm pack`'s tarball
   installed with `npm install --no-save`, the alias file moved aside so
   `node_modules` is what resolves: 86 pass, and `npm run types` is clean,
   which is the proof of `typesVersions` under learning's
   `moduleResolution: "node"`. Run (2) needed learning's committed Jest
   mapper for the package anchored (`'^@edx/frontend-lib-special-exams$'`);
   unanchored, it also matches the `/testing` subpath and resolves it to
   `dist/index.js`. That anchor is the swap layer's change. Afterwards
   learning was restored: setup file and mapper reverted, alias file back,
   `node_modules` reinstalled at the locked 4.1.0.
0b.8. **The payload builders are called with no overrides** in
   `mockSpecialExams.test.ts`, "payload builders › build the default payloads
   when given no overrides" (coverage review 2026-10-09, after Codecov flagged
   #176's patch: every uncovered line was live behaviour, so each gained a
   test in the commit that introduced it).

## Commit 1 — drop FPF, slot → component prop (`6301a85`, 2026-10-07)

1. **The override travels by a library-internal context, not by prop
   drilling.** The one consumer, `SubmittedExamInstructions`, is five
   components below `SequenceExamWrapper`; drilling would add a pass-through
   prop and `propTypes` entry to `ExamWrapper`, `Exam`, `Instructions` and
   `SubmittedExamInstructions` for a value none of them reads. The wrapper
   provides `SequenceExamContext` (`src/core/SequenceExamContext.jsx`, read
   with `useSequenceExam()`); commits 3–5 hand the subtree the sequence's
   exam identity and the two client-state values through the same context,
   so it starts here with one value and grows into that. Not exported; hosts
   see only the prop. The library had this shape before 2024
   (`ExamStateContext`).

2. **The context's default is `{}`, not a throw.** The plan said the hook
   would throw outside the provider. The library's own tests render
   `Instructions`, `SubmittedExamInstructions` and the pages in isolation
   without the wrapper (34 such renders across `Instructions.test.jsx` and
   siblings), and `OuterExamTimer`'s tree never provides the context and
   never reaches the submitted page. An empty default lets every component
   keep rendering with the default heading; the override is simply absent.
   Revisit in commit 3 if the exam identity has to be present for a
   component to render at all.

3. **Prop `submittedTimedExamInstructions`, a component rendered with
   `{ timeIsOver }`.** camelCase like the wrapper's other props; a component
   rather than a render function because what replaces a slot is a
   component, and learning passes its slot component straight through. One
   prop, not a `components` map: the slot was the library's only
   customisation point and its being in the library is what is being undone
   (plan-2018 D5).

4. **`timeIsOver` is read where the override is rendered.** The old slot
   component read `state.specialExams.timeIsOver` itself;
   `SubmittedExamInstructions` now reads it (same `useSelector`, same
   `|| false` default) and passes it to whichever component it renders, so
   the default `SubmittedTimedExamInstructions` is a plain presentational
   component with `timeIsOver` as a required prop. The `data-testid`
   `exam.submittedExamInstructions.title` is kept on the default heading;
   consumers' tests may target it.

5. **The slot's README and screenshots are not carried in this repo.** They
   describe FPF configuration the library no longer offers. Learning takes
   the slot id, the README and the screenshots from this repo's `v4.1.0`
   history in its swap layer (openedx/frontend-app-learning#2018). The
   README's "Plugins" section becomes "Customization", describing the prop.

6. **`@openedx/frontend-plugin-framework` stays listed, unused, until the
   dependency-removal commit.** Uninstalling it here flipped 1,565 `"dev"`
   flags in the lock (its subtree's packages became dev-only), burying the
   code diff. All dependencies that become unused across the PR (FPF,
   frontend-platform, the redux packages) leave in one commit at the end
   with one lock regeneration (settled 2026-10-07).

7. **Commit message `feat!:` with a `BREAKING CHANGE:` footer.** The repo
   releases with semantic-release's commit analyser on `main`; the footer
   names the removed slot id, the new prop and what a host does instead. How
   the PR is merged (squash vs merge commit) decides whether this footer or
   the squash message carries the major; checked before merge.

## Commits 1a and 1b — two fixes found while planning the mutations commit (2026-10-08)

Each is a failing-tests commit followed by the fix, so the pass/fail
evidence is in the history: 1a `857a6a8` → `0cc4945`, 1b `21e9dbb` → `98b6d25`.

1a.1. **`skipProctoringExam` sends the create request with the arguments
   `createExamAttempt` takes.** The call was `createExamAttempt(exam.id,
   true, false, useLegacyAttemptApi)`, the order from before #96
   (2023-04-07) inserted `legacyAttempt` as the second parameter and only
   appended the flag here. Against `(examId, legacyAttempt, startClock,
   attemptProctored)` it forced the LMS endpoint for every backend with
   `start_clock: "false"`, and sent `attempt_proctored: "true"` for a legacy
   exam on an edx-exams host. edx-proctoring's create view declines a
   proctored exam's new attempt only when `attempt_proctored` is false
   (`start_clock` is then ignored); edx-exams ignores `attempt_proctored`
   and honours `start_clock`. The fix restores the pre-#96 call,
   `createExamAttempt(exam.id, useLegacyAttemptApi)`, defaults carrying
   `start_clock: "true", attempt_proctored: "false"`. On a pure-LMS host
   the flag is absent, so `attempt_proctored` defaulted to `"false"` by
   accident and only `start_clock` was wrong, which edx-proctoring ignores
   there; the real failures are edx-exams hosts. Unreachable from learning
   today (openedx/frontend-app-learning#2162: the opt-out flag is never sent); documented there rather
   than in a library issue, because the fix must ship before or with the
   platform change that makes the button appear.
1a.2. **The tests assert the POST's URL and body.** The existing skip tests
   mock the refetch and check only the status it returns, so they passed
   with the request going to an unmocked URL: `updateAttemptAfter` routes
   the rejection to `setApiError` and re-fetches anyway. Three cases now
   pin the request: legacy host, edx-exams host, and a legacy exam on an
   edx-exams host.
1b.1. **`startProctoredExam` reads `attempt.use_legacy_attempt_api`.** It
   read `exam.useLegacyAttemptApi`, a camelCase name no payload has: the
   exam is stored raw and snake_case (`camelCaseObject` has never appeared
   in the repo), and the spelling is the local-variable name #101 used one
   file over, written against the object by #108 (2023-05-16). The guard
   was always true, so a legacy exam without a desktop worker also posted
   `['exam_state_change', 'exam_take']` to the top window. Reachable change:
   it no longer does. A GitHub code search finds no sender or listener for
   the message in any Open edX repo besides this library; its consumer is
   Proctorio's browser extension, an edx-exams LTI provider, and Proctorio
   is not an edx-proctoring backend (RPNow, a generic REST backend, mock,
   null). edx-proctoring sets `use_legacy_attempt_api: True` on its own
   payloads, so pure-LMS hosts are covered by the fix too. Carried-vs-fixed
   was weighed against "no reachable behaviour change in the refactor PR";
   fixed because the evidence shows nothing depends on the extra message.
1b.2. **The test is the legacy mirror of #108's.** #108's test asserts the
   message is sent for an LTI exam, which an unconditional send passes. The
   new case continues a `use_legacy_attempt_api` attempt through the
   edx-proctoring endpoint (a PUT, which the sibling test mocks as a POST
   and never notices because `updateAttemptAfter` tolerates the 404) and
   asserts no message.
1c. **`expireExam`'s `activeAttempt.course_id` is carried.** The ids can
   only differ across courses and the attempt is fetched per course, so no
   observable effect; one sentence in the PR.

## Commit 2 — mutations: the attempt actions become `useMutation` hooks (`ac7cc57`, 2026-10-08)

Decisions 1–5 were settled in `plan-175.md` before the work; 2.1–2.5 record
them as built, 2.6 onward what building it decided.

2.1. **React peer `^18.0.0`.** React Query 5 needs React 18 or later, which
   rules out the lib's `^16.14 || ^17`; the first cut copied React Query's
   own `^18 || ^19`, but no host allows 19 (frontend-platform 8 peers on
   `^16.9 || ^17 || ^18`, frontend-base on `^18.3.1`, Paragon 23 on
   `^16.8.6 || ^17 || ^18`), so the peer says what the hosts support.
   `@tanstack/react-query` peer `^5.0.0`, devDependency pinned at 5.90.19
   (learning's version). The lock change is the one new package plus the
   root entry's peer ranges.
2.2. **Spinner through `useIsMutating`, not a slice write.** Every hook keys
   its mutation `['specialExams', 'attempt', <action>]`; `onSettled` returns
   the re-fetch's promise so the mutation stays pending until the exam is
   back. `Exam.jsx` reads the slice flag as `isExamLoading`, computes
   `isMutating = useIsMutating({ mutationKey: specialExamsMutationKey }) > 0`
   (the key prefix exported from `data/mutations.ts`), and its `isLoading`
   becomes `isExamLoading || isMutating`; the `if (isLoading)` spinner line
   is unchanged. A first cut wrapped the `useIsMutating` call in an
   exported `useIsAttemptActionPending()` hook; dropped in review
   (2026-10-08) as an invented name for one caller. The hook test pins the
   window: mutating before the request leaves, still mutating after the
   POST is recorded, not once the re-fetch lands. In commit 3
   `isExamLoading` becomes the exam query's pending state and the line
   stays.
2.3. **1a and 1b landed first; 1c is carried.** `useExpireExam` passes
   `refetchArgs: () => [activeAttempt.course_id, exam.content_id]` under
   the thunk's own "this sure looks like a bug" comment.
2.4. **`startProctoringSoftwareDownload` deleted** with its `data/index.js`
   export and its two tests. The download page's direct
   `softwareDownloadAttempt` call is untouched.
2.5. **Listener leak fixed**: `onLimitReached` is a named arrow beside the
   other three, used by `once` and `off`; the effect's deps become `[]`
   (there is no `dispatch` to list). Test: mount, unmount, mount again,
   emit `TIMER_LIMIT_REACHED`, one `expireExam.mutate()`.
2.6. **`useAttemptAction` reproduces `updateAttemptAfter`'s rule exactly,
   including the re-fetch after a failed request.** Today's `catch` sets
   the error message and clears the spinner but does not `return`, so the
   re-fetch runs anyway and the message stays on the refreshed page. The
   hook's `onSettled` re-fetches when `error || response?.exam_attempt_id`
   and does nothing when `run` returned `undefined`. Carried as behaviour,
   not fixed: a reviewer may prefer no re-fetch after an error, and that is
   a one-line change in one place now.
2.7. **Branches that bypass `updateAttemptAfter` today handle their own
   errors inside `run` and return `undefined`**, the "nothing to re-fetch"
   signal: the missing-id bails (`useFailAction`: `logError`, plus
   `setApiError` where the thunk set one), the other-sequence `stop` /
   `submit` (request, `window.location.href`, no re-fetch; a rejection
   becomes `apiError` only), and `startProctoredExam`'s worker failure
   (`logError` with the attempt details, the fixed message, no re-fetch).
   `submitExam`'s worker notification runs after the re-fetch via `after`,
   as the thunk ran it after `updateAttemptAfter`; `expireExam`'s `after`
   dispatches `expireExamAttempt()` then notifies, in the thunk's order.
2.8. **Payload interfaces live in `src/data/types.ts`.** `testing/payloads.ts`
   imports and re-exports them, so 0b's public surface is unchanged.
   `use_legacy_attempt_api` (exam and attempt) and `external_id` (attempt)
   are added as optional fields; the hooks read them and the index
   signature typed them `unknown`.
2.9. **Hooks are exported through `data/index.js`** (`export * from
   './mutations'`), so components keep importing from `../../data` and
   tests keep stubbing that one module. Stub shape: `useX: () => ({ mutate:
   mockX })`, assertions on `mockX`; the three practice-exam tests drop
   their `react-redux` `useDispatch` mock, which existed only to capture
   the dispatched thunk. `Instructions.test.jsx`,
   `ProctoredExamInstructions.test.jsx` and `OuterExamTimer.test.jsx`, whose
   `jest.mock('../data')` factories listed only thunks, now list every hook
   the pages under them call. Those factories replace the module wholesale,
   so the thunks they omitted were `undefined` too, harmlessly: a thunk is
   only read inside a click handler or an `Emitter.once` callback, and those
   tests never click or emit. A hook is called during render, so an omitted
   one throws on the first render; `() => ({ mutate: jest.fn() })` is the
   smallest thing a hook can return that the component can hold without
   calling, in the style the files already use for `Emitter`. Spreading
   `jest.requireActual('../data')` and running the real hooks against the
   test `QueryClientProvider` would also work; kept the files' own style
   (confirmed in review 2026-10-08). Jest requires closed-over names in a
   `jest.mock` factory to start with `mock`.
2.10. **`ExamTimerBlock` calls its three hooks where `useDispatch` was,
   above the existing early return.** The conditional `useEffect` below the
   return, with its rules-of-hooks disable, is untouched.
2.11. **The hook tests replace the thunk tests' `window` spy with targeted
   stubs.** `redux.test.jsx` swapped `window` for `{ top: { postMessage } }`
   or `{ Worker }`; nothing rendered there, so it worked. Under `renderHook`
   React reads `window` during commit and that spy breaks every render
   after it. `postMessage` is spied on the window itself (jsdom's
   `window.top` is the window), and `window.Worker` is defined for one test.
   Each global stub pushes its undo onto a `cleanups` list that `afterEach`
   drains, so a failed assertion cannot leak a stub into the next test (the
   thunk tests restored `window.location` on the test's last line, which a
   failure skips); no `jest.restoreAllMocks()`, which in Jest 29 restores
   spies only and would have left the file leaning on that detail (review,
   2026-10-08).
2.12. **Ported assertions say what they mean.** The thunk tests' snapshot
   of the started attempt becomes `toMatchObject({ attempt_id,
   attempt_status: 'started' })`; the six action snapshots are removed from
   `redux.test.jsx.snap`; the moved cases also assert the request count,
   URL and body where the thunk tests only checked the status the mocked
   re-fetch returned. The hook tests' `state()` is typed against the
   payload interfaces because the JavaScript slice's state is inferred from
   its initial values (`activeAttempt: null`). `runAction` lets a rejected
   `mutateAsync` propagate rather than swallowing it (review, 2026-10-08);
   the one network-error case asserts the rejection itself. Dropping the
   catch exposed that the four "Should use legacy endpoint" cases never
   mocked the request whose URL they assert: the thunk versions passed on a
   404 that `updateAttemptAfter` swallowed. They now mock it.
2.13. **Test setup**: `createTestQueryClient()` (`retry: false`) and a
   `queryClient` render option in `src/setupTest.js`; `render` wraps a
   `QueryClientProvider` inside the store `Provider`. Learning's render
   already provides a client, which is the host-client design.
2.14. **Result**: lint, `types`, build clean; 34 suites, 378 tests, 382 after
   the coverage review's cases (0b.8, 2.16) (363 at
   baseline; +11 mock, +3 fixes, +42 hook cases replacing 40 thunk cases,
   +1 spinner, +1 leak); 97.56% statements (97.27% at baseline);
   learning's 97 exam tests against the source, which exercise the real
   hooks through learning's own `QueryClient`.
2.15. **Every case removed from `redux.test.jsx` and where it went.** 43
   removed: 41 moved to `mutations.test.tsx` under the hook's `describe`
   with the same `it` name, 2 deleted with the uncalled thunk; 1 new case
   (`specialExamsMutationKey › counts an action as mutating from the call
   until the refetch after it has landed`). The six entries pruned from
   `redux.test.jsx.snap` were the snapshots of those cases, marked below.

   | Removed (`redux.test.jsx` describe › it) | Replacement | Changed on the way |
   |---|---|---|
   | Test startTimedExam › with edx-proctoring as a backend (no EXAMS_BASE_URL) › Should create and start exam | `useStartTimedExam` › same name | snapshot → `toMatchObject` on the started attempt |
   | Test startTimedExam › Should create and start exam | `useStartTimedExam` › same name | snapshot → `toMatchObject` |
   | Test startTimedExam › Should use legacy endpoint if use_legacy_attempt_api set on exam | `useStartTimedExam` › same name | now mocks the legacy POST; the thunk version passed on a swallowed 404 |
   | Test startTimedExam › Should fail to fetch if no exam id | `useStartTimedExam` › same name | also asserts no request was made |
   | Test stopExam › with edx-proctoring … › Should stop exam, and update attempt | `useStopExam` › same name |  |
   | Test stopExam › with edx-proctoring … › Should stop exam, and redirect to sequence if not in exam section | `useStopExam` › same name | also asserts no re-fetch |
   | Test stopExam › Should stop exam, and update attempt | `useStopExam` › same name |  |
   | Test stopExam › Should stop exam, and redirect to sequence if not in exam section | `useStopExam` › same name |  |
   | Test stopExam › Should use legacy endpoint if use_legacy_attempt_api set on attempt | `useStopExam` › same name | now mocks the legacy PUT; same |
   | Test stopExam › Should fail to fetch if error occurs | `useStopExam` › same name |  |
   | Test stopExam › Should fail to fetch if no active attempt | `useStopExam` › same name |  |
   | Test continueExam › with edx-proctoring … › Should return to exam, and update attempt | `useContinueExam` › same name |  |
   | Test continueExam › Should return to exam, and update attempt | `useContinueExam` › same name |  |
   | Test continueExam › Should fail to fetch if no attempt id | `useContinueExam` › same name | also asserts no request was made |
   | Test resetExam › with edx-proctoring … › Should reset exam attempt | `useResetExam` › same name | store snapshot → `toMatchObject` on the attempt and `activeAttempt` null |
   | Test resetExam › Should reset exam attempt | `useResetExam` › same name | store snapshot → same |
   | Test resetExam › Should fail to fetch if no attempt id | `useResetExam` › same name | also asserts no request was made |
   | Test submitExam › with edx-proctoring … › Should submit exam, and update attempt and exam | `useSubmitExam` › same name | also asserts the PUT URL and body |
   | Test submitExam › Should submit exam, and update attempt and exam | `useSubmitExam` › same name |  |
   | Test submitExam › Should fail to fetch if no attempt id | `useSubmitExam` › same name | also asserts no request was made |
   | Test submitExam › Should submit exam and redirect to sequence if no exam attempt | `useSubmitExam` › same name |  |
   | Test submitExam › Should use legacy endpoint if use_legacy_attempt_api set on exam | `useSubmitExam` › same name | now mocks the legacy PUT; same |
   | Test expireExam › with edx-proctoring … › Should expire exam, and update attempt | `useExpireExam` › same name |  |
   | Test expireExam › Should submit expired exam, and update attempt | `useExpireExam` › same name |  |
   | Test expireExam › Should fail to fetch if no attempt id | `useExpireExam` › same name | also asserts no request and `timeIsOver` unchanged |
   | Test startProctoringSoftwareDownload › with edx-proctoring … › Should start downloading proctoring software, and update attempt and exam | deleted | the thunk had no caller (decision 2.4) |
   | Test startProctoringSoftwareDownload › Should start downloading proctoring software, and update attempt and exam | deleted | same |
   | Test createProctoredExamAttempt › with edx-proctoring … › Should create exam attempt, and update attempt and exam | `useCreateProctoredExamAttempt` › same name | also asserts the POST body |
   | Test createProctoredExamAttempt › Should create exam attempt, and update attempt and exam | `useCreateProctoredExamAttempt` › same name | also asserts the POST URL |
   | Test createProctoredExamAttempt › Should use legacy endpoint if use_legacy_attempt_api set on exam | `useCreateProctoredExamAttempt` › same name | now mocks the legacy POST; same |
   | Test createProctoredExamAttempt › Should fail to start if no attempt id | `useCreateProctoredExamAttempt` › same name | also asserts no request was made |
   | Test startProctoredExam › with edx-proctoring … › Should start exam, and update attempt and exam | `useStartProctoredExam` › same name | snapshot → `toMatchObject`; mocks the PUT the thunk test mocked as a POST |
   | Test startProctoredExam › Should start exam, and update attempt and exam | `useStartProctoredExam` › same name | snapshot → `toMatchObject`; same PUT correction |
   | Test startProctoredExam › Should fail to fetch if no exam id | `useStartProctoredExam` › same name | also asserts no request was made |
   | Test startProctoredExam › Should log an error on worker failure | `useStartProctoredExam` › same name | also asserts the error message and no request; `window.Worker` stub instead of the `window` spy |
   | Test startProctoredExam › Should notify top window on LTI exam start | `useStartProctoredExam` › same name | `postMessage` spy instead of the `window` spy |
   | Test startProctoredExam › Should not notify top window on legacy exam start (1b) | `useStartProctoredExam` › same name | same |
   | Test skipProctoringExam › with edx-proctoring … › Should create exam attempt with declined status, and update attempt and exam (1a) | `useSkipProctoringExam` › same name |  |
   | Test skipProctoringExam › with edx-proctoring … › Should change existing attempt status to declined, and update attempt and exam | `useSkipProctoringExam` › same name | also asserts the PUT body |
   | Test skipProctoringExam › Should create exam attempt with declined status, and update attempt and exam (1a) | `useSkipProctoringExam` › same name |  |
   | Test skipProctoringExam › Should create the declined attempt on edx-proctoring for a legacy exam (1a) | `useSkipProctoringExam` › same name |  |
   | Test skipProctoringExam › Should change existing attempt status to declined, and update attempt and exam | `useSkipProctoringExam` › same name |  |
   | Test skipProctoringExam › Should fail to start if no attempt id | `useSkipProctoringExam` › same name | also asserts no request was made |
2.16. **Five more cases** (coverage review 2026-10-09, after Codecov flagged
   #176's patch: every uncovered line was live behaviour, so each gained a
   test in the commit that introduced it): `useStopExam` and `useSubmitExam`
   "Should show the error and stay if … fails outside the exam section" (the
   redirect branch's `catch`), `useSubmitExam` "Should show an error when the
   proctoring app does not confirm the submission" (the worker notification's
   `catch`), and in `Instructions.test.jsx` the timed start button and the
   skip-proctoring confirm button now click through to their mutation, with
   `jest.clearAllMocks()` added to that file's `beforeEach` so call counts are
   per test.

## Commit 3 — queries: the reads, the poll and the two effects (`597f9a9`, 2026-10-09)

Decisions 1–8 were settled in `plan-175.md` before the work; 3.1–3.8 record
them as built, 3.9 onward what building it decided.

3.1. **Exam identity in the context.** `SequenceExamContext` (now `.tsx`,
   typed `SequenceExam`) carries `{ courseId, sequenceId, isTimeLimited,
   allowProctoringOptOut, submittedTimedExamInstructions }` from
   `SequenceExamWrapper`, now `.tsx` with a `SequenceExamWrapperProps`
   interface in place of `propTypes` (review 2026-10-09: the first cut
   added `propTypes` shapes for the new reads); `courseId` and `sequence`
   are required there. `OuterExamTimer` provides `{ courseId }` alone.
   `getAllowProctoringOptOut`, `setAllowProctoringOptOut` and the slice
   field are gone (decision 1).
3.2. **One owner per page, readers at `enabled: false`.** `ExamWrapper`
   mounts `useExamQuery(courseId, sequence.id, { enabled:
   !!sequence.isTimeLimited, refetchOnMount: 'always' })` and
   `useActiveAttemptQuery(courseId, { enabled: !sequence.isTimeLimited,
   refetchOnMount: 'always' })`; `OuterExamTimer` mounts the attempt query
   the same way. Every other reader (`useExam`, `useActiveAttempt`,
   `useIsExamLoading`, `useIsExam`, `useProctoringSettings`, the public
   hooks) observes the same key with `enabled: false`, so a page sends one
   exam (or attempt) request per mount however many components read it.
   `staleTime: Infinity` on the query options keeps the cache from
   refetching under the readers; `refetchOnMount: 'always'` on the owner is
   what re-fetches on every sequence mount, as the thunk did. `useExamState`
   picks the exam query under a time-limited context and the attempt query
   otherwise (decision 2); `useActiveAttempt` derives `timer_ends` on read
   (3.16).
3.3. **The poll is a query.** `usePollQuery(enabled)` on
   `specialExamsQueryKeys.poll(attemptId)`: `refetchInterval: 60_000`,
   `refetchIntervalInBackground: true` (decision 3), `staleTime: 0`,
   `gcTime: 0`, enabled while the attempt is started. `TimerProvider`
   passes `!inGracePeriod`, so the poll stops once the ticker passes zero,
   where the ticker used to fire `pollAttempt` on tick 0 and every 60th.
   An effect on `dataUpdatedAt` patches the owner key
   (`time_remaining_seconds`, `attempt_status`) and clears `apiErrorMsg`;
   `submitted` / `error` dispatch `expireExamAttempt` and invalidate the
   exam state. `usePingAttempt(endExamWithFailure)` keeps the ticker's
   cadence. `TimerProvider.test.jsx` mocks `usePollQuery` and asserts it
   is enabled while the exam runs and disabled in the grace period; its
   "when the poll interval is reached (1 minute)" case (a poll on render,
   then one per minute) moved to `queries.test.tsx` as "polls again every
   minute while the exam runs", which advances fake timers through two
   intervals against the request history (added in review 2026-10-09; the
   first cut had dropped the cadence assertion).
3.4. **`placeholderData` for the settings** (decision 4):
   `useProctoringSettingsQuery` returns `defaultProctoringSettings` until
   the fetch lands. `Exam.jsx` owns that query (`enabled` for the three
   proctored types with an id) and reports its error through
   `useReportQueryError`, which dispatches `setApiError` where
   `handleAPIError` did; `ExamWrapper` and `OuterExamTimer` report their
   owner queries the same way.
3.5. **A non-exam sequence never asks for the exam** (decision 5): the exam
   query is disabled there and the attempt query runs instead, so the
   in-course timer shows from a fetch of its own, `useIsExam()` is false,
   and nothing is left over from an earlier exam sequence. Learning's
   non-exam case "asks for the exam once" becomes "asks for the latest
   attempt once and never for the exam" (plan-2018, learning side).
3.6. **`useCheckExamEntry(examQuery, endExamWithFailure)`** runs once per
   mount, after that mount's fetch has completed (`data` present and
   `isFetching` false), with `mounted` / `timeout` refs so a later refetch
   or a cached-then-refreshed mount cannot probe twice (decision 6). The
   probe now leaves in the same React commit that renders the fetched
   instructions, where the thunk sent it before React rendered anything;
   milliseconds in a browser, but one learning test raced on it
   (plan-2018).
3.7. **Public hooks in `src/apiHooks.ts`** (decision 7; `src/api.js` renamed
   in review 2026-10-09 so the consumer-facing hooks no longer share a
   name with `data/api.js`, the backend functions): `useIsExam()` is the
   queries' hook (the exam query for the enclosing sequence has an id);
   `useExamAccessToken()` → `{ accessToken, isPending: query.isFetching }`
   with `logError` on failure, from `useAccessTokenQuery(examId)`
   (`enabled: !!examId && !!EXAMS_BASE_URL`, `refetchOnWindowFocus: false`
   and `refetchOnReconnect: false`); `useFetchExamAccessToken`
   is removed. This commit's message carries the `BREAKING CHANGE` footer.
   **`isPending` is fetch-aware** (review 2026-10-09, amended into this
   commit): the first cut returned `query.isLoading`, which is false
   whenever the cache holds a token. `Unit` remounts per unit id, so on the
   second exam unit the iframe rendered at once with the previous unit's
   token and reloaded when the fresh one arrived; v4's `useExamAccess`
   hid each unit until its own fetch finished. `isFetching` restores that
   wait. Because `isFetching` would also flip during any background
   refetch and hide the unit mid-exam, the token query refetches neither on
   focus nor on reconnect, so the only fetch is the one on mount, as in v4.
   `apiHooks.test.jsx` "useExamAccessToken should stay pending while a
   cached token is refreshed" and `queries.test.tsx` "does not refetch the
   token when the network reconnects" pin both; each fails without its
   half of the change. **Retries stay the host's** (settled in review
   2026-10-09): the token query sets no `retry`, so it inherits the host
   `QueryClient`'s policy; learning's retries 5xx and network errors up to
   three times (about 7 s of backoff) and never 4xx. `isFetching` holds the
   unit through those retries, where v4 made one attempt and unblocked when
   it settled, so during an outage a unit stays hidden about 7 s longer, and
   a transient failure can recover with a fresh token where v4 would have
   rendered a refused one. Either way, on failure the iframe renders with
   the token already held (the previous unit's, or none), exactly as v4's
   slice did, and `render_xblock`'s token check decides what is served, so
   nothing becomes visible that v4 would not have shown. `retry: false` for
   strict parity was considered and not taken.
3.8. **Tests seed the cache through `render`, explicitly** (decision 8,
   reshaped in review 2026-10-09). `src/setupTest.js` has
   `createTestQueryClient()`, `seedSpecialExams(queryClient, fixture)` and
   `render(ui, { store, queryClient, specialExams })`, the split learning's
   `initializeStore` / `createTestQueryClient` / `seedQueryData` make.
   `seedSpecialExams` writes the factory fixture to the exam key and to the
   settings, token and review-policy keys (`exam?.course_id ??
   defaultExam.course_id`, `exam?.id ?? defaultExam.id`; the fixtures keep
   `reviewPolicy` on the exam, so it is read from there) and returns the
   context value `{ courseId, sequenceId, isTimeLimited: true,
   allowProctoringOptOut }` that `render` provides. `initializeTestStore`
   is redux only: it takes slice-shaped client state (`{ specialExams: {
   timeIsOver, apiErrorMsg } }`), and `render` builds a fresh store when a
   test passes none. The first cut had `initializeTestStore(preloadedState)`
   stash the whole fixture for the next `render` to seed, so the store
   helper carried query data under a module-level variable; review
   rejected that as non-redux state in the test store. Call sites: a test
   passes `{ specialExams: fixture }` to `render`, the 13 sites that
   preload client state pass `store: initializeTestStore({ specialExams: {
   timeIsOver: true } })` beside it, and fixtures that repeat within a file
   are one named constant at describe level (`practiceExam`,
   `submittedExam`, `proctoredExam`, `examWithOptOut`, …) rather than a
   copy per test. 17 test files convert their 148 `store.getState = () =>
   …` sites this way.
3.9. **`queryKeys.ts` and `defaults.ts` are their own modules** because
   `setupTest.js` imports them: a setup file that imported `queries.ts`
   would load `api.js` and `mutations.ts` before a test file's `jest.mock`
   of either could apply.
3.10. **`useIsExamLoading` is `!!isTimeLimited && (isPending ||
   isFetching)`**, not the query's `isLoading`. The first cut used
   `isLoading`, and the first render of an exam sequence showed the entrance
   page for the default exam before the spinner: with `refetchOnMount:
   'always'` over a cached key the query is fetching but not pending. The
   spinner must cover any fetch on an exam sequence and never show on a
   non-exam one, so the hook says exactly that.
3.11. **`useAttemptAction` invalidates instead of re-fetching.** Its
   `refetchArgs` becomes `refetchKey?: () => QueryKey` and `onSettled`
   calls `queryClient.invalidateQueries`, which refetches the page's owner
   observer and marks the rest stale; `useExpireExam`'s key is built from
   `activeAttempt.course_id` (1c, carried, comment kept).
   `useEndExamWithFailure` joins `mutations.ts` for the two effects
   (3.15). `apiHooks.test.jsx` keeps the
   public-hook cases one to one, including the two that were about the
   removed `useFetchExamAccessToken`: with an exam and no cached token,
   `useExamAccessToken` is pending and then holds the token after one
   request; without an exam it makes no request (review, 2026-10-09).
3.12. **Deleted**: `thunks.js`, `utils.js`, `redux.test.jsx` and its
   snapshot (the read cases live in `queries.test.tsx`, 29 cases; the
   action cases moved in commit 2). The slice keeps `timeIsOver`,
   `apiErrorMsg`, `expireExamAttempt` and `setApiError`.
3.13. **Hook-test hygiene in `queries.test.tsx`**: the entry-check cases
   post a probe that a later test's listener could answer, so an
   `afterEach` answers every outstanding probe; the tests stub
   `window.postMessage` and `window.Worker` rather than spy on `window`,
   which breaks `renderHook`.
3.14. **Suite**: 34 suites, 387 tests, 98.18 % statements; lint, types and
   build clean. Learning's exam tests, run from this source with a local
   `useExamAccess` of the swap layer's shape (`{ blockAccess: isExam &&
   isPending }`), pass 79 of 79 with the five test adaptations recorded in
   plan-2018: four follow from decisions 5, 6 and 7 and the token gate; one
   is a fake-timer hazard in learning's test environment that this commit
   exposed and that is learning's to fix.
3.15. **`useEndExamWithFailure` takes its arguments and is handed to the
   effects.** The error PUT (`endExamWithFailure` in `data/api.js`:
   `updateAttemptStatus` with `action: 'error'` and the message as
   `detail`) had no thunk of its own; `pingAttempt` and `checkExamEntry`
   each called it inside `updateAttemptAfter`. It is now one
   `useAttemptAction` mutation like the learner-triggered actions, so it
   gets the same follow-through (invalidate the page's exam state after a
   response with an attempt id or an error; the error message through
   `useApiError`). Unlike the other hooks it does not read the exam
   itself: its two callers end different attempts with different
   arguments. `usePingAttempt` ends the active attempt with the worker's
   message (or "Worker failed to respond.") and the exam attempt's
   `use_legacy_attempt_api`; `useCheckExamEntry` ends the sequence's exam
   attempt with "exam reentry disallowed" and `useLegacyAttemptAPI:
   false`, as the thunk hard-coded. So `mutate({ attemptId, message,
   useLegacyAttemptAPI })` carries the three arguments the thunks passed,
   one to one. The effects live in `queries.ts`, which `mutations.ts`
   imports for its reads, so they take the mutation as a parameter
   (`ExamWrapper`: `useCheckExamEntry(examQuery, useEndExamWithFailure())`;
   `TimerProvider`: `usePingAttempt(useEndExamWithFailure())`) rather than
   import it back and form a cycle; the parameter is typed as the small
   `EndExamWithFailure` interface (`mutate` with those variables), not the
   full mutation result.
3.16. **`timer_ends` is derived on read from `dataUpdatedAt`, not stamped
   on write.** The server sends only `time_remaining_seconds`; the ticker
   needs a fixed deadline. `appendTimerEnd` (`helpers.js`) gave it one by
   stamping `timer_ends = now + time_remaining_seconds` on every attempt
   the slice stored (`setExamState` after a fetch, `setActiveAttempt`
   after a poll). React Query records when data was stored as the query's
   `dataUpdatedAt`, so `withTimerEnd(attempt, dataUpdatedAt)` in
   `queries.ts` does the same arithmetic against that timestamp, with the
   same guard (no `time_remaining_seconds`, no `timer_ends`), and
   `useActiveAttempt` applies it under `useMemo` on `[attempt,
   dataUpdatedAt]` so the object is stable between renders. Both write
   paths still re-anchor: the fetch sets `dataUpdatedAt` when it lands, and
   the poll's patch goes through `queryClient.setQueryData`, which stamps
   `dataUpdatedAt` too. The cache holds the attempt as the server sent it;
   `timer_ends` exists only on what `useActiveAttempt` returns, and
   `TimerProvider` is its one reader. `appendTimerEnd` and its
   `helpers.test.js` cases are deleted; `queries.test.tsx` pins the
   derivation on `useActiveAttempt`.
3.17. **No new `exhaustive-deps` disables; the long-lived effects get
   stable inputs instead** (review 2026-10-09; the first cut had added two).
   `TimerProvider`'s ticker effect must not restart on every render (it
   owns the 1-second interval and the `timerTick` counter the ping cadence
   reads), and it now calls `pingAttempt` where it dispatched a thunk that
   read `getState()` when it ran. So `usePingAttempt` returns a
   `useCallback` with no dependencies that reads the attempt, exam and
   mutation current when the tick fires from a ref an effect refreshes
   each render, the same latest-value-ref pattern the file already uses
   for `deadline`; the ticker lists it as a dependency. `usePollQuery`'s
   effect runs once per poll reply: `useExamStateKey` is memoized on the
   context identity and `useInvalidateExamState` is a `useCallback`, so
   the effect lists everything it uses; the patch passes `{ updatedAt:
   dataUpdatedAt }` to `setQueryData`, so the owner key is dated at the
   poll's reply and `timer_ends` (3.16) re-anchors from the time the
   server answered rather than the time the effect ran. The two
   pre-existing disables (`Exam.jsx`'s `examId` effect,
   `TimerProvider`'s context value) are untouched.
3.18. **Three more cases** (coverage review 2026-10-09, after Codecov flagged
   #176's patch: every uncovered line was live behaviour, so each gained a
   test in the commit that introduced it): the entry check ends the attempt
   when the proctoring app does not answer within 5 s (fake timers), and
   leaves it alone when the sequence unmounts before the app answers (the
   `mounted` guard of 3.6); `useExamAccessToken` logs "Exam access token was
   not granted." when the token is refused.
3.19. **Branch coverage** (coverage review 2026-10-09, second pass: Codecov
   counts a line whose only branch never runs as missed). `useExamQuery`,
   `useActiveAttemptQuery` and `useProctoringSettingsQuery` take `options?:`
   instead of `options = {}`: every caller passes options, so the default was
   a fallback nothing used, and spreading `undefined` is the same as spreading
   `{}`. `useExpireExam` gains a case: it refreshes the course's latest
   attempt when it expires outside an exam sequence, as under `OuterExamTimer`
   (the `activeAttempt` side of the 1c `refetchKey`; `renderAction` now takes
   an optional context and mounts the owner `ExamWrapper` would for it). The
   poll's cache updater is extracted as `withPolledAttempt(data)` and tested
   directly, including that an empty cache entry stays empty: through
   `usePollQuery` that case cannot occur, because the hook reads its attempt
   from the entry it patches, so once the entry is gone the poll moves to a
   disabled key and the patch never runs. A first cut tested it by removing
   the entry mid-poll, which passed without reaching the branch; the guard
   stays because `setQueryData`'s updater is typed to receive `undefined`.

## Commit 4 — own the exam's client state in the sequence context, not a redux slice (`0781870`, 2026-10-09)

Decisions 1–4 were settled in `plan-175.md` before the work; 4.1–4.4 record
them as built, 4.5 onward what building it decided.

4.1. **The client state is scoped to its provider and resets with the
   sequence.** `timeIsOver` and `apiErrorMsg` are `useState` in
   `useExamClientState` (`core/SequenceExamContext.tsx`), called by
   `SequenceExamWrapper` and `OuterExamTimer`, so each is created with the
   sequence (or the outer timer) and gone when it unmounts. **This resolves
   a latent bug**: the slice lived in learning's app store for the page
   session, nothing ever set `timeIsOver` back to `false`, and the only
   write of an empty `apiErrorMsg` was the poll's. In-app navigation stays
   within a course (another course is a full page load), so with two
   timed exams in one course in one session, once the first expired the
   second's submitted page read "The time allotted for this exam has
   expired." however it was submitted (the `submittedTimedExamInstructions`
   override received the same wrong `timeIsOver`), and an error raised on
   one exam sequence stayed on the course's other exam sequences until a
   started attempt's poll succeeded. Messaging only; no request or
   transition read either field. Both now start clean with each sequence.
4.2. **One context.** The state and its setters join `SequenceExamContext`
   beside the identity (`SequenceExam` = `SequenceExamIdentity` +
   `ExamClientState`); both providers spread the hook's value into their
   memoized context value, and the hook memoizes its own value on the two
   fields so the setters (stable from `useState`) do not churn it. The
   re-render cost was weighed in the plan: the exam readers all consume
   this context, but `timeIsOver` changes once per attempt, an error
   already re-renders the page that shows it, and the poll's
   `setApiError('')` every minute sets an unchanged value React bails out
   of. Learning's `SidebarContext` is the same shape.
4.3. **Test seams.** `render(ui, { specialExams, sequenceExam, clientState })`:
   `clientState` seeds the state half, `sequenceExam` overrides identity
   fields (used by the submitted-timed override case, which no longer
   nests its own provider). Both come from `createTestSequenceExam(identity,
   initialClientState)` in `setupTest.js`, a provider with real state
   whose `clientState()` reads what it holds now; the hook tests build
   their wrapper from it and read the state the actions wrote through that
   getter instead of `store.getState()`. Two cases that preloaded state
   into a provider component are gone, each covered elsewhere:
   `SequenceExamWrapper.test` "renders the submittedTimedExamInstructions
   component with timeIsOver instead" now asserts the pass-through with
   the fresh `timeIsOver: false`; the `true` half is
   `SubmittedInstructions.test` "passes timeIsOver to the timed
   instructions" (retitled from "passes the store's timeIsOver …", there
   being no store) and "renders the timed instructions component the
   wrapper provides, with timeIsOver", both under `clientState`.
   `OuterExamTimer.test` "renders error component when apiErrorMsg is
   present" merged into "shows the error when the latest-attempt request
   fails", the behaviour that produces the state. `initializeTestStore`,
   the `store` option, `let store` and the `store.dispatch = jest.fn()`
   stubs are gone from every test.
4.4. **`react-redux`, `redux`, `@reduxjs/toolkit` stay in `package.json`**,
   peers included, unused, until commit 7.
4.5. **Setter shapes.** `setApiError(message: string)` and
   `setTimeIsOver(boolean)` replace `setApiError({ errorMsg })` and
   `expireExamAttempt()`; the hooks pass `message || detail || ''` where
   the thunks stored `message || detail`, which could be `undefined`.
   Readers only test truthiness (`!!apiErrorMsg`, `apiErrorMsg &&`), so
   `''` and `undefined` render the same; the state is typed `string`.
4.6. **Deleted**: `data/slice.js`, the `reducer` export (`data/index.js`,
   `index.jsx`), every `react-redux` import. `README.rst` never
   documented the reducer, so nothing there changes. The `BREAKING
   CHANGE` footer names the removed export.
4.7. **Suite**: 34 suites, 386 tests, 98.18 % statements; lint, types and
   build clean. Learning's exam tests from this source (the swap layer's
   `useExamAccess` shape, the plan-2018 adaptations, and a local
   reducer-less `store.ts`): 79 of 79.

## Commit 5 — import the i18n components from react-intl, not frontend-platform (`3a66d9f`, 2026-10-09)

Decisions 1–2 were settled in `plan-175.md` before the work; 5.1–5.2 record
them as built, 5.3 onward what building it decided.

5.1. **Peer `^6.0.0 || ^10.0.0`.** The majors the hosts carry and nothing
   between: frontend-platform 8.3.3 depends on react-intl 6.8.9 and the
   published frontend-base 1.0.1 on `^6.6.6`; the frontend-base 2.0 line
   the migration targets (`2.0.0-alpha.15`, the `alpha` dist-tag, and
   `main`) depends on `^10.1.20`. The plan's first draft spanned `^6`
   through `^10` on the belief that frontend-base shipped 10; no host
   carries 7, 8 or 9, and the peer says what the hosts support (the React
   peer rule, 2.1).
5.2. **devDependency `react-intl@10.2.2`**, not the 6.8.9 already in the
   tree, so the lib's suite runs on 10 while learning's source check runs
   the same code on learning's 6.8.9 through the jest alias (the alias
   maps every lib peer to learning's `node_modules`); both declared
   majors are exercised on every run. Until commit 7 removes
   frontend-platform, which pins a nested 6.8.9, the lib's `node_modules`
   holds both; nothing in the lib uses frontend-platform's i18n after
   this commit, so they never meet.
5.3. **Paragon devDependency `^23.23.0`** (from `^23.3.0`, lock 23.4.2 →
   23.23.0). Paragon 23.4.2 peers on react-intl `^5.25.1 || ^6.4.0`, so
   with 10 at the top level `npm ls` reported it invalid; 23.23.0 is the
   first release whose peer admits `^10.1.20`, and the one the
   frontend-base 2.0 line requires (`@openedx/paragon: ^23.23.0`), so the
   lib's dev tree is the frontend-base 2 host pairing. **The Paragon peer
   narrows to `^23.0.0`** (review 2026-10-09; `^22.0.0 || ^23.0.0` since
   #159, 2025-03): learning is on 23.23.0 (`^23.4.5`), frontend-base 1.0.1
   requires `^23.20.0` and the 2.0 line `^23.23.0`, and Paragon 22's
   react-intl peer (`^5.25.1 || ^6.4.0`) can never pair with the
   react-intl 10 side of 5.1. The commit gains the `!` and a `BREAKING
   CHANGE` footer for it.
5.4. **Jest transforms react-intl 10 and its formatjs packages.** 10.2.2 is
   `"type": "module"` with no CommonJS build, as are `@formatjs/intl` and
   `intl-messageformat` (`@formatjs/icu-messageformat-parser` is CommonJS
   but shares the `@formatjs` scope); `transformIgnorePatterns` becomes
   `/node_modules/(?!@(open)?edx|react-intl|@formatjs|intl-messageformat)`.
   The pattern applies at every `/node_modules/` in a path, which covers
   react-intl's nested `node_modules/@formatjs`.
5.5. **Mechanical otherwise.** 43 source files (no tests) change one import
   line each; `setupTest.js` imports `IntlProvider` from react-intl.
   frontend-platform's `i18n/index.js` re-exports `FormattedMessage`,
   `IntlProvider`, `defineMessages` and `useIntl` from react-intl
   unchanged, and the lib never used its own additions (`getLocale`,
   `injectIntl`, `configure`), so nothing renders differently. Commit 0a's
   `i18n_extract` runs on the react-intl imports as before.
5.6. **Suite**: 34 suites, 386 tests, 98.18 % statements on react-intl
   10.2.2; lint, types and build clean. Learning's exam tests from this
   source on learning's react-intl 6.8.9 (same local shims as 4.7): 79 of
   79.

## Commit 6 — host services through `SpecialExamsProvider`, no frontend-platform peer (`41fbf10`, 2026-10-09)

Decisions 1–4 were settled in `plan-175.md` before the work; 6.1–6.4 record
them as built, 6.5 onward what building it decided.

6.1. **`config` keys are camelCase** (`examsBaseUrl`, `lmsBaseUrl`,
   `siteName`, `supportUrl`, `contactUrl`, `proctoredExamFaqUrl`,
   `proctoredExamRulesUrl`, all optional strings; `examsBaseUrl` unset
   selects the LMS `edx_proctoring` endpoints as `EXAMS_BASE_URL` unset
   did). A frontend-platform host maps once at the mount; the README's
   "Setup" section shows it. frontend-base's site config already uses
   these names (`lmsBaseUrl`, `siteName` in the 2.0 alpha's published
   code, no upper-snake keys), so a frontend-base host passes its values
   through. 0b's `mockSpecialExams` took `{ lmsBaseUrl, examsBaseUrl }`
   from the start and now takes the same config object.
6.2. **`httpClient`, `logError` and `isAuthenticated` are required**, no
   defaults. frontend-platform's `logError` was a forwarder to the logging
   service the host's `initialize()` installed, and a host without one
   failed; the library never had a console fallback, and a default would
   have hidden a misconfigured host. `useSpecialExams()` throws
   "SpecialExamsProvider is required above the special exams components."
   outside the provider, so a missing mount fails at the first render
   rather than at the first request.
6.3. **Test setup keeps `initializeMockApp()` and `render(ui, …)`.**
   `setupTest.js` exports `testConfig` (the values `.env.test` held, in
   the provider's names), `httpClient` (one `axios.create()` instance the
   data tests attach their `MockAdapter` to, where they attached it to
   `getAuthenticatedHttpClient()`) and `testServices`; `initializeMockApp`
   returns the same jest logger the provider is given. `render` takes a
   `services` option merged over `testServices`, with `config` merged one
   level deeper so a test can set one key. The four tests that
   `jest.mock('@edx/frontend-platform')` for `getConfig`
   (`ExamAPIError`, `Footer`, `ErrorProctoredExamInstructions`,
   `proctorio`) pass the config instead; the two that set
   `appContext.authenticatedUser: null` pass `services: { isAuthenticated:
   false }`. The hook tests' legacy cases set `services` to a config
   with `examsBaseUrl: null` where they called `mergeConfig({
   EXAMS_BASE_URL: null })`. `.env.test` and the `dotenv` line in
   `jest.config.js` are gone, as is the `env.config` virtual mock (0a.5).
6.4. **`data/api.js` is `data/api.ts`.** Every function takes
   `{ config, httpClient }` (`ApiServices`) first and returns a typed
   payload; the exam fetchers return `ExamAttemptsResponse` and the
   actions `AttemptActionResponse`. The edx-exams branch of
   `pollExamAttempt`, which renames the attempt's `attempt_status` to
   `status`, types the response through generic `fetchActiveAttempt<T>` /
   `fetchAttemptForExamSequnceId<T>` rather than a cast through `unknown`.
   `total_time` humanizing keeps its `Number.isInteger` test on the raw
   value. Tests assert the request functions with `expect.anything()` in
   the services position.
6.5. **One context value, memoized on its four inputs.** `useSpecialExams()`
   returns `{ config, httpClient, logError, isAuthenticated }`; the query
   and mutation hooks call it and pass the services to `api.ts`, so no
   module-level registry exists. `checkAppStatus(examsBaseUrl)` and
   `pingApplication(…, logError)` / `workerPromiseForEventNames(…,
   logError)` take theirs as arguments from the hooks that call them
   (`handlers.js` and `proctorio.js` stay JavaScript, unchanged otherwise).
   `usePingAttempt` keeps `logError` in its latest-values ref (3.17).
6.6. **`HttpClient` is structural**: `get` / `post` / `put` returning
   `Promise<{ data: T }>`, the subset the library calls, so an axios
   instance satisfies it without the library depending on axios's types
   (`axios` is a devDependency only).
6.7. **Entry module `index.ts`** (from `index.jsx`): exports
   `SpecialExamsProvider` and the types `SpecialExamsConfig`,
   `SpecialExamsServices`, `HttpClient`, `LogError`,
   `SequenceExamWrapperProps`; `dist/index.d.ts` carries them.
6.8. **`@edx/frontend-platform` leaves `peerDependencies`** (the lock's
   root entry follows); the package stays in `devDependencies` and the
   lock until commit 7, unused by any source or test. `continueAttempt`'s
   attempt id in `useStartProctoredExam` carries a non-null assertion, the
   one call site whose attempt comes from `exam.attempt`
   (`Partial<AttemptPayload>`) with no guard, as the thunk had none.
6.9. **Suite**: 36 suites, 390 tests, 99.12 % statements (a new
   `SpecialExamsProvider.test.tsx` pins the contract and the throw);
   lint, types and build clean. Learning's exam tests from this source: 79
   of 79, with a local `SpecialExamsProvider` mounted in learning's test
   `render` (frontend-platform's `getConfig()` mapped to the camelCase
   keys, `getAuthenticatedHttpClient()`, `logError`,
   `!!getAuthenticatedUser()`), beside the earlier store and
   `useExamAccess` shims; all local and uncommitted.
6.10. **`data/api.test.ts`** checks `softwareDownloadAttempt`'s request on
   edx-exams and on the LMS for a legacy attempt; the download page's tests
   mock it, so nothing else sent it (coverage review 2026-10-09, after Codecov
   flagged #176's patch: every uncovered line was live behaviour, so each
   gained a test in the commit that introduced it).

## Commit 7 — drop the dependencies nothing imports any more (`63c1471`, 2026-10-09)

Decisions 1–3 were settled in `plan-175.md` before the work; 7.1–7.3 record
them as built, 7.4 onward what building it decided.

7.1. **Fourteen packages go**: the six the branch orphaned
   (`@openedx/frontend-plugin-framework` from commit 1; `react-redux`,
   `redux`, `@reduxjs/toolkit` from commit 4; `@edx/frontend-platform`
   from commit 6; `babel-polyfill`, test environment only) and the eight
   nothing ever imported from `src` (`react-router`, `react-router-dom`,
   the four `@fortawesome/*` packages, `dotenv`, `glob`). Of the peers,
   `react-redux`, `redux`, `@reduxjs/toolkit`, `react-router` and
   `react-router-dom` leave; `@openedx/paragon`, `@tanstack/react-query`,
   `prop-types`, `react`, `react-dom` and `react-intl` remain, and
   `eventemitter3` is the one runtime dependency. The `BREAKING CHANGE`
   footer names the dropped peers.
7.2. **`axios` and `axios-mock-adapter` stay devDependencies and nothing
   more** (closes 0b.4): the `./testing` mock imports both as types only,
   a plain peer would be auto-installed into every consumer by npm 7+, an
   optional peer neither installs nor warns, and a consumer adopting the
   fixtures sees them in `devDependencies` and the README's Testing
   section.
7.3. **`babel-polyfill` and its `setupTest.js` import are gone**; the suite
   passes without it. jsdom now has no `setImmediate`, so React's
   scheduler uses its captured `setTimeout`, and the fake-timer hazard
   plan-2018 records for learning cannot arise in this repository's tests.
7.4. **The lock was regenerated from scratch** (`package-lock.json` deleted
   with `node_modules`, then `npm install`), not updated in place, after
   the `package.json` change; an in-place update after a change of this
   size carries the old resolution forward. The fresh resolution moved
   `@types/react` to 19 (`useRef()` requires an argument there, failing
   `queries.ts`) and `@types/node` to 26 (declaration syntax TypeScript
   4.9.5 cannot parse, failing `tsc` in `build` and `types`). Both are
   pinned as devDependencies to the lines the old lock had resolved
   transitively (`@types/react ^18.3.0`, `@types/node ^22.13.13`); nothing
   else needed pinning. `@types/react-dom` was tried and dropped: the old
   lock never had it and types pass without it.
7.5. **Verification**: lint, types and build clean on the fresh tree; 36
   suites, 390 tests, 99.12 % statements. Learning's exam tests from this
   source: 79 of 79 with the local shims (jest alias, reducer-less
   `store.ts`, `SpecialExamsProvider` in the test `render`,
   `useExamAccess`).

## Commit 8 — review fixes (`63438a4`, 2026-10-13)

The six inline comments from arbrandes's approving review, in one commit on
top rather than amended into commits 0a–7.

8.1. **The entry check works under StrictMode, as React's docs shape an
   Effect.** At `63c1471` the no-answer path was dead in development under
   StrictMode (learning renders under it) for two independent reasons:
   StrictMode's mount-time cleanup set `mounted` false with nothing setting
   it back (the review's finding), and the same cleanup's `clearTimeout`
   cancelled the timer the probe had just started, while the probe's
   re-run returned on `checked`. Either alone kills the path; the review's
   suggested fix (`mounted.current = true` in the setup) revived the
   "not active" path but left the no-answer path dead. Both the guard and
   the cancel were commit 3's wrapper around the body ported from v4's
   `checkExamEntry` thunk, which had neither and ran once from
   `ExamWrapper`'s mount effect.
   [Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects#how-to-handle-the-effect-firing-twice-in-development):
   "The right question isn't "how to run an Effect once", but "how to fix
   my Effect so that it works after remounting"" — the cleanup "should
   stop or undo whatever the Effect was doing", and a ref used to keep an
   Effect from running twice is a named pitfall
   ([Don't use refs to prevent Effects from firing](https://react.dev/learn/synchronizing-with-effects#dont-use-refs-to-prevent-effects-from-firing)).
   So each probe now owns its cleanup: a local `ignore` flag and a local
   `timeout`, both undone by the cleanup it returns (the docs'
   [Fetching data](https://react.dev/learn/synchronizing-with-effects#fetching-data)
   pattern), which keeps the timer cancelled on unmount. `checked`,
   `mounted`, the `timeout` ref and the separate unmount effect are gone;
   the ported body is unchanged apart from `timeout` and `mutate`.

   **The dependency array takes over the checks the effect made inside.**
   The old guard (`checked.current || isFetching || !data`, deps `[data,
   isFetching, …]`) did two jobs. `isFetching` waited for this mount's
   fetch (`refetchOnMount: 'always'` starts one while cached data shows);
   `checked` threw away every later run, because `data` and `isFetching`
   changed on every refetch. Now the guard is `!isFetchedAfterMount`
   ([`isFetchedAfterMount`](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery#result-property-isfetchedaftermount):
   "Will be `true` if the query has been fetched after the component
   mounted"; query-core compares the query's `dataUpdateCount` /
   `errorUpdateCount` with a snapshot the observer takes when it attaches)
   and the effect depends on it alone, which turns true once and stays
   true, so a refetch never re-runs it:

   | Moment | `isFetching` | old: effect runs? | `isFetchedAfterMount` | new: effect runs? |
   |---|---|---|---|---|
   | Mount, cached data, fetch in flight | true | yes, waits on `isFetching` | false | yes, waits on `!isFetchedAfterMount` |
   | This mount's fetch lands | false | yes, **probes**, sets `checked` | true | yes (dep changed), **probes** |
   | Refetch starts | true | yes, blocked by `checked` | true | no, deps unchanged |
   | Refetch lands | false | yes, blocked by `checked` | true | no, deps unchanged |

   Reading `data` without depending on it is what `checked` hid from
   `react-hooks/exhaustive-deps`; React's tool for it, `useEffectEvent`,
   needs React 19.2 and the peer range starts at 18, so `data` is read
   through a latest-value ref updated by an effect with no dependency
   array, as `usePingAttempt` does. The effect depends on the mutation's
   stable `mutate`, not the mutation result, which changes every render.

   **One behaviour change: a cached return to the exam probes again.**
   `checked` lived as long as the wrapper; the observer's snapshot is
   retaken when the query key changes. `Course.jsx` renders `<Sequence>`
   without a `key`, and `Sequence` unmounts `SequenceExamWrapper` behind a
   spinner only while a sequence's metadata loads, so with a proctored
   exam and a lesson both cached:

   1. Open the exam (first visit). Both probe.
   2. Go to the lesson (first visit: spinner, wrapper remounts). Neither
      probes; the lesson's exam query is disabled.
   3. Back to the exam (cached: wrapper stays mounted). Both probe; the
      remount in step 2 reset `checked`.
   4. To the lesson again (cached). Neither probes.
   5. Back to the exam again (cached). Old: no probe, `checked` is still
      set from step 3. New: probes.

   Probing the exam again on return is already normal (steps 1 and 3); a
   probe with the proctoring app running answers active and nothing
   happens. The entry-check tests run with RTL's `reactStrictMode`; the
   not-active and no-answer cases failed under it at `63c1471`. New case:
   an unmount before the timeout leaves the attempt alone. "does not
   probe an attempt that is not in a proctored state" now builds a
   proctored attempt: with the factory's default `exam_type: 'timed'` it
   returned at the LTI check and never reached the status check its name
   describes (the explicit `return undefined` after that check showed it
   uncovered).
8.2. **The owner queries are `enabled` only for a signed-in user**
   (`ExamWrapper`'s exam and active-attempt queries, `OuterExamTimer`'s
   active-attempt query), as #175's query table specified. v4 also fetched
   for anonymous visitors, from effects above its early return; under v5 a
   host `QueryClient` without a `retry` policy retried the 403 three times.
   The existing anonymous tests assert no fetch; both fail without the gate.
8.3. **The timer, `OuterExamTimer` and `Exam` tests attach a `MockAdapter`
   to the test `httpClient`**, so unmatched requests answer 404 instead of
   reaching the network; the twelve `AggregateError`s are gone. The leak is
   new in commit 3: v4 polled only from the timer's minute tick, which these
   tests never reached, while the poll query fetches on mount. Each file
   attaches its own adapter, as the data-layer tests already did and as
   frontend-platform's `MockAuthService` documents; authoring
   (`initializeMocks()`) and learning (`mockCourseRequests()`) wrap the
   shared client per test too, and none of them attaches one at setup
   level. A rejecting default adapter in `setupTest.js` was tried first and
   dropped for that reason.
8.4. **The README builds the provider's config when the provider renders**:
   the module-scope `config` object becomes a `getSpecialExamsConfig()`
   function called in the `config` prop, as learning's wrapper does, so
   `getConfig()` runs after `initialize()` has loaded runtime config. No
   `useMemo`: learning's wrapper has none (decisions-2018), and a new
   `config` object only changes the context value when the component
   rendering the provider re-renders.
8.5. **CI runs `npm run types`**, after lint; `build` excludes the test files.
8.6. **Verification**: lint, types and build clean; 36 suites, 391 tests,
   99.12 % statements; every changed line and branch covered.
