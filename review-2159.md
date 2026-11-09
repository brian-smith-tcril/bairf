# Review: openedx/frontend-app-learning#2159 — feat: Pathways strip in course pages [FC-0137]

https://github.com/openedx/frontend-app-learning/pull/2159

The record of this review. The state is rewritten, never appended; the passes table and the ledger grow. A comment on the PR is what the author should act on or answer; everything else is a ledger entry.

## State

First of a four-PR stack (ChrisChV, open-craft fork; #2231 pathway pages and the strip's links, #2232 achievements, #2233 progress, each "review only the changes" against the previous branch). Adds a strip below the course header listing the learner's pathways that include the course, as the default content of a new `org.openedx.frontend.learning.course_info_strip.v1` slot, with a "+N" popover for labels that do not fit. The data layer is a stub: `getPathwaysByCourse` returns `{}` until openedx-platform has the endpoint, so on a real site nothing renders; the body's `dev-pathways-dummy-data-2.patch` makes every course get five fixture pathways (downloaded to `/tmp/claude-1000/-var-home-bsmith-code-reviews/6f1523c0-5704-4fae-b797-b660a6af9c9e/scratchpad/downloads-2159/`, touches `src/pathways/data/api.ts` only). Twin of the learner-dashboard strip from openedx/frontend-app-learner-dashboard#875.

Review history: rpenido requested changes 2026-10-06 (RTL fix missing, since shown present; asked about a shared `@openedx/frontend-component-pathways` package, unanswered), kdmccormick requested changes 2026-10-09 (drop the `ENABLE_PATHWAY_PILOT_UI` flag, `itemCount` not `courseCount`, a generic info-strip slot; Brian agreed to the generic slot and raised that frontend-base assumes the header is topmost, so cassiezamparini settled "below the course header"). All three landed by 2026-10-16. rpenido approved 2026-10-29 (notes: patch path stale, since fixed; strip blends with the instructor toolbar, follow-up for design), kdmccormick approved 2026-10-29 and handed Brian the technical sweep. One open thread: rpenido on `types.ts` line 12, the optional category fields are safe to assume present, "revisit when we add the backend". Head 696901a030 is a merge of master into the branch (repo allows squash and rebase only); base 230799eb25; CI green, codecov full patch coverage.

Claude's first pass (2026-11-09), whole diff for dealbreakers and bigger conversations; Brian has not read it yet and the local run is his. No dealbreaker found (entries 1, 5, 8). Two things for Brian: the strip renders on every page that goes through `TabPage` (outline, dates, progress, discussion, live, course exit, courseware units) and nothing in writing says which pages it is meant for; the issue, the Figma node and every screenshot show the course outline (entry 2); and the data shape carries fields nothing in this PR reads, with rpenido's shared-package question still open (entries 3, 4). Small things parked in entry 6. Brian's local run is underway with the author's dummy-data patch applied (entry 7). Decided so far: the strip moves below the instructor toolbar so a frontend-base port is a plain `PREPEND` into the course navigation bar slot (entries 2, 10); the custom SCSS is a dealbreaker-class comment (entry 9). Next: his remaining picks, then the drafts.

## Passes

One row per pass. `bin/review sync` appends the row with the new head; scope (whole diff, named files or commits) and outcome (none, comments, approve, request changes) are filled in by hand. Since the last pass: `git diff <previous head>..<head>` in the code worktree, or `git range-diff` across a rebase.

| date | base | head | scope | outcome |
|------|------|------|-------|---------|
| 2026-11-09 | 230799eb25 | 696901a030 | whole diff (`git diff origin/master...HEAD`), dealbreakers and bigger conversations; slot gating against learning#1713 and #1943; FPF 1.8.0 `PluginSlot`; `TabPage` consumers; sibling slots, hooks and message ids; rpenido's reviews and open thread; screenshots; suite not run | none yet: entries 2, 3, 4 wait for Brian |

## Ledger

One entry per question, newest last: `### N. <question>`, a `Status:` line, a `Rests on:` line, then what was found, why no comment was needed, or what was posted. Status is one of: open; resolved, no comment; posted <thread url>; parked; stale. "Rests on" names the files and the head SHA the answer was reached at; a pass marks an entry stale when those files changed since.

### 1. Is the new slot's contract right: id, aliases, props, rendering?

Status: resolved, no comment
Rests on: src/plugin-slots/CourseInfoStripSlot/{index.tsx, README.md}, src/tab-page/TabPage.tsx, src/plugin-slots/README.md at 696901a030; node_modules/@openedx/frontend-plugin-framework@1.8.0 dist/plugins/PluginSlot.js; Brian's comments on openedx/frontend-app-learning#1713 (https://github.com/openedx/frontend-app-learning/pull/1713#discussion_r2128909259) and #1943 (https://github.com/openedx/frontend-app-learning/pull/1943#discussion_r3631800950)

Id `org.openedx.frontend.learning.course_info_strip.v1` follows the 29 siblings in `src/plugin-slots/README.md` (`org.openedx.frontend.learning.<snake_case>.v1`) and is listed there in order. No `idAliases`, right for a new slot. One plugin prop, `courseId`, which the README's own examples (trial access, archived run) need; the README documents it, shows default and replacement, and says how to hide (`Hide` on `default_contents`). FPF's `PluginSlot` renders through `as = React.Fragment` by default, so when `CoursePathwaysStrip` returns `null` (no pathways, or still loading) nothing is left in the DOM; no empty band on sites without pathways. `slotOptions={{ mergeProps: true }}` is on 11 of 35 sibling slots and absent here; the default content takes `courseId` directly, so nothing is lost.

Gating: `TabPage` renders the slot only under `shouldRenderContent` (metadata resolved without error), the same gate as the toast, the tour button and the tab body; the header renders regardless. Brian's #1713 line ("the slot should always be rendered. The goal is to render nothing *in* the slot by default") was about a config flag deciding whether a slot exists; #1943 is the closer case, where he leaned that a page-level condition may gate the slot and "whatever component operators put in there can assume it's supposed to render when it's rendering". Loading and error are page-level. No comment.

### 2. Which pages is the strip intended for? Today it renders on every `TabPage` page

Status: open: placement below the instructor toolbar decided (2026-11-09), reaffirmed after entry 10; comment to draft. The intended set of pages still his call; the design mock being a unit page is a data point for all pages
Rests on: src/tab-page/TabPage.tsx, src/tab-page/TabWithTimer.tsx, src/courseware/CoursewareContainer.tsx, src/course-home/{outline,dates,progress,discussion,live}-tab, src/courseware/course/course-exit/CourseExit.jsx at 696901a030; issue #2165; PR body; src/plugin-slots/CourseInfoStripSlot/README.md and screenshot_default.png

The slot sits in `TabPage`, so the strip renders on every page that goes through it: outline, dates, progress, discussion and live tabs and `CourseExit` via `TabWithTimer`, and the courseware unit pages via `CoursewareContainer`. Nothing in writing picks a set: issue #2165 says "rendered in the course outline", the PR body and slot README say "below the course header", and every screenshot (body, slot README, rpenido's approval) is the outline tab. kdmccormick's "visual changes ... look good" rests on those outline screenshots. Asking "is the unit page intentional?" is backwards (Brian, 2026-11-09): the author decides page by page what the strip is for, and dates, progress and the rest are as open as units. Shape if asked: "This renders on every page that goes through `TabPage` (outline, dates, progress, discussion, live, course exit and the courseware units). Which of those is the strip meant for?" If the answer is "outline only", the slot moves or is gated by tab; the record's entry 1 (slot always rendered, default conditional) still holds either way. Not asked: whether the strip belongs on #2231's pathway pages, which do not use `TabPage`.

Decided direction (Brian, 2026-11-09, after entry 10): the strip moves below the instructor toolbar, which holds the masquerade widget here (`src/instructor-toolbar/InstructorToolbar.jsx` imports `MasqueradeWidget`), and stays above the course tabs. That is the frontend-base order (header, masquerade bar, course navigation bar), so the port is a `PREPEND` into `header.courseNavigationBar.v1` with nothing to rearrange. In code: `CourseInfoStripSlot` leaves `TabPage` (line 156) for `LoadedTabPage`, after `InstructorToolbar` and before the `AlertList`/`CourseTabsNavigationSlot` column. Consequences: gating is unchanged (`LoadedTabPage` renders only under the same `shouldRenderContent`, with `courseId` present), so the slot's `courseId` can become a required `string`; the two `TabPage.test.jsx` cases for the slot (lines 64 to 76) move to `LoadedTabPage`'s tests. Size: a handful of lines, all from this change. The "which pages" half of this entry stays open: the move does not change the set of pages, it fixes the order within them.

### 3. `PathwayData` carries fields nothing here reads, and rpenido's optionality note is open

Status: open: Brian's call
Rests on: src/pathways/data/types.ts, src/pathways/pathways-strip/{CoursePathwaysStrip.tsx, MorePathwaysPopover.tsx} at 696901a030; openedx/frontend-app-learner-dashboard#879 src/hooks/usePathwayData.ts at f4852b343a; rpenido's thread https://github.com/openedx/frontend-app-learning/pull/2159#discussion_r4412725979; Brian's #175 comment 5 (https://github.com/openedx/frontend-app-catalog/pull/175#discussion_r4496568991)

The strip and the popover read `pathway.id` and `pathway.content.displayName` only. `itemCount`, the four `category*` fields, `progress` and `provider` have no reader in this PR; they appear in the fixtures. The type is the learner-dashboard's `PathwayData` (#879) minus `categoryLabelPlural`, so this is the shared shape being copied in, not invented here; #2231 to #2233 presumably read the rest. Brian's rule from #175 ("Nothing in this PR reads `PathwayCardProps` ... wait until there's something using it") applies by the letter; against it, the comment at the top of `types.ts` declares it the UI's contract with the API layer, and trimming it here would diverge the two copies rpenido wants merged (entry 4). rpenido's open thread says the category fields are safe to assume present; in #175 Brian asked for `category` and `categoryLabel` required per the catalog ADR, with the color pair optional. Same question across three repos; where it gets answered is Brian's call.

### 4. Shared code with the learner dashboard: rpenido's `@openedx/frontend-component-pathways` question

Status: open: bigger conversation, Brian's call
Rests on: rpenido's review https://github.com/openedx/frontend-app-learning/pull/2159#pullrequestreview (2026-10-06 body); openedx/frontend-app-learner-dashboard#875, #879

rpenido's 2026-10-06 review: "This and openedx/frontend-app-learner-dashboard#875 share a lot of components and functions. Handling it in two places in the long term would be a pain." No reply on the PR. What is shared today: the `PathwayData` type (entry 3), the fixtures' shape, and the strip's measuring approach (#875's strip is the "twin"). Where it would live (a component package, or frontend-base once both apps are on it) is the "where something should live" conversation Brian usually routes to the right owner; not a blocker for this PR.

### 5. Do the tests test the thing?

Status: resolved, no comment
Rests on: every `*.test.*` under src/pathways and src/plugin-slots/CourseInfoStripSlot, src/tab-page/TabPage.test.jsx at 696901a030

All new. `hooks.test.tsx` drives `useVisiblePathways` through a harness with mocked layout getters and a mocked `ResizeObserver`: fit, overflow, cut label, nothing fits, RTL, container resize, label resize, same-count rerender, no `ResizeObserver`, unmount. `CoursePathwaysStrip.test.tsx` mocks the hook and the popover and asserts the visible labels by class selector, the measure row's `aria-hidden` and child count. `MorePathwaysPopover.test.tsx` uses `userEvent` and the accessible name, singular and plural, click and Escape. The slot test asserts the default content renders inside the slot with the prop; `TabPage.test.jsx` asserts the slot renders with `courseId` and not while loading. `api.test.ts` asserts the stub returns `{}` ("Until the backend exists"), a placeholder that will be rewritten with the endpoint. Nothing claims more than it asserts.

### 6. Small things, held

Status: parked
Rests on: src/pathways/pathways-strip/{hooks.ts, CoursePathwaysStrip.scss, MorePathwaysPopover.tsx}, src/pathways/data/{api.ts, apiHooks.ts} at 696901a030; src/courseware/course/breadcrumbs/BreadcrumbItem.tsx; src/course-home/data/apiHooks.ts

- `COUNTER_RESERVED_WIDTH = 74` in `hooks.ts`: the space kept for the "+N" trigger is a hard-coded pixel width rather than the trigger's measured width; a longer count or a different font changes it.
- `CoursePathwaysStrip.scss` uses `var(--pgn-color-light-700)` for borders but raw `0.75rem`, `1.25rem`, `0.5rem` for spacing where `--pgn-spacing-spacer-*` exists, and restyles Paragon's `.badge` and `.btn-icon-after` inside the trigger.
- The "+N" `Button` has `aria-label` but no `aria-expanded`/`aria-haspopup`; the repo's other `ModalPopup` trigger (`BreadcrumbItem.tsx`) has neither either. Same pattern, so a repo-wide note if anything.
- `courseId!` twice in `apiHooks.ts` with `skipToken`: `skipToken` is new to this repo, but `courseId!` is how `course-home/data/apiHooks.ts` and `courseware/data/apiHooks.ts` already pass an optional id into a query-options builder (23 `!` in src). Matches siblings; no comment.
- `// eslint-disable-next-line @typescript-eslint/no-unused-vars` on the stub's `_courseIds`; the repo's `.eslintrc.js` sets no `argsIgnorePattern`, and whether `@openedx/frontend-build`'s config does was not checked.
- Message ids `learning.coursePathways.*` fit `learning.outline.*`, `learning.loading`.

### 7. Local run

Status: open: Brian's
Rests on: the body's testing instructions; the downloaded patch

Needs tutor (course page, login). `git apply` of the downloaded patch in the code worktree makes `getPathwaysByCourse` return five fixture pathways for every course, enough to overflow the strip and show the popover; it is not applied yet. Things to watch, from the diff: the strip on each `TabPage` page, units and the dates and progress tabs included (entry 2); the "+N" trigger at narrow widths and in RTL; the popover's Escape and outside-click; the instructor toolbar directly below the strip (rpenido's screenshot).

### 8. Anything in the diff the body does not account for?

Status: resolved, no comment
Rests on: the whole diff at 696901a030; the PR body

Every file is under `src/pathways/`, `src/plugin-slots/CourseInfoStripSlot/`, the slot index, `src/index.scss` (one import) and `TabPage` (one import, one line, two tests). Nothing out of scope. The head is a merge commit (master merged in 2026-10-28); the repo merges by squash or rebase, so it does not land as is.

### 9. `CoursePathwaysStrip.scss`: what Paragon already provides, what it does not

Status: open: Brian flagged the file on his read (2026-11-09): custom styles are a cost to theme authors; comment shape pending
Rests on: src/pathways/pathways-strip/CoursePathwaysStrip.scss (53 lines), CoursePathwaysStrip.tsx, MorePathwaysPopover.tsx at 696901a030; @openedx/paragon 23.23.1 dist/core.css (installed; package.json `^23.4.5`); `git ls-files 'src/**/*.scss'`

Rule by rule against Paragon 23.23.1's `core.css`:

- `.course-pathways-strip-container` (`position: relative; flex: 1; min-width: 0; overflow: hidden`): `position-relative`, `flex-grow-1`, `overflow-hidden` exist as utilities; no utility sets `min-width: 0` (`mw-100` is max-width), and that line is what lets the label row shrink under its content. One line needs SCSS.
- `.course-pathways-strip-label` (`flex-shrink: 0; white-space: nowrap`): `flex-shrink-0` and `text-nowrap` exist. The `& + .label` separator (0.75rem margin and padding, 1px `--pgn-color-light-700` border, logical `inline-start`): Paragon's spacer scale is 1..6 = .25/.5/1/1.5/3/5rem, no .75; `border-left` exists but is `--pgn-color-border` with `!important` and there is no `border-light-700` colour utility; so the separator is SCSS either way. Design question, not a Paragon one: is `light-700` the divider colour the Figma wants on `bg-primary`?
- `.course-pathways-strip-trigger` on the Paragon `Button`: `py-0` and `rounded-0` exist as utilities (Paragon utilities are `!important`, so they beat `.btn-sm`); the `border-inline-start` is the same separator as above. Then it reaches into Paragon component internals: `.badge` is rebuilt (`inline-flex`, `min-width`/`height` 1.25rem, `padding: 0`, margin) against Paragon's own badge tokens (`--pgn-spacing-badge-padding-*`, `--pgn-size-badge-border-radius-pill`), and `.btn-icon-after`'s 0.5rem gap is zeroed. No other SCSS file in this repo targets `.badge` or `.btn-icon-after` (`git grep` over `src/**/*.scss`, none). This block is the "custom where the system provides" item: the system's `Badge pill` and the button's icon spacing are provided and then overridden.
- `.course-pathways-strip-measure` (hidden copy for measuring): `position-absolute` and `invisible` exist; `top/left: 0`, `width: max-content`, `pointer-events: none` have no Paragon 23 utility (`top-0`, `pe-none` are Bootstrap 5). Stays SCSS, and the measuring approach itself is entry 6's "+N" reserve question.

Why it matters (Brian, 2026-11-09): every custom rule is one more thing a theme author has to find and override; a repo already carrying custom SCSS is no licence to add more. The file's size relative to siblings is not a consideration. The ask is therefore the whole file, not the Badge block alone: utilities where Paragon has them, and for the lines Paragon cannot express (`min-width: 0`, the separator, the measuring block) the question is whether the design needs them at all.

### 10. Port to frontend-base: where would the strip sit between the header and the course tabs?

Status: Brian's position (2026-11-09): below the header is his preference too, since a strip above it would move the header up and down between the learner dashboard and the learning pages; he will reply on the thread himself that frontend-base can also carry it above everything if design really wants that. The move in entry 2 (below the instructor toolbar) stands.
Rests on: src/tab-page/TabPage.tsx and LoadedTabPage.tsx at 696901a030; frontend-base 72d7053 (alpha.19 head) shell/DefaultLayout.tsx, shell/header/Header.tsx, shell/header/app.tsx, shell/header/course-bar/navigation/CourseTabsNavigation.tsx, shell/header/course-bar/utils.ts, runtime/slots/widget/types.ts

Here today: `TabPage` renders `HeaderSlot`, then `CourseInfoStripSlot`, then `LoadedTabPage`, which renders `InstructorToolbar`, `AlertList` and then `CourseTabsNavigationSlot`. So the strip already sits between the header and the course tabs, with the instructor toolbar and alerts between it and the tabs. The app owns that whole column.

In frontend-base the app does not. `DefaultLayout` is header.main → content.main → footer.main, and the shell's `Header` component renders `<header>` (desktop and mobile slots), then the `header.masqueradeBar.v1` slot, then the `header.courseNavigationBar.v1` slot. The course tabs are the shell's `CourseTabsNavigation` widget, appended to `courseNavigationBar.v1` under a `condition.callback` of `isCourseBarRoute()` (apps opt in by `provides: { [providesCourseBarRolesId]: [...] }`), reading `courseId` from `useParams()`. There is no slot named for "between the header and the tabs", but two existing slots put a widget there:

- `PREPEND` (or an insert-before relative to `org.openedx.frontend.widget.header.courseNavigationBar.v1`) into `header.courseNavigationBar.v1`: renders above the tabs, below the masquerade bar, inside the same slot.
- `APPEND` into `header.masqueradeBar.v1`: same visual position, different slot; semantically wrong, the slot is the masquerade bar.

Either way the strip becomes a header-level widget, mounted by the app's config with a route condition, not a slot the app renders in its page body; the `courseId` comes from the route params as `CourseTabsNavigation` does. The ordering question that stays open: the instructor toolbar (today between the strip and the tabs) has no frontend-base home yet, so the relative order of strip, masquerade bar, toolbar and tabs is undecided there. `courseNavigationBar.extraContent.v1` is inside the `Nav`, beside the tab links, not a row above them.

How the position was chosen (thread https://github.com/openedx/frontend-app-learning/pull/2159#discussion_r4234023949, read in full): commit 5f92fb9 (2026-10-04, "add the course pathways strip above the course header") rendered the strip above `HeaderSlot`, README "shown above the course header", screenshot likewise (saved as downloads-2159/original-above-header.png). On 2026-10-09 kdmccormick relayed Brian's point that frontend-base assumes the header is topmost with app content sandwiched below, sketched the fix (a generic info-strip slot inside the header that the app pushes into) and asked product whether above-the-header was essential. cassiezamparini (2026-10-13): "think it could work if it's just below the course title", with a mock (downloads-2159/design-below-title.png: strip directly under the title row, above the tabs, on a courseware unit page). kdmccormick: "works great"; ChrisChV moved it in e8f73ea. So the present position is downstream of the constraint as stated on 10-09, and the design reply reads as an accommodation.

Was the constraint right? In frontend-base at 72d7053, `header.main.v1`'s only default widget is the shell's `Header` component (shell/app.ts, `APPEND` under `isChromeVisible`), and slots are ordered widget lists, so a `PREPEND` into `header.main.v1` renders above the `<header>` element. The above-the-header design is reachable as a header-area widget mounted from the learning app's config with a route condition; what frontend-base rules out is the app rendering it from its page body. Semantics of the candidates, from the slot names and frontend-base#106 ("Course Navigation Tab bar as a slot inside the header"): `PREPEND` into `header.courseNavigationBar.v1` puts cross-course context inside the slot named for the tab bar, a stretch; `header.masqueradeBar.v1` is wrong; `PREPEND` into `header.main.v1` is honest ("in the header area, above the header bar", ADR 0009 reads `header.main.v1` as the slot that wraps the header) and matches the original design; a new shell slot in `Header`, empty by default, at the position design picks, is the clean answer the 10-09 thread already sketched and needs frontend-base work. Both candidate positions are therefore reachable in frontend-base; the position should be picked on design merit, and the 10-09 framing overstated the constraint.

Bearing on entry 2: the design mock is a courseware unit page, so design intends the strip on units at least. Bearing on the move recorded in entry 2: it is needed only for the below-title position (masquerade bar, strip, tabs); for above-the-header, 5f92fb9's order (strip, header, toolbar, tabs) is what a `PREPEND` into `header.main.v1` gives.

Header replacement flows (Brian's question, 2026-11-09; frontend-base 72d7053 shell/app.ts, shell/header/app.tsx, shell/header/Header.tsx, docs/decisions/0016-shell-layout-replacement-seams.rst). The header region has two replacement seams. (a) The documented one, ADR 0016: `REPLACE` against `widget.header.desktopLayout.v1` (and `mobileLayout.v1`), which swaps the bar inside `<header>` and leaves `Header`'s two lower slots, masquerade bar and course navigation bar, rendering. (b) `REPLACE` against `widget.header.main.v1`, the `Header` component itself, which takes the `<header>` and both lower slots away; the replacement renders those slots itself or the tabs are gone. Either is one operation today, with one widget in each slot.

| flow | strip prepended into `header.courseNavigationBar.v1` (below the header) | strip prepended into `header.main.v1` (above everything) |
|---|---|---|
| (a) replace desktopLayout | untouched, like the tabs | untouched, sits above the custom bar |
| (b) replace the `Header` widget | goes with the header, like the tabs; back only if the replacement renders the slot | survives above the replacement: a second widget in a slot ADR 0016 treats as one layout widget, so a clean header region now needs a `REMOVE` of a learning widget id the operator has to know about |
| remove or replace the tabs widget | strip stays (ops are per widget id); its own `REMOVE` hides it | n/a |

Weight of this (corrected the same day after Brian asked): the normal header replacement is seam (a), which leaves the course tabs and the strip alone in either position, so the two placements do not differ for the common flow. Only seam (b), the whole-region replacement that already takes the course bar with it, tells them apart, and whether the course bar belongs to the header region is a frontend-base question that predates this PR. So this is a minor point, not a second reason; the header moving vertically between the learner dashboard and learning is the reason for below the header.
