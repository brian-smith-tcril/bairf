Issue for `openedx/frontend-lib-special-exams` (draft, not filed)

**Title:** v5: convert the data layer to React Query and drop the frontend-platform, frontend-plugin-framework and redux peers

> [!NOTE]
> This issue was authored by Claude (Claude Code) and reviewed before posting.

`frontend-app-learning` is converting from Redux to React Query (openedx/frontend-app-learning#1946) ahead of its frontend-base port (openedx/frontend-app-learning#1905). At the top of that work the only Redux left in learning is the store it creates to host this library's `reducer`, and the only frontend-platform-shaped contract a frontend-base build would have to satisfy for it is this library's. This issue is the library change that removes both, as one major release. Investigation and design: openedx/frontend-app-learning#2018.

## Why one major, and why this shape

- The library creates no store. Every component and the three public hooks call `useSelector(state => state.specialExams)` / `useDispatch`, and the 19 thunks read only `getState().specialExams`. The host registers `reducer` and renders the react-redux `Provider`. frontend-base ships React Query and no redux, so a frontend-base host cannot provide either.
- A library-owned Redux store (the pre-2024 `src/data/store.js` shape) would unblock the host but keep redux, react-redux and the toolkit in the consumer's bundle. The target is a redux-free learning bundle, so the data layer converts to React Query, which both hosts already provide.
- The library peers on `@edx/frontend-platform` for `getConfig`, `getAuthenticatedHttpClient`, `logError`, `AppContext` and i18n. frontend-base replaces frontend-platform, so a v5 that still required it could not be used under frontend-base, and requiring both would bloat both. The non-i18n surface is small (six config keys, one HTTP client, one logger, one boolean), so v5 takes those from the host through a provider and imports i18n from `react-intl` directly, which both hosts re-export.
- `@openedx/frontend-plugin-framework` is a regular dependency here (one slot). frontend-base has no FPF, and FPF 1.8.0 itself depends on react-redux 8.1.1. The slot's rendering moves to the host; the library exposes an override prop.

## What changes

**Tooling (dev-only).** `@openedx/frontend-build` is replaced by the tools it wrapped, declared directly: `tsc` builds `dist/` (CommonJS, `target: ES6` per frontend-base ADR 0005, with `.d.ts` shipped), `eslint` with `@edx/eslint-config` as today, `jest` with `babel-jest`, `@formatjs/cli` for extraction. frontend-base lists frontend-build among the libraries it supersedes, and consumers' bundlers transpile `@edx/*` packages themselves, so the ES5 → ES6 output change is unobservable; the `is-es5` check goes with it. New code in this change is TypeScript; existing `.jsx` stays until rewritten.

**Peers.** Add `@tanstack/react-query` (^5), `react-intl`. Remove `@edx/frontend-platform`, `react-redux`, `redux`, `@reduxjs/toolkit`. Remove the `@openedx/frontend-plugin-framework` dependency. Unchanged: `react`, `react-dom`, `@openedx/paragon`, `eventemitter3`.

**`SpecialExamsProvider` (new export).** Mounted once by the host, above both components and every call to the hooks, under the host's `QueryClientProvider` (the library uses the host's client; keys are namespaced `['specialExams', …]`).

```tsx
<SpecialExamsProvider
  config={{ examsBaseUrl, lmsBaseUrl, siteName, contactUrl, proctoredExamRulesUrl, proctoredExamFaqUrl }}
  httpClient={/* authenticated axios instance */}
  logError={/* (message, customAttributes?) => void */}
  isAuthenticated={/* boolean; today only the truthiness of authenticatedUser is read */}
>
```

`src/data/api.js` takes `config` and `httpClient` from the provider instead of `getConfig()` / `getAuthenticatedHttpClient()`. `ExamAPIError` reads `siteName` / `contactUrl` from it. `OuterExamTimer` and `ExamWrapper` early-return on `!isAuthenticated` as they do on `!authenticatedUser` today.

**Exam identity.** `SequenceExamWrapper` provides `{ courseId, sequenceId, allowProctoringOptOut }` plus the two client-state values (`timeIsOver`, `apiError`) to its subtree through an internal context. The public hooks read it, so `useIsExam()` is scoped to the enclosing wrapper instead of to whichever exam was fetched last (today a learner leaving an exam sequence for a non-exam one keeps the stale `exam` in the slice, so `useIsExam()` stays `true` there).

**Queries (6)** replacing `getExamAttemptsData`, `getLatestAttemptData`, `pollAttempt`, `getProctoringSettings`, `getExamReviewPolicy`, `examRequiresAccessToken` and their reducers:

| Query | Key | Enabled |
|---|---|---|
| exam for sequence (`fetchExamAttemptsData(...).exam`) | `['specialExams','exam', courseId, sequenceId]` | `sequence.isTimeLimited` |
| active attempt (`fetchLatestAttempt(...).active_attempt`; `select` adds `timer_ends = dataUpdatedAt + time_remaining_seconds * 1000`, today's `appendTimerEnd`) | `['specialExams','activeAttempt', courseId]` | `isAuthenticated` |
| poll (`pollExamAttempt(pollUrl, sequenceId)`, `refetchInterval: 60_000`) | `['specialExams','poll', attemptId]` | attempt started, status ≠ `ready_to_submit`, seconds left ≥ 0 |
| proctoring settings (`fetchProctoringSettings`) | `['specialExams','proctoringSettings', courseId, examId]` | exam type ∈ onboarding/practice/proctored and `examId` |
| review policy (`fetchExamReviewPolicy(...).review_policy`) | `['specialExams','reviewPolicy', examId]` | mounted in `ReadyToStartProctoredExamInstructions` |
| access token (`fetchExamAccessToken`) | `['specialExams','accessToken', examId]` | `examId && config.examsBaseUrl` |

Poll data patches the active-attempt cache (`time_remaining_seconds`, `attempt_status`); on `submitted` / `error` it sets `timeIsOver` and invalidates the exam query, as `pollAttempt` does today. The edx-exams branch of `fetchExamAttemptsData` stops calling the latest-attempt endpoint a second time; the active-attempt query covers it.

**Mutations (10) and effects (2)** replacing the rest of `thunks.js`. Each mutation's `onSuccess` invalidates the exam and active-attempt queries (today's `updateAttemptAfter` refetch); `onError` sets `apiError` (today's `handleAPIError`).

| Thunk | v5 |
|---|---|
| `startTimedExam`, `createProctoredExamAttempt`, `skipProctoringExam`, `continueExam`, `resetExam` | mutations over the same `api.js` functions |
| `startProctoredExam` | mutation: worker start then `continueAttempt`; without a worker, `notifyStartExam` then `continueAttempt` |
| `stopExam`, `submitExam` | mutations; the "attempt belongs to another exam → `window.location.href = exam_url_path`" branch kept |
| `expireExam` | mutation: `submitAttempt` + `timeIsOver` + worker submit message. Passes `activeAttempt.course_id` where its siblings pass `exam.course_id` (the thunk's own comment flags it); kept as is, not fixed silently |
| `pingAttempt` | effect on the timer ticker → `pingApplication`; on loss, an `endExamWithFailure` mutation |
| `checkExamEntry` | effect on `SequenceExamWrapper` mount → `checkAppStatus` race; on loss, `apiError` + `endExamWithFailure` |
| `getAllowProctoringOptOut` | deleted; the value is a prop (`sequence.allowProctoringOptOut`), provided through context |
| `startProctoringSoftwareDownload` | deleted; unexported and unused (`download-instructions/index.jsx` calls `softwareDownloadAttempt` directly) |

**Client state.** `timeIsOver` and `apiError` live in the `SequenceExamWrapper` context; `TimerProvider` keeps its 1s ticker and `timeState`, and keeps emitting `TIMER_*` on the `eventemitter3` singleton. `isLoading` is derived from the exam query's and the in-flight mutation's `isPending`.

**Slot → override prop.** `plugin-slots/SubmittedTimedExamInstructionsSlot` and the FPF dependency are deleted. `SequenceExamWrapper` takes one component prop for the submitted timed-exam instructions, called with `{ timeIsOver }`, defaulting to today's heading (both messages). The host renders slot ID `org.openedx.frontend.special_exams.submitted_timed_exam_instructions.v1` with the same prop around it, so operator configurations are unchanged. The slot README and screenshots move to the host that renders it.

**Public API.**

| v4 | v5 |
|---|---|
| `reducer` | removed |
| — | `SpecialExamsProvider` |
| `SequenceExamWrapper` | same props + the override component prop |
| `OuterExamTimer` | unchanged |
| `useIsExam()` | same shape; scoped to the enclosing `SequenceExamWrapper` |
| `useExamAccessToken()` → `string` | → `{ accessToken: string, isPending: boolean }`; `isPending` is `false` when the query is disabled |
| `useFetchExamAccessToken()` | removed; the query fetches itself (`staleTime: 0`, so a consumer mounting it per unit refetches per unit, today's behaviour) |

**Consumer-facing backend mock.** Ship a mock of the exam backend for consumers' tests as `@edx/frontend-lib-special-exams/testing` (a new `exports` entry), in TypeScript with plain payload builders (no `rosie` at runtime), built from the same payload shapes the library's own tests use: both URL families, the attempt state machine (create; the `action` transitions; the poll's status and countdown), provider settings, review policy and access token, with failure switches. `frontend-app-learning`'s `src/tests/mockSpecialExams.ts` (openedx/frontend-app-learning#2163) is the first consumer and is replaced by it when learning adopts v5, so the knowledge of what the backend looks like lives in the library that talks to it and changes in the same PR as the client code.

**Tests.** `initializeTestStore` becomes a per-test `QueryClient` + `QueryClientProvider` + `SpecialExamsProvider` (with the `axios-mock-adapter` client) + `IntlProvider` wrapper. Rosie factories carry over as payloads; `data/redux.test.jsx` becomes hook tests.

## Not changed

Endpoints, payloads and the edx-proctoring / edx-exams branching in `api.js`; the instruction components' rendering and messages; the timer's cadence, grace period and events; translations. Driving the access token's staleness from `exam_access_token_expiration` is a follow-up, not part of this major.

## Sequencing

One PR; the steps below are its commit order, each a reviewable commit, released together as v5.0.0. The PR links a `frontend-app-learning` testing branch that installs the packed build from a vendored tarball as its demonstration (a draft PR there gives CI and a deploy preview).

1. Replace frontend-build with direct tooling; `tsc` build at ES6 with declarations (dev-only).
2. Consumer-facing backend mock, TypeScript, exported as `./testing`.
3. Drop FPF: slot → `submittedTimedExamInstructions` component prop on `SequenceExamWrapper`, through an internal `SequenceExamContext` the wrapper provides.
4. `SpecialExamsProvider`; `api.js`, `ExamAPIError`, `OuterExamTimer`, `ExamWrapper` read config / http / log / `isAuthenticated` from it; `react-intl` imports. Still Redux at this point.
5. The six queries; components read them; slice loses `exam`, `activeAttempt`, `proctoringSettings`, `examAccessToken`, `isLoading`.
6. Mutations, effects, timer; slice loses the rest.
7. Delete `slice.js`, `thunks.js` and the `reducer` export; public hooks on the context; test setup swap.
8. Remove every dependency nothing imports any more (FPF, `@edx/frontend-platform`, `react-redux`, `redux`, `@reduxjs/toolkit`) in one `package.json` change with one lock regeneration, so the code commits read without lock churn.

## Consumers

- `frontend-app-learning`: adopts v5 in openedx/frontend-app-learning#2018, mounting the provider, owning the slot, and deleting its store and redux dependencies.
- `frontend-app-ora`: pins `^3.4.0`, renders only `OuterExamTimer`, registers the reducer but never reads the slice, and is on React Query v4. Unaffected until it chooses to take v5; 4.x stays published.



