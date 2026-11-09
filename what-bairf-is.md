# What bairf is

Audience: colleagues who use AI for non-coding work. Each item names a thing that exists in bairf on `main` today, in plain terms first and in repo terms second so the translation can be checked.

## 1. Established practices

A document called "How Brian works" (`claude/CLAUDE.md`), and the reference docs it points at. The agents read it at the start of every session, on every project. It covers pace, how to investigate, how decisions get made and recorded, how to behave on GitHub, how to write code and commits, and the house rules of the Open edX repos. The reference docs beside it hold the facts those practices lean on: a glossary, per-repo notes that outlive any one piece of work, the shapes issue and PR bodies take.

Where it comes from. Claude Code has a built-in system that lets agents record "memories" about projects and workflows. Every so often Brian reviews those memories with an agent and decides which deserve to be permanent. Those are written into "How Brian works" or a reference doc beside it; the rest are dropped. The document began as one such review, of every memory on the machine, and it grows the same way: a practice gets a line once it has been learned, and the line's history in git is the record of when and why.

Contrast for the audience: some people disable memory and have the agent write everything to a durable place up front. Brian lets memory accumulate cheaply, then curates. The curated layer is versioned and installed on every machine (item 5); the memory layer is per machine and allowed to be messy.

## 2. Effort workspaces

An effort is one piece of work: a multi-session project, a single task, a sidequest like this one, or a review of someone else's PR. Each gets its own named workspace, a `project/`, `task/`, `sidequest/` or `review/` branch checked out as a folder beside the code it serves. One command creates it with an empty index (`TAG.md`) and a README; the folder then holds plans, decisions, manual-testing records and draft issue and PR bodies as the work happens. The code repo learns which effort it belongs to from a one-line local file, so the agents resolve the right folder on their own. Non-technical framing: a project folder for the notes about the work, separate from the work itself, that the agents know to read and write in.

When an effort is done, closing it turns the index into an archive tag and removes the folder. The notes remain searchable later: from a PR or issue number, or a term, back to the effort that produced it.

## 3. Hooks (enforced rules)

A hook is a small script Claude Code runs on its own before an agent takes a certain kind of action. If the script objects, the action doesn't happen and the agent is told why. Most of the practices in item 1 are followed because the agents read them; a hook is for the few that matter too much to leave to reading. bairf has two, each with a test beside it:

- No GitHub write whose body names a scratch file, bairf, or a local path. The public record on a project repo stays complete on its own and never points at Brian's working notes.
- No push from a throwaway clone under `/tmp`.

## 4. Skills (reusable procedures)

A skill is a step-by-step procedure an agent follows on request, written down once so it runs the same way every time, with stops where Brian decides. bairf has one of its own: `upstream-issue` takes a plan from an effort workspace to a public GitHub issue in four steps, draft, create, review, settle, and nothing advances to the next step until Brian says so. Two scripts do the same job for the lifecycle of efforts and reviews: `bin/effort` creates, finds and closes an effort workspace; `bin/review` sets up and tears down a review of someone else's PR, with its record and draft comments.

## 5. Work environment setup instructions

Agent-run. This is not about Brian's own tools; the editor, the browser and the terminal are set up the ordinary way. bairf sets up what the agents need to work the way Brian works.

One checkout of bairf is "the installed one". A script (`setup.sh`) checks the machine against a short list of expected states and reports each row as ok, missing, or needs a hand merge; on Brian's word it brings every row to ok. Non-technical framing: a checklist an agent runs so that, on any computer Brian works from, the agents start every session with the same practices, the same hooks and the same skills. A fresh machine takes minutes, and nothing about how the agents behave depends on which machine it is.

What the checklist installs, in plain terms:

- A pointer that says where the setup lives, so everything else is derived from one place.
- A one-line file that pulls in "How Brian works" (item 1) at the start of every session, on every project.
- The hooks (item 3), registered so Claude Code runs them.
- The skills (item 4), copied in and refreshed on re-run.
- Third-party tools the practices tell the agents to use.

## Open

- Item 1's body is new under this heading and hasn't been worked through yet.
- Whether the memory contrast paragraph stays written down or is said out loud when presenting.
