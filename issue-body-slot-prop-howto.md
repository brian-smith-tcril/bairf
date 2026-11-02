> [!NOTE]
> This issue was written by Claude (Claude Code) and reviewed before posting.

**Goal:** a how-to in `docs/how_tos/` that walks an app maintainer through renaming or changing a slot prop: what the change does to the slot's contract, which path it takes, and what the plugin author sees along the way.

**Why:** [ADR 0009](https://github.com/openedx/frontend-base/blob/main/docs/decisions/0009-slot-naming-and-lifecycle.rst) sets the rules but not the steps. Section 2 makes props the contract ("a given slot's API contract is comprised of: Its React props, with the notable exclusion of `props.children`") and says the version increments when a change means "existing widgets can be reasonably expected to break". Section 3 says the previous version is deprecated through the Open edX DEPR process and kept "for the duration of the deprecation process, which should include at least one Open edX release where it co-exists with the new version". Nothing in `docs/how_tos/` (automatic-case-conversion, caching, i18n, migrate-frontend-app, permissions, theming) turns that into a procedure; the migration how-to's slot section covers only the move from `<PluginSlot />` to `<Slot />` and re-naming ids.

The gap shows in review. openedx/frontend-app-catalog#174 renames the catalog page's data layer and its internals but keeps the slot props `courseDataResultsLength` and `totalCourses` under their old names "so existing site plugins keep working", because there is no documented way to do otherwise. The additive path (add the new prop beside the old one, mark the old one deprecated, remove it at the next slot version) fits ADR 0009 as written, but a maintainer has to work that out from the ADR each time, and nothing says how to mark the deprecation so a plugin author notices.

This issue covers the prop rename and prop change case. Its scope may grow.

<details>
<summary> Claude Plan </summary>

Written 2026-11-02 against `ae5ec93` on `main`.

### What the how-to would cover

1. **Classifying the change.** A new optional prop: additive, no version change. A renamed prop: additive if the old name stays for a release, breaking if it goes at once. A prop whose type changes: breaking when existing widgets stop compiling or misbehave (the question of what a prop's type exposes is #339, which this guide defers to). A removed prop: breaking.
2. **The additive path for a rename.** Add the new prop; keep the old one, forwarding to the new one in the slot's default content; mark the old one deprecated in the TypeScript (`@deprecated` on the interface member, naming the replacement and the version it goes away in) and in the slot's README; note it in the release notes (conventional-commits footer); remove it at the next slot version via the ADR 0009 section 3 process.
3. **The breaking path.** When the additive path is not possible: `v2` slot id, both versions rendered for a release, DEPR ticket, the README documenting both.
4. **What the plugin author sees.** The `@deprecated` tag in their editor, the README's deprecation note, the release note; and the one place to look for the replacement.
5. **A worked example**, taken from a real slot once one has gone through the path.

### Open questions

- Whether a deprecated prop needs a DEPR ticket of its own or rides on the slot version's DEPR when it is finally removed.
- Whether pre-release apps (frontend-app-catalog has published only `1.0.0-alpha.*`) follow the same path or may rename outright.
- Whether a lint rule or type-level check should enforce that a renamed prop keeps its old name for a release, or whether the how-to is enough.

### Where it lives

`docs/how_tos/slot-props.md` (or a broader `docs/how_tos/slots.md` if the scope grows), linked from ADR 0009's Consequences section and from the migration how-to's slot section.

</details>
