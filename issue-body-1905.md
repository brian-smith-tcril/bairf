### Description

Convert the Learning app to use frontend-base, as per https://github.com/openedx/frontend-base/blob/main/docs/how_tos/migrate-frontend-app.md.

The converted code will remain in a long-lived [`frontend-base`](https://github.com/openedx/frontend-app-catalog/tree/frontend-base) branch.

### Epics

> [!NOTE]
> This section and the TODO edits below were drafted by Claude (Claude Code) and reviewed before posting.

The conversion is three sibling epics. This issue is epic 1.

1. **#1905 (this issue):** Learning runs on frontend-base from the `frontend-base` branch. Every slot is reduced to a placeholder that renders its default content in a bare fragment, with `@openedx/frontend-plugin-framework` removed, following the pattern openedx/frontend-app-catalog#137 used before its per-slot port commits. Plugin contracts are broken on this branch until epic 2.
2. **#2185:** port each slot to the Slot API and merge `frontend-base` into `master`. Publishing and tutor-mfe inclusion land there.
3. **#2186:** split the tabs into widgets, per the 2026-09-24 FWG outcome recorded in the comments.

Epics 1 and 2 together are the "initial conversion" from that FWG discussion. Epic 1 and 2 PRs target `frontend-base`; epic 3 PRs target `master`.

### TODO

- [ ] Convert internal app structure (site.config, routes, providers)
- [ ] Reduce every slot to a placeholder; remove `@openedx/frontend-plugin-framework` and the `env.config.jsx` slot configuration
- [ ] Port header and footer customizations, if any (custom menus?); drop the direct `@edx/frontend-component-header` / `-footer` imports
- [ ] Fix tests

Publishing to NPM and inclusion in frontend-template-site and tutor-mfe moved to #2185, since they need the code on `master`.
