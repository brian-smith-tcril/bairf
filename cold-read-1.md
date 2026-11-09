# Cold read 1 of `what-bairf-is.md` (2026-11-09)

Reader: a fresh agent playing a nonprofit marketer who uses Claude Code in a browser for LinkedIn posts and knows no code. It read only the doc, at commit 9a9bec3. Report verbatim below.

---

OK, I read the whole thing twice. Here's where I came out, honestly. I work in marketing, I use Claude in the browser to draft LinkedIn posts and the newsletter, and I've never written code. Brian asked where this loses someone like me, so I'm not going to soften it.

## 1. Section by section

### Section 1: "Established practices"

**What I think it says:** Brian has written a document called "How Brian works" that tells the AI how he likes things done (how fast to go, how to make decisions, how to write), and the AI reads it every time he starts working with it. The document is built from the "memories" the AI collects on its own: every so often Brian goes through those memories, keeps the good ones by writing them into the document, and throws the rest away. Some other people turn memory off and write their rules up front instead; Brian lets the memories pile up and then sorts them.

**Confidence:** Fairly high for the gist, maybe 70%. This is the section I understood best, because I know what Claude's memory is. I didn't understand how the document actually relates to the code stuff.

**What lost me:**
- "`claude/CLAUDE.md`" -- I have no idea what this is. Is it the name of the document? A place? Why the slash and the weird capitalization?
- "It covers pace, how to investigate, how decisions get made and recorded, how to behave on GitHub, how to write code and commits, and the house rules of the Open edX repos." -- "GitHub," "commits," "repos" all went past me. I've heard of GitHub as a website programmers use. "Open edX" I think is the education software Brian's team works on? Not sure.
- "a glossary, per-repo notes that outlive any one piece of work, the shapes issue and PR bodies take." -- I don't know what a "PR body" is or what an "issue" is here. "Shapes" of bodies sounds like a template, maybe?
- "the line's history in git is the record of when and why." -- "git" means nothing to me. I gathered it's some kind of record of changes, like Google Docs version history?
- "The curated layer is versioned and installed on every machine (item 5); the memory layer is per machine" -- "versioned" and "layer" are vague to me. I think "layer" just means "the two kinds of notes"?

### Section 2: "Effort workspaces"

**What I think it says:** Every piece of work gets its own folder for the notes *about* the work (plans, decisions, drafts), kept separate from the work itself. The AI knows where that folder is and reads and writes in it. When the work is done, the folder goes away but the notes are kept somewhere you can search later.

**Confidence:** Medium, maybe 50%. The sentence "Non-technical framing: a project folder for the notes about the work, separate from the work itself, that the agents know to read and write in" saved this section. Without that line I'd have had nothing.

**What lost me:**
- "a `project/`, `task/`, `sidequest/` or `review/` branch checked out as a folder beside the code it serves" -- "branch," "checked out," and "beside the code" are all mystery words. Checked out like a library book? I honestly don't know what a branch is.
- "One command creates it with an empty index (`TAG.md`) and a README" -- what is a README? What's `TAG.md`? Why is "index" in there?
- "The code repo learns which effort it belongs to from a one-line local file, so the agents resolve the right folder on their own." -- the whole sentence. "Code repo," "local file," "resolve."
- "closing it turns the index into an archive tag and removes the folder" -- what's an "archive tag"? If the folder is removed, where do the notes live? The next sentence says they're "searchable later" but doesn't say *where*.
- "a review of someone else's PR" -- again, PR. I'm guessing it's some kind of document other people submit for approval?
- Also, "a sidequest like this one" -- I like the word sidequest, but it made me realize this document is itself one of the things it's describing, and I wasn't sure what that meant.

### Section 3: "Hooks (enforced rules)"

**What I think it says:** Most of Brian's rules are followed because the AI reads them and tries to comply. But a couple of rules are too important to leave to that, so there's an automatic check that physically stops the AI from doing the thing and tells it why. There are two such rules: don't let any public writing mention Brian's private notes, and don't send stuff out from some kind of temporary scratch area.

**Confidence:** Medium-high on the idea, 65%. The idea is clear: "a hook is for the few that matter too much to leave to reading." I like that sentence. The two actual rules I only half-got.

**What lost me:**
- "A hook is a small script Claude Code runs on its own" -- "script" to me means a screenplay or a telemarketer's lines. I think here it means a little automatic program?
- "No GitHub write whose body names a scratch file, bairf, or a local path." -- "GitHub write," "body," "scratch file," "local path." I got the spirit from the next sentence ("The public record on a project repo stays complete on its own and never points at Brian's working notes") but the first sentence on its own was gibberish to me.
- "No push from a throwaway clone under `/tmp`." -- I have zero idea what this means. "Push"? "Clone"? "/tmp"? This bullet has no plain-English version next to it, unlike the first one.
- "each with a test beside it" -- test of what?

### Section 4: "Skills (reusable procedures)"

**What I think it says:** A skill is a written-down procedure the AI follows the same way every time, with built-in pauses where Brian has to say yes before it continues. Brian has one that takes a plan and turns it into a public posting in four steps, stopping after each step. There are also two helper tools for opening and closing the work folders from section 2 and for reviewing other people's work.

**Confidence:** Medium, 55%. The first sentence is very clear. Then it gets technical fast.

**What lost me:**
- "`upstream-issue` takes a plan from an effort workspace to a public GitHub issue" -- "upstream" and "issue." Issue sounds like a problem, but I think here it's a thing you post? I kept wanting it to mean "a problem Brian found."
- "draft, create, review, settle" -- I actually liked this. Four plain words. But "settle" is an odd one; settle what?
- "Two scripts do the same job for the lifecycle of efforts and reviews: `bin/effort` creates, finds and closes an effort workspace; `bin/review` sets up and tears down a review of someone else's PR, with its record and draft comments." -- "bin/" whatever. Why "bin"? Is it a trash bin? "Tears down" sounds destructive. And "do the same job" -- the same job as what? As the skill? I couldn't tell whether these two scripts ARE skills or are something different that's being mentioned here for convenience.

### Section 5: "Work environment setup instructions"

**What I think it says:** Brian can sit down at any computer, run one checklist, and the AI will set itself up to behave exactly the same way as on his other computers: same rules, same automatic checks, same procedures. The checklist shows what's okay and what's missing and fixes things when he says go.

**Confidence:** Medium-high on the concept, 65%, thanks to the "Non-technical framing" sentence again: "a checklist an agent runs so that, on any computer Brian works from, the agents start every session with the same practices." That's a good sentence. The bulleted list afterwards I only half-followed.

**What lost me:**
- "Agent-run." as the opening word. Took me a second; I think it means "the AI does this, not Brian."
- "One checkout of bairf is 'the installed one'." -- "checkout" again. I still don't know what checking out is.
- "A script (`setup.sh`)" -- what does ".sh" mean?
- "needs a hand merge" -- merge what with what, by hand?
- "A pointer that says where the setup lives" -- "pointer" like a sticky note? I think that's roughly it.
- "registered so Claude Code runs them" -- registered where?
- "Third-party tools the practices tell the agents to use." -- vague. Which tools? Why does the AI need tools? I thought the AI *was* the tool.

### "Open" section (not numbered, but it's there)

I read this as Brian's own to-do notes to himself that got left in the handout. "Item 1's body is new under this heading and hasn't been worked through yet" -- so section 1 might change? And "Whether the memory contrast paragraph stays written down or is said out loud when presenting" -- fine, but this isn't for me, it's for Brian. It made the document feel unfinished.

## 2. Terms I didn't understand or only half understood

- **bairf** -- Never actually defined! The title is "What bairf is" and I finished it still not sure if bairf is a folder, a document, a program, a set of rules, or a name for all of the above. My best guess: it's the collection of everything in sections 1 through 5, stored somewhere, that gets copied onto each of Brian's computers.
- **main** ("exists in bairf on `main` today") -- guess: the current/official version?
- **repo / code repo / project repo / Open edX repos** -- guess: a place where a software project's files live. Like a shared drive for one project?
- **`claude/CLAUDE.md`, `TAG.md`, `setup.sh`** -- guess: file names. No idea what the endings mean or why they're written in that typewriter font.
- **agents / the agents** -- I *think* this means the AI (Claude) while it's working. But "agents" plural confused me. Are there several? Is each conversation an agent?
- **Claude Code** -- I use claude.ai/code in my browser. Is that the same thing Brian means? He talks about "the terminal" so maybe not.
- **GitHub** -- guess: a website where programmers put their work and talk about it publicly.
- **issue** -- guess: a public posting on GitHub describing a piece of work or a problem. Not a magazine issue.
- **PR / PR body** -- no real guess. "Body" I take as the main text of something, like an email body. PR... public record? Can't be "press release" in this context, although that's what my brain keeps reading.
- **commit / commits** -- guess: saving a change, with a note about why?
- **git** -- guess: the thing that keeps the history of changes.
- **branch** -- no guess. Something tree-like.
- **checkout / checked out** -- no real guess. Maybe "a copy you're working on"?
- **README** -- guess: an intro note in a folder. The name is helpful at least.
- **index** (as in "an empty index (`TAG.md`)") -- guess: a table of contents.
- **archive tag** -- guess: a label that marks something as finished and stored away.
- **local file / local path** -- guess: a file on Brian's own computer, as opposed to online.
- **scratch file** -- guess: rough notes.
- **script** -- guess: a small automatic program.
- **hook** -- the document defines this one, thank you. A rule enforced automatically.
- **skill** -- also defined. A repeatable procedure.
- **push / clone / throwaway clone / `/tmp`** -- honestly zero. "Throwaway" tells me it's temporary.
- **upstream** -- guess: the original or official version of something that other people copy from? Like a river?
- **`bin/effort`, `bin/review`** -- guess: names of two little tools. Don't know why "bin."
- **tears down** -- guess: closes out and cleans up.
- **versioned** -- guess: has saved history.
- **hand merge** -- guess: two versions disagree and a human has to combine them.
- **pointer** -- guess: a note saying "look over there."
- **registered** -- guess: signed up with Claude Code so it knows to run them.
- **third-party tools** -- guess: other software, not made by Brian or by Claude.
- **sidequest** -- I get this from video games, a side task. Nice word actually.
- **effort** -- the document uses this as a technical word ("an effort is one piece of work") and it mostly worked, but I kept reading it as the ordinary word and stumbling.

## 3. What landed

Several things actually, and I want to be clear about that, because the ideas are good even where the words got in the way.

- **The memory curation idea in section 1.** "Brian lets memory accumulate cheaply, then curates." I've been vaguely annoyed that Claude remembers some things about my posts and not others, and it never occurred to me I could sit down with it every few weeks, ask what it's remembered, and decide what to keep as permanent instructions. I would totally do that for my voice and tone preferences. That paragraph was the most useful thing in the whole document for me.
- **A "How [Name] works" document that gets read at the start of every session.** I'd love a "How Maria works" that says: never use the word "leverage," always lead with a person, posts under 150 words, no emoji in headlines, etc. I didn't know you could have the AI read a standing document each time. I don't know if that's possible in the browser version I use.
- **Hooks, the idea of them.** "a hook is for the few that matter too much to leave to reading." Yes. There's a difference between "please don't" and "cannot." For us, "never post a donor's name without written consent" should be a cannot. I don't know if I can have one, but I want one.
- **The four-step skill with stops: "draft, create, review, settle, and nothing advances to the next step until Brian says so."** That is exactly how I'd want a newsletter workflow to go. Draft, I approve, it formats, I approve, it schedules. The idea that the stops are *built in* rather than me remembering to say "wait" is appealing.
- **Keeping notes about the work separate from the work.** "a project folder for the notes about the work, separate from the work itself." I do this badly in Google Drive already. Having the AI know where the notes folder is and keep decisions there is a nice thought.
- **"on any computer Brian works from, the agents start every session with the same practices."** I switch between my work laptop and home computer and Claude feels slightly different on each. I now understand that's a solvable problem, even if I don't understand the solution.

## 4. Questions I'd ask Brian

1. What *is* bairf? One sentence. Is it a folder? A document? A program? The name of your whole system? The document never says.
2. Is any of this available to me in the browser version of Claude Code, or does it all require "the terminal"? Sections 1 and 4 especially: can I have a "How I work" document and a stop-and-wait skill without being a programmer?
3. How do you do the memory review? Do you literally ask Claude "what do you remember about me" and go through it? How often? What does "deserve to be permanent" look like in practice?
4. When a hook blocks something, what does that look like? Does Claude just say "I'm not allowed to do that"? Can you override it?
5. In section 2, where do the notes actually go after you "remove the folder"? You say they stay searchable, but searchable where?
6. What's the difference between a skill and the two "scripts" in section 4? You say the scripts "do the same job" but you also say bairf has only *one* skill, so the scripts aren't skills? I couldn't tell.
7. What's in "How Brian works" that a non-coder could borrow? Can I see it? The parts about pace and decisions sound like they'd apply to anyone.
8. What are the "Third-party tools the practices tell the agents to use"? That line is a cliffhanger.
9. Why "bairf"? What does the name mean?
10. Was the "Open" section meant to be in the handout, or did it get left in?

## 5. Overall

On the scale from "I get what bairf is" to "I have no idea what I just read," I'm at about **"I get the five ideas, I don't get what bairf is."** Closer to the understanding end than I expected, honestly, but only because of the three sentences labeled "Non-technical framing" or "Contrast for the audience" and the one-liners like "a hook is for the few that matter too much to leave to reading." Everywhere else, the "plain terms first and in repo terms second" promise at the top didn't hold: the repo terms came first in most sentences, or both were mixed together in one sentence, and the plain version, when it existed, came last as a rescue.

**The single change that would have helped most:** put one plain-English paragraph at the very top that says what bairf is as a whole, and why it exists, before the five items. Something like: "bairf is the set of standing instructions, automatic guardrails, and repeatable procedures that I keep in one place and copy to every computer I work from, so the AI behaves the same way everywhere and I don't have to re-explain myself." I'm guessing at that, which is the problem. Right now the document is five descriptions of parts, and I had to infer the whole, and I'm still not sure I got it.

Close runner-up: every one of the typewriter-font things (`claude/CLAUDE.md`, `TAG.md`, `/tmp`, `bin/effort`, `setup.sh`) could go in a footnote or a second column. For me they're noise, and worse than noise, they make me feel like the document isn't for me even when the surrounding sentence is. The line at the top says they're there "so the translation can be checked," and I get that, but the person checking the translation is not the person who came to the talk.

---

# Follow-up: reaction to a one-line definition

Brian's candidate: "stuff Brian uses to make Claude work the way he likes (and a home for 'for Claude by Claude' text)". The same reader, in character, reacting to the sentence alone as if it were the doc's first line. Verbatim.

OK, reacting to the sentence on its own, as if it had been line one.

"stuff Brian uses to make Claude work the way he likes (and a home for 'for Claude by Claude' text)"

## 1. What I now think bairf is

Bairf is Brian's personal kit of instructions and settings for Claude. The things he's accumulated to make Claude behave his way. That's it, and honestly, yes, that answers my question 1. I wanted to know whether bairf was a folder, a document, a program, or the name of the whole system, and this tells me: it's the whole collection, and it's *his*. Not a product, not a tool everybody uses, a personal setup. That single fact reframes everything. Last time I kept wondering whether I was supposed to be able to go get bairf; now I understand I'm supposed to be looking at how Brian did it and thinking about doing my own version.

I'd put myself at "I get what bairf is" now. The five sections are the five kinds of stuff in the kit.

## 2. The first half: "stuff Brian uses to make Claude work the way he likes"

"stuff" lands as a **kit** or a **toolbox**. A grab bag with several different kinds of things in it. Not a document, not one folder, not a setting. The vagueness is actually right here, because the five sections *are* different kinds of things (a document, folders, automatic rules, procedures, a setup checklist), and any more precise word would have been wrong for four of the five. "Stuff" says "don't expect one kind of thing," which is the correct expectation.

"to make Claude work the way he likes" tells me a lot. It tells me the purpose is about *behavior*, not about getting more out of Claude or making it smarter. It's about Claude doing things Brian's way. That's exactly what I want for my LinkedIn posts: not a better Claude, a Claude that knows I never say "leverage." So yes, it tells me what the whole thing is *for*, and it tells me the thing is personal and preference-driven. "the way he likes" is a little soft, though. It sounds like taste, like he prefers blue. What I read in the sections was more like rules, guardrails, and stops that he's learned the hard way. "the way he works" or "by his rules" would be closer to what the five sections describe. "Likes" undersells it.

One more thing: "Claude" rather than "the agents." Thank you. Last time "the agents" plural threw me. If the document said "Claude" throughout I'd have followed it much better.

## 3. The parenthetical: "a home for 'for Claude by Claude' text"

I had to read it three times. Here's what I eventually pictured: writing that Claude produced, that is meant to be read back by Claude later, not by a person. Notes Claude leaves for its future self, basically.

Did I understand it on the first pass? No. The phrase "for Claude by Claude" is cute but it's a riddle. My first reading was "text about Claude, written in the style of Claude," which is wrong. My second reading was "text that Claude wrote," which is half of it. Only on the third did I get that the "for" half matters: the *audience* is Claude. And even then I'm guessing.

Did it connect to anything in the five sections? Yes, once I'd worked it out, it connected to section 1: the memories Claude records on its own, which Brian curates into "How Brian works." That's Claude writing things down for Claude to read later, with Brian in the middle deciding what stays. It also maybe connects to section 2, the notes folders, since Brian said "the agents know to read and write in" them, so Claude is writing notes there that Claude reads back. But I wouldn't have made either connection from the sentence alone. I made them because I'd already read the five sections and was hunting for a match. A first-time reader would have the riddle and nothing to pin it to.

"a home for" is good, though. It says this is where that writing *lives*, which was one of my questions last time (where do the notes go?).

## 4. Would I have read the rest differently?

Yes, a lot. The main gift is "Brian uses" and "the way he likes": I'd have read every section as "here is one more thing in Brian's personal kit" instead of trying to figure out what institution or product I was looking at. That alone would have cut my confusion in half.

Which sections it sets up well:
- **Section 1 (the "How Brian works" document and the memory curation)** is set up perfectly. That's the most literal "make Claude work the way he likes," and the parenthetical, once decoded, is pointing straight at the memory part.
- **Section 3 (hooks)** fits "the way he likes" fine, although as I said, "likes" is too soft for "it is not allowed to do this."
- **Section 4 (skills)** fits. Procedures that run his way.

Which it doesn't cover:
- **Section 2 (effort workspaces).** The notes folders for each piece of work. Nothing in the sentence prepares me for "and also a system of folders for project notes that come and go." Maybe the parenthetical is supposed to cover it (the notes are "for Claude by Claude"?), but if so it's doing it in code. I'd not have expected section 2 from this line.
- **Section 5 (setup on every computer).** The sentence says nothing about multiple machines or about installing anything. That's the section that most needs a "why does this exist" and the line doesn't give it. "...and copies it to every computer he works from" would have set it up in eight words.

## 5. What bothers me

- **"stuff."** I defended it above as accurate, and I mean that, but tone-wise it reads like a shrug. For the first line of a document that people asked for after a talk, it undersells the thing. It's the kind of word you use when you haven't decided what to call something. I'd keep the meaning and lose the shrug: "the kit Brian uses," "everything Brian uses," "what Brian keeps around."
- **The parentheses.** The parenthetical is doing something important (it's the only hint at the memory idea, which was the best idea in the whole document for me), and parentheses say "this part is optional." Either it matters, and it gets its own sentence, or it doesn't, and it goes. Right now it's an afterthought that happens to contain the most interesting thing.
- **The quotes inside quotes.** 'for Claude by Claude' as a quoted phrase inside the sentence makes it look like a brand name or a category I'm supposed to already know. I don't. If it's Brian's coinage, say so in plain words: "writing Claude produces for Claude to read later." It costs ten more words and removes the riddle.
- **"the way he likes."** Already said: too soft. The hooks are not preferences. "the way he works" or "by his rules."
- **It doesn't say why.** The sentence says what bairf is and skips why it exists. One more clause would do it: "so he doesn't have to re-explain himself every session, on every computer." That's the thing that made me sit up in section 5 and it's the thing I'd want in the first line.

If I were rewriting it for someone like me, keeping Brian's meaning: "bairf is everything Brian keeps to make Claude work by his rules on every computer he uses, including the notes Claude writes for itself to read later." Not elegant, but I wouldn't have had to read it three times.

Net: the sentence answers "what is bairf," which is what I asked for, and I'd rather have it at the top than not. The parenthetical is the part that needs another pass.
