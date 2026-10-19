# Config mapping table: env vars and bootstrap keys to frontend-base config

Type: research
Status: open

## Question

Decision from grilling Q13: one table, reviewed by Brian, not a per-variable conversation.

Produce a table with one row per variable in Learning's `.env.development` (52) and per key in the `mergeConfig` block of `src/index.jsx` (26; overlap expected). Columns: name; where Learning reads it today (file:line count); destination, one of: required or optional `SiteConfig` field (name it); route role or `externalRoutes` entry (name the role id); app `defaultConfig` value under frontend-base ADR 0017 (name the key); shell-managed, dropped; or unknown. Follow the how-to's "Delete the .env files and create site.config files" section and catalog's `.env` audit in the gist worklog.

Also propose, from the converted apps' conventions: Learning's `appId`, its route ids (`org.openedx.frontend.route.learning.*`), and its role ids, one per route-level page, matching how catalog, gradebook, profile and account name theirs.

Note any variable whose destination is "dropped" as a possible breaking change for operators, without deciding it.

## Answer
