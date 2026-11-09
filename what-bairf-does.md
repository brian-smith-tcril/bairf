# What bairf does

Audience: colleagues who use AI for non-coding work. Every item below is a thing bairf does on `main` today, named in plain terms first and in repo terms second so the translation can be checked.

## 1. Sets up the work environment for the agents

Agent-run. This is not about Brian's own tools; the editor, the browser and the terminal are set up the ordinary way. bairf sets up what the agents need to work the way Brian works.

One checkout of bairf is "the installed one". A script (`setup.sh`) checks the machine against a short list of expected states and reports each row as ok, missing, or needs a hand merge; on Brian's word it brings every row to ok. Non-technical framing: a checklist the assistant runs so that, on any computer Brian works from, the agents start every session with the same instructions, the same guardrails and the same procedures. A fresh machine takes minutes, and nothing about how the agents behave depends on which machine it is.

What the checklist installs, in plain terms:

- A pointer that says where the setup lives, so everything else is derived from one place.
- The standing instructions: a one-line file that pulls in "How Brian works" (`claude/CLAUDE.md`) at the start of every session, on every project.
- Guardrails that run automatically before certain actions (the hooks; see item 4).
- Reusable procedures (skills), copied in and refreshed on re-run.
- Third-party tools the instructions tell the agents to use.

## 2. Sets up a workspace per effort

Each piece of work gets its own named workspace: a `project/`, `task/`, `sidequest/` or `review/` branch checked out as a folder beside the code it serves. One command creates it with an empty index (`TAG.md`) and a README; the folder then holds plans, decisions, manual-testing records and draft issue and PR bodies as the work happens. The code repo learns which effort it belongs to from a one-line local file, so the assistant resolves the right notes folder on its own. Non-technical framing: a project folder for the notes about the work, separate from the work itself, that the assistant knows to read and write in.

When an effort is done, closing it turns the index into an archive tag and removes the folder. The notes remain searchable later: from a PR or issue number, or a term, back to the effort that produced it.

## 3. Holds the curated version of what the agents learn

(Candidate.) Claude Code has a built-in system that lets agents record "memories" about projects and workflows. Every so often he reviews those memories with an agent and decides what deserves to be permanent. What survives is written into the standing instructions ("How Brian works", `claude/CLAUDE.md`) or a reference doc beside them; the rest is dropped. The setup started this way, from a review of every memory on the machine, and the same review repeats whenever Brian decides it's time.

Contrast for the audience: some people disable memory and have the agent write everything to a durable place up front. Brian lets memory accumulate cheaply, then curates. The curated layer is versioned and installed on every machine (item 1); the memory layer is per machine and allowed to be messy.

## 4. Enforces a few rules mechanically

(Candidate.) Two hooks run before every shell command: one blocks any GitHub write whose body names scratch files, bairf, or a local path; one blocks pushing from a throwaway clone. These are the rules that matter too much to leave to the assistant's memory.

## 5. Packages repeatable procedures

(Candidate.) A skill is a step-by-step procedure the assistant follows on request, with gates where Brian decides. `upstream-issue` takes a local plan to a public issue in four gated steps: draft, create, review, settle. `bin/review` opens and closes a review of someone else's PR with its record and draft comments.

## 6. Keeps a public record separate from the working record

(Candidate.) Working notes stay in the effort folder; what goes to a project repo is the complete, embedded record with none of the scratch. The hook in item 4 is what makes the line hard to cross by accident.

## Open

- Which of 3 to 6 go on the list, and in what order after 2.
