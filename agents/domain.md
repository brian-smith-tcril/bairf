# Domain docs

## Before exploring, read these

- `openedx/GLOSSARY.md` in the bairf checkout: ecosystem vocabulary.
- `openedx/repos/<repo>/GLOSSARY.md`, when it exists: this repo's own terms.
- `<worktree>/GLOSSARY.md`: the effort's own terms, when the effort worktree has one.
- The repo's `docs/decisions/`: ADRs touching the area, plus frontend-base's `docs/decisions/` for the ecosystem rules they sit under.

Absent files are fine; proceed silently.

## Where a resolved term lands

- Ecosystem-wide (true in every frontend app): `openedx/GLOSSARY.md`, committed on bairf `main`.
- Repo-specific, outliving any effort: `openedx/repos/<repo>/GLOSSARY.md`, committed on bairf `main`.
- Effort-specific: `<worktree>/GLOSSARY.md`, committed on the effort branch.

## ADRs

`openedx/adr-policy.md`. Candidates are proposed with their gates and the ADRs checked; nothing is written into `docs/decisions/` by an agent.

## Use the glossary's vocabulary

Output names a concept the way the glossary does, and avoids the synonyms it marks. A concept missing from both glossaries is either invented language (reconsider) or a gap to note for `/domain-modeling`.
