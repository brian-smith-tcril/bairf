## Summary

Gate `CourseBreadcrumbs` on the queries instead of the Redux status strings: `useIsCourseLoaded(courseId)` and `useSequenceMetadata(sequenceId).isSuccess` replace the slice's `'loaded' && 'loaded'` comparison — both ids were already props. This is **layer A4** (of six) of the courseware slice teardown #1976 ([plan](https://github.com/openedx/frontend-app-learning/issues/1976)), stacked on the loaded-gate layer #2071, and deliberately tiny: one consumer whose inputs both exist. Part of #1976 — the teardown's final layer closes it.

With this, the transitional status bridge's only remaining readers are `CoursewareContainer` and `TabPage` — exactly the surface of the two teardown layers that follow.

## What changed

- **`CourseBreadcrumbs.jsx`**: the two `useSelector` status reads become the query gates; the `useMemo` deps follow; `react-redux` leaves the file. Model reads (`useModel`/`useModels`) untouched — read conversions are #1977's home.
- **`CourseBreadcrumbs.test.jsx`**: gains the `QueryClientProvider` the component now needs and async settles on the loaded-gated assertions. Its pre-existing `/preview/courses` pathname cases now genuinely exercise the preview-keyed sequence query (`useSequenceMetadata` derives `isPreview` from the pathname, #2070).

## Testing

`npm run types` (0 errors), `npm run lint` (clean), full jest suite green at head (111 suites, 1131 passed / 3 pre-existing skips). Manual pass on tutor local in the details block below — including a note on a **pre-existing** jump-nav preview-prefix gap observed while testing (untouched by this stack, not filed per review).

## Decisions

<details>
<summary>Full decision log</summary>

# Decisions — CourseBreadcrumbs onto the query gates (#1976, layer A4)

1. **Pure consumer swap.** `CourseBreadcrumbs` gates its breadcrumb links on
   `useIsCourseLoaded(courseId) && useSequenceMetadata(sequenceId).isSuccess`
   instead of the slice's `'loaded' && 'loaded'` strings — both ids were
   already props. The `useMemo` deps swap the two strings for the two
   booleans. `react-redux` leaves the file. Model reads (`useModel`/
   `useModels` for the course/sections/sequences) are untouched — #1977's
   home.

2. **Kept as its own tiny layer** rather than folding into A3: the layer
   boundary is "one consumer, both inputs already exist", and the diff reads
   in one screen.

3. **Tests:** the suite gains the `QueryClientProvider` the component now
   needs and async settles (`findAllByTestId`/`findByText`) for the
   loaded-gated assertions. Its pre-existing `/preview/courses` pathname
   cases now genuinely exercise the preview-keyed sequence query
   (`useSequenceMetadata` derives `isPreview` from the pathname);
   `initializeTestStore`'s sequence mock matches either preview param.

4. **Behavior deltas:** the standard posture (the component's own query
   subscriptions; results bridge into the model store as before). Otherwise
   faithful: same gate, same render output.

</details>

<details>
<summary>Manual testing</summary>

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

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
