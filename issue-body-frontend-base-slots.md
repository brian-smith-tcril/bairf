Epic 2 of 3 for the frontend-base conversion. Follows #1905 (epic 1), which lands Learning on the long-lived `frontend-base` branch with every slot reduced to a placeholder that renders its default content in a bare fragment. This epic restores each slot on the frontend-base Slot API and merges the branch to `master`. The widget split is #2186.

Together, #1905 and this issue are the "initial conversion" agreed at the 2026-09-24 Frontend Working Group (recorded on #1905): slots converted, everything renders and works.

> [!NOTE]
> This issue body was drafted by Claude (Claude Code) and reviewed before posting.

### Scope

- Port each placeholder under `src/plugin-slots/` to the Slot API, following the per-slot pattern of openedx/frontend-app-catalog#137: fragment to `<Slot id>`, a README with a site-config example, screenshots where the existing README has them. 34 slot directories on `master` today, plus the upgrade widget's slot (`src/widgets/upgrade/`, ADR 0010). The auxiliary sidebar comes with two questions deferred from its port: how a site registers widgets (the `SIDEBAR_WIDGETS` list on `master`; a registry entry is a panel, a trigger, a provider and a per-unit availability check, which a slot widget's static `condition` does not cover, so either the slot's layout defines a widget contract or each widget inserts a trigger and a panel and carries its own availability; a Tutor plugin such as tutor-forum could then insert the discussions widget from site config), and the upgrade widget, which ports here with its slot, files, registry entry and six slot props (two of them aliases ADR 0010 deprecated), its default registration settled in line with #1902, which already lists it for removal. Both are looked at again in #2186.
- Restore the per-slot contracts the placeholders dropped: 29 files on `master` pass plugin props or slot options, 34 attributes in all. Each port decides what the Slot API equivalent is.
- Decide the slot ID namespace against frontend-base's convention before the first port; Learning's current IDs (`org.openedx.frontend.learning.*.v1`) and catalog's (`org.openedx.frontend.slot.catalog.*.v1`) differ in shape.
- Merge `frontend-base` into `master`.

### Exit criteria (moved here from #1905)

- [ ] Every slot ported, with a README
- [ ] `frontend-base` merged to `master`
- [ ] Publish to NPM
- [ ] Include in frontend-template-site
- [ ] Include in tutor-mfe as a frontend app
