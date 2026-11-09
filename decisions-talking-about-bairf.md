# Decisions — talking about bairf (2026-11-09)

Settled while preparing a deeper dive on bairf for colleagues, after a shareout on AI tool use at work drew interest. The deliverable in progress is `what-bairf-is.md`. Entries are in the order they were decided.

1. **The audience is non-technical: colleagues who use AI for non-coding work.** Findings are shared at that level. Each item in the doc names its subject in plain terms first and in repo terms second, so the translation can be checked against the repo.

2. **A sidequest worktree lives at `<bairf parent>/sidequest-<name>/bairf-<name>`, like every other effort kind.** The parent directory is created by hand and the worktree goes inside it; Brian had been doing this himself and `bin/effort start` was run straight this time, landing the worktree at the flat default. Two interim moves (to `sidequest-<name>` as the worktree itself, and a matching change to the script's default) were reverted. Whether the default should produce the nested form is left for later.

3. **"Work environment setup" sets up what the agents need, not what Brian needs.** The editor, browser and terminal are set up the ordinary way; bairf installs the practices, hooks, skills and tools the agents work from, so they behave the same on every machine.

4. **Effort workspaces are their own item, not a layer of setup.** The first draft folded them into the setup item as a second layer; they describe a different thing.

5. **The doc answers "what bairf is", not "what bairf does".** Every candidate item had been a noun wearing a verb, and the item about the instructions document resisted every verb because it names a place. Items are things that exist in the repo and can be pointed at. A heading that names a purpose ("a durable location for agent learnings") was rejected for an item because it doesn't sit beside the others; the same phrase was rejected as a one-line top-level answer because it covers only part of the list. The list of five stands with no top-level answer above it.

6. **Headings are title-style labels, and a label may carry a term the body then defines.** "Effort workspaces" is fine although the audience doesn't know "effort": a label signals "read on". A sentence-shaped heading using the same term ("Sets up a workspace per effort") reads as off, because it asserts the reader already knows the word. Claude Code's own terms get a parenthetical gloss in the label: "Hooks (enforced rules)", "Skills (reusable procedures)".

7. **The headings, in order:** Established practices; Effort workspaces; Hooks (enforced rules); Skills (reusable procedures); Work environment setup instructions. The setup goes last because it is how the other four reach a machine.

8. **"Established practices" names the instructions document and the reference docs beside it.** Rejected for the heading: "instructions" (not wrong given the contents, but sounds handed down), "rules" (same), "guardrails", "conventions" (close, but sounds like nobody decided), "a durable location for agent learnings" (purpose, not thing; see 5). The quality wanted was "learned, then decided", which "established" carries.

9. **Memory stays on; bairf is where the curated result lives, and bairf does not curate.** Claude Code's memory is the intake. Brian reviews memories with an agent at his own pace and promotes what deserves to be permanent into "How Brian works" or a reference doc; the rest is dropped. The setup was first built from such a review of every memory on the machine. The contrast with disabling memory and writing durable notes up front (a coworker's approach) is a point Brian wants made; whether it is written in the doc or said aloud is open. The item's opening sentence settled, after several rounds, as: "Claude Code has a built-in system that lets agents record "memories" about projects and workflows." Rejected openers described the system as being *for* recording how Brian works (it isn't specific to him), or the memories as Brian's (they are the agents'), or as being about the people agents work with (it is about how they work).

10. **Rules the agents follow by reading them are part of established practices, not a separate item.** A learning and a rule are the same line in the document at two moments, before and after it was written down. The hooks item covers only the rules that went one step further, from written down to enforced by code, because reading them was not enough.

11. **"Keeps a public record separate from the working record" is not an item.** It is a property of the whole, enforced by the first hook; its sentence lives in that hook's bullet.

12. **A one-line definition of bairf: "stuff Brian uses to make Claude work the way he likes (and a home for 'for Claude by Claude' text)".** The second half is not a second category: recording context is part of working the way Brian likes, and could happen in local files or fork branches; what bairf distinctly is, is the *home* for that text. The talk's explanation defines the coinage and the name: Claude writes a lot of text ("Claude vomit"), Claude needs it, Brian needs a home for it, hence bairf (barf + AI). A cold reader's objection that "the way he likes" is too soft was rejected: "make" carries the force, and "make ... the way he likes" is true of all five parts where "by his rules" is true of three.

13. **A cold read by a fresh agent in a non-technical persona is the test of a draft.** First run recorded in `cold-read-1.md` (nonprofit marketer, browser Claude, no code). Result: the five ideas landed, bairf itself was undefined, repo terms in code font read as "not for me", and the plain-English sentences carried each section.

14. **`what-bairf-is.md` stays the reference and is not rewritten for the room.** The audience gets a separate doc, `something-like-bairf.md`, whose question is "how can a non-technical person do something like bairf": each part as what Brian does, what it gets him, and the equivalent without a terminal. Ordered by what the cold reader said landed.

## Open

- Item 1's body under "Established practices" has not been worked through.
- Where the memory contrast goes: on the page, or spoken.
- `bin/effort start` default directory (see 2).
