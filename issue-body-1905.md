### Description

Convert the Learning app to use frontend-base, as per https://github.com/openedx/frontend-base/blob/main/docs/how_tos/migrate-frontend-app.md.

The converted code will remain in a long-lived [`frontend-base`](https://github.com/openedx/frontend-app-catalog/tree/frontend-base) branch.

### Epics

> [!NOTE]
> This section and the TODO edits below were drafted by Claude (Claude Code) and reviewed before posting.

The conversion is three sibling epics. This issue is epic 1.

1. **#1905 (this issue):** Learning runs on frontend-base from the `frontend-base` branch, which merges into `master` at the end of this epic (agreed with @arbrandes on 2026-10-21). Every slot is reduced to a placeholder that renders its default content in a bare fragment, with `@openedx/frontend-plugin-framework` removed, following the pattern openedx/frontend-app-catalog#137 used before its per-slot port commits. Plugin contracts are broken on `master` from the landing until epic 2 restores them; a `legacy-mfe` branch keeps the old behavior, as the other converted apps did.
2. **#2185:** port each slot to the Slot API, on `master`.
3. **#2186:** split the tabs into widgets, per the 2026-09-24 FWG outcome recorded in the comments.

Epics 1 and 2 together are the "initial conversion" from that FWG discussion; epic 1 lands on `master` first. Epic 1 PRs target `frontend-base`; epic 2 and 3 PRs target `master`.

### TODO

- [ ] Convert internal app structure (site.config, routes, providers)
- [ ] Reduce every slot to a placeholder; remove `@openedx/frontend-plugin-framework` and the `env.config.jsx` slot configuration
- [ ] Port header and footer customizations, if any (custom menus?); drop the direct `@edx/frontend-component-header` / `-footer` imports
- [ ] Fix tests
- [ ] Cut `legacy-mfe` from the last pre-swap `master` and land the tutor-mfe change that builds it for Learning, before the swap
- [ ] Merge `frontend-base` into `master` (the swap: `frontend-base/` to the root, `src/` deleted, release workflow added)
- [ ] Publish to NPM
- [ ] Include in frontend-template-site
- [ ] Include in tutor-mfe as a frontend app

The last four moved to #2185 on 2026-10-18 and back here on 2026-10-21, when the landing moved to the end of this epic.
