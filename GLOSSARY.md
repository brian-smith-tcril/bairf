# Effort glossary

Terms specific to this effort. Repo and ecosystem terms are on `main`.

"Placeholder" on its own is the ordinary word; the qualified terms below are the ones with a fixed meaning.

- **placeholder slot**: the epic-1 state of a plugin slot: the slot module keeps its file and name, renders its default content in a bare fragment, and is wired to neither mechanism; a slot with no default content renders nothing.
- **stub route**: a route in the ported tree whose element renders only a line naming the page as not yet ported; the page's port layer replaces it.
- **outline tab**: the course home landing tab (`src/course-home/outline-tab/`). Aliases elsewhere: UI label "Course", route segment `home`, LMS tab type `courseware`, shell course-bar slug `outline`. Always with "tab": bare "outline" is ambiguous with the courseware **outline sidebar** (`src/courseware/course/sidebar/sidebars/course-outline/`).
