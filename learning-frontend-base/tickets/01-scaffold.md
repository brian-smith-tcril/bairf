# 01: Scaffold the `frontend-base` package

**Parent:** openedx/frontend-app-learning#1905

**What to build:** A maintainer can run the dev server, the test suite and the build from a new `frontend-base` directory in the repository, scaffolded from frontend-template-application's main branch as its own npm package, with the repository root untouched. CI runs the new package's checks from the subdirectory and uploads its coverage under its own flag, alongside the unchanged legacy workflow. The template's names are replaced with Learning's identity (app id, package name, route and role id prefixes from the reviewed config table). The provenance manifest exists, empty. The manual-testing record documents the verification environment every later layer uses.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The new package's `dev`, `test`, `build` and `lint` scripts run from inside its directory with no root install present
- [ ] A new CI workflow file runs the package's checks on changes under its directory; no master-owned workflow file is modified
- [ ] Coverage uploads under a `frontend-base` flag configured from a file inside the package, with an absolute project target equal to master's project coverage at branch creation; verified by throwaway commits inside the layer that are removed before it lands
- [ ] The package's site config declares the required site-config fields and Learning's app with its default config, from the reviewed config table
- [ ] An empty `manifest.tsv` with a header comment describing the format
- [ ] The manual-testing record describes the verification environment (how a frontend-base site is run against tutor dev) step by step
- [ ] Types, lint and tests of the new package pass; master's legacy workflow stays green; `npm run dev` from the new package serves every route ported so far

Notes: Decisions 11, 16, 17; the prototype-free verification of the subdirectory layout is a task inside this ticket.
