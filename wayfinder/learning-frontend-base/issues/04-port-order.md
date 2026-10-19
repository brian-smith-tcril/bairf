# Port order and split points

Type: grilling
Status: claimed
Blocked by: 01, 02

## Question

Decision 18: one route-level page per PR, courseware expected to split. Which page goes first, in what order do the rest follow, and where does courseware split?

Inputs: the dependency graph between Learning's route-level pages and shared code (`src/generic/`, `src/tab-page/`, `src/course-home/data/`, `src/courseware/data/`), the header findings (01) that decide what the tab-page frame needs, and the config table (02) that decides what the scaffold must carry before the first page renders. Candidates for first: the outline tab (simplest tab, exercises the tab-page frame, course metadata and the header course bar) or the three non-course pages (smallest, but exercise nothing shared).

Output: an ordered list of port tickets with their one-line scope and the shared modules each one carries out of `src/` first.

## Answer
