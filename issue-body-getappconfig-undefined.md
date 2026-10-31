> [!NOTE]
> This issue was written by Claude (Claude Code) and reviewed before posting.

**Goal:** make `getAppConfig(appId)` always return an object, as its declared return type (`AppConfig`) and the migration how-to both promise.

**Why:** `getAppConfig` in `runtime/config/index.ts` has an early return:

```ts
const defaultConfig = appDefaultConfigs[id];
if (defaultConfig === undefined && commonAppConfig === undefined) {
  return appConfigs[id];
}
return merge({}, defaultConfig, commonAppConfig, appConfigs[id]);
```

`appConfigs[id]` is only set when the app registered a `config`, so an app with no `defaultConfig`, in a site with no `commonAppConfig`, and with no `config`, gets `undefined` from a function typed `(id: string) => AppConfig`. The how-to (`docs/how_tos/migrate-frontend-app.md`, "App-specific configuration") tells app authors to read `getAppConfig(appId).key` with no guard, and `useAppConfig` is seeded from the same call in `CurrentAppProvider`, so it is `undefined` in the same case. The early return predates `defaultConfig`: before #298 it was `if (commonAppConfig === undefined) return appConfigs[id]`, so the gap has been there since the three-source merge was introduced; #298 only widened the condition.

frontend-base itself reads app config in two places, and they disagree about the contract: `runtime/scripts/index.ts` guards with `getAppConfig(app.appId) ?? {}`, while `shell/header/helpButtonSlotOperation.tsx` reads `getAppConfig(appId).SUPPORT_URL` unguarded and `HelpButton` calls that `getUrl` at render, so any app that adds the help button and has no config of its own throws in the header. learner-dashboard master mounts it in `src/widgets/LearnerDashboardHeader/app.tsx`, so it is the next throw in the same crash; catalog and instructor-dashboard mount it too. The existing tests cover "app config as-is when commonAppConfig is not set" only for an app that has a `config`; the no-config case is untested.

A deployed site reaches it the same way. Runtime config is optional: the module doc on `runtime/config/index.ts` says it "can be enabled by supplying a runtimeConfigJsonUrl", ADR 0007 makes the JavaScript site config a configuration method in its own right, and #118 lets `runtimeConfigJsonUrl` point at a static `.json` file rather than the LMS. A site built from a `site.config.tsx` that sets no `commonAppConfig`, or whose runtime config JSON carries none, hands every app without a `config` an `undefined`. The LMS's `/api/frontend_site_config/v1/` always serves `commonAppConfig`, which is why sites that use it never see this; it is where the gap has stayed hidden, not a guarantee. The reproduction is `npm run dev`: openedx/frontend-app-learner-dashboard#868 removed that app's bundled `config` per ADR 0017 and bundled no `defaultConfig`, its `site.config.dev.tsx` sets neither `commonAppConfig` nor `runtimeConfigJsonUrl`, and master's dev server now crashes on first render with `Cannot read properties of undefined (reading 'ENABLE_PROGRAMS')` from `src/widgets/LearnerDashboardHeader/app.tsx`. Every other converted app that reads config avoids it by accident: account, authn, catalog and profile bundle a `defaultConfig`, and instructor-dashboard spreads a `config` block into its dev site config for the help button. admin-console, aspects, gradebook, notifications and frontend-template-application read no config; frontend-template-site is a site and sets `commonAppConfig`.

<details>
<summary> Claude Plan </summary>

Written 2026-10-31 against `ae5ec93` on `main`.

### Baseline

- `runtime/config/index.ts`: the initial `siteConfig` literal sets no default for `commonAppConfig` (nor for `basename`, `headerLogoImageUrl` and the three service classes). `SiteConfig` is `RequiredSiteConfig & Partial<OptionalSiteConfig>` in `types.ts`, so `getSiteConfig().commonAppConfig` is typed as possibly `undefined`; the early return is the only place that distinction leaks out. `initialize.js` applies the site's config file with `mergeSiteConfig(config)` over that literal, so a default there reaches every site.
- `addAppConfigs` registers `appDefaultConfigs[appId]` and `appConfigs[appId]` only when the app sets the field; `mergeAppConfig` replaces an entry with a fresh merged object.
- `getAppConfig` returns a fresh `merge({}, ...)` object on every call on the merge path, so nothing downstream can rely on reference identity today except on the early-return path. `CurrentAppProvider` re-reads on `CONFIG_CHANGED` and stores the result in state.

### Change

1. **`getAppConfig`** drops the early return and always returns `merge({}, defaultConfig, commonAppConfig, appConfigs[id])`. The result for an app with nothing registered, or an unknown `appId`, is `{}`. The documentation comment above it gains one line saying so.
2. **Default `commonAppConfig: {}`** in the initial `siteConfig` literal. With 1 in place this changes nothing (`merge` skips an `undefined` source); it only spares later readers of `getSiteConfig().commonAppConfig` the undefined case. Optional; dropped if review would rather keep the literal minimal.
3. **`runtime/scripts/index.ts`** loses the now-dead `?? {}`; `helpButtonSlotOperation.tsx` is unchanged (the `as string | undefined` cast is about the key, not the object).

Not here: the `commonAppConfig` naming question in #268's discussion, and which apps should bundle which defaults (the per-app audit is its own issue).

### Tests

- `runtime/config/index.test.ts`, in `describe('getAppConfig with defaultConfig')` or a new sibling: an app with no `defaultConfig`, no `config` and no `commonAppConfig` returns `{}`; an `appId` not in `apps` returns `{}`; the existing merge-order cases are unchanged.
- A new `runtime/react/hooks/useAppConfig.test.tsx` (neither `CurrentAppProvider` nor `useAppConfig` has a test today): `useAppConfig()` returns `{}` for such an app.
- `npm run typecheck`, `npm run lint`, `npm test`.

### Commit and PR

One commit, `fix: getAppConfig always returns an object`; `main` is the `alpha` prerelease channel in `.releaserc`, so it ships as the next `2.0.0-alpha.N`. Branch on the fork, PR against `main`, "Resolves #337". The first consumer check is openedx/frontend-app-learner-dashboard master's `npm run dev` rendering again with no change to that repo.

</details>
