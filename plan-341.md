# Plan for openedx/frontend-base#341

Written 2026-11-02 against `72d7053` on `main`. Proposal only; the ADR is written on Brian's word.

## What the ADR decides

An app is an npm package released by semantic-release on the ADR 0012 branches, so "breaking change for an app" means: which changes oblige a `feat!:` / `BREAKING CHANGE:` commit, hence a major version and, under ADR 0012 section 3, a new `n.x` release branch. ADR 0009 answers this for one slot's own contract (props, location, kind of content), ADR 0012 says where breaking changes may land, and ADR 0016 preserves the shell's default widget ids without saying why in general. Nothing lists the app-level surface. This ADR does.

### The app's public surface

A change that makes any of these stop working for an existing site config, plugin or consuming package is major.

1. **Slots the app offers.** Removing a slot. Bumping a slot's version (ADR 0009 section 2), since the bump is the statement that the previous version's contract no longer holds. The `vN` id's lifecycle (ADR 0009 section 3) is unchanged.
2. **Default widget ids.** The ids of the widgets an app registers as a slot's default content are targets for `INSERT_AFTER`, `INSERT_BEFORE`, `REPLACE`, `REMOVE` and `OPTIONS`. Removing one, or renaming one without keeping the old id in `idAliases` (#334, merged in #335), is major. Settled in #336: existence yes.
3. **Exports.** Everything reachable through the `exports` map, which for a migrated app is `src/index.ts`: the `App` config, the `*SlotProps` interfaces, and the types those props are built from (settled in #339: apps export them). Removing an export, or changing one so that existing imports no longer compile or behave, is major. A rename keeps the old name exported for a release (the steps are #340's).
4. **Peer dependency ranges.** Narrowing a range so a version a site has today falls out of it (`react: ^18` to `react: ^19`) is major. Widening (`^18 || ^19`) is not. Same for `@openedx/frontend-base` itself.

### Not part of the surface

- **Default widget order.** Relative operations place against the target's current position; an app may reorder its defaults in a minor. Settled in #336: order no. The TSDoc on the relative operations states this, since that comment is where a site config author reads what the operation promises.
- Component, file, function and test names; the implementation of a default widget; anything not exported.

### Where it lands

- A new ADR in `docs/decisions/`, rst, status Proposed. Number is whatever is free at write time: `0017` is taken by an unmerged commit (`97241feb`, `App.defaultConfig`) and `0018` by openedx/frontend-base#326.
- ADR 0009 section 2 gets a one-line note that its default-content exclusion governs the slot's version only, and points here for what it does not cover. ADR 0016's preservation of default widget ids gets a reference to the general rule.
- TSDoc on the relative widget operations in `runtime/slots/widget/types.ts` (the order rule); the `idAliases` TSDoc already carries the rename rule.
- #340's how-to carries the procedures (rename path, deprecation marking); this ADR carries only the rule.

### Gates (`adr-policy`)

1. Hard to reverse: every app's major-version history keys off it.
2. Surprising without context: ADR 0009 reads as a licence to change default content "at any time", and nothing says peer ranges or exports are contract.
3. Trade-off weighed: existence versus order of default widgets (#336); narrow versus wide export surface (#339).
4. Only frontend-base decides it (ecosystem rule, `adr-policy` Frontend). Checked against ADR 0009, 0012, 0016: none lists the app-level surface.

## Open questions for Brian

1. **Slot version bump.** Is the bump itself major (the issue's bullet), or the later removal of the old version? ADR 0009 section 3 requires the old version to coexist in the codebase for at least one Open edX release; ADR 0012 section 3 already keeps it alive on the previous `n.x` branch. Does the ADR say whether in-codebase coexistence still applies to apps on release branches?
2. **Peer dependency floor within a major.** `react: ^18.2` to `^18.3`: major or not?
3. **Default widget `options` shape**, and i18n message ids operators override: in or out of the surface?
4. **Pre-release apps.** On `2.0.0-alpha.*`, `feat!:` still yields the next alpha, so the rule costs nothing there; say so, or leave pre-release out?
