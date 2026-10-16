# Manual testing — CourseBreadcrumbs onto the query gates (#1976, layer A4)

In-browser verification for layer A4, against tutor local
(`http://apps.local.openedx.io:2000/learning`, DemoX). This layer claims
**zero user-facing change**: breadcrumbs gate on the queries instead of the
Redux status strings.

## Verify by hand

- [x] **Breadcrumbs render** — `CourseBreadcrumbs` only renders through the
  `org.openedx.frontend.learning.course_breadcrumbs.v1` slot, which is empty
  by default: re-inject the default component via `env.config.jsx` per the
  slot's README first. Then open a unit: the breadcrumb bar shows Course home
  plus the section and sequence crumbs once loaded; the section/sequence
  dropdowns navigate.
## Results

The render check passed (2026-09-16, tutor local, DemoX, default breadcrumbs
re-injected via `env.config.jsx`, run against the local branch @ `05c90e75`):
crumbs render once loaded and the dropdowns navigate.

A preview-route check was dropped: with jump nav enabled (the staff/preview
context), crumb clicks go through `JumpNavMenuItem.destinationUrl()`, which
has never carried the `/preview` prefix — pre-existing on `master` (neither
`BreadcrumbItem.tsx` nor `JumpNavMenuItem.jsx` changes in this stack), so it
can't verify this layer. Not filed, per review.
