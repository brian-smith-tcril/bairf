# Port order and split points

Type: grilling
Status: resolved
Blocked by: 01, 02

## Question

Decision 18: one route-level page per PR, courseware expected to split. Which page goes first, in what order do the rest follow, and where does courseware split?

Inputs: the dependency graph between Learning's route-level pages and shared code (`src/generic/`, `src/tab-page/`, `src/course-home/data/`, `src/courseware/data/`), the header findings (01) that decide what the tab-page frame needs, and the config table (02) that decides what the scaffold must carry before the first page renders. Candidates for first: the outline tab (simplest tab, exercises the tab-page frame, course metadata and the header course bar) or the three non-course pages (smallest, but exercise nothing shared).

Output: an ordered list of port tickets with their one-line scope and the shared modules each one carries out of `src/` first.

## Answer

## Answer

Settled with Brian 2026-10-19 (decisions 26–31). Layers in order; each is one PR onto `frontend-base`, each replaces a stub or adds a feature to a page that already works, each has a manual pass in its record.

**Scaffold and frame**

1. **Scaffold.** `frontend-base/` from frontend-template-application `main` as its own package, CI workflow, codecov flag, `manifest.tsv`, site config, app identity. One task verifies codecov and CI from the subdirectory. Manual-testing record also documents the verification environment (decision 14 note).
2. **Frame: routes and roles only.** Root `learning` layout route with a bare outlet; a stub route for each of the eleven pages; `handle.roles` per route; `provides` with the single `learning` role under both course-bar ids. Nothing fetches, no providers, no header widget. Manual pass: the shell course bar lists the tabs and client-navigates to each stub.

**Course tab pages** (each replaces its stub; the tab-page frame, course-metadata fetch and the Learning-wide providers arrive with the first page that needs them, on the root route)

3. **Dates.** Brings the tab-page frame and the course-metadata fetch.
4. **Progress.**
5. **Outline tab.**

**After the first tab, own layers, order free among themselves and relative to 4–6**

7. **Header title widget.** Org and title line into a shell header slot via `App.slots`, reading course metadata from the shared query cache, rendered on course routes only.
8. **Instructor toolbar.** Re-homed against the shell's masquerade bar.
9. **Product tours.**

**Courseware** (stubbing inward; chain order, CW5 and CW6 may swap)

10. **CW1 container and redirects.** Course component stubbed to print the resolved course, sequence and unit ids. Manual pass: the redirect table.
11. **CW2 sequence and unit.** Sequence metadata, content iframe, previous and next, hidden-after-due, license, sequence alerts; exams provider stubbed as a pass-through.
12. **CW3 outline sidebar** and its desktop and mobile triggers.
13. **CW4 exams.** Provider, unit exam access, timer.
14. **CW5 right sidebar and widgets** (discussions, upgrade).
15. **CW6 unit extras.** Calculator and notes, bookmark, celebrations, social share, effort estimate.
16. **CW7 course exit** page in its three states.

**URL-only pages, last, each with a recipe for reaching it**

17. **Live.** Needs a live provider configured in the LMS.
18. **Discussion, as a redirect route.** The route is kept; its element is a loader redirecting through the discussions role (decision 24) to `<url>/<courseId>/<path>`, replacing the iframe. The sub-issue proposes it as a redirect; its review round is where "as an iframe" would win instead.
19. **Redirect landing page.**
20. **Goal unsubscribe.**
21. **Preferences unsubscribe.**
22. **Access denied** (enterprise-only; moved to this group 2026-10-19).

Not ported in epic 1 (placeholder-slot rule, matching master out of the box): breadcrumbs and the unit tab strip, both operator-inserted plugins since #1716 and #1685.

Shared modules move with their first consumer: the tab-page frame and `course-home/data` with dates; `courseware/data` with CW1; `generic/user-messages`, toast, notices and plugin-overrides providers with the first page that renders them, onto the root route.
