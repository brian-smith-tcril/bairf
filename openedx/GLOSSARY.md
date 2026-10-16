# Open edX ecosystem glossary

Seed. Sharpen with `/grill-with-docs`; ecosystem-wide terms land here, a repo's own terms in `repos/<repo>/GLOSSARY.md`, an effort's in its worktree's `GLOSSARY.md`.

- **frontend app** (`frontend-app`): a deployable Open edX frontend, one per `frontend-app-*` repo. Avoid: *MFE*, *micro-frontend* (the older name).
- **OEP**: an Open edX Proposal; OEP-67 is the tools-and-technology baseline every frontend app follows (`frontend-app-code.md`).
- **frontend-base**: the library every frontend app is built on; the ADR-heavy, foundational repo. Its ADRs are the ecosystem's standing decisions (`adr-policy.md`).
- **frontend-platform**: the predecessor library frontend-base replaces.
- **Paragon**: the Open edX React component library and design-token system.
- **openedx-platform**: the backend monolith (`edx-platform` historically). Its LMS and CMS are services inside it; in comments, name the endpoint (`course_metadata`) or the repo, never "the LMS" as an actor.
- **frontend-app-authoring**: the course-authoring frontend app; sometimes referred to as Studio or just Authoring.
- **slot** (frontend-base): a customization point a frontend app defines with `<Slot id="…" />`, into which an operator's site config inserts widgets; named in reverse-domain form (`org.openedx.frontend.slot.header.main.v1`, frontend-base ADR 0009).
- **plugin slot** (frontend-plugin-framework): the older mechanism, a `PluginSlot` in a frontend app's `src/plugin-slots/`, with ids like `org.openedx.frontend.learning.<name>.v1`. People use "slot" and "plugin slot" interchangeably; say which mechanism is meant.
- **tutor dev**: Brian's local Open edX stack, run with `tutor dev …` (`tutor-dev.md`). Not `tutor local`, a different Tutor mode.
- **upstream**: the repo a fork was forked from; for Open edX repos, the one under the `openedx` org. It is a concept, not a remote name: when the checkout is a fork, pull from the remote that points at its parent (`gh repo view --json parent` names it, `git remote -v` shows which remote has that URL). Other remotes are forks, Brian's or a contributor's added to pull a branch. Branches push to Brian's fork whenever that works; any branch pushed to upstream itself (in practice, a stack's layers) carries the `bsmith/` prefix.
- **layer**: one PR in a stack; one commit, one concern. **running stack**: the single stack all current epic work lands on.
- **plan doc**, **decisions doc**, **manual-testing doc**: `plan-<issue>.md`, `decisions-<issue>.md`, `manual-testing-<issue>.md` in the effort worktree; planning, settled entries, and observed in-browser results respectively (`github-bodies.md`).
- **ADR**: a numbered behaviour decision in a repo's `docs/decisions/`; proposed by agents, written by people, rare in frontend apps (`adr-policy.md`).
- **effort branch** / **worktree**: a bairf branch holding one effort's working docs, checked out beside the code it serves; closed by a `<kind>-archive/<name>` tag. Kinds: **project** (multi-session, an epic's worth), **task** (one issue or PR's worth: a bug fix, a one-commit feature), **sidequest** (exploration or investigation for Brian, with no commitment to act on it).
