# Config mapping table: env vars and bootstrap keys to frontend-base config

Type: research
Status: resolved

## Question

Decision from grilling Q13: one table, reviewed by Brian, not a per-variable conversation.

Produce a table with one row per variable in Learning's `.env.development` (52) and per key in the `mergeConfig` block of `src/index.jsx` (26; overlap expected). Columns: name; where Learning reads it today (file:line count); destination, one of: required or optional `SiteConfig` field (name it); route role or `externalRoutes` entry (name the role id); app `defaultConfig` value under frontend-base ADR 0017 (name the key); shell-managed, dropped; or unknown. Follow the how-to's "Delete the .env files and create site.config files" section and catalog's `.env` audit in the gist worklog.

Also propose, from the converted apps' conventions: Learning's `appId`, its route ids (`org.openedx.frontend.route.learning.*`), and its role ids, one per route-level page, matching how catalog, gradebook, profile and account name theirs.

Note any variable whose destination is "dropped" as a possible breaking change for operators, without deciding it.

## Answer

Findings: `../research/config-mapping.md` (sources pinned: Learning master @ 7522f9c, frontend-base main @ 83a1752).

52 rows (51 distinct `.env.development` variables plus `INSIGHTS_BASE_URL`, which only the `.env` file and the `mergeConfig` block carry). Destinations: 5 required `SiteConfig` fields, 9 optional (`NODE_ENV` → `environment`, `STUDIO_BASE_URL` → `cmsBaseUrl`, `REFRESH_ACCESS_TOKEN_ENDPOINT` → `refreshAccessTokenApiPath` as a path), 4 route-role or external-route (`SEARCH_CATALOG_URL` → the existing `org.openedx.frontend.role.courses`; `DISCUSSIONS_MFE_BASE_URL`, `ENTERPRISE_LEARNER_PORTAL_URL`, `INSIGHTS_BASE_URL` have no role id anywhere yet), 22 app `defaultConfig` keys, 10 shell-managed and dropped (logo, favicon, Paragon theme URLs, Optimizely key, `ORDER_HISTORY_URL`, `PRIVACY_POLICY_URL`, `ENTERPRISE_LEARNER_PORTAL_HOSTNAME`, `PORT`; all but `PORT` noted as possible operator-facing breaking changes), `APP_ID` → `appId`, and 1 unknown: `SESSION_COOKIE_DOMAIN`, read through `process.env` in `AccountActivationAlert.jsx` with no frontend-base field or precedent.

Three keys Learning reads but no `.env` file lists: `ACCOUNT_SETTINGS_URL` and `ACCOUNT_PROFILE_URL` (map to the shell's `account` and `profile` roles) and `SIDEBAR_WIDGETS` (ticket 03's territory). frontend-base's runtime defaults equal Learning's dev values for the four cookie and path fields, which is why catalog left them unset.

Proposed identifiers: `appId` `org.openedx.frontend.app.learning`; route ids `org.openedx.frontend.route.learning.main` with per-page children (`.outline`, `.dates`, `.progress`, `.discussion`, `.live`, `.courseware`, `.courseExit`, `.accessDenied`, `.goalUnsubscribe`, `.redirect`, `.preferencesUnsubscribe`); role ids flat camelCase after catalog's: `org.openedx.frontend.role.learning` (the shell's own course-bar docstring example) plus `courseHome`, `courseDates`, `courseProgress`, `courseDiscussion`, `courseLive`, `courseware`, `courseExit`, `courseAccessDenied`, `goalUnsubscribe`, `learningRedirect`, `preferencesUnsubscribe`.

Unverified: which zero-reader keys the legacy header and footer packages consumed (`ORDER_HISTORY_URL`, `PRIVACY_POLICY_URL`); their source was not inspected.

Brian reviews the table (grilling Q13); three rows need his call: the three URLs with no role id, and `SESSION_COOKIE_DOMAIN`.

**Addendum: precedents from the converted apps** (`../research/config-precedents.md`; eight apps at default-branch HEAD and their `legacy-mfe` branches, frontend-base main @ 83a1752, template-site main @ 7a3afa9).

- Cross-app URLs with no existing role (`DISCUSSIONS_MFE_BASE_URL`, `ENTERPRISE_LEARNER_PORTAL_URL`, `INSIGHTS_BASE_URL`): frontend-base declares only `home`, `login`, `register`; no app declares discussions, enterprise portal or insights. Two precedents: admin-console names a consumer-side role for the authoring app (`org.openedx.frontend.role.courseAuthoring`) supplied by `externalRoutes`, the form the how-to prescribes; catalog keeps a sibling app's URL as app config (`LEARNING_BASE_URL`, `null` hides the button) where it only needs a string prefix. Profile's `CREDENTIALS_BASE_URL` is app config with `defaultConfig: null` and the comment "no route role to resolve".
- `SESSION_COOKIE_DOMAIN`: authn keeps it as an app config key under the same name, set by the operator in `config`, not in `defaultConfig`; frontend-base has no cookie-domain field. Unset means the cookie is scoped to the serving host.
- The ten dropped rows all have dropped precedents: `LOGO_URL` → `SiteConfig.headerLogoImageUrl`; `FAVICON_URL` → static `<link>` in the shell's `index.html` (DEPR public-engineering#415); Optimizely → public-engineering#413; `PARAGON_THEME_URLS` → `SiteConfig.theme`, which no converted app sets; legal URLs, `LOGO_TRADEMARK_URL` and `CONTACT_URL` dropped by every app with no DEPR and no mention, and the legacy LMS footer never read the legal URLs; `ORDER_HISTORY_URL` re-homed as app config only by learner-dashboard, which renders the menu item itself; `SEGMENT_KEY` → `SiteConfig.segmentKey`.
- Two conventions to carry: `SUPPORT_URL` is read by the shell's help button from `getAppConfig(appId).SUPPORT_URL`, and template-site sets it site-wide through `commonAppConfig`; flag keys keep SCREAMING_SNAKE names so MFE config API values keep flowing (account #1470), and only real defaults go in `defaultConfig`, since a key in the app's own `config` cannot be overridden by `commonAppConfig` (catalog #156).
