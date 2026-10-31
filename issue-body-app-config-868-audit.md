> [!NOTE]
> This issue was written by Claude (Claude Code) and reviewed before posting.

**Goal:** finish the app-config audit that #299 (now closed) started, so that every converted app bundles only genuine defaults in `defaultConfig`, falls back at the read site for everything else, and carries no app `config` block in its `site.config.dev.tsx`.

**Why:** ADR 0017 and #268 split `App.config` (the operator's) from `App.defaultConfig` (the author's), and #299 asked each app to "sort its bundled keys into genuine defaults, which move, and no-ops or placeholders, which go away". openedx/frontend-app-catalog#156 and openedx/frontend-app-learner-dashboard#868 did that sort strictly: a key is a default only when it changes behaviour against an unset read, so `null`, `''` and `false` placeholders and "no-ops against already-guarded reads" were dropped and the reads given a fallback. authn did the same sort the same day (`d124a0a`, "feat!: bundle only real defaults in app config") and kept only the three keys the rule keeps; account and profile were converted a month later, in their "adopt frontend-base tooling" commits, with a looser reading. Enumerated 2026-10-31 over every openedx repo with a `site.config.dev.tsx`:

| App | `defaultConfig` | `site.config.dev.tsx` app `config` block | Reads config |
|---|---|---|---|
| account | 9 keys: `SUPPORT_URL: null`, `PASSWORD_RESET_SUPPORT_LINK: null`, `SHOW_PUSH_CHANNEL: false`, `ENABLE_COPPA_COMPLIANCE: false`, `ENABLE_DOB_UPDATE: false`, `MARKETING_EMAILS_OPT_IN: false`, `COUNTRIES_WITH_DELETE_ACCOUNT_DISABLED: []`, `ENABLE_ACCOUNT_DELETION: true`, `SUPPORT_URL_TO_UNLINK_SOCIAL_MEDIA_ACCOUNT: <help.edx.org URL>` | `SUPPORT_URL`, `PASSWORD_RESET_SUPPORT_LINK`, `SHOW_PUSH_CHANNEL` | yes |
| authn | `DISABLE_ENTERPRISE_LOGIN: true`, `LOGO_URL`, `LOGO_WHITE_URL` (edx-cdn) | `INFO_EMAIL`, `MARKETING_SITE_BASE_URL`, `SESSION_COOKIE_DOMAIN` | yes, ~20 keys |
| profile | `DISABLE_VISIBILITY_EDITING: false`, `CREDENTIALS_BASE_URL: null` | `CREDENTIALS_BASE_URL: 'http://local.openedx.io:18150'` | yes |
| catalog | `HOMEPAGE_COURSE_MAX` | `ENABLE_COURSE_DISCOVERY`, `ENABLE_COURSE_SORTING_BY_START_DATE`, `INFO_EMAIL` | yes |
| instructor-dashboard | none | `SUPPORT_URL` | only the shell help button via `helpButtonSlotOperation`, which reads `SUPPORT_URL` at render |
| learner-dashboard | none (#868) | none | yes |
| admin-console, aspects, gradebook, notifications | none | none | no |
| frontend-template-application | none | none | no |
| frontend-template-site | n/a | `commonAppConfig: { SUPPORT_URL }` and a `config` block on the instructor dashboard | n/a |

Three things follow. First, the `null`/`false` entries in account and profile are the placeholders #156 and #868 removed elsewhere; by the same rule they go, and their reads get the fallback. Second, the dev-config `config` blocks are operator configuration typed into a developer file: they shadow what the operator's site config would supply, and four of the five carry at least one value tutor already serves in `commonAppConfig` (`INFO_EMAIL`, `MARKETING_SITE_BASE_URL`, `ENABLE_COURSE_DISCOVERY`, `ENABLE_COURSE_SORTING_BY_START_DATE`, `CREDENTIALS_BASE_URL`, `PASSWORD_RESET_SUPPORT_LINK` are all in the dev tutor response, though tutor's `CREDENTIALS_BASE_URL` is `''`, which hides the records button the dev block's laptop URL shows). For instructor-dashboard, which bundles no `defaultConfig`, the block is also the only thing keeping its help button off the `getAppConfig` `undefined` return that learner-dashboard master now hits in `npm run dev` (#337); the four apps with a `defaultConfig` take the merge path with or without their block. Third, the dev-config values tutor does not serve are account's `SUPPORT_URL` and `SHOW_PUSH_CHANNEL`, instructor-dashboard's `SUPPORT_URL` and authn's `SESSION_COOKIE_DOMAIN`. The last is read only by two `setCookie` calls (`RegistrationPage.jsx`, `RedirectLogistration.jsx`), which set a host-only cookie when it is unset, so a one-host dev run does not notice; it is an operator value, not a default.

<details>
<summary> Claude Plan </summary>

Written 2026-10-31 against frontend-base `ae5ec93`; app heads: account `662bbf7`, authn `0f9f2a9`, profile `b6ebe9b`, catalog `586f5f6`, instructor-dashboard `25c6f02`, learner-dashboard `162fad7`.

### The rule, as #156 and #868 applied it

- A bundled key stays, in `defaultConfig`, only when its value differs from what the read site does with `undefined`. A boolean default of `false` behind a truthiness or `=== true` read, a `null` or `''` URL behind a read that renders nothing without it, and an empty array behind an `includes` are all no-ops and go. A `true` default, a number, or a real URL the product owns (ADR 0017's "default logo") stays.
- A read of a removed key gets its fallback at the read site: the catalog pattern is `getLearningHomePageUrl` returning `null` and the button gated on it; the learner-dashboard pattern is the credit checkout link returning `null`.
- An app repo's `site.config.dev.tsx` carries site identity and URLs only: no app `config` block, no `commonAppConfig`. A value a dev run needs that an operator would set comes from the LMS (`runtimeConfigJsonUrl: '/api/frontend_site_config/v1/'`, which frontend-base's own `shell/site.config.dev.tsx` and `test-site/site.config.dev.tsx` use, and which the dev server already proxies) or is a real default and belongs in `defaultConfig`. The LMS route has one catch to settle before any app takes it: the runtime merge applies the whole response, so the LMS's `baseUrl` (`http://apps.local.openedx.io:8080`) replaces the app's own dev port.
- Every step that leaves an app with no `defaultConfig` and no dev block (learner-dashboard now, profile after 4, instructor-dashboard after 6) waits for #337: the shell help button reads `getAppConfig(appId).SUPPORT_URL` at render inside frontend-base, and no app-side guard reaches it.

### Per app

1. **learner-dashboard**: nothing to bundle and no dev block to drop. The five app reads, in `src/widgets/LearnerDashboardHeader/app.tsx` (`ENABLE_PROGRAMS`, `ORDER_HISTORY_URL`), `OrderHistoryLinkMenuItem.jsx`, `src/data/services/lms/urls.js` and the `useAppConfig` read in `UnenrollConfirmModal`, are value-guarded only, and the sixth, the help button mounted in the same `app.tsx`, is frontend-base's own, so nothing here can make the dev run survive an `undefined` config. This app waits for #337 and then takes only the frontend-base bump.
2. **account**: audit the nine; by the rule `ENABLE_ACCOUNT_DELETION: true` and `SUPPORT_URL_TO_UNLINK_SOCIAL_MEDIA_ACCOUNT` stay, the rest go. The four booleans and the array already pass through `parseEnvBoolean` and `parseEnvArray`, which take `undefined`. The two `null` URLs are not gated: `ReviewRequirementsPanel.jsx`, `SummaryPanel.jsx`, `AccountSettingsPage.jsx` and `ConfirmationAlert.jsx` render a `Hyperlink` with the raw value, so they get the catalog gate (no link when unset instead of a dead one), which is the user-facing change that makes this PR a `feat!:`. Drop the dev block.
3. **authn**: the three defaults stay (a `true` and two product logos). Drop the dev block: tutor serves `INFO_EMAIL` and `MARKETING_SITE_BASE_URL`, and `SESSION_COOKIE_DOMAIN` unset means host-only cookies from the two `setCookie` calls. The one thing to check by hand is the registration flow with that key unset.
4. **profile** (after #337, since this leaves it with no `defaultConfig`): `DISABLE_VISIBILITY_EDITING: false` and `CREDENTIALS_BASE_URL: null` go, and the comments that document them as deliberate nulls go with them; `useIsVisibilityEnabled` already runs `parseEnvBoolean` and the `ProfilePage` read already gates the button. Drop the dev block (a laptop URL, the `LEARNING_BASE_URL` case from #868; tutor's `''` hides the button, which is the production case).
5. **catalog**: `defaultConfig` is already right. Drop the dev block (all three keys served by tutor).
6. **instructor-dashboard** (after #337, since the help button's read throws at render with nothing registered): drop the dev block; the help button then needs `SUPPORT_URL` from the operator, which is the production case anyway.
7. **frontend-template-application**: show `defaultConfig` on the app (per #268's checklist, "its example should demonstrate `defaultConfig`"); its dev config has no block to drop. **frontend-template-site** is a site, so the dev-config rule does not apply: its `commonAppConfig` and the instructor-dashboard `config` block are the operator's two fields by ADR 0017's split and stay as the example. The `...instructorDashboardApp.config` spread inside that block is the fragile pattern #268 described and spreads `undefined`, since that app bundles no `config`; it goes.

One PR per repo, each a `fix:` (removing dev-only values and no-op defaults changes no deployed behaviour) except account, whose new gates change what renders, as #156 and #868 were `feat!:` for the view-course and credit buttons. This issue is the tracker; the per-repo PRs link back to it.

</details>
