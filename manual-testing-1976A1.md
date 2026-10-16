# Manual testing — courseware route ids from useParams (#1976, layer A1)

In-browser verification for layer A1, against tutor local
(`http://apps.local.openedx.io:2000/learning`, DemoX
`course-v1:OpenedX+DemoX+DemoCourse`). This layer claims **zero user-facing
change**: nine readers swap the slice's `courseId`/`sequenceId` mirrors for
`useParams()`, and the values are identical on every route that renders them.
The things to watch are the places those ids feed URLs or lookups.

## Verify by hand

- [x] **Unit navigation buttons** (`UnitButton` builds
  `/course/{courseId}/{sequenceId}/{unitId}` from route params now) —
  `UnitButton` only renders inside `SequenceNavigation`, whose slot
  (`org.openedx.frontend.learning.sequence_navigation.v1`) renders nothing by
  default: re-inject the default nav via `env.config.jsx` per the slot's
  README first. Then open a unit with several units in the sequence; the
  per-unit icon tabs link to sibling units correctly (hover/copy a link — no
  `undefined` segments), and clicking navigates.
- [x] **Preview route** (`UnitButton`'s `/preview` prefix) — same
  `env.config.jsx` setup; open the same unit under `/preview/course/...`
  (staff): unit buttons keep the `/preview` prefix and work.
- [x] **Outline sidebar** (`useCourseOutlineSidebar` active ids from params)
  — open the outline tray on a unit page: the active section's sequences
  show, the active sequence is expanded/highlighted; clicking a unit in the
  tray navigates and (mobile width) closes the tray.
- [x] **Unit iframe** (`useIFrameBehavior` active sequence from params) —
  unit content loads and resizes normally; navigating between units keeps
  working.
- [x] **Course-end page** (`CourseCelebration` / `CourseInProgress` /
  `CourseNonPassing` / `CatalogSuggestion` / `UpgradeFootnote` /
  `CourseRecommendations` courseId from params) — open
  `/course/{courseId}/course-end`: the celebration (or
  in-progress/non-passing) content renders with its links (dashboard
  footnote, progress/dates links, recommendations or catalog suggestion);
  no blank sections.

## Results

All five checks passed (2026-09-15, tutor local, DemoX; sequence-navigation
checks with the default nav re-injected via `env.config.jsx`). No `undefined`
URL segments, active section/sequence resolved in the tray, course-end
content and links intact.
