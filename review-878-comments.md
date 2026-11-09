# Draft review comments for openedx/frontend-app-learner-dashboard#878

Drafted 2026-11-09 against head `aca7e369ba`. This one is a PR comment, a follow-up to Brian's 2026-10-31 comment (https://github.com/openedx/frontend-app-learner-dashboard/pull/878#issuecomment-6539158727), not an inline review comment, so there is no review summary and no anchor; the diff context below is the two `app.tsx` lines the comment is about, for reading. The body under the heading is the text to post, verbatim. Status: `draft`, then `posted <comment url>`.

## 1. Both header link ids renamed, old ids as aliases

File: `src/widgets/LearnerDashboardHeader/app.tsx`
Lines: 26 (`headerLinkDiscover.v1`, now rendering Explore) and 39 (`headerLinkCourses.v1`, now rendering My Learning)
Ledger: entry 6 (decided 2026-11-09: both ids), entries 3 and 5 (the posted comments it follows up)
Status: posted by Brian in his own form, as a comment review https://github.com/openedx/frontend-app-learner-dashboard/pull/878#pullrequestreview-5827822352 (2026-11-09 15:12Z): two inline `suggestion` blocks on `app.tsx`, line 26 (https://github.com/openedx/frontend-app-learner-dashboard/pull/878#discussion_r4514229119) and line 39 (https://github.com/openedx/frontend-app-learner-dashboard/pull/878#discussion_r4514238858), each the new id plus `idAliases` with the old id, and a review body: thanks for the patience, #336 decided ids are contract and order is not so the reorder is fine, #335 landed in `frontend-base` 2.0.0-alpha.19, "let me know if you hit any snags". Not in it, from the draft below: the TSDoc link. Same ids and aliases as the draft.

Diff context (`bin/review hunk`, `>` on the anchor lines):

```
  23 |      },
  24 |      {
  25 |        slotId: 'org.openedx.frontend.slot.header.primaryLinks.v1',
    | -      id: 'org.openedx.frontend.widget.learnerDashboard.headerLinkCourses.v1',
> 26 | +      id: 'org.openedx.frontend.widget.learnerDashboard.headerLinkDiscover.v1',
  27 |        op: WidgetOperationTypes.APPEND,
  28 |        element: (
    | -        <LinkMenuItem
    | -          label={<CoursesLink />}
    | -          role={dashboardRole}
  29 | +        <DiscoverLinkMenuItem
```

```
  36 |      },
  37 |      {
  38 |        slotId: 'org.openedx.frontend.slot.header.primaryLinks.v1',
    | -      id: 'org.openedx.frontend.widget.learnerDashboard.headerLinkPrograms.v1',
> 39 | +      id: 'org.openedx.frontend.widget.learnerDashboard.headerLinkCourses.v1',
  40 |        op: WidgetOperationTypes.APPEND,
  41 |        element: (
    | -        <ProgramsLinkMenuItem
  42 | +        <LinkMenuItem
```

> Following up on this: widget id aliases landed in `frontend-base` (https://github.com/openedx/frontend-base/pull/335) and are available as of `@openedx/frontend-base@2.0.0-alpha.19`. With that in place, I'd like to see both header link ids updated to match the new names, with the old ids kept as aliases so existing site configs that target them keep working:
>
> ```tsx
> {
>   slotId: 'org.openedx.frontend.slot.header.primaryLinks.v1',
>   id: 'org.openedx.frontend.widget.learnerDashboard.headerLinkExplore.v1',
>   idAliases: ['org.openedx.frontend.widget.learnerDashboard.headerLinkDiscover.v1'],
>   op: WidgetOperationTypes.APPEND,
>   // ...
> },
> {
>   slotId: 'org.openedx.frontend.slot.header.primaryLinks.v1',
>   id: 'org.openedx.frontend.widget.learnerDashboard.headerLinkMyLearning.v1',
>   idAliases: ['org.openedx.frontend.widget.learnerDashboard.headerLinkCourses.v1'],
>   op: WidgetOperationTypes.APPEND,
>   // ...
> },
> ```
>
> The [TSDoc on `idAliases`](https://github.com/openedx/frontend-base/blob/72d70535cf77e98be8f859aa5746c3dddb4d02d2/runtime/slots/widget/types.ts#L81-L84) has the details: a relative operation whose `relatedId` names an alias applies as if it named `id`, and the old id stays as an alias for at least one release.
>
> On the reordering (https://github.com/openedx/frontend-base/issues/336): the decision was that default widget ids are part of an app's contract and their order isn't, so the new order is fine as is.
