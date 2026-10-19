# Plugin-era contracts the placeholder step breaks

Sources: openedx/frontend-app-learning `master` at 7522f9c (2026-10-16); openedx/frontend-base `main` and openedx/frontend-platform `master` as served by the GitHub contents API on 2026-10-19; `@edx/unit-translation-selector-plugin` 0.5.0 from the npm registry. `env.config.jsx` is untracked and absent from the clone; the tracked `example.env.config.jsx` stands in for it.

Framework-era terms: "plugin slot" is `PluginSlot` from `@openedx/frontend-plugin-framework`; "slot" is frontend-base's `<Slot>`.

## 1. `@openedx/frontend-plugin-framework` and the `pluginSlots` config key

What it is. `package.json:46` depends on `@openedx/frontend-plugin-framework ^1.7.0` (lock resolves 1.8.0, `package-lock.json:5403`). `src/setupTest.js:26-35` mocks the package globally with `src/tests/MockedPluginSlot.jsx`. Operators configure plugins through the `pluginSlots` key of `env.config.jsx`, which frontend-platform loads through a webpack alias (`frontend-platform/src/initialize.js:50-56`) and merges in `jsFileConfig()` (`:157-172`). `README.rst:137-139` documents the framework as the customization mechanism.

Consumers. Every `pluginSlots` entry in an operator's `env.config.jsx`; `example.env.config.jsx:10-24` inserts `@edx/unit-translation-selector-plugin` into `unit_title_plugin` (not a slot ID or alias on master; `src/plugin-slots/UnitTitleSlot/index.tsx:25-26` has `org.openedx.frontend.learning.unit_title.v1` and alias `unit_title_slot`). Three test files `jest.unmock` the framework and set `pluginSlots` through `setConfig`: `src/course-home/progress-tab/ProgressTab.test.jsx:27,1539-1548`, `src/plugin-slots/CourseBreadcrumbsSlot/index.test.tsx:26,55-71`, `src/plugin-slots/SubmittedTimedExamInstructionsSlot/index.test.tsx:15`.

What breaks. Decision 3 removes the package, the `env.config.jsx` slot configuration and the `setupTest.js` mock in one step. Those three tests stop compiling; `src/tests/MockedPluginSlot.jsx` and its test lose their reason to exist.

Restored by #2185? Yes for slots: the how-to's "Refactor slots" section replaces `<PluginSlot />` with `<Slot />` and renames IDs per ADR 0009 (`docs/how_tos/migrate-frontend-app.md:1080-1085`); #2185's scope restates this and lists "Decide the slot ID namespace" as a task. No DEPR needed for the mechanism itself; whether the `v1` IDs are kept or renamed to `org.openedx.frontend.slot.learning.*` is a #2185 decision (ADR 0009 §1 names `slot` as the fixed Type segment, `:85-105`).

Port area. Scaffold (root `index.jsx` providers, `setupTest`), then every route-level page that renders a slot.

## 2. Plugin override registry (`PluginOverridesProvider` / `registerOverrideMethod`)

What it is. `src/generic/plugin-overrides/PluginOverridesContext.tsx:30-60` is a React context holding `pluginName -> methodName -> method`; `usePluginsCallback(methodName, defaultMethod)` folds registered overrides over the host's default (`:72-80`). `src/generic/plugin-overrides/index.ts` exports the three names. The provider wraps the routes at `src/index.jsx:31,56,137` and the test wrapper at `src/setupTest.js:17,273-275`. The one overridable method is `getIFrameUrl`, hosted at `src/courseware/course/sequence/Unit/index.tsx:8,47-56` (README table, `src/generic/plugin-overrides/README.md:44-48`). The module README states it "is not part of `@openedx/frontend-plugin-framework`" (`:3-6`). It replaced a Redux slice `@src/generic/plugin-store` in #2082 (2026-09-21, `refactor!`), migration diff at README `:62-82`.

Consumer. `@edx/unit-translation-selector-plugin`, latest 0.5.0 published 2025-03-18, repository `edx/frontend-plugins` (packument). What the tarball does:

- `dist/translation-selection/index.js:14,16,49,93-108`: `useDispatch()` from `react-redux` and `dispatch(registerOverrideMethod({ pluginName: id, methodName: 'getIFrameUrl', method }))` imported from `@src/generic/plugin-store`; the method appends `src_lang`/`dest_lang` to the iframe URL.
- `dist/index.js:16-17,42-54,62`: `useModel('coursewareMeta' | 'courseHomeMeta', courseId)` from `@src/generic/model-store` and `VERIFIED_MODES` from `@src/constants`; `dist/translations-loader/index.js` also imports `model-store`; `useSelectLanguage.js` and `translations-loader/index.js` import `@src/data/localStorage`.
- frontend-platform imports: `i18n` (17 files), `@edx/frontend-platform` (`subscribe`, `APP_I18N_INITIALIZED`, `getConfig().LMS_BASE_URL` and `.AI_TRANSLATIONS_URL` in `dist/data/api.js:22,26,114`), `auth`, `analytics`, `logging`. Peer deps: `@edx/frontend-platform *`, `@openedx/frontend-plugin-framework ^1.0.0`, `react-redux` is not declared (`package.json` peerDependencies).
- Props it reads: `id, courseId, unitId, unitTitle` (`dist/index.js:37-41,110-115`). The slot has passed `unitId, unit, isEnabledOutlineSidebar, renderUnitNavigation` since #1643 (2025-03-24; the commit's diff removes `courseId`/`unitTitle` from `pluginProps`); the plugin's README registers against the alias IDs `unit_title_slot` and `sequence_container_slot` (`README.md:21-50`).

Status on master before this effort: already broken. `src/generic/plugin-store` was deleted by #2082 and `src/generic/model-store` by #2154 (2026-10-05); neither path exists on master. The plugin's own repo is private, so whether a newer unpublished version exists is unknown.

What breaks on the `frontend-base` branch. The registry itself is plain React and imports nothing from the framework or frontend-platform; it survives the placeholder step unchanged, and the in-repo test `src/courseware/course/sequence/Unit/index.test.jsx:135-157` keeps passing. What is lost is the only way a plugin reaches `usePluginOverrides()`: being rendered inside a plugin slot (there is no in-repo caller of `registerOverrideMethod` outside tests). With placeholders, nothing external renders.

Restored by #2185? Rendering, yes. The registry is not a slot and is outside #2185's scope; it ports as application code (how-to: `providers.ts` "where global context providers are defined", `:835`). A DEPR is needed only if the branch drops the registry; the plugin needs a new release for reasons that predate this effort (its `@src/*` imports).

Port area. Courseware page (`Unit`); provider in the scaffold.

## 3. `SIDEBAR_WIDGETS` and the rest of `env.config.jsx`

What it is. `src/courseware/course/sidebar/constants.js:11-13` names the key; `defaultWidgets.js:18-39` reads `getConfig()[WIDGET_CONFIG.EXTERNAL_WIDGETS_KEY]`, filters out `enabled: false` entries (which can also disable a default by ID), appends externals not already default, sorts by `priority`. `src/courseware/course/Course.jsx:13,47` calls `getEnabledWidgets()` once per mount. The entry shape is `SidebarWidget` (`SidebarContext.tsx:43-51`): `id, priority, Sidebar, Trigger, Provider?, isAvailable?, enabled?`, three of them React components and one a function, so the value can only come from a JS config file, not from JSON. `DEFAULT_WIDGETS` is `[discussionsWidgetConfig, upgradeWidgetConfig]` (`defaultWidgets.js:9-12`; `src/widgets/discussions/widgetConfig.ts:10-18`, `src/widgets/upgrade/src/widgetConfig.ts:7-15`).

Documented contract. `src/courseware/course/sidebar/README.md:56-83,165-195` ("Widgets are registered via the `SIDEBAR_WIDGETS` key in `env.config.jsx`", npm-package method at `:74-83`); `ARCHITECTURE.md:25-27`; `src/widgets/upgrade/README.md:13-37` (disable with `{ id: 'UPGRADE', enabled: false }`; explicit registration ahead of a planned default removal); `docs/decisions/0010-upgrade-widget-extraction.md:32-38,58,169-186`; `src/widgets/discussions/README.md:36-48` (override `isAvailable`); `example.env.config.jsx:8`. The README's example package `@edx/learning-upsell-widgets` (`:228`) is not on the npm registry (404).

Consumers. Operators' `env.config.jsx`; tests `SidebarTriggers.test.jsx:173-222` and `defaultWidgets.test.js:41-133` set the key with `mergeConfig`/mocked `getConfig`.

What breaks. Not the placeholder step: the key is read through `getConfig()`, not the framework. The frontend-platform removal takes `getConfig()`, `mergeConfig` and the `env.config.jsx` loader with it (how-to `:633-640`: `getConfig` becomes `getSiteConfig`; `:741`: ".env files and env.config.js files" are replaced by site config). The documented file name and key location therefore change for every operator who registers a widget; the data shape can survive because site config is JS.

Restored by #2185? No; #2185 covers slots, and #2186 covers "splitting tabs into widgets" (map, Out of scope). This contract has no owner yet. A DEPR is needed only if the key is dropped rather than relocated; ADR 0010's own DEPR inventory (`:44-58`) already lists the pending default-removal change.

Also in this area: the upgrade panel's own plugin slot, `src/widgets/upgrade/src/UpgradePanel.jsx:88-105`, ID `org.openedx.frontend.learning.upgrade_panel.v1` with two deprecated aliases and `pluginProps` `courseId, model: 'coursewareMeta', upgradeCurrentState, setUpgradeCurrentState` plus deprecated aliases `notificationCurrentState, setNotificationCurrentState` (ADR 0010 `:91-102`). It is a prop-passing site outside `src/plugin-slots/` and is in #2185's scope ("plus the upgrade widget's slot").

Port area. Courseware page (`Course.jsx`, sidebar).

## 4. `courseHome.examsData` (PR #1829)

Original shape. #1829 "Fetch exams data on the progress page", merged 2025-12-15, body: "allows children of the root `ProgressPage` or downstream plugin slots to access this data from the Redux store." It added `getExamsData(courseId, sequenceId)` (edx-proctoring or edx-exams attempt URL by `EXAMS_BASE_URL`), thunk `fetchExamAttemptsData` resolving one `response.exam || {}` per sequence, `setExamsData` on the `courseHome` slice (`examsData: null` initial), and `useGetExamsData` dispatched from `ProgressTab.jsx` with the subsection `blockKey`s of `sectionScores`.

Shape on master. Redux is gone. `src/course-home/progress-tab/hooks.jsx:10-18` exports `useExamsData()` ("Plugin-facing; no in-app caller"), which reads the already-fetched progress query (`useProgressTabData(..., { enabled: false })`), derives the sequence IDs and calls `useExamAttemptsData` (`src/course-home/data/apiHooks.ts:118-134`; `getExamsData` typed `ExamAttempt` at `api.ts:443-468`, 404 → `{}`). Returns the array or `null`. `src/course-home/progress-tab/README.md:5-42` documents it for a widget in `org.openedx.frontend.learning.progress_tab_course_grade.v1`, importing from `./src/course-home/progress-tab/hooks`. `ProgressTab.test.jsx:1530-1590` covers it through an unmocked `PluginSlot`, including "makes no attempt requests when no plugin reads the data" (`:1580-1590`).

What breaks. The hook is React Query plus `useParams` and survives. The two things that break are: the test (`jest.unmock` at `:27`), and reachability, since a progress-tab placeholder renders no plugin. The README's import path assumes a plugin bundled with the repo's source (`./src/...`); under frontend-base the app is a library whose public surface is `index.ts` (how-to `:833`), so the hook is reachable to a plugin only if exported there.

Restored by #2185? The slot, yes. Whether `useExamsData` is exported from `index.ts` is undecided and not in #2185's text. No DEPR needed while the hook exists.

Port area. Course-home progress tab page.

## 5. Runtime config: `MFE_CONFIG_API_URL` versus `runtimeConfigJsonUrl`

Today. frontend-platform `config.ts:266-267` reads `MFE_CONFIG_API_URL` and `APP_ID` from `process.env`; `initialize.js:180-196` fetches `${MFE_CONFIG_API_URL}?mfe=${APP_ID}` and `mergeConfig(data)`. In Learning, `.env`, `.env.development` and `.env.test` set only `APP_ID='learning'` (`:7` in each); `package.json:20` (`dev` script) sets `MFE_CONFIG_API_URL='http://local.openedx.io:8000/api/mfe_config/v1'`. `src/index.jsx:159-194` merges 25 `process.env` keys (including `EXAMS_BASE_URL`) in the `config` handler.

frontend-base. `types.ts:94` `runtimeConfigJsonUrl: string | null` (default `null`, `runtime/config/index.ts:130`; doc `:83-92` points at the same edx-platform MFE Config API ADR). `runtime/initialize.js:166-191`: if set, resolve against `window.location.origin`, add a `timestamp` cache-buster in `DEVELOPMENT`, GET it, reject anything that is not a JSON object, and `mergeSiteConfig(data, { limitAppMergeToConfig: true })`. No `mfe=` parameter is appended and no `APP_ID` is read.

What breaks. The `?mfe=learning` suffix moves from code to the operator's URL; the `process.env` keys become site-config/app-config values (how-to `:720-741`). Not a slot concern, so not #2185; it lands with the scaffold layer and the tutor-mfe inclusion that #2185 lists as an exit criterion. No DEPR: operator configuration changes form, nothing is dropped.

Port area. Scaffold (site config), not a page.

## 6. `pluginProps` and `slotOptions`

Slot API facts the table relies on. `<Slot>` accepts `id`, `idAliases`, `children`, `layout` and arbitrary extra props (`runtime/slots/Slot.tsx:7-13`), all placed in `SlotContext` (`:33-38`). `useWidgets()` removes `id` and `children` and passes the rest to `useWidgetsForId` (`widget/hooks.ts:9-13`), which spreads them onto every `component` widget (`widget/utils.tsx:102-108`); `element` and iframe widgets receive nothing. Per-widget configuration comes from `WidgetOperationTypes.OPTIONS` through `useWidgetOptions()` (`widget/types.ts:45-48`, `widget/hooks.ts:62-84`); per-slot configuration from `LayoutOperationTypes.OPTIONS` through `useLayoutOptions()` (`layout/types.ts:11-25`, `layout/hooks.ts:35-58`). ADR 0011 rejects a wrapping operation; a layout replacement reads `useWidgets().byId()/withoutId()`, and "The slot's children are available as the `defaultContent` widget" (`0011-no-slot-wrapping-operation.rst:55-65,110-114`). ADR 0009 §2 makes a slot's React props part of its versioned contract, `children` excluded (`:131-149`).

Counts. 26 `src/plugin-slots/*/index.*` files match, plus `CourseExitPluginSlots/CourseExitViewCoursesPluginSlot/index.tsx:30-32` and `DashboardFootnoteLinkPluginSlot/index.tsx:42-44` (both `slotOptions.mergeProps` only, nested one level deeper) and `UpgradePanel.jsx` (section 3): 29 files, 34 `pluginProps=`/`slotOptions=` attributes. Decision 3 and #2185 say "45 sites"; that figure does not match any count taken here (29 files, 34 attributes, 37 occurrences including tests).

| Slot (file under `src/plugin-slots/`) | `pluginProps` names | `slotOptions` | Slot API equivalent |
| --- | --- | --- | --- |
| BannerDatesUpgradeSlot (`index.tsx:10-18`) | `courseId, logUpgradeLinkClick` | — | JSX props on `<Slot>` |
| ContentIFrameErrorSlot (`index.tsx:11-16`) | `courseId` | — | JSX props; default `ErrorPage` import leaves with frontend-platform (`:4`) |
| ContentIFrameLoaderSlot (`index.tsx:10-19`) | `defaultLoaderComponent` (a React element), `courseId` | — | JSX props; the element prop is what ADR 0011 calls `defaultContent` |
| CourseBreadcrumbsSlot (`index.tsx:16-29`) | `courseId, sectionId, sequenceId, unitId, isStaff` | `mergeProps: true` | JSX props; no children, so `mergeProps` has nothing to merge into |
| CourseHomeSectionOutlineSlot (`index.tsx:14-29`) | `expandAll, sectionIds, sections` | — | JSX props |
| CourseOutlineMobileSidebarTriggerSlot (`index.tsx:8-16`) | — | `mergeProps: true` | layout (ADR 0011) or nothing |
| CourseOutlineSidebarCompletionIconSlot (`index.tsx:17-24`) | `completionStat, enabled, active, variant` | — | JSX props |
| CourseOutlineSidebarHeadingSlot (`index.tsx:12-23`) | `onToggleCollapse, isDisplaySequenceLevel, backButton` | — | JSX props |
| CourseOutlineSidebarSlot (`index.tsx:8-16`) | — | `mergeProps: true` | layout or nothing |
| CourseOutlineSidebarTriggerSlot (`index.tsx:17-31`) | `sectionId, sequenceId, unitId, isStaff` | `mergeProps: true` | JSX props; layout for the merge |
| CourseOutlineSidebarUnitSlot (`index.tsx:24-39`) | `unit, isLocked, isCompletionTrackingEnabled, icon` | — | JSX props |
| CourseOutlineTabNotificationsSlot (`index.tsx:8-15`) | `courseId, model: 'outline'` | — | JSX props; `model` names a deleted model-store key (#2154) |
| CourseTabLinksSlot (`index.tsx:10-15`) | `activeTabSlug` | — | JSX props |
| GatedUnitContentMessageSlot (`index.tsx:9-17`) | `courseId` | — | JSX props |
| HeaderSlot (`index.jsx:9-28`) | `courseOrg, courseNumber, courseTitle, showUserDropdown` | `mergeProps: true` | shell header slot (decision 4; how-to `:905`) |
| LearnerToolsSlot (`index.jsx:22-38`) | `courseId, unitId, userId, isStaff, enrollmentMode` | — | JSX props; `getAuthenticatedUser` import leaves with frontend-platform (`:4`); rendered through `createPortal` to `document.body` |
| NextUnitTopNavTriggerSlot (`index.tsx:28-53`) | `disabled, buttonText, nextLink, sequenceId, onClickHandler, variant, buttonStyle, isAtTop` | — | JSX props |
| ProgressCertificateStatusSlot (`index.jsx:5-11`) | `courseId` | — | JSX props |
| ProgressTabCourseCompletionSlot (`index.tsx:8-13`) | `enableProgressGraph` | — | JSX props |
| RightSidebarSlot (`index.tsx:8-22`) | — | `mergeProps: true` | layout or nothing; carries two deprecated aliases (ADR 0010) |
| RightSidebarTriggerSlot (`index.tsx:8-22`) | — | `mergeProps: true` | layout or nothing; two deprecated aliases |
| SequenceBottomNavigationSlot (`index.tsx:22-44`) | `courseId, sequenceId, unitId, onClickNext, onNavigate, onClickPrevious` | `mergeProps: true` | JSX props; layout for the merge |
| SequenceContainerSlot (`index.jsx:5-12`) | `courseId, unitId` | — | JSX props; no children |
| SequenceNavigationSlot (`index.jsx:12-24`) | `sequenceId, unitId, nextHandler, onNavigate, previousHandler` | `mergeProps: true` | JSX props; no children |
| SubmittedTimedExamInstructionsSlot (`index.tsx:14-21`) | `timeIsOver` | — | JSX props; `useIntl` import moves to frontend-base |
| UnitTitleSlot (`index.tsx:24-47`) | `unitId, unit, isEnabledOutlineSidebar: true, renderUnitNavigation` | — | JSX props; `isEnabledOutlineSidebar` is kept "for backward compatibility" only (README `:16-17`) |
| CourseExitPluginSlots/CourseExitViewCoursesPluginSlot (`index.tsx:28-35`) | — | `mergeProps: true` | layout or nothing |
| CourseExitPluginSlots/DashboardFootnoteLinkPluginSlot (`index.tsx:40-48`) | — | `mergeProps: true` | layout or nothing |
| `src/widgets/upgrade/src/UpgradePanel.jsx:88-105` | `courseId, model: 'coursewareMeta', upgradeCurrentState, setUpgradeCurrentState, notificationCurrentState, setNotificationCurrentState` | — | JSX props; the two `notification*` names and `model` are already in ADR 0010's deprecation table |

What breaks. All of it, in epic 1 (decision 3). Restored by #2185 per slot; ADR 0009 §2-3 mean a prop set that changes on restoration is a version bump plus a DEPR for the `v1` name.

## 7. Other hits

- `src/courseware/course/sidebar/sidebars/course-outline/README.md:7`: the outline tray "is rendered directly via plugin slots" (CourseOutlineSidebarSlot and its triggers), outside `SIDEBAR_WIDGETS`.
- `src/course-home/progress-tab/README.md:12`, `src/widgets/upgrade/README.md:46-65`, every `src/plugin-slots/*/README.md` and `example.env.config.jsx`: framework-era examples that become false in epic 1 and are rewritten per slot in #2185 (catalog pattern: README plus site-config example).
- `README.rst:137-139` ("Plugins") and `:141-147` ("configured via environment variables supplied at build time").
- `src/setupTest.js:26-35` mock and `src/tests/MockedPluginSlot.jsx`: test infrastructure deleted with the dependency.
