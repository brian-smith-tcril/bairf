# Review: openedx/frontend-app-learner-dashboard#878 — feat: Update Course heading in dashboard [FC-0137]

https://github.com/openedx/frontend-app-learner-dashboard/pull/878

The record of this review. The state is rewritten, never appended; the passes table and the ledger grow. A comment on the PR is what the author should act on or answer; everything else is a ledger entry.

## State

First of the PRs split out of openedx/frontend-app-learner-dashboard#875 (ChrisChV, open-craft fork). Covers the dashboard heading only ("My Learning" title, "Courses" heading, sticky heading and Refine filter, header links renamed to Explore and My Learning) and depends on no pathways code; #879 is independent of it by its own body and by branch content (diverged, neither contains the other). kdmccormick approved 2026-10-29. Brian is doing his own pass (2026-10-30); findings arrive from him as he goes.

## Passes

One row per pass. `bin/review sync` appends the row with the new head; scope (whole diff, named files or commits) and outcome (none, comments, approve, request changes) are filled in by hand. Since the last pass: `git diff <previous head>..<head>` in the code worktree, or `git range-diff` across a rebase.

| date | base | head | scope | outcome |
|------|------|------|-------|---------|
| 2026-10-30 | 162fad7fde | aca7e369ba | | |

## Ledger

One entry per question, newest last: `### N. <question>`, a `Status:` line, a `Rests on:` line, then what was found, why no comment was needed, or what was posted. Status is one of: open; resolved, no comment; posted <thread url>; parked; stale. "Rests on" names the files and the head SHA the answer was reached at; a pass marks an entry stale when those files changed since.

### 1. What `ENABLE_PROGRAMS` gates, how programs relate to pathways, and where the tab order came from

Status: resolved, no comment
Rests on: src/widgets/LearnerDashboardHeader/app.tsx, ProgramsLinkMenuItem.jsx, DiscoverLinkMenuItem.jsx, src/data/services/lms/urls.js at aca7e369ba; the #878 threads; frontend-app-learner-dashboard issues #372, #865, #866; platform-roadmap#452, #448

`ENABLE_PROGRAMS` gates exactly one thing: the Programs header link widget (`headerLinkPrograms.v1`, `ProgramsLinkMenuItem`), whose target is `programsUrl()` = `<LMS>/dashboard/programs`, the legacy program dashboard that is still Django templates in edx-platform (#865: converting it to a React route here is wanted, platform-roadmap#468, nobody on it). The gate came from #372 (arbrandes, 2024-11: hide the button on installs with no programs). "Programs" here is the course-discovery-era concept. Nothing in this repo links programs and pathways in code.

Overlap is intended at the roadmap level: platform-roadmap#452 (Grouping Product) describes "new functionality that covers use cases currently handled by Discovery and Programs", and #463 (Modular Delivery) is its parent. So pathways are the planned successor to programs, not a sibling; a dashboard that shows both is the transition state. No roadmap issue, and nothing on #875 or #878, decides the header navigation.

Tab order. Before this PR: Courses, Programs (if enabled), Discover New. After aca7e36: Explore, My Learning, Programs (if enabled). kdmccormick's thread on `messages.ts` asked only that the Courses tab become My Learning; ChrisChV's reply says "I also updated the 'Explore' tab and the order of the tabs", so Explore-first is the author's addition with no written ask behind it. The only candidate source is the Pathways Figma file (#866 and #875 link nodes 900-2007 and 2220-2065; #866 warns the designs changed and to wait for the final), which is not readable from here. Brian checked the Figma (2026-10-30): the "My Learning Dashboard" frame's header shows Explore first, then My Learning selected, and no Programs link anywhere. So Explore-first is from the design, and Programs was simply not considered. Brian's call: fine as is, Programs stays last behind its gate; no comment.

Also from the commit: the widget ids were swapped so that `headerLinkDiscover.v1` is the first widget and `headerLinkCourses.v1` now renders My Learning (same destination, so an override keyed on that id still lands on the dashboard link); the message ids changed (`learnerVariantDashboard.course` → `.myLearning`, `.discoverNew` → `.explore`), which resets translations for those two strings, the right call when the English changes meaning.

### 2. The `explore` message description still says "discover"

Status: posted https://github.com/openedx/frontend-app-learner-dashboard/pull/878#discussion (thread on src/widgets/LearnerDashboardHeader/messages.js line 57, 2026-10-30 14:42)
Rests on: src/widgets/LearnerDashboardHeader/messages.js at aca7e369ba

### 3. Naming is split between discover/explore and courses/myLearning after the rename commit

Status: open, candidate comment
Rests on: src/widgets/LearnerDashboardHeader/{app.tsx, DiscoverLinkMenuItem.jsx, DiscoverLinkMenuItem.test.jsx, MyLearningLink.jsx, messages.js}, src/data/services/lms/urls.js, src/tracking/constants.js at aca7e369ba; npm versions of @openedx/frontend-app-learner-dashboard; tags v1.0.0 and v2.0.0-alpha.1

Brian's finding (2026-10-30). Enumerated:

The Explore link. Renamed by aca7e36: message key `discoverNew` → `explore`, id `learnerVariantDashboard.explore`, label "Explore". Still "discover": the file `DiscoverLinkMenuItem.jsx` and its test, the inner `DiscoverLink` function, the `DiscoverLinkMenuItem` component, the widget id `headerLinkDiscover.v1`, and the message description "switching to discover page" (entry 2, posted). Already "explore" on master, untouched: the tracking event names `learner_home_nav_explore` and `learner_home_nav_dropdown_explore` (so analytics called it explore while the label said Discover New), `learner_home_widget_explore`, and the NoCoursesView `exploreCourses*` messages. The URL helper the link uses is `coursesUrl(courseSearchUrl)`, shared with NoCoursesView and LookingForChallengeWidget; it points at course search, so its name is the one pre-existing mismatch on this side.

The My Learning link. Renamed: `CoursesLink.jsx` → `MyLearningLink.jsx`, function `MyLearningLink`, message key `course` → `myLearning`, id `.myLearning`, label "My Learning". Still "courses": the widget id `headerLinkCourses.v1`. (`CoursesPanel` and its messages are genuinely the courses list and stay.)

What can move freely: file, component and function names, the test file, the message description. What cannot move freely: the two widget ids. Unlike catalog, this package has a non-alpha release: `1.0.0` is published, built on frontend-base, and `headerLinkCourses.v1` and `headerLinkDiscover.v1` are in its `app.tsx`; master is on `2.0.0-alpha.4`. A site that overrides or removes those widgets by id on 1.0.0 breaks if they are renamed, so an id rename is a `!` change under the 2.0.0 major, documented, not a free tidy. Tracking event names are analytics identifiers and stay. Candidate comment: finish the rename for the code-level names (file, component, function, test), and decide the widget ids explicitly: either rename them as a documented breaking change in the 2.0.0 line, or leave them and say so.

### 4. What frontend-base makes public about widget ids, and whether aliases cover them

Status: resolved, no comment (feeds entry 3)
Rests on: openedx/frontend-base at ae5ec93 (2026-10-26): runtime/slots/Slot.tsx, runtime/slots/hooks.ts, runtime/slots/widget/types.ts, runtime/slots/widget/utils.tsx, docs/decisions/0009-slot-naming-and-lifecycle.rst, docs/decisions/0016-shell-layout-replacement-seams.rst; openedx/frontend-base#178

Aliases are slot-only. #178 (brian-smith-tcril, merged 2026-02-26, port of frontend-plugin-framework#110) added `idAliases?: string[]` to `<Slot>`; `useSlotOperations` passes `[id, ...idAliases]` to `getSlotOperations`, which matches an operation's `slotId` against that list. Widgets have no equivalent: a widget has one `id`, and the four relative operations resolve `operation.relatedId` by exact match in `findRelatedWidgetIndex`.

Widget ids are a targeting surface: of the seven `WidgetOperationTypes`, five take `relatedId` (`INSERT_AFTER`, `INSERT_BEFORE`, `REPLACE`, `REMOVE`, `OPTIONS`); only `APPEND` and `PREPEND` do not. A site config that hides, replaces, reorders around, or passes options to the header links names `headerLinkCourses.v1` or `headerLinkDiscover.v1`.

The written contract covers slots, not widgets. ADR 0009 defines the id format (`org.openedx.frontend.slot.<module>.<identifier>.<version>`), says a slot's contract is its props, its page location and the general kind of content, and states that "the presence, absence, shape, or implementation of child widgets ... is explicitly not part of the slot's contract, and may change at any time". That sentence is about what bumps a slot's version, not a licence to rename widget ids. ADR 0016 treats default widget ids as public in practice: "All existing inner slot ids and default widget ids are preserved", and a new widget id is counted as "the public surface gains ... one new widget id ... following the reverse-DNS-versioned convention from ADR 0009". No ADR gives widget ids a deprecation path, and with no alias a renamed widget id simply stops matching old `relatedId`s.

Net for entry 3: renaming the two header widget ids is a break for any 1.0.0 site config that targets them, with no compatibility shim available, so it is a documented `!` change in the 2.0.0 line or not done. Adding `idAliases` for widgets in frontend-base is the shim that does not exist yet.
