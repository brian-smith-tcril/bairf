# Map: convert Learning to frontend-base, epic 1 (openedx/frontend-app-learning#1905)

## Destination

Epic 1's implementation tickets exist as direct sub-issues of #1905 and read `approved` in `UPSTREAM.md`, with nothing left to decide before the first layer is written. Implementation happens outside this map.

## Notes

- Decisions already settled live in `decisions-1905.md` (entries 1–22 at charting); a ticket's answer that settles a decision is appended there as a new entry, and the map links it.
- Reference material every session reads first: the frontend-base migration how-to (`docs/how_tos/migrate-frontend-app.md` on `main`), frontend-base ADRs 0009, 0013, 0015, 0017, the catalog conversion gist (`78222db3b54b48132aa13018f7f5b371`: plan, worklog, port-the-tests), and the converted apps' `src/routes.tsx` and `src/setupTest.js` on their default branches (profile, account, catalog, gradebook, instructor dashboard).
- Layout under decision: legacy tree untouched at `src/`, new package in `frontend-base/`, branch rebased on `master` (entries 11–14).
- Breaking changes are decided in PRs, never on this map (entry 9). A ticket notes "may need a breaking change" and moves on.
- Terms: ecosystem glossary distinguishes **slot** (frontend-base) from **plugin slot** (frontend-plugin-framework); **placeholder** is in the Learning glossary.
- Skills per ticket type: research → `mattpocock-skills:research`; grilling → `mattpocock-skills:grilling` + `mattpocock-skills:domain-modeling`.

## Decisions so far

<!-- one line per resolved ticket: [title](issues/NN-slug.md): gist -->

## Not yet specified

- The per-port checklist the how-to implies and no decision hangs on: page title per route-level page (ADR 0015), i18n changes, SCSS `@import` to `@use`, runtime-style separation, the `PageWrap` replacement, `process.env` reads, the special exams provider's host wiring. Graduates into the spec at handoff, not into tickets.
- Pact tests: whether they run under the new package's jest config, and what they are worth if not. Sharpens once the scaffold layer exists.
- Test-port conventions (grilling Q15): catalog's rules as the starting point, pending a comparison against the profile, account, admin-console and instructor-dashboard conversions.

## Out of scope

- Porting plugin slots to the Slot API, the swap of `frontend-base/` to the root, publishing, frontend-template-site and tutor-mfe inclusion: openedx/frontend-app-learning#2185.
- Splitting tabs into widgets and the shared-query-key work: openedx/frontend-app-learning#2186.
- Any ticket whose resolution is "drop feature X" (entry 9).
- The manual verification environment: known, recorded in the scaffold layer's manual-testing record, not researched.
