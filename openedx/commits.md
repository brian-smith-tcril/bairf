# Commit messages on Open edX repos

The rule is [OEP-51, Conventional Commits](https://open-edx-proposals.readthedocs.io/en/latest/oep-0051-bp-conventional-commits.html). What is enforced is whatever check the repo runs on its PRs, and that is read, not assumed, before the first commit of a layer and again after the repo's workflows change.

## Reading the enforced rules

1. Find the check: the commitlint job on a recent PR of the repo (`gh pr checks <n>`, or the job list on the PR), and the workflow file that defines it (`grep -ril commitlint .github/`). The file name is not fixed.
2. Follow the workflow to its config at the ref it pins. A `uses:` of another repo's workflow means reading that workflow at that ref; a config fetched by URL means reading the URL as it is now. A ref like `@master` or a `HEAD` URL can change under the repo without any commit in it, so a past reading is not a rule.
3. The config the run actually loads is the rule: a config file in the repo if the workflow prefers one, otherwise whatever the workflow supplies. Where the job log prints the loaded rules or the failing rule names, the log is the ground truth.

A repo whose resolved rules differ from the others, or from the last snapshot below, gets a line in `openedx/repos/<repo>/README.md`.

## Snapshot: frontend-app-learning, read 2026-10-21

Not a rule; what the chain resolved to that day. `.github/workflows/commitlint.yml` calls `openedx/.github/.github/workflows/commitlint.yml@master`; that workflow runs `wagoid/commitlint-github-action` on every commit of the PR and, finding no `commitlint.config.mjs` in the repo, fetches `edx_lint/files/commitlint.config.js` from openedx/edx-lint at `HEAD`. That file: `@commitlint/config-conventional` with `type-enum` of `revert`, `feat`, `fix`, `perf`, `docs`, `test`, `build`, `refactor`, `style`, `chore`, `temp` (so no `ci`); `header-max-length` 110; body and footer lengths, leading blanks, subject case and subject full stop unchecked; `Revert "..."` messages ignored.
