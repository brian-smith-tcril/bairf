# Config precedents in the converted apps

How the eight apps already on `@openedx/frontend-base`, plus `frontend-template-site`, carry the kinds of values in Learning's drafted mapping table. Read-only; no repo was modified.

Sources, as read (default branch, HEAD): learner-dashboard `master@25ccda2`, account `master@1319a3d`, profile `master@758f360`, catalog `master@7b20932`, gradebook `master@1a311b6`, instructor-dashboard `main@2740284`, authn `master@732a781`, admin-console `master@2e8035b`, frontend-template-site `main@7a3afa9`, frontend-base `main@83a1752`. Legacy state is each repo's `legacy-mfe` branch: learner-dashboard `72c0262`, account `29a015e`, profile `a158834`, catalog `4120c85`, gradebook `568914d`, authn `00f7aa0`, admin-console `6139af7`; instructor-dashboard has no pre-conversion branch and never had an `.env.development`. Legacy header and footer packages: `openedx/frontend-component-header` `master@922e367`, `openedx/frontend-component-footer` `master@a9340b5`.

## 1. Cross-app URLs

Resolution primitives are all in frontend-base `runtime/routing/utils.ts`: `getUrlByRouteRole` (27-50) walks `apps[].routes` for a `handle.roles` match, then `externalRoutes`; `resolveRouteByRole` (93-100) wraps it, fills params and reports `isInternal`; `getLinkProps` (120-125) turns any URL into `Link`-or-anchor props. The how-to (`docs/how_tos/migrate-frontend-app.md:741`) says MFE and service URLs "should now be expressed as part of the `apps` config as route roles, or as `externalRoutes`, and resolved in code via `resolveRouteByRole()`".

### Every occurrence

| app | target | mechanism | role id / key | where |
|---|---|---|---|---|
| learner-dashboard | catalog (browse courses) | `resolveRouteByRole`, fallback LMS `courseSearchUrl`; rendered with `getLinkProps` | `org.openedx.frontend.role.courses` | `src/data/services/lms/urls.js:30-32`; `src/constants.ts:3`; `src/widgets/LookingForChallengeWidget/index.jsx:34` |
| learner-dashboard | order history | app config, no default | `ORDER_HISTORY_URL` | `src/widgets/LearnerDashboardHeader/OrderHistoryLinkMenuItem.jsx:17`; condition `app.tsx:79` |
| learner-dashboard | ecommerce | app config, no default | `ECOMMERCE_BASE_URL`, `CREDIT_PURCHASE_URL` | `urls.js:38-46`; `site.config.test.tsx:19` |
| learner-dashboard | programs | hardcoded on `lmsBaseUrl` | `/dashboard/programs` | `urls.js:23` |
| account | dashboard | `resolveRouteByRole`, fallback `${lmsBaseUrl}/dashboard` | `org.openedx.frontend.role.dashboard` | `src/utils.js:83-85`; `src/constants.ts:6` |
| account | logout | `resolveRouteByRole`, fallback `getSiteConfig().logoutUrl` | `org.openedx.frontend.role.logout` | `src/utils.js:92`; `src/constants.ts:7` |
| account | support | app `defaultConfig: null` | `SUPPORT_URL`, `PASSWORD_RESET_SUPPORT_LINK`, `SUPPORT_URL_TO_UNLINK_SOCIAL_MEDIA_ACCOUNT` | `src/app.ts:11,18-19` |
| profile | account settings | `resolveRouteByRole`, fallback `${lmsBaseUrl}/account/settings` | `org.openedx.frontend.role.account` | `src/utils.js:24-27`; `src/constants.ts:5`; PR #1408: "`ACCOUNT_SETTINGS_URL` becomes the account route role" |
| profile | credentials (Learner Record MFE) | app `defaultConfig: null`, button hidden when unset | `CREDENTIALS_BASE_URL` | `src/app.ts:14-16`; `src/profile/ProfilePage.jsx:85-86` |
| catalog | learning (course home) | app config via `getStringConfig`, `null` hides the button | `LEARNING_BASE_URL` | `src/course-about/course-intro/utils.ts:7-10`; PR #156: "required config with no default that can work" |
| catalog | its own courses / course-about pages | own routes with roles; `getUrlByRouteRole`, `resolveRouteByRole(role, { courseId })` | `org.openedx.frontend.role.courses`, `.courseAbout` | `src/routes.tsx:25,35`; `src/home/components/home-banner/HomeBanner.tsx:22`; `src/generic/course-card/index.tsx:33` |
| catalog | LMS dashboard, programs | hardcoded on `lmsBaseUrl` | `/dashboard`, `/dashboard/programs` | `src/widgets/CatalogHeader/CoursesLinkMenuItem.jsx:7`, `ProgramsLinkMenuItem.jsx:7` |
| catalog | home | `externalRoutes` to the LMS dashboard | `org.openedx.frontend.role.home` | `site.config.dev.tsx:32-35` |
| catalog | studio | `SiteConfig.cmsBaseUrl` | — | `src/course-about/course-overview/index.tsx:33` |
| gradebook | instructor dashboard | `resolveRouteByRole(role, { courseId })`, fallback `${lmsBaseUrl}/courses/${courseId}/instructor` | `org.openedx.frontend.role.instructorDashboard` | `src/components/GradebookHeader/index.jsx:10,28-30,48`; `src/data/services/lms/urls.js:38-40` |
| instructor-dashboard | gradebook | `resolveRouteByRole(role, { courseId })`, fallback LMS-reported `gradebookUrl` | `org.openedx.frontend.role.gradebook` | `src/grading/components/GradingActionRow.tsx:9,24,29-32` |
| instructor-dashboard | admin console | `resolveRouteByRole`, fallback LMS-reported `adminConsoleUrl` | `org.openedx.frontend.role.adminConsole` | `src/courseTeam/CourseTeamPage.tsx:15,30,42-45` |
| instructor-dashboard | support | operator `config` only | `SUPPORT_URL` | `site.config.dev.tsx:24` |
| authn | dashboard | `resolveRouteByRole`, fallback `{ url: '/', isInternal: true }` | `org.openedx.frontend.role.dashboard` | `src/data/utils/dataUtils.js:84`; `src/constants.ts:9` |
| authn | its own pages | `getUrlByRouteRole` | `.login`, `.register`, `.resetPassword`, `.confirmPassword`, `.welcome` | `src/constants.ts:4-8`; `src/routes.jsx:31-67` |
| authn | marketing site | app config, no default, logo unlinked when unset | `MARKETING_SITE_BASE_URL` | `src/base-container/components/BrandLogo.jsx:12,21-28` |
| authn | catalog | app config | `SEARCH_CATALOG_URL` | `src/progressive-profiling/ProgressiveProfiling.jsx:116`; README:218-220 |
| authn | enterprise login | hardcoded path on `lmsBaseUrl` | `ENTERPRISE_LOGIN_URL = '/enterprise/login'` | `src/data/constants.js:1`; `src/common-components/ThirdPartyAuth.jsx:35` |
| admin-console | course authoring MFE | `getUrlByRouteRole` with an inline literal; `externalRoutes` entry in dev config | `org.openedx.frontend.role.courseAuthoring` | `src/authz-module/components/ErrorPage/index.tsx:83`; `site.config.dev.tsx:33-36`; legacy var was `COURSE_AUTHORING_MICROFRONTEND_URL` |
| admin-console | LMS admin | hardcoded on `lmsBaseUrl` | `/admin` | `src/authz-module/role-assignation-wizard/components/SelectUsersAndRoleStep.tsx:22` |
| all (via shell) | profile, account, logout | shell header `LinkMenuItem role=...`; every app's `site.config.dev.tsx` supplies `externalRoutes` for them | `.profile`, `.account`, `.logout` | frontend-base `shell/header/app.tsx:77,89,101`; e.g. account `site.config.dev.tsx:29-42` |

Pattern: a URL that another frontend-base app *could* serve is a role with an LMS fallback (dashboard, account, courses, gradebook, instructor dashboard, admin console, course authoring); a URL of a service or MFE nobody has ported is an app config key with no default (`CREDENTIALS_BASE_URL`, `LEARNING_BASE_URL`, `ECOMMERCE_BASE_URL`, `ORDER_HISTORY_URL`, `MARKETING_SITE_BASE_URL`, `SEARCH_CATALOG_URL`). Catalog chose the app-config form for Learning itself rather than naming a learning role. Legacy cross-app vars no converted app reads were dropped without a DEPR: learner-dashboard's `LEARNING_BASE_URL`, `SEARCH_CATALOG_URL`, `CAREER_LINK_URL`, `ACCOUNT_PROFILE_URL`, `ACCOUNT_SETTINGS_URL` (legacy `src/config/index.js` and `LearnerDashboardMenu.jsx:48-58`); profile's `ENTERPRISE_LEARNER_PORTAL_HOSTNAME` (`.env.development:21`, zero readers in legacy `src/`, not mentioned in #1405).

### Role ids in use

| role id | declared | consumers |
|---|---|---|
| `org.openedx.frontend.role.home` | frontend-base `shell/constants.ts:1` | learner-dashboard `src/routes.jsx:10` (provides, with `dashboardRole`); catalog dev `externalRoutes`; `shell/Logo.tsx:14` |
| `.login`, `.register` | `shell/constants.ts:3-4`; authn `src/constants.ts:4-5` | `runtime/routing/authenticatedLoader.ts:5` |
| `.resetPassword`, `.confirmPassword`, `.welcome` | authn `src/constants.ts:6-8` | authn only |
| `.dashboard` | learner-dashboard `src/constants.ts:2` | account `:6`, authn `:9` (each re-declares the string under "Roles of routes elsewhere in the site that this app links to") |
| `.courses` | catalog `src/constants.ts:3` | learner-dashboard `src/constants.ts:3` |
| `.catalog`, `.courseAbout` | catalog `src/constants.ts:2,4` | catalog only |
| `.profile` | profile `src/constants.ts:2` | shell header literal; every dev `externalRoutes` |
| `.account` | account `src/constants.ts:2` | profile `src/constants.ts:5`; shell header literal |
| `.idVerification` | account `src/constants.ts:3` | — |
| `.logout` | account `src/constants.ts:7` (consumer); no app provides it | shell header literal; `externalRoutes` in every dev config and in template-site |
| `.gradebook` | gradebook `src/routes.tsx:13` (literal) | instructor-dashboard `GradingActionRow.tsx:9` (file-local const) |
| `.instructorDashboard` | instructor-dashboard `src/constants.ts:2` | gradebook `GradebookHeader/index.jsx:10` (file-local const); frontend-base ADR 0013:111-114 |
| `.adminConsole` | admin-console `src/routes.tsx:15` (literal) | instructor-dashboard `CourseTeamPage.tsx:15` (file-local const) |
| `.courseAuthoring` | nowhere; `externalRoutes` only | admin-console `ErrorPage/index.tsx:83` (literal) |
| `.learning` | nowhere; docstring example | frontend-base `shell/header/course-bar/utils.ts:10,22-23` |
| `.courseware` | nowhere; dev page | frontend-base `shell/dev/devHome/HomePage.tsx:8` |
| `.authn` | nowhere; docstring example | frontend-base `shell/app.ts:12` |

frontend-base itself declares only `home`, `login`, `register` (`shell/constants.ts`); `docs/` mentions a role id once (ADR 0013, `instructorDashboard`). **No app and no frontend-base file defines a role for discussions, the enterprise learner portal, or insights** (grep of `org.openedx.frontend.role.` across all nine `src/` trees and frontend-base, plus `Role = '` and `roles: [` declarations). The naming precedent for a consumer-named role for an unported MFE is admin-console's `courseAuthoring`: declared as a literal at the one call site, supplied through `externalRoutes`.

## 2. Cookie and session values

frontend-base `SiteConfig` cookie fields (`types.ts:105-108`): `accessTokenCookieName`, `languagePreferenceCookieName`, `userInfoCookieName`. Runtime defaults (`runtime/config/index.ts:134,137,139`): `'edx-jwt-cookie-header-payload'`, `'openedx-language-preference'`, `'edx-user-info'`. There is no domain field; `grep -i domain runtime/` finds nothing. Every converted dev config still sets `accessTokenCookieName` to the default value (e.g. account `site.config.dev.tsx:44`); authn's does not (`site.config.dev.tsx:7-29`).

authn is the one converted app that sets cookies with a domain. Legacy: `src/config/index.js:3` mapped `process.env.SESSION_COOKIE_DOMAIN`, and `src/data/utils/cookies.js:7` read `getConfig().SESSION_COOKIE_DOMAIN` inside the helper. Converted: `SESSION_COOKIE_DOMAIN` is an **app config key**, not a `SiteConfig` field, read with `useAppConfig()` (`src/register/RegistrationPage.jsx:99-105,224`; `src/common-components/RedirectLogistration.jsx:38`) and passed as an argument to `setCookie(cookieName, cookieValue, cookieDomain, cookieExpiry)` (`src/data/utils/cookies.js:3-10`, `universal-cookie`, options `{ domain, path: '/' }`). It is not in `defaultConfig` (`src/app.ts:10-14`); the dev config sets it as operator `config` (`site.config.dev.tsx:25`, `'local.openedx.io'`). README:222-224: "Domain the cookies this app sets are scoped to. Unset, they are scoped to the host that served the page." The companion `USER_RETENTION_COOKIE_NAME` is app config too (README:230-232; "No cookie is set when unset"). Legacy `.env.development:25-27` grouped `SESSION_COOKIE_DOMAIN` with `USER_INFO_COOKIE_NAME` under `# ***** Cookies *****`.

learner-dashboard's legacy `src/config/index.js:16` declared `SESSION_COOKIE_DOMAIN` with no consumer; the converted app has no reference to it and #657 does not mention it. No other converted app reads a cookie domain.

## 3. Logo, favicon, legal and theme values

Legacy presence (`.env.development` on `legacy-mfe`): `LOGO_URL`, `LOGO_TRADEMARK_URL`, `LOGO_WHITE_URL`, `FAVICON_URL`, `PARAGON_THEME_URLS`, `SITE_NAME`, `SEGMENT_KEY` in all seven; `ORDER_HISTORY_URL` in all but learner-dashboard (which read it anyway via `getConfig()`); `PRIVACY_POLICY_URL` and `TERMS_OF_SERVICE_URL` in gradebook and learner-dashboard (profile `TERMS_OF_SERVICE_URL` only); `SUPPORT_URL` in account, catalog, gradebook, learner-dashboard, profile; `CONTACT_URL` in gradebook, learner-dashboard, profile.

| legacy var | legacy reader | where it went |
|---|---|---|
| `LOGO_URL` | header package `src/Header.jsx:112`, `src/learning-header/LearningHeader.jsx:27`; gradebook `EdxHeader/index.jsx:14` | `SiteConfig.headerLogoImageUrl` (`types.ts:96`; `shell/Logo.tsx:13`, default `https://edx-cdn.org/v3/default/logo.svg`). Only gradebook's dev config sets it (`site.config.dev.tsx:18`, `''`). Exception: authn keeps `LOGO_URL` and `LOGO_WHITE_URL` as app `defaultConfig` with edx-cdn defaults (`src/app.ts:12-13`) because its own `BrandLogo.jsx:12-17` renders them. |
| `LOGO_TRADEMARK_URL` | footer package `src/components/Footer.jsx:54` | dropped; shell footer renders a text trademark notice (`shell/footer/LegalNotices.tsx:14`). No DEPR link. |
| `LOGO_WHITE_URL` | authn layouts only | authn `defaultConfig` (above); dropped elsewhere. |
| `FAVICON_URL` | `Head.jsx` in account:14, gradebook:15, profile:19; authn `MainApp.jsx:44`; learner-dashboard `App.jsx:32`; catalog `generic/head/index.tsx:13` | static `<link rel="shortcut icon">` in `shell/public/index.html:6` (edx-cdn `favicon.ico`); no `SiteConfig` field. #657 lists "react-helmet (setting favicon and page title)" with DEPR openedx/public-engineering#415 "[DEPR]: react-helmet for global `<head />` configuration". ADR 0015 (Proposed) reintroduces per-page titles via Helmet, not favicons. |
| `PRIVACY_POLICY_URL`, `TERMS_OF_SERVICE_URL` | footer package reads them only in `src/components/studio-footer/StudioFooter.jsx:21-22,48-53`, not in the LMS `Footer.jsx`; no converted app's legacy `src/` read them | dropped, no DEPR. authn's registration-form legal links are its own app-config keys `PRIVACY_POLICY`, `TOS_LINK`, `TOS_AND_HONOR_CODE`, each falling back to `#` (README:213-216; `HonorCode.jsx:34,44`). |
| `PARAGON_THEME_URLS` | frontend-platform | `SiteConfig.theme` (`types.ts:99,139-143`), read by `runtime/react/hooks/theme/useThemeConfig.ts:21`. No converted app sets `theme`; template-site imports `@edx/brand/core.min.css` and `light.min.css` directly (`site.config.dev.tsx:13-14`). |
| `SITE_NAME` | everywhere | required `siteName`; read as `getSiteConfig().siteName` (account `Main.tsx:20`, etc.); account and authn still branch on `=== 'edX'` (`PrintingInstructions.jsx:21`; `default-layout/LargeLayout.jsx:15`). |
| `SUPPORT_URL` | app code and header package | app config, same name. The shell's help button reads it from the app's config: `shell/header/helpButtonSlotOperation.tsx:15` `getAppConfig(appId).SUPPORT_URL`; used by learner-dashboard (`LearnerDashboardHeader/app.tsx:66`), catalog, instructor-dashboard. account bundles `defaultConfig.SUPPORT_URL: null` (`src/app.ts:11`); template-site sets it site-wide in `commonAppConfig` (`site.config.dev.tsx:24-26`) and overrides it for instructor-dashboard (`:39-45`). |
| `CONTACT_URL` | none in gradebook, learner-dashboard or profile legacy `src/` | dropped silently. |
| `ORDER_HISTORY_URL` | header package `src/Header.jsx:81-83`, `AuthenticatedUserDropdown.jsx:29-31`; learner-dashboard `LearnerDashboardMenu.jsx:56-58` | learner-dashboard alone keeps it as app config (no default) and renders the menu item itself (`OrderHistoryLinkMenuItem.jsx:17-27`, inserted before the shell's logout item, `app.tsx:67-81`); dropped elsewhere. |

Conversion issues' dropped-features sections: #657 (learner-dashboard) is the only one that names head/favicon; #1498 (authn), #497 (gradebook, left as "..."), #1466/#1316 (account), #1405/#1246 (profile), #123 (catalog), #149/#211 (admin-console) say nothing about logos, favicon, legal URLs or theme. Account PR #1470 says the "legacy `index.html` and document head" are dropped; profile PR #1408 says "the document head ... [is] the shell's now".

## 4. App-specific flags

Casing: **SCREAMING_SNAKE kept** in every app, despite the how-to's camelCase example (`migrate-frontend-app.md:775-777` `myCustomVariableName`). PR #1470: "bundled as `defaultConfig` under their existing names, so MFE config API values keep flowing".

Examples of `defaultConfig` flags:

- account `src/app.ts:12-15`: `SHOW_PUSH_CHANNEL: false`, `ENABLE_COPPA_COMPLIANCE: false`, `ENABLE_DOB_UPDATE: false`, `ENABLE_ACCOUNT_DELETION: true`; read with a `parseEnvBoolean` wrapper (`src/account-settings/JumpNav.jsx:64`).
- profile `src/app.ts:13`: `DISABLE_VISIBILITY_EDITING: false`, with a one-line comment on the surprising case; read `src/profile/data/hooks.js:46`.
- authn `src/app.ts:11`: `DISABLE_ENTERPRISE_LOGIN: true`; read `src/common-components/ThirdPartyAuth.jsx:34`.
- catalog `src/app.ts:12`: `HOMEPAGE_COURSE_MAX` is its only default; its `ENABLE_*` flags have no default and are compared `=== true` at the read site (`src/widgets/CatalogHeader/app.tsx:36-56`). PR #156 explains: a key in the app's own `config` "is a key `commonAppConfig` can never supply", so only real defaults are bundled.
- learner-dashboard, gradebook, instructor-dashboard, admin-console bundle no `defaultConfig` (`src/app.ts` in each); learner-dashboard reads `ENABLE_PROGRAMS === true` (`LearnerDashboardHeader/app.tsx:50`) and `SHOW_UNENROLL_SURVEY` (`UnenrollConfirmModal/hooks/index.js:31`) straight from `getAppConfig`/`useAppConfig`.

frontend-template-site (`site.config.dev.tsx@7a3afa9`): site-wide `commonAppConfig: { SUPPORT_URL }` (24-26); one per-app override using the spread form, `{ ...instructorDashboardApp, config: { ...instructorDashboardApp.config, SUPPORT_URL: ... } }` (39-45); every other app is listed bare (33-38, 46-47); `externalRoutes` holds only `logout` (49-54). `site.config.build.tsx` has no overrides at all. Each app's own `site.config.dev.tsx` uses the same `{ ...app, config: {...} }` spread (account 20-27, profile 20-25, catalog 21-28, instructor-dashboard 21-26, authn 20-27); test configs use `apps: [{ appId, config: {...} }]` with only the keys tests rely on (account `site.config.test.tsx:16-26`).

## 5. Analytics and third-party keys

`SEGMENT_KEY` → `SiteConfig.segmentKey: string | null` (`types.ts:118`), default `null` (`runtime/config/index.ts:140`), consumed by `runtime/analytics/SegmentAnalyticsService.js:13,17,111` (`analytics.load(this.segmentKey)` only when set). Gradebook's dev config sets a placeholder (`site.config.dev.tsx:17`); test configs set `''` (learner-dashboard, catalog, gradebook, admin-console). The legacy per-app `src/segment.js` snippets (gradebook, learner-dashboard, `analytics.load(configuration.SEGMENT_KEY)` at :83) went; learner-dashboard's file still exists on `master` but imports `./config`, which no longer exists, so nothing loads it.

Optimizely, Hotjar, Zendesk, Algolia: all dropped, all pointing at openedx/public-engineering#413 "[DEPR]: Built-in support for third-party services in the frontend" (its body lists Algolia, Hotjar, Optimizely, Segment, Zendesk). learner-dashboard #657: Hotjar, Optimizely, "Segment tracking hooks in the header", `robots.txt`. authn #1498: Zendesk, Algolia, Optimizely (legacy readers `src/common-components/Zendesk.jsx`, `src/data/algolia.js`, `src/data/optimizely.js`), plus Recommendations (#1533) and the simplify-registration experiment (public-engineering#414). account PR #1470: "the Optimizely script, the Usabilla widget and `LEARNER_FEEDBACK_URL` are dropped". frontend-base's replacement seam is `App.externalScripts` (`types.ts:34,42-46`; ADR 0014, status Proposed); no converted app or template-site uses it.

## Precedent answers for Learning's open rows

- **`DISCUSSIONS_MFE_BASE_URL`** — no discussions role exists. Two precedents conflict: catalog kept a sibling MFE's base URL as app config (`LEARNING_BASE_URL`, `null` hides the button, PR #156), while admin-console turned `COURSE_AUTHORING_MICROFRONTEND_URL` into a consumer-named role (`org.openedx.frontend.role.courseAuthoring`) supplied by `externalRoutes`. The role form is the how-to's rule (line 741) and matches how every converted app links to another *frontend-base* app with an LMS fallback; the app-config form is what catalog did for a URL it only needed as a string prefix. Learning builds an iframe `src` from this value, so the catalog form is the closer match in mechanism; the admin-console form is the closer match in the how-to.
- **`ENTERPRISE_LEARNER_PORTAL_URL`** — no role exists. Profile dropped `ENTERPRISE_LEARNER_PORTAL_HOSTNAME` silently (zero readers). Nearest living precedent is `CREDENTIALS_BASE_URL` in profile (`src/app.ts:14-16`, "no route role to resolve", `defaultConfig: null`): an unported MFE as app config.
- **`INSIGHTS_BASE_URL`** — no role exists; same two precedents as above. No converted app links to Insights.
- **`SESSION_COOKIE_DOMAIN`** — authn precedent: app config key, same name, no default, operator sets it in `config`; the domain is passed as an argument to a `setCookie` helper rather than read inside it; README documents the unset behaviour. frontend-base has no cookie-domain `SiteConfig` field.
- **Ten dropped rows** — `LOGO_URL` → `headerLogoImageUrl`; `LOGO_TRADEMARK_URL`, `LOGO_WHITE_URL`, `FAVICON_URL`, `PARAGON_THEME_URLS`, `PRIVACY_POLICY_URL`, `ORDER_HISTORY_URL`, `OPTIMIZELY_FULL_STACK_SDK_KEY`, `ENTERPRISE_LEARNER_PORTAL_HOSTNAME`, `PORT` all have a dropped precedent. Only favicon (public-engineering#415) and Optimizely (public-engineering#413) were given DEPR links; the legal URLs, trademark logo and theme URLs were dropped with no mention in any conversion issue. The legacy LMS footer never read `PRIVACY_POLICY_URL`/`TERMS_OF_SERVICE_URL` (only `StudioFooter.jsx` did), and the legacy header read `ORDER_HISTORY_URL` and `LOGO_URL` (`Header.jsx:81-83,112`); learner-dashboard is the one app that re-homed `ORDER_HISTORY_URL` as app config because it renders the menu item itself.
