Clearing `start_course` adds a history entry. When a learner opens the course home from the enrollment email, the outline tab sends the `enrollment.email.clicked.startcourse` event and takes `?start_course=1` out of the address. It does that with a new history entry, where it means to replace the current one. Back then returns to the `?start_course=1` address, the event is sent a second time, and the learner is moved forward again. It has been this way since #1128 (2023-10), the React Router v6 upgrade.

A test of the same call shows the router recording the navigation as a push. What Back does follows from that and has not been watched in a browser.

**Status (2026-11-18):** fixed in the frontend-base version of Learning, the package under `frontend-base/` on the `frontend-base` branch, by #2252. The frontend-build and frontend-platform version under `src/` still has it.

> [!NOTE]
> This issue was written by Claude (Claude Code) and reviewed before posting.

<details>
<summary> Claude Plan </summary>

## Mechanism

- [`OutlineTab.jsx`](https://github.com/openedx/frontend-app-learning/blob/df388386d60dd1f6b88249561ca3b1d87f1fc4c9/src/course-home/outline-tab/OutlineTab.jsx#L102-L117) clears the parameter with `navigate({ pathname, search, replace: true })`: `replace` is a key of the first argument.
- React Router's `navigate` takes `replace` in its second argument. From the `useNavigate` page of the v6 documentation:
  > Either pass a `To` value (same type as `<Link to>`) with an optional second `options` argument

  and, under [`options.replace`](https://reactrouter.com/6.30.6/hooks/use-navigate#optionsreplace):
  > Specifying `replace: true` will cause the navigation to replace the current entry in the history stack instead of adding a new one.
- A `To` object carries a pathname, a search string and a hash. A `replace` key in it is not read, so the call navigates with the default, a push.

## History

- #1128 (2023-10-05) turned `history.replace({ search: currentParams.toString() })` into the `navigate` call and put `replace: true` in the first argument ([the commit](https://github.com/openedx/frontend-app-learning/commit/b788b969c352730bd18d7f8e96c44144f452d2c5)).
- The weekly goal card's cleanup of `weekly_goal`, in `WeeklyLearningGoalCard.jsx`, still calls `history.replace` and is not affected.

## What a learner sees

After arriving with `?start_course=1`, the history holds two entries for the course home: the address with the parameter, and the one without. Back goes to the first. The effect runs again there, sends `enrollment.email.clicked.startcourse` again and adds the clean address again. Each press of Back repeats that, so Back does not leave the page and the event is counted once per press.

## Fix

`navigate({ pathname, search }, { replace: true })`, with a case that fails when the cleanup adds an entry. #2252 does this in the frontend-base package: its case asserts that the router's last navigation was a replace, and it fails with the call as it is here, the router reporting a push.

## Acceptance

- [ ] After arriving with `?start_course=1`, Back leaves the course home
- [ ] `enrollment.email.clicked.startcourse` is sent once
- [ ] A test fails if the cleanup adds a history entry

</details>
