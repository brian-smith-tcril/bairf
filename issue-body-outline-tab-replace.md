Part of #1946 — Redux → React Query migration (Stage 1). Found in the #2135 plan review, which surveyed every automatic redirect in the app; peeled out because it is course-home, not courseware.

**Defect.** `OutlineTab.jsx` strips the `start_course` query parameter after sending its tracking event:

```js
navigate({
  pathname: location.pathname,
  search: `?${currentParams.toString()}`,
  replace: true,
});
```

React Router's `navigate(to, options)` reads `replace` from the second argument only; a `replace` key on the `to` object is ignored. So this pushes a new history entry instead of replacing the current one, and the learner's Back button returns to the `?start_course=1` URL, which fires the tracking event again.

**Fix.** `navigate({ pathname: location.pathname, search: `?${currentParams.toString()}` }, { replace: true })`.

**Tasks**
- A failing test first: land on the outline tab with `?start_course=1` and assert the history length is unchanged after the parameter is stripped (the existing *emit start course event via query param* case asserts only the event).
- The one-line fix.

**Verify:** `npm run types`, `npm run lint` and the full suite green; Back from the outline tab after a `?start_course=1` landing does not return to the parameterised URL.

> [!NOTE]
> This issue was authored by Claude (Claude Code) and reviewed before posting.
