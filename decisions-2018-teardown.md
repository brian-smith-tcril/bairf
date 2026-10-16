# Decisions — remove the redux packages (#2018)

Layer 3 of the #2018 stack, above #2168 (which adopted
`@edx/frontend-lib-special-exams` 5.0.0 and removed learning's redux
store); closes #2018. This is the library-gated dependency removal #1978
described and handed to #2018 when #1977 closed it. Settled 2026-10-14.

1. **Two lock regenerations, each from scratch.** Both wipe
   `package-lock.json` and `node_modules`, run `npm install`, then
   `npm dedupe` (as #2042 did). The first runs with `package.json`
   unchanged and is committed alone, so its diff is only the current
   ranges resolving to newer versions: 132 version changes, one major
   (`ajv-formats` 2 to 3, under copy-webpack-plugin's `schema-utils`).
   Without dedupe a fresh install hoists react-intl 10 (Paragon's peer
   range allows it), which is ESM-only and fails Jest, and `@types/node`
   26, which fails types; with dedupe the tree keeps react-intl 6.8.9 and
   `@types/node` 22 and no pins are needed. The second regeneration
   carries the removals, so its lock diff is only what they cause (plus
   `electron-to-chromium` 1.5.455 to 1.5.456, released between the two).
2. **What leaves `package.json`:** `@reduxjs/toolkit`, `react-redux` and
   `redux`, which no learning code imports since #2168, and `reselect`,
   the selector library used with them, whose last import went in #2146.
   `@reduxjs/toolkit`, `redux-thunk`, `@types/react-redux` and `reselect`
   leave the tree.
3. **What still pulls redux in.** Only frontend-platform (required peers:
   `redux ^4.0.4`, `react-redux ^7.1.1 || ^8.1.1`) and
   frontend-plugin-framework (dependencies: `redux` 4.2.1, `react-redux`
   8.1.1). npm satisfies both with one root copy each, `react-redux` 8.1.1
   and `redux` 4.2.1, which replaces learning's `react-redux` 7.2.9 and
   frontend-plugin-framework's nested copy. Both packages stay through the
   frontend-base port (#1905), which is when they leave.
4. **`@types/react` and `@types/react-dom` `^18` join devDependencies.**
   Without learning's own `react-redux` 7.2.9 (whose only peer is
   `react`), npm places frontend-platform's `react-redux` 8 peer at the
   root. Its optional `@types/react` peer (`^16.8 || ^17.0 || ^18.0`)
   applies to the root `@types/react`, which learning has as 18.3.31
   through react-intl, react-bootstrap and uncontrollable.
   `@testing-library/react`'s optional `@types/react-dom` peer then
   resolved to 19.3.0, whose `@types/react ^19.3.0` peer needs that same
   root copy to be 19, and a fresh install stopped with ERESOLVE. Learning
   listed neither type package; the org's React 18 apps list both:
   frontend-template-application, frontend-base and frontend-app-authoring
   (as devDependencies: `^18`, frontend-base `^18.3.20` and `^18.3.6`), and the
   frontend-base apps account, profile, instructor-dashboard and
   admin-console. Learning follows the template's spelling. No frontend-platform
   app had dropped its own `react-redux` before, which is why none hit
   this. The two go in the removal commit, not the first regeneration,
   because only the removal needs them; no `overrides`.
5. **Comments that point at Redux go** (a third commit):
   `GoalUnsubscribe.jsx`'s "don't need to bother with redux" note,
   `TourContext.tsx`'s "mirrors the former `tours` Redux slice" note, the
   "former end-tour thunks" parenthetical in `ProductTours.jsx`, and the
   "old reducer … immer" note in `apiHooks.test.tsx` (the test name
   already says what it checks) are removed. `SequenceNavigation.test.jsx`'s
   TODO still holds (`UnitButton` prefers the cached unit's `contentType`
   over the `"lock"` fallback), so only its source changes, from Redux to
   `useUnit`.
6. **Kept:** the "Migrating from the Redux plugin store" section of
   `src/generic/plugin-overrides/README.md`, for plugins that still
   dispatch to the old store, and ADRs 0004 (model store), 0006 (thunk
   naming) and 0007 (testing, Draft), as history. No learning ADR for
   React Query: OEP-67 frontend ADR 0010 ("React Query") is the
   org-level decision.
7. **No `!`.** Nothing consumer-facing changes beyond #2168's break,
   where plugins lost the store.
8. **Verification** (at the layer's head): lint and types clean; 124
   suites, 1,279 tests pass; `npm run build` compiles with webpack's two
   usual asset-size warnings; `npm ls @reduxjs/toolkit` is empty.
