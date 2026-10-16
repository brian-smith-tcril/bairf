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
