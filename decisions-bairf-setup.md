# Decisions — setting up bairf (2026-10-16)

Settled while turning the React Query epic's learnings into a reusable Claude Code setup. Entries are in the order they were decided.

1. **bairf `main` is the machine setup; every other branch is an effort.** Point a new machine at `main`. Effort branches hold working docs and are deleted when the effort ends.

2. **A body on a project repo is the complete public record.** The failure to prevent is substitution: an agent linking to a plan instead of embedding it, so the only public copy of the reasoning lives in a personal repo. Bodies embed content verbatim; bairf is a working copy, never a place a reader is sent.

3. **Bare scratch filenames are out of bodies too.** They are meaningless to a later reader. The thirteen PRs and fourteen issues on openedx/frontend-app-learning that already mention them are a cleanup candidate, separate from this setup.

4. **A hook enforces 2 and 3, not just prose.** `hooks/no-scratch-refs.sh` runs on every Bash call, fires only on a gh write at the start of a command segment, and scans only the body sources (body files, inline `--body` text including heredocs) for scratch filenames, bairf URLs, bairf worktree paths and local paths. `hooks/test-no-scratch-refs.sh` holds eleven cases.

5. **No symlinks in the machine setup.** `setup.sh --check` reports each item's state and `--apply` brings it there, idempotently. Items: the pointer, the `~/.claude/CLAUDE.md` stub, the global git ignore, merged `settings.json`, skill copies, plugins and tools.

6. **Exactly one checkout is the installed one.** `~/.claude/bairf-root` holds its absolute path; everything else derives from it. Hook commands in settings read the pointer at run time; the CLAUDE.md stub is the one written-out copy of the path, rewritten by setup.

7. **`CLAUDE.local.md` is ignored through the global git ignore**, which the setup checks, so no repo's tracked `.gitignore` changes and no per-clone step exists.

8. **Open edX conventions live in the user-level CLAUDE.md under a conditional section**, pointing at docs in the bairf checkout, so no per-repo import or file is needed.

9. **A code repo joins an effort with one line in `CLAUDE.local.md` naming the branch**, never a path. Agents resolve the worktree with `bin/effort path`.

10. **Four tiers of knowledge:** user-level conduct (`claude/CLAUDE.md`), ecosystem (`openedx/*.md`, `openedx/GLOSSARY.md`), repo (`openedx/repos/<repo>.md`, facts that outlive any effort), effort (the effort branch). The repo tier exists so a future effort on a repo does not have to search archive tags.

11. **A global glossary exists above any repo.** First entry: *frontend app*, not *MFE*. Ecosystem terms go to `openedx/GLOSSARY.md` on main; effort terms to the worktree's own `GLOSSARY.md`. Other entries settled here: frontend-app-authoring (Studio, Authoring are nicknames); frontend-base *slot* vs frontend-plugin-framework *plugin slot*, used interchangeably by people so the agent says which; *tutor dev*, not *tutor local* (a different Tutor mode); *upstream* as the repo a fork was forked from, a concept rather than a remote name.

12. **ADRs are rare and never written by agents.** frontend-base owns ecosystem decisions and is ADR-heavy by design; a frontend app's ADR never restates, narrows or contradicts one. Four gates, the fourth being "only this repo decides it, and no existing ADR covers it" (in a frontend app, frontend-base's ADRs count). Agents propose with gates and ADRs checked, then stop. The decisions doc is the valve that keeps ADR pressure low.

13. **Wayfinder uses the local-markdown tracker in the effort worktree.** Maps and decision tickets are files under `wayfinder/<effort>/`; nothing is created on a project repo's tracker by planning.

14. **GitHub issues are created only through `/upstream-issue`**, a four-gate export: draft the body in the worktree, create on Brian's word, review loop with the worktree file as mirror, approve. `UPSTREAM.md` holds the state; implementation starts only on an `approved` row. The friction is intentional.

15. **Finished efforts become tags.** `bin/effort close` tags the final commit `<kind>-archive/<name>`, deletes the branch locally and on origin, and removes the worktree. A list of efforts buys nothing: `git branch` and `git tag -l '*-archive/*'` are the lists.

16. **Three effort kinds: project, task, sidequest.** Branches are `<kind>/<name>`. A project is a multi-session effort against a code repo, an epic's worth. A task is work that would make sense as one issue or PR: a bug fix, a one-commit feature. A sidequest is for Brian: exploring an idea, investigating with no commitment to act on the findings, or this setup itself.

17. **The official gh-stack skill stays the base.** bairf never copies it; `openedx/stacked-prs.md` holds only Brian's additions, and setup installs the official skill with `gh skill install github/gh-stack` when missing.

18. **Remote names are a property of the clone.** Docs say "upstream" in the fork-parent sense and tell the agent to read `git remote -v`. Push to the fork whenever that works; only a branch pushed to upstream itself carries the `bsmith/` prefix.

19. **Code conventions reference OEP-67 as the baseline** and keep five house rules: TypeScript for new files, the `@src` alias over `../../` climbs where the alias exists, test conventions, following the two hook lint rules even where disabled, naming the endpoint rather than "the LMS".

20. **Manual-testing guidance lives with the body templates**, since it is about writing the doc that a PR embeds, not about code.

21. **The user-level CLAUDE.md was pruned line by line.** Dropped: bug-provenance attribution, local `git log --grep` discovery, the lookup-object rule, the destructuring rule, WIP checkpoints, batching dependency removals, the tarball-to-registry rule, the stay-inside-one-directory rule (machine-specific; it stays in auto-memory). Reworded for plainness: literal test conditions, settled decisions in bodies, discussion diffs (no "once it becomes a PR" condition), non-blocking review comments (report provenance and size, Brian chooses), second rejection ends the guessing, review-thread replies, `as any` as an absolute last resort, minimal diffs and faithful conversions as two rules with justification written where the change is proposed, PR branches as a plain checkout by default with uncommitted work a question for Brian. Moved: deep-or-wide to Deciding as a work-splitting rule, diff `+`/`-` lines to GitHub, bisect into a renamed Investigating section, layer-commit rules into `openedx/stacked-prs.md`.

22. **Legacy from the epic:** the 207 scratch files moved from the frontend-app-learning checkout onto `project/learning-react-query`, to be closed with an archive tag once pushed. An accidental commit of those files on `bsmith/special-exams-v5` (f16c34dc, unpushed) is reset to a6442722 on Brian's word.

23. **Nothing assumes a default branch name.** `gh repo view --json defaultBranchRef` reads it; a fork's can differ from upstream's. The stacked-PR doc says "default branch" everywhere it said `master`.

24. **Node rules were split.** nvm is on PATH through the session hook and is never sourced by the agent; setup verifies `nvm --version` runs rather than that the file exists. Checks go through `package.json` scripts. The lockfile rule is three lines: regenerate from scratch, pin a transitive dependency by adding it as a direct or dev dependency (never `overrides`), and lock-only commits before `package.json` changes. `npm dedupe` was a fix for react-intl 10 hoisting in frontend-app-learning, not a rule; it moved to that repo's file.

25. **A repo's docs are a directory.** `openedx/repos/<repo>/README.md` for facts that outlive any effort, `openedx/repos/<repo>/GLOSSARY.md` for its terms. A glossary has three levels: ecosystem, repo, effort; `agents/domain.md` names where a resolved term lands.

26. **Worktree location is a convention.** `bin/effort path` resolves through `git worktree list`, so a worktree can live anywhere. A task's takes the default beside the bairf checkout (the directory holding the repo checkouts); a project's is passed as `[dir]` so it sits inside the project directory beside the code.

27. **A subdirectory `CLAUDE.local.md` loads on demand.** Claude Code discovers `CLAUDE.md` and `CLAUDE.local.md` under the launch directory and loads each when a file in that subdirectory is first read, written or edited, so a session started in a project directory above the repo checkout still picks up the repo's bairf branch on first touch.

28. **Body templates for every shape.** `openedx/github-bodies.md` opens by naming the worktree docs a body is built from, then gives a full template for a new issue and a PR description. The review-reply comment shape was dropped; the doc covers issues and PR bodies only.

29. **Glossary corrections from review:** frontend-app-authoring is the term (Studio and Authoring are nicknames); a frontend-base *slot* and a frontend-plugin-framework *plugin slot* are distinct and the agent says which; it is *tutor dev*, since `tutor local` is a different mode; *upstream* is the fork's parent as a concept, with push-to-fork preferred and the `bsmith/` prefix only on branches pushed to upstream itself.

