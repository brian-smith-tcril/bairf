# Map: convert Learning to frontend-base, epic 1 (openedx/frontend-app-learning#1905)

## Destination

Epic 1's implementation tickets exist as direct sub-issues of #1905 and read `approved` in `UPSTREAM.md`, with nothing left to decide before the first layer is written. Implementation happens outside this map.

## Notes

- Decisions already settled live in `decisions-1905.md` (entries 1–31); a ticket's answer that settles a decision is appended there as a new entry, and the map links it.
- Reference material every session reads first: the frontend-base migration how-to (`docs/how_tos/migrate-frontend-app.md` on `main`), frontend-base ADRs 0009, 0013, 0015, 0017, the catalog conversion gist (`78222db3b54b48132aa13018f7f5b371`: plan, worklog, port-the-tests), and the converted apps' `src/routes.tsx` and `src/setupTest.js` on their default branches (profile, account, catalog, gradebook, instructor dashboard).
- Layout under decision: legacy tree untouched at `src/`, new package in `frontend-base/`, branch rebased on `master` (entries 11–14).
- Breaking changes are decided in PRs, never on this map (entry 9). A ticket notes "may need a breaking change" and moves on.
- Terms: ecosystem glossary distinguishes **slot** (frontend-base) from **plugin slot** (frontend-plugin-framework); **placeholder slot** and **stub route** are in this effort's `GLOSSARY.md`; bare "placeholder" is the ordinary word.
- Skills per ticket type: research → `mattpocock-skills:research`; grilling → `mattpocock-skills:grilling` + `mattpocock-skills:domain-modeling`.

## Decisions so far

<!-- one line per resolved ticket: [title](issues/NN-slug.md): gist -->
- [Header and `provides`](issues/01-header-and-provides.md): six things Learning's header does that the shell's defaults do not (course title line, masquerade extras, courseware search, notifications tray, user-menu items), each re-homed into one of the shell header's 17 slots through `App.slots` by the port that owns it; the active-tab rule is a shell behaviour note; `provides` wiring traced; a six-role declaration drafted, with two route facts for port order.
- [Config mapping table](issues/02-config-mapping.md): 52 rows mapped (5 required, 9 optional SiteConfig; 4 roles/external routes, three without an existing role id; 22 app defaultConfig; 10 shell-managed and dropped; 1 unknown, `SESSION_COOKIE_DOMAIN`); identifiers proposed; reviewed 2026-10-19 (decisions 24, 25).
- [Plugin-era contracts the placeholder step breaks](issues/03-plugin-era-contracts.md): seven contracts classified; `env.config.jsx` slot and sidebar-widget config and the runtime-config URL are the operator-facing notes; the override-registry plugin is already broken on master; prop-passing count corrected to 29 files / 34 attributes.
- [Manifest format and rebase audit script](issues/05-manifest-and-audit.md): one plain-text `frontend-base/manifest.tsv`, tab separated, sorted by legacy path, `dropped` as a target; `bin/rebase-audit` in this worktree resolves master's changes through it (RE-PORT / UNMAPPED / DROPPED, exit 1 on the first two), proven on a synthetic repo.
- [Port order and split points](issues/04-port-order.md): 21 layers in order (scaffold; frame with stub routes; dates, progress, outline tab, access denied; title widget, instructor toolbar, product tours; courseware CW1–CW7 stubbing inward; live, discussion-as-redirect and the three URL-only pages last); decisions 26–31.

## Not yet specified

- The per-port checklist the how-to implies and no decision hangs on: page title per route-level page (ADR 0015), i18n changes, SCSS `@import` to `@use`, runtime-style separation, the `PageWrap` replacement, `process.env` reads, the special exams provider's host wiring, the Pact test's provider URL (entry 23). Graduates into the spec at handoff, not into tickets.

## Out of scope

- Porting plugin slots to the Slot API, the swap of `frontend-base/` to the root, publishing, frontend-template-site and tutor-mfe inclusion: openedx/frontend-app-learning#2185.
- Splitting tabs into widgets and the shared-query-key work: openedx/frontend-app-learning#2186.
- Any ticket whose resolution is "drop feature X" (entry 9).
- The manual verification environment: known, recorded in the scaffold layer's manual-testing record, not researched.
