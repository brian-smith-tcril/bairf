# What Learning's header does that the shell's does not, and how `provides` reaches the course bar

Type: research
Status: open

## Question

Decision 20 takes the shell's header and footer and declares Learning's course-bar roles through `provides`. What, concretely, does that lose, and what does Learning have to declare?

1. Inventory what `LearningHeader` (`@edx/frontend-component-header`) renders for Learning today, and what the preferences-unsubscribe page's plain `Header` renders: course title and org line, course tabs, masquerade bar and its placement, menus, logo and links, anything driven by Learning's `courseHome.*` data. Compare each against frontend-base's shell header on `main` (`shell/header/`, including `course-bar/` and `masquerade/`). Classify each item: shell already provides it / Learning declares it through `provides` / absent, note as a possible breaking change.
2. How `provides` works for the course bar: the two ids in `shell/header/constants.ts`, what `CourseTabsNavigation` and `MasqueradeBar` do with them, what the shell renders for a tab whose role no installed app provides, and what Learning must put in its `App.provides` for each of its tabs (outline, dates, progress, discussion, live, courseware). Cite ADR 0013 and the code.
3. Footer: what Learning's `FooterSlot` usages render that the shell footer does not.

## Answer
