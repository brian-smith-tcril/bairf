# Plugin-era contracts the placeholder step breaks

Type: research
Status: resolved

## Question

Decision 3 reduces every plugin slot to a placeholder, removing `@openedx/frontend-plugin-framework` and `env.config.jsx` slot configuration. Decision 9 says breaking changes are decided in PRs, with a note on the ticket that touches them. This ticket produces those notes.

Enumerate every contract outside the 34 plugin-slot directories that the placeholder step or the frontend-platform removal breaks, with the file that implements it and who consumes it:

- the plugin-store `PluginOverridesProvider` / `registerOverrideMethod` consumer (`@edx/unit-translation-selector-plugin`, source private; check the published tarball);
- `SIDEBAR_WIDGETS` and anything else read from `env.config.jsx` (the upgrade widget, `src/widgets/discussions/`);
- the `courseHome.examsData` plugin contract (PR #1829);
- runtime config through `MFE_CONFIG_API_URL` versus frontend-base's `runtimeConfigJsonUrl`;
- `pluginProps` and `slotOptions` passed at the 26 slot index files: list which props each slot passes, since the Slot API port in #2185 has to restore them;
- anything else `grep -rn frontend-plugin-framework\|env.config` surfaces.

For each: what breaks on the `frontend-base` branch, which port ticket should carry the note, and whether #2185 restores it or a DEPR would be needed.

## Answer

Findings: `../research/plugin-era-contracts.md` (Learning master @ 7522f9c, frontend-base main as of 2026-10-19).

Seven contracts, with what breaks on the branch and who owns the restoration:

1. **Plugin framework and `pluginSlots` in `env.config.jsx`.** Every operator plugin config stops applying; three tests that un-mock the framework stop compiling. #2185 restores through `<Slot>` plus site config. Area: scaffold, then every page.
2. **Plugin override registry** (`src/generic/plugin-overrides`, host `Unit/index.tsx`). The registry is plain React and survives; it becomes unreachable because no plugin renders in a placeholder. Its only known consumer, `@edx/unit-translation-selector-plugin` 0.5.0, is already broken on master: it dispatches through the Redux plugin store removed in #2082, imports the model store removed in #2154, and reads props the slot stopped passing in #1643. Not a slot, so not #2185's; ports as a provider. Area: courseware page and scaffold providers.
3. **`SIDEBAR_WIDGETS`** (`defaultWidgets.js`, consumed by `Course.jsx`). Unaffected by placeholders; broken by the frontend-platform removal, since `getConfig` and the `env.config.jsx` loader leave. The shape can survive in site config. The upgrade widget's own `PluginSlot` (`UpgradePanel.jsx:88-105`, six props including two ADR 0010 aliases) is #2185's. Area: courseware sidebar.
4. **`courseHome.examsData`** (#1829). On master it is `useExamsData()` over React Query with no in-app caller; the hook survives but is unreachable until the progress-tab slots return. Whether the library exports it from `index.ts` is an open decision outside #2185's text. Area: progress tab.
5. **Runtime config.** frontend-platform fetched `${MFE_CONFIG_API_URL}?mfe=learning`; frontend-base fetches `runtimeConfigJsonUrl` verbatim and merges with `limitAppMergeToConfig`. The operator URL changes form. Area: scaffold.
6. **`pluginProps` and `slotOptions`.** 29 files, 34 attributes (26 slot index files, two nested course-exit slots, `UpgradePanel`), not the 45 in decision 3 and #2185's body, which counted grep lines. Slot API equivalent: extra `<Slot>` props reach every component widget through `useWidgets()`; `mergeProps` (11 slots) has no option equivalent, a replacement layout decides per ADR 0011. ADR 0009 makes props part of the versioned contract, so a changed prop set on restoration is a version bump of the slot id. Five slots pass no children.
7. Framework-era text in `course-outline/README.md`, every slot README, `example.env.config.jsx`, `README.rst` and the `setupTest.js` mock.

Possible-breaking-change notes for port tickets: operators' `env.config.jsx` (items 1, 3), the runtime-config URL form (5), the override-registry plugin (2, already broken). DEPRs only if the registry or the sidebar-widget mechanism is dropped, which no ticket decides.
