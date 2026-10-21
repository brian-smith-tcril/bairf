Epic 2 of 3 for the frontend-base conversion. Follows #1905 (epic 1), which lands Learning on `master` on frontend-base with every slot reduced to a placeholder that renders its default content in a bare fragment. This epic restores each slot on the frontend-base Slot API, on `master`. The widget split is #2186.

Together, #1905 and this issue are the "initial conversion" agreed at the 2026-09-24 Frontend Working Group (recorded on #1905): slots converted, everything renders and works.

> [!NOTE]
> This issue body was drafted by Claude (Claude Code) and reviewed before posting.

### Scope

- Port each placeholder under `src/plugin-slots/` to the Slot API, following the per-slot pattern of openedx/frontend-app-catalog#137: fragment to `<Slot id>`, a README with a site-config example, screenshots where the existing README has them. 34 slot directories on `master` today, plus the upgrade widget's slot (`src/widgets/upgrade/`, ADR 0010). The auxiliary sidebar comes with two questions deferred from its port: how a site registers widgets (the `SIDEBAR_WIDGETS` list on `master`, merged with the built-ins by `defaultWidgets.js`, which ports here rather than with the auxiliary sidebar; a registry entry is a panel, a trigger, a provider and a per-unit availability check, which a slot widget's static `condition` does not cover, so either the slot's layout defines a widget contract or each widget inserts a trigger and a panel and carries its own availability; a Tutor plugin such as tutor-forum could then insert the discussions widget from site config), and the upgrade widget: its panel is a plugin slot with no default content (since 14c662dc), #1902 already lists its default registration for removal, and whether it ports at all, and as what, is settled here (if it does: its slot, files, registry entry and six slot props, two of them aliases ADR 0010 deprecated). Both are looked at again in #2186. The outline tab's notifications slot comes with one more: the new-user course home tour has an upgrade step anchored to an id that only an upsell plugin in that slot renders, a deprecation candidate once there is a clear way for an operator to add a step to the tour.
- Restore the per-slot contracts the placeholders dropped: 29 files on `master` pass plugin props or slot options, 34 attributes in all. Each port decides what the Slot API equivalent is.
- Decide the slot ID namespace against frontend-base's convention before the first port; Learning's current IDs (`org.openedx.frontend.learning.*.v1`) and catalog's (`org.openedx.frontend.slot.catalog.*.v1`) differ in shape.

### Exit criteria

- [ ] Every slot ported, with a README

The merge to `master`, publishing and the frontend-template-site and tutor-mfe inclusion were here from 2026-10-18 to 2026-10-21 and are back on #1905, since the branch now lands at the end of epic 1.
