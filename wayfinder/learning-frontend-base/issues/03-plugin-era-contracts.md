# Plugin-era contracts the placeholder step breaks

Type: research
Status: open

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
