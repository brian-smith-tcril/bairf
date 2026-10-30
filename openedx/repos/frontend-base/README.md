# openedx/frontend-base

Facts about the repo that outlive any effort. Read 2026-10-30 at `ae5ec93` on `main`.

- Default branch `main`. Fork: `brian-smith-tcril/frontend-base`.
- Checks: `npm run typecheck`, `npm run lint`, `npm test`. `npm run lint` ends with `npm --prefix ./test-site run lint`, and `test-site` depends on `@openedx/frontend-base` as `file:../pack/openedx-frontend-base.tgz`; the `shell` jest project's masquerade suites import `@openedx/frontend-base` through the same install. A fresh clone therefore needs CI's install order before lint or the full suite pass: `npm ci`, `npm run pack` (runs `make build` through `prepack`), then in `test-site` `npm i ../pack/openedx-frontend-base.tgz` and `npm ci`. The `npm i` rewrites `test-site/package-lock.json` (the tarball's integrity hash); revert it, it is not part of any change.
- Commitlint: `.github/workflows/commitlint.yml` calls `openedx/.github/.github/workflows/commitlint.yml@master`, no local config; the same chain as the learning snapshot in `openedx/commits.md`.
- Releases: semantic-release (`.releaserc`), so `feat:` is a minor and `fix:` a patch; `package.json` version stays `0.0.0-dev`.
- Slot and widget ids are the targeting surface of site-config operations; slot `idAliases` came in #178, widget `idAliases` in #334. Neither has a docs page or a slot-showcase entry; the documentation is the TSDoc on the types.
