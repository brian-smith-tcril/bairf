Epic 3 of 3 for the frontend-base conversion, after #1905 (epic 1) and #2185 (epic 2) have merged the `frontend-base` branch to `master`.

Split the Learning tabs (outline, dates, progress, courseware, and the rest) into frontend-base widgets: self-contained pieces that insert into the app's own slots, can be exported for other apps' slots, and do not reach into context they do not own. Shape and precedents are recorded in the 2026-09-24 Frontend Working Group outcome on #1905: one Learning app, tabs as widgets, following frontend-app-learner-dashboard's [`src/widgets/`](https://github.com/openedx/frontend-app-learner-dashboard/tree/master/src/widgets) and openedx/frontend-app-gradebook#632.

> [!NOTE]
> This issue body was drafted by Claude (Claude Code) and reviewed before posting.

### Scope

- One widget per tab, each working and tested standalone.
- The shared-query-key and `provides` experiment from the FWG action item, tracked upstream as openedx/frontend-base#253. Shared keys must not be namespaced by a tab.
- Move the outline payload's two off-tab readers (`useEnrollmentAlert`, `useLogistrationAlert` in `LoadedTabPage`) inside the outline widget, so nothing shared reads a tab's payload.
