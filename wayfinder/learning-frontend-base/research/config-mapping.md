# Config mapping: Learning `.env*` and `mergeConfig` keys to frontend-base

Sources as read: openedx/frontend-app-learning `master` at `7522f9c`; openedx/frontend-base `main` at `83a1752`; catalog gist `78222db3b54b48132aa13018f7f5b371`, worklog entry "Audit: legacy `.env*` → SiteConfig / app.config"; converted apps on their default branches (catalog, gradebook, profile, account, learner-dashboard: `master`; instructor-dashboard: `main`).

Row set: `.env.development` lines 4–56 hold 51 distinct variables; the `mergeConfig` block in `src/index.jsx:164-189` holds 26 keys, 25 of which are in `.env.development`. The one extra, `INSIGHTS_BASE_URL`, is in `.env:24` only. Union: 52 rows.

Reader counts are from `grep -rn "getConfig()\.[A-Z_]*" src` excluding `*.test.*`. Three other read forms exist and are added in parentheses: destructuring in `src/courseware/RedirectPage.tsx:19-22` (`LMS_BASE_URL`, `ENTERPRISE_LEARNER_PORTAL_URL`); `const config = getConfig()` then `config.X` in `src/generic/special-exams/SpecialExamsProvider.tsx:9-17` (`EXAMS_BASE_URL`, `LMS_BASE_URL`, `SITE_NAME`, `SUPPORT_URL`, `CONTACT_URL`, `PROCTORED_EXAM_FAQ_URL`, `PROCTORED_EXAM_RULES_URL`); and `process.env.SESSION_COOKIE_DOMAIN` in `src/alerts/logistration-alert/AccountActivationAlert.jsx:32`. `src/setupTest.js:107-116` merges all of `process.env` into config for tests; it is not counted.

## Rules applied

- **SiteConfig required**: `types.ts:50-61` (`siteId`, `siteName`, `baseUrl`, `lmsBaseUrl`, `loginUrl`, `logoutUrl`); how-to "Required config", lines 713-720.
- **SiteConfig optional**: `types.ts:82-124`; how-to "Optional config", lines 725-736. Runtime defaults in `runtime/config/index.ts:125-140` (`accessTokenCookieName: 'edx-jwt-cookie-header-payload'`, `csrfTokenApiPath: '/csrf/api/v1/token'`, `languagePreferenceCookieName: 'openedx-language-preference'`, `refreshAccessTokenApiPath: '/login_refresh'`, `userInfoCookieName: 'edx-user-info'`, `segmentKey: null`, `ignoredErrorRegex: null`, `cmsBaseUrl: ''`). The gist's "SiteConfig fields — skipped" table left these unset because the defaults match.
- **Role or `externalRoutes`**: how-to "URL Config changes", line 741: "URLs for various micro-frontends and services ... should now be expressed as part of the `apps` config as route roles, or as `externalRoutes`, and resolved in code via `resolveRouteByRole()`". `types.ts:11-14` (`ExternalRoute { role, url }`); `runtime/routing/utils.ts:27-43` (`getUrlByRouteRole` searches apps then `externalRoutes`).
- **App `defaultConfig`**: how-to "App-specific config values", lines 770-796; ADR 0017 lines 40-51 (`defaultConfig` for author-bundled values, below `commonAppConfig`, below `config`). Precedents: profile `src/app.ts:11-17` puts a service URL with "no route role to resolve" (`CREDENTIALS_BASE_URL: null`) there; account `src/app.ts:10-20` puts `SUPPORT_URL: null`, `PASSWORD_RESET_SUPPORT_LINK: null` and a help-article URL there; catalog `src/app.ts:11-13` puts `HOMEPAGE_COURSE_MAX` there.
- **Shell-managed, dropped**: gist "Dropped entirely — never consumed, or shell-managed in frontend-base" table; decisions 4 and 20 (header and footer are the shell's); `types.ts:96` (`headerLogoImageUrl`), `types.ts:99` (`theme`).

## 1. Mapping table

| name | readers in `src/` | destination | source for the rule | note |
|---|---|---|---|---|
| `ACCESS_TOKEN_COOKIE_NAME` | 0 | `SiteConfig.accessTokenCookieName` optional | `types.ts:106`; gist "already correct" row ("dev only") | runtime default equals the dev value (`runtime/config/index.ts:134`) |
| `APP_ID` | 0 (`src/constants.ts:1` sets `appId = 'learning'` independently) | `App.appId` (not config) | `types.ts:30`; gist "already correct" row (`appId` in `src/constants.ts`) | see section 2 |
| `BASE_URL` | 1 (`src/course-home/outline-tab/LmsHtmlFragment.jsx:18`) | `SiteConfig.baseUrl` required | `types.ts:53`; how-to line 717 | |
| `CONTACT_URL` | 1 (`src/course-home/goal-unsubscribe/ResultPage.jsx:18`; +1 `SpecialExamsProvider.tsx:15`) | app `defaultConfig.CONTACT_URL` | account precedent for help/contact URLs (`src/app.ts:11`); no `SiteConfig` field | an LMS page URL; how-to line 741 would also admit an `externalRoutes` entry, no role id exists |
| `CREDENTIALS_BASE_URL` | 1 (`src/courseware/course/course-exit/ProgramCompletion.jsx:67`) | app `defaultConfig.CREDENTIALS_BASE_URL` | profile `src/app.ts:14-16`, same key, comment "no route role to resolve" | |
| `CREDIT_HELP_LINK_URL` | 1 (`src/course-home/progress-tab/credit-information/CreditInformation.jsx:28`) | app `defaultConfig.CREDIT_HELP_LINK_URL` | how-to lines 770-778; README.rst:151 lists it as Learning-specific | |
| `CSRF_TOKEN_API_PATH` | 0 | `SiteConfig.csrfTokenApiPath` optional | `types.ts:111`; gist "skipped" row | runtime default equals the dev value (`runtime/config/index.ts:135`) |
| `DISCOVERY_API_BASE_URL` | 1 (`src/courseware/course/course-exit/data/api.js:27`) | app `defaultConfig.DISCOVERY_API_BASE_URL` | profile precedent (service URL, no role); `types.ts:55-57, 86-87` list only `lmsBaseUrl` and `cmsBaseUrl` as backends | |
| `DISCUSSIONS_MFE_BASE_URL` | 3 (`src/course-home/discussion-tab/DiscussionTab.jsx:20`) | role id or `externalRoutes` entry | how-to line 741 (micro-frontend URL) | no discussions role id exists in frontend-base (`shell/constants.ts`, `shell/header/constants.ts`, `shell/site.config.dev.tsx:18-31`) or in the six converted apps' `constants.ts`; role id to be named |
| `DISCOUNT_CODE_INFO_URL` | 2 (`src/shared/streak-celebration/StreakCelebrationModal.jsx:88`) | app `defaultConfig.DISCOUNT_CODE_INFO_URL` | how-to lines 770-778 | |
| `ECOMMERCE_BASE_URL` | 2 (`src/shared/streak-celebration/StreakCelebrationModal.jsx:94`) | app `defaultConfig.ECOMMERCE_BASE_URL` | profile precedent (service URL, no role); gist listed it as unread in catalog, but Learning reads it | |
| `ENABLE_JUMPNAV` | 1 (`src/courseware/course/breadcrumbs/BreadcrumbItem.tsx:42`) | app `defaultConfig.ENABLE_JUMPNAV` | how-to lines 770-778; README.rst:154 | compared to the string `'true'` at the read site |
| `ENABLE_NOTICES` | 1 (`src/generic/notices/NoticesProvider.jsx:16`) | app `defaultConfig.ENABLE_NOTICES` | how-to lines 770-778 | |
| `ENTERPRISE_LEARNER_PORTAL_HOSTNAME` | 0 | dropped | no reader in `src/` outside `index.jsx:169` | possible breaking change for operators |
| `ENTERPRISE_LEARNER_PORTAL_URL` | 0 (+1 destructured, `src/courseware/RedirectPage.tsx:21`) | role id or `externalRoutes` entry | how-to line 741 (micro-frontend URL) | no enterprise-portal role id exists anywhere searched; role id to be named |
| `EXAMS_BASE_URL` | 4 (`src/course-home/data/api.ts:262`; +1 `SpecialExamsProvider.tsx:11`) | app `defaultConfig.EXAMS_BASE_URL` | profile precedent (service URL, no role) | the special-exams provider's host wiring is on the map's per-port list |
| `FAVICON_URL` | 1 (`src/index.jsx:49`, `<Helmet>`) | shell-managed, dropped | gist "Dropped entirely" row: "the frontend-base shell handles favicons" | possible breaking change for operators |
| `IGNORED_ERROR_REGEX` | 0 | `SiteConfig.ignoredErrorRegex` optional | `types.ts:115`; how-to line 735 | type is `RegExp \| null`, legacy was a string |
| `INSIGHTS_BASE_URL` | 1 (`src/instructor-toolbar/InstructorToolbar.jsx:14`) | role id or `externalRoutes` entry | how-to line 741 (separate frontend) | not in `.env.development`; `.env:24`, `index.jsx:173`; no insights role id exists; role id to be named |
| `LANGUAGE_PREFERENCE_COOKIE_NAME` | 0 | `SiteConfig.languagePreferenceCookieName` optional | `types.ts:107`; gist "skipped" row | runtime default equals the dev value (`runtime/config/index.ts:137`) |
| `LMS_BASE_URL` | 65 (`src/alerts/active-enteprise-alert/ActiveEnterpriseAlert.jsx:17`; +2 other forms) | `SiteConfig.lmsBaseUrl` required | `types.ts:56`; how-to line 718 | |
| `LOGIN_URL` | 0 | `SiteConfig.loginUrl` required | `types.ts:59`; how-to line 719 | |
| `LOGOUT_URL` | 0 | `SiteConfig.logoutUrl` required | `types.ts:60`; how-to line 720 | |
| `LOGO_URL` | 0 | shell-managed, dropped | gist row: "frontend-base shell manages logos via `siteConfig.headerLogoImageUrl` + theme"; `types.ts:96` | possible breaking change for operators |
| `LOGO_TRADEMARK_URL` | 0 | shell-managed, dropped | same row | possible breaking change for operators |
| `LOGO_WHITE_URL` | 0 | shell-managed, dropped | same row | possible breaking change for operators |
| `LEGACY_THEME_NAME` | 2 (`src/course-home/outline-tab/LmsHtmlFragment.jsx:17`) | app `defaultConfig.LEGACY_THEME_NAME` | how-to lines 770-778 | builds an LMS static CSS path inside an iframe document |
| `MARKETING_SITE_BASE_URL` | 1 (`src/generic/upgrade-bullets/UpgradeBullets.jsx:14`) | app `defaultConfig.MARKETING_SITE_BASE_URL` | account precedent for external-site URLs; gist listed it as unread in catalog, but Learning reads it | |
| `NODE_ENV` | 0 | `SiteConfig.environment` optional | `types.ts:84, 155-159`; gist "already correct" row | |
| `ORDER_HISTORY_URL` | 0 | shell-managed, dropped | gist "Dropped entirely" row (dead-letter); decision 20 (header is the shell's) | possible breaking change for operators; whether the legacy header package read it was not verified (`node_modules` absent) |
| `PORT` | 0 | shell-managed, dropped | gist row: moves to the npm `dev` script (`"PORT=1998 PUBLIC_PATH=/catalog openedx dev"`) | |
| `PARAGON_THEME_URLS` | 0 | shell-managed, dropped | gist row: "replaced by `siteConfig.theme`"; `types.ts:99, 139-143` | possible breaking change for operators |
| `PRIVACY_POLICY_URL` | 0 | shell-managed, dropped | decision 4/20 (footer is the shell's); no reader in `src/` outside `index.jsx:188` | possible breaking change for operators; legacy footer package not verified |
| `PROCTORED_EXAM_FAQ_URL` | 0 (+1 `SpecialExamsProvider.tsx:16`) | app `defaultConfig.PROCTORED_EXAM_FAQ_URL` | how-to lines 770-778 | |
| `PROCTORED_EXAM_RULES_URL` | 0 (+1 `SpecialExamsProvider.tsx:17`) | app `defaultConfig.PROCTORED_EXAM_RULES_URL` | how-to lines 770-778 | |
| `REFRESH_ACCESS_TOKEN_ENDPOINT` | 0 | `SiteConfig.refreshAccessTokenApiPath` optional | `types.ts:112`; gist "skipped" row: "path-only — legacy was a full URL" | runtime default `/login_refresh` (`runtime/config/index.ts:138`) |
| `SEARCH_CATALOG_URL` | 2 (`src/courseware/course/course-exit/CatalogSuggestion.jsx:26`) | role `org.openedx.frontend.role.courses` | how-to line 741; catalog `src/constants.ts:3` defines it on `/catalog/courses` (`src/routes.tsx:22-26`); learner-dashboard `src/constants.ts:3` declares the same id as a link target | |
| `SEGMENT_KEY` | 0 | `SiteConfig.segmentKey` optional | `types.ts:118`; gist "skipped" row | |
| `SESSION_COOKIE_DOMAIN` | 0 (+1 `process.env`, `src/alerts/logistration-alert/AccountActivationAlert.jsx:32`) | unknown | no `SiteConfig` field (`types.ts:82-124`); not in the gist; not in any converted app's `app.ts` | read through `process.env`, which the map lists as a per-port item |
| `SHOW_UNGRADED_ASSIGNMENT_PROGRESS` | 2 (`src/course-home/progress-tab/utils.ts:5`) | app `defaultConfig.SHOW_UNGRADED_ASSIGNMENT_PROGRESS` | how-to lines 770-778 | `index.jsx:189` defaults it to `false`, unlike the other keys' `null` |
| `SITE_NAME` | 12 (`src/alerts/logistration-alert/AccountActivationAlert.jsx:51`; +1 `SpecialExamsProvider.tsx:13`) | `SiteConfig.siteName` required | `types.ts:52`; how-to line 716 | |
| `SOCIAL_UTM_MILESTONE_CAMPAIGN` | 2 (`src/courseware/social-share/SocialIcons.jsx:62`) | app `defaultConfig.SOCIAL_UTM_MILESTONE_CAMPAIGN` | how-to lines 770-778; README.rst:160 | |
| `STUDIO_BASE_URL` | 1 (`src/instructor-toolbar/InstructorToolbar.jsx:29`) | `SiteConfig.cmsBaseUrl` optional | `types.ts:87`; gist "skipped" row: "`siteConfig.cmsBaseUrl` — add when porting course-about" | |
| `SUPPORT_URL` | 2 (`src/courseware/course/course-exit/ProgramCompletion.jsx:61`; +1 `SpecialExamsProvider.tsx:14`) | app `defaultConfig.SUPPORT_URL` | account `src/app.ts:11`, same key | |
| `SUPPORT_URL_CALCULATOR_MATH` | 1 (`src/courseware/course/content-tools/calculator/Calculator.jsx:97`) | app `defaultConfig.SUPPORT_URL_CALCULATOR_MATH` | how-to lines 770-778; README.rst:166 | |
| `SUPPORT_URL_ID_VERIFICATION` | 3 (`src/course-home/outline-tab/alerts/certificate-status-alert/CertificateStatusAlert.jsx:109`) | app `defaultConfig.SUPPORT_URL_ID_VERIFICATION` | how-to lines 770-778; README.rst:172 | |
| `SUPPORT_URL_VERIFIED_CERTIFICATE` | 2 (`src/courseware/course/course-exit/CourseCelebration.jsx:207`) | app `defaultConfig.SUPPORT_URL_VERIFIED_CERTIFICATE` | how-to lines 770-778; README.rst:179 | |
| `TERMS_OF_SERVICE_URL` | 1 (`src/courseware/course/sequence/honor-code/HonorCode.jsx:23`) | app `defaultConfig.TERMS_OF_SERVICE_URL` | how-to lines 770-778 | |
| `TWITTER_HASHTAG` | 1 (`src/courseware/social-share/SocialIcons.jsx:115`) | app `defaultConfig.TWITTER_HASHTAG` | how-to lines 770-778; README.rst:186 | |
| `TWITTER_URL` | 1 (`src/courseware/social-share/SocialIcons.jsx:44`) | app `defaultConfig.TWITTER_URL` | how-to lines 770-778; README.rst:193 | |
| `USER_INFO_COOKIE_NAME` | 0 | `SiteConfig.userInfoCookieName` optional | `types.ts:108`; gist "skipped" row | runtime default equals the dev value (`runtime/config/index.ts:139`) |
| `OPTIMIZELY_FULL_STACK_SDK_KEY` | 0 | dropped | no reader in `src/`; not in `mergeConfig`; not in the gist | possible breaking change for operators |

Keys read by `src/` but absent from both `.env.development` and the `mergeConfig` block (outside the row set, recorded for the port): `ACCOUNT_SETTINGS_URL` (`src/preferences-unsubscribe/index.jsx:72`) and `ACCOUNT_PROFILE_URL` (`src/shared/links.jsx:46`), which the shell's dev config expresses as `externalRoutes` for `org.openedx.frontend.role.account` and `org.openedx.frontend.role.profile` (`shell/site.config.dev.tsx:18-27`; profile `src/constants.ts:5` and account `src/constants.ts:2` declare those ids); and `getConfig()['SIDEBAR_WIDGETS']` (`src/courseware/course/sidebar/defaultWidgets.js:19`, key from `sidebar/constants.js:12`).

## 2. Proposed identifiers

Conventions observed: `appId` is `org.openedx.frontend.app.<camelCaseName>` (catalog `src/constants.ts:1`, gradebook `:1`, profile `:1`, account `:1`, instructor-dashboard `:1` `instructorDashboard`, learner-dashboard `:1` `learnerDashboard`). Each app's root route carries `id: 'org.openedx.frontend.route.<camelCaseName>.main'` (catalog `src/routes.tsx:5`, gradebook `:5`, profile `:9`, account `:9`, learner-dashboard `src/routes.jsx:6`); instructor-dashboard, the one app with two top-level routes, gives each its own `.main` id (`src/routes.tsx:78, 83`). No converted app sets an `id` on a child route (catalog `src/routes.tsx:15-41`, profile `:22-38`, account `:19-38`). Role ids are `org.openedx.frontend.role.<camelCaseName>` and are flat, named for the page rather than nested under the app: `catalog`, `courses`, `courseAbout` (catalog `src/constants.ts:2-4`), `profile` (profile `:2`), `account`, `idVerification` (account `:2-3`), `gradebook` (gradebook `src/routes.tsx:13`), `instructorDashboard` (instructor-dashboard `src/constants.ts:2`), `dashboard` (learner-dashboard `:2`). The root route carries the app's main role (profile `src/routes.tsx:12-17`, comment: external systems build URLs from it); child pages that other systems link to get their own role (account `src/routes.tsx:29-32`, comment: the LMS links to `/id-verification`; catalog `src/routes.tsx:23-26, 33-36`). The shell's course-bar docstring already uses `org.openedx.frontend.role.learning` as its example (`shell/header/course-bar/utils.ts:10, 22-23`), and instructor-dashboard's `src/provides.ts:4-7` passes its single role to both `providesCourseBarRolesId` and `providesCourseBarMasqueradeRolesId`.

- **appId**: `org.openedx.frontend.app.learning` — mirrors catalog `src/constants.ts:1`.
- **Root route id**: `org.openedx.frontend.route.learning.main` on the `learning` root route (decision 21) — mirrors profile `src/routes.tsx:9-12`.
- **Child route ids**, one per route-level page, extending the `.main` pattern the way instructor-dashboard extends it across its two routes (`src/routes.tsx:78, 83`); the converted apps leave children without ids, so these are a proposal with no direct precedent: `org.openedx.frontend.route.learning.outline`, `.dates`, `.progress`, `.discussion`, `.live`, `.courseware`, `.courseExit`, `.accessDenied`, `.goalUnsubscribe`, `.redirect`, `.preferencesUnsubscribe`. Source paths: `src/constants.ts:3-32` (`DECODE_ROUTES`, `ROUTES`).
- **Role ids**, flat camelCase as catalog's `courseAbout` (`src/constants.ts:4`) and account's `idVerification` (`src/constants.ts:3`):
  - root: `org.openedx.frontend.role.learning` — mirrors the shell's own example (`shell/header/course-bar/utils.ts:10`) and profile's root-route role (`src/routes.tsx:12-17`)
  - outline: `org.openedx.frontend.role.courseHome` (LMS tab path is `/home`, `src/constants.ts:5`)
  - dates: `org.openedx.frontend.role.courseDates`
  - progress: `org.openedx.frontend.role.courseProgress`
  - discussion: `org.openedx.frontend.role.courseDiscussion`
  - live: `org.openedx.frontend.role.courseLive`
  - courseware: `org.openedx.frontend.role.courseware`
  - course exit: `org.openedx.frontend.role.courseExit`
  - access denied: `org.openedx.frontend.role.courseAccessDenied`
  - goal unsubscribe: `org.openedx.frontend.role.goalUnsubscribe`
  - redirect landing: `org.openedx.frontend.role.learningRedirect`
  - preferences unsubscribe: `org.openedx.frontend.role.preferencesUnsubscribe`

  Each `course*` name mirrors catalog's `courseAbout`; the single-word `courseware` mirrors `gradebook`/`profile`. Whether every page needs its own role or only the pages external systems deep-link to (the account precedent) is not decided here.

## 3. Totals and unknowns

| destination | rows |
|---|---|
| `SiteConfig` required | 5 (`BASE_URL`, `LMS_BASE_URL`, `LOGIN_URL`, `LOGOUT_URL`, `SITE_NAME`) |
| `SiteConfig` optional | 9 (`ACCESS_TOKEN_COOKIE_NAME`, `CSRF_TOKEN_API_PATH`, `IGNORED_ERROR_REGEX`, `LANGUAGE_PREFERENCE_COOKIE_NAME`, `NODE_ENV`, `REFRESH_ACCESS_TOKEN_ENDPOINT`, `SEGMENT_KEY`, `STUDIO_BASE_URL`, `USER_INFO_COOKIE_NAME`) |
| role id or `externalRoutes` entry | 4 (`SEARCH_CATALOG_URL` with an existing role; `DISCUSSIONS_MFE_BASE_URL`, `ENTERPRISE_LEARNER_PORTAL_URL`, `INSIGHTS_BASE_URL` with no existing role id) |
| app `defaultConfig` | 22 |
| shell-managed, dropped | 10 (`ENTERPRISE_LEARNER_PORTAL_HOSTNAME`, `FAVICON_URL`, `LOGO_URL`, `LOGO_TRADEMARK_URL`, `LOGO_WHITE_URL`, `OPTIMIZELY_FULL_STACK_SDK_KEY`, `ORDER_HISTORY_URL`, `PARAGON_THEME_URLS`, `PORT`, `PRIVACY_POLICY_URL`) |
| `App.appId` (outside the five categories) | 1 (`APP_ID`) |
| unknown | 1 |
| **total** | **52** |

Rows marked unknown:

- `SESSION_COOKIE_DOMAIN`: read via `process.env` at `src/alerts/logistration-alert/AccountActivationAlert.jsx:32`; no `SiteConfig` field, no gist row, no converted-app precedent.

Rows whose category is known but whose role id has no precedent (not counted as unknown): `DISCUSSIONS_MFE_BASE_URL`, `ENTERPRISE_LEARNER_PORTAL_URL`, `INSIGHTS_BASE_URL`.

Gaps in this audit: the legacy `@edx/frontend-component-header` (`^8.2.1`) and `-footer` (`^14.6.0`) packages (`package.json:37-38`) were not inspected because `node_modules` is not present and installing was out of bounds, so which of the zero-reader keys they consume is unverified.
