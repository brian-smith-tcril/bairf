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

15. **`something-like-bairf.md` covers the two parts the presentation focuses on, as two named sections with no numbers (2026-11-16).** The first is "Global instructions": the "How Brian works" document, with what goes in it as subsections and memory as where its lines come from, as in the reference and 9. The second is the files Claude writes so that a later session can use them, which bairf produces in automated ways; the decisions doc and the glossary are the best examples. This replaces the six numbered headings written under 14. The shape of each part from 14 stands: what Brian does, what it gets him, the equivalent without a terminal.

16. **The second section is named '"For Claude by Claude" files'; "local setup" is the other presenter's part.** Local setup is the walkthrough, for people who don't use GitHub, of how they might store files like a glossary or a decisions doc. Rejected as this doc's section name for that reason: "local setup". The label reuses the phrase from the one-line definition in 12. Where the files are kept is handed off to local setup and is not covered in this doc, which does not mention local setup either.

17. **The subheadings under "Global instructions" are the categories of what goes in the document, worded to be understood alone on a slide.** A slide shows the headings and none of the body, so the allowance in 6 for a label whose term the body defines does not apply to them. In order: When to stop and wait; How to look into a problem; How decisions get made; Things never to do; What finished work looks like. The first three are the Pace, Investigating and Deciding sections of "How Brian works", the fourth its Shell section, and the fifth stands for its tool-specific sections (GitHub, Code, Git, Node repos, Open edX repos). Rejected: wrapper subheadings "What goes in it" and "Where the lines come from" (the what and the where don't need headings; the categories are the headings); "House rules for one kind of work" for the fifth. Memory has no heading of its own. The second section's subheadings are plural to match: Decision docs; Glossaries. "Decision docs", not "Decisions docs": it is what Brian says aloud, though bairf's own files write "decisions doc".

18. **The example under "Things never to do" is "A first name is never inferred from a handle."** It is lighthearted and works for the room. It replaces the delete-command rule and its home-directory story, and it does not fit under "What finished work looks like", where it first sat. So the category is the "never" lines wherever they are in "How Brian works", not only its Shell section as 17 had it.

19. **"What finished work looks like" is dropped; "Global instructions" has four subheadings.** When to stop and wait; How to look into a problem; How decisions get made; Things never to do. The fifth was a bucket for the tool-specific sections of "How Brian works" (GitHub, Code, Git, Node repos, Open edX repos), renamed to sound general, as "House rules for one kind of work" had been before it. Nothing in the document is organised that way, and the line picked for it ("Minimal diffs") is about how to work, not what the result looks like. The four that remain are each about how Claude behaves in any kind of work.

20. **What a glossary gets Brian is agreement on terms.** Claude tends to make terms up when they aren't defined. Rejected as the benefit: Claude using his words consistently across sessions and dropping retired ones, which describes an effect and misses the point.

## Open

- Item 1's body under "Established practices" has not been worked through.
- Where the memory contrast goes: on the page, or spoken.
- `bin/effort start` default directory (see 2).
- Whether hooks, skills and the machine setup get a mention in `something-like-bairf.md`; they are out of it for now and remain in the reference.
- Where a browser user puts the global instructions document so Claude reads it every time: whether that is this part's to say or local setup's. `something-like-bairf.md` says nothing about it until this is answered and the product fact is checked.

Open items for `something-like-bairf.md`, kept here and not in the doc, since cold read 1 took an "Open" section for notes left in the handout:

- Every "Yours might be" and "Your version" example is invented, written in the 2026-11-16 pass. Swap any that don't fit the room.
- Which of Brian's lines stands for each of the first three categories, and the plain-words rendering of each, have not been checked by Brian.
- Voice: Brian in first person, or about Brian.
- Whether the memory paragraph stays as text under "Global instructions" or leaves the doc.
- The cold reader took three reads to decode "for Claude by Claude". It is now a heading that will stand alone on a slide; the doc decodes it in its second paragraph, a slide would not.
