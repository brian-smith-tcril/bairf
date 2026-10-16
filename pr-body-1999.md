## Summary

`useAccessExpirationMasqueradeBanner(courseId, tab)` reads the outline and progress queries with `{ enabled: false }` and picks `accessExpiration` from a lookup keyed by `tab`, in place of `useModel(tab, courseId)`, the last `useModel` reader in the app. Only those two course-home payloads carry `access_expiration` (openedx-platform's `OutlineTabSerializer` and `ProgressTabSerializer`; the dates serializer has no such field), so they are the only two pages the banner has ever rendered on, and every other slug yields `undefined` where `useModel` yielded `{}`. `targetUserId` for the progress key comes from `useParams()`, as in `ProgressTab`. With the reader gone, the three tab-data hooks stop mirroring into the model store, so no query opts into the bridge any more and #1977 becomes deletion only. **No behaviour or request change.** Part of the Redux → React Query migration (#1946, Stage 1), layer E of #1977; stacked above #2152, the TypeScript peel that made this a two-line read swap. Closes #1999.

## What changed

- **`alerts/access-expiration-alert/hooks.ts`** (decisions 1–2, 8): `useOutlineTabData(courseId, { enabled: false })` and `useProgressTabData(courseId, targetUserId, { enabled: false })`, a two-entry lookup keyed by `tab`, `targetUserId` from `useParams()`; the `useModel` import goes.
- **`course-home/data/apiHooks.ts`** (decision 5): the `meta` bridge entries on `useDatesTabData` and `useOutlineTabData` and their `Transitional (#1999)` comments removed; `useProgressTabData` keeps `meta: { logStatusAs: { 404: 'silent' } }`.
- **`course-home/data/api.ts`** (decision 6): `CourseHomeProgress.accessExpiration?: CourseHomeAccessExpiration | null`, the type imported from `courseHomeOutline.ts`.
- **Untouched:** `InstructorToolbar`, `LoadedTabPage`, `TabPage` (decision 1), the model store, the bridge, `queryClient.ts`, `store.ts` (all #1977).

## Testing

`npm run types` and `npm run lint` clean; full suite 122 suites, 1200 passed, 0 skipped. `git grep useModel` over non-test source outside the store and bridge is empty; `git grep "modelType:"` finds only `setupTest.js`'s seeds. The owners' existing banner cases (`OutlineTab.test.jsx` › *Access Expiration Alert*, `ProgressTab.test.jsx` › *Access expiration masquerade banner*) now run axios → query → hook with no bridge between and needed no edit. Added (decision 7): a progress banner case on `/progress/10/`; a staff variant of each owner's once-per-load request count (outline once and progress never on the outline page, progress once and outline never on the progress page); and two `InstructorToolbar` cases on a seeded query client, the banner from the outline query on `tab="outline"` and no banner on `tab="courseware"` even with the flag seeded in both the courseware metadata and the outline. Two `useModel` cases in `model-store/hooks.test.tsx` (decision 9) keep the hook covered now that nothing in the app calls it, as #2140 did for `useModels`.

## Decisions

<details>
<summary>Full decision log</summary>

# Decisions — source the access-expiration masquerade banner from the tab queries, not `useModel(tab)` (#1999)

Layer E of the model-store dissolution (#1977), the last `useModel` reader.
Layer of the running stack #2141 above #2150 (#2130). Settled with the user
2026-10-02.

1. **The hook reads the owner queries itself, selected by tab.**
   `useAccessExpirationMasqueradeBanner(courseId, tab)` reads
   `useOutlineTabData(courseId, { enabled: false }).data` and
   `useProgressTabData(courseId, targetUserId, { enabled: false }).data` and
   picks `accessExpiration` from a lookup keyed by `tab` with two entries,
   `outline` and `progress`. Those are the only two course-home payloads that
   carry `access_expiration` (openedx-platform `OutlineTabSerializer` and
   `ProgressTabSerializer`; the dates serializer has no such field), so they
   are the only two pages the banner has ever rendered on. Every other slug
   (`dates`, `discussion`, `lti_live`, `courseware`) yields `undefined` where
   `useModel` yielded `{}`; no page changes. This continues the shared-hook
   reader pattern of `useEnrollmentAlert` / `useLogistrationAlert` (#2083) and
   the per-tab gating of the sibling `useCourseStartMasqueradeBanner`.
   Threading the value down from `TabPage`'s `courseStatus` was rejected: the
   courseware page's tab-data query (the courseware metadata) carries the same
   `masquerading_expired_course` flag, so a uniform read would show the banner
   in courseware for the first time, `CourseExit` passes two tab-data queries
   with no single answer, and the hook would stop sourcing the data it is
   named for. Moving `access_expiration` onto the course metadata endpoint is
   a backend change outside Stage 1. `InstructorToolbar`, `LoadedTabPage` and
   `TabPage` are untouched.

2. **`targetUserId` comes from `useParams()` inside the hook.** The progress
   query is keyed on `(courseId, targetUserId)`, and `ProgressTab.jsx` takes
   both from `useParams()`, so reading the same param in the hook makes the
   `enabled: false` key match the owner's by construction: the learner's id on
   `/progress/:targetUserId`, `undefined` everywhere else, which is also what
   the progress tab passes on its own route. `useContextId`
   (`src/data/hooks.ts`, #1976) is the existing shared data hook that reads a
   route param this way. react-router 6's `useParams` returns `{}` when no
   route matched, so renders without a router (the bare toolbar tests) keep
   working. Threading the id as a prop through `TabPage`, `LoadedTabPage` and
   `InstructorToolbar` was rejected: three component edits to carry a value
   the hook can read itself.

3. **The TypeScript conversion of `alerts/access-expiration-alert` is its own
   peel layer below this one, not part of it.** The peel renames `hooks.js` /
   `index.js` to `.ts`, types `courseId` and `tab`, and types the reads as
   they are today, with no runtime change and the existing tests untouched,
   the shape #2125 used below the `units` read conversion (#2088). This layer
   then shows only the read swap and the `meta` removals on an already typed
   file, instead of a rename-plus-rewrite that buries one behavioural change
   in a whole-file diff and carries a `refactor!:` footer beside an unrelated
   rename. Converting inside this layer (the #2111 shape) was considered and
   passed over for that reason. Stack order: #2150 ← peel ← #1999.

4. **`useAccessExpirationAlert` and `AccessExpirationAlert.jsx` stay.** The
   learner-facing alert in the same folder has had no in-repo caller since
   #499 (2021-06) and REV-2132 (2021-07), and #606 (2021-08) left it behind
   when it replaced the masquerade alert with the toolbar banner. Deleting it
   in the peel was proposed and rejected: the folder's `index` exports it,
   plugins bundled into the app can import host modules through `@src`, and
   the only remedy for a plugin that did would be to copy the hook, the
   component and four message ids into itself. Every earlier removal footer
   in this migration (#2134, #2140, #2144) asked for a one-line read swap;
   that ask is of a different order and is not the migration's to make. The
   peel types the hook's six parameters and leaves the component `.jsx`,
   like `AccessExpirationMasqueradeBanner.jsx`. Removal, if wanted, is a
   standalone cleanup proposal with its own notice, outside #1946.

5. **The three bridge `meta` entries go; the progress hook keeps
   `logStatusAs`.** `useDatesTabData` and `useOutlineTabData` lose their
   `meta` and the `Transitional (#1999)` comments; `useProgressTabData`'s
   becomes `meta: { logStatusAs: { 404: 'silent' } }`, since that key is
   `queryClient.ts`'s error-logging switch (#2023), not the bridge's. With
   them gone no query opts into the bridge: `git grep "modelType:"` over
   non-test source finds only `setupTest.js`'s seeds, which F removes along
   with the bridge, the `onSuccess` wiring and `queryClient.test.ts`'s one
   bridge case.

6. **`CourseHomeProgress.accessExpiration?: CourseHomeAccessExpiration | null`.**
   The progress serializer sends the same dict the outline does, so the type
   is imported from `courseHomeOutline.ts` rather than redeclared or moved.
   Optional, like every other field of that interface (its 401/403 branches
   return `{}`); the outline's stays required, matching its interface.

7. **Four test cases, plus the owners' existing ones unchanged.** The outline
   and progress suites' *Access Expiration* cases now run axios → query →
   hook with no bridge between and needed no edit; they remain the proof of
   the real path. Added: a progress case on `/progress/10/`, so the hook's
   `useParams()` key matches the owner's when the param is present; a staff
   variant of each owner's once-per-load request count (outline requested
   once and progress never on the outline page; progress once and outline
   never on the progress page), since the non-staff counts never mounted the
   toolbar's two `enabled: false` observers; and two `InstructorToolbar`
   cases on a seeded query client, the banner from the outline query on
   `tab="outline"`, and no banner on `tab="courseware"` even with the flag
   seeded in both the courseware metadata and the outline, which pins the
   finding that a `courseStatus` read would have changed behaviour.

8. **`refactor!:` with the #2144-shaped footer; no comment on the lookup.**
   The `dates`, `outline` and `progress` models stop being written, so a
   plugin `useModel` of any of them returns `{}`; the footer names the three
   query hooks to read instead. Two drafts of a comment on the lookup (which
   payloads carry `access_expiration`, and that the courseware page has never
   shown the banner) were cut by the user: the two keys say which tabs, and
   the reason there are two is this log's (entry 1), not the code's.

9. **Two `useModel` cases for codecov's project check.** Every patch line was
   covered, but project coverage dipped: with its last app reader gone,
   `useModel`'s selector in `generic/model-store/hooks.js` is reached by no
   test, two lines and a branch. #2140 met the same thing for `useModels` and
   added `model-store/hooks.test.tsx`; this layer adds a `useModel` describe
   to that file in the same shape (a model in the store, `{}` for a missing
   id and for a missing type). The hook is deleted in #1977 with the rest of
   the store, so the cases live for one layer.


</details>

<details>
<summary>Manual testing</summary>

# Manual testing — source the access-expiration masquerade banner from the tab queries (#1999)

In-browser verification against a live backend (tutor local). PR #2153. Run by
the user 2026-10-02 with the three temporary fetcher edits below, then reverted.

What changed: `useAccessExpirationMasqueradeBanner` reads the outline and
progress queries (non-fetching, keyed by the toolbar's `tab`) instead of the
`useModel(tab, courseId)` mirror, and the three tab-data queries stop writing
the model store. The banner should render exactly where it did (Course and
Progress tabs, while masquerading as a learner whose access has expired) and
nowhere else; no request count changes.

**The bugs this layer could introduce.**
- *The banner missing on Progress for a specific learner.* The hook's progress
  key now includes `targetUserId` from the route; a mismatch with the owner's
  key reads an empty cache entry and hides the banner on `/progress/<id>`.
- *The banner appearing in courseware.* The courseware metadata carries the
  same flag; the tab-keyed lookup must keep ignoring it.
- *An extra request.* Two new `enabled: false` observers mount with the
  toolbar on every tab; neither may fetch.

## Setup

The banner needs `access_expiration.masquerading_expired_course: true` in the
outline and progress payloads. Producing that for real is the platform's FBE
access-duration feature (config row, verified mode, backdated audit enrollment,
specific-student masquerade; appendix below), which this layer does not touch.
Fake it in the fetchers instead, **after** the real request so the Network
counts stay real; remove all three edits afterwards (`git diff` empty).

```ts
// temporary, manual test only
const expiredAccess = {
  expiration_date: '2020-01-01T12:00:00Z', masquerading_expired_course: true,
  upgrade_deadline: null, upgrade_url: null,
};
```

- `src/course-home/data/api.ts`, `getOutlineTabData`: after `const { data, headers } = tabData;`
  add `data.access_expiration = expiredAccess;`.
- `src/course-home/data/api.ts`, `getProgressTabData`: before `const camelCasedData = camelCaseObject(data);`
  add `data.access_expiration = expiredAccess;`.
- `src/courseware/data/api.js`, `getCourseMetadata`: before `return normalizeCoursewareMeta(metadata);`
  add `metadata.data.access_expiration = expiredAccess;` (for the "must not render in courseware" check).

Then:

1. Log in as a staff user so the instructor toolbar renders. No masquerade
   needed: the flag is in the payload.
2. Devtools Network filtered to `course_home|courseware/course`, Console open.

## Checks

### Where the banner renders

- [x] **Course (outline) tab:** the warning "This learner no longer has access to this course. Their access expired on 1/1/2020." in the instructor toolbar.
- [x] **Progress tab:** same banner.
- [x] **Progress tab via `/progress/<any learner id>/`:** same banner (the new keyed read; the progress request URL changes, and the hook must read that entry).
- [x] **Temporary edits removed, hard reload:** banner gone on both tabs.

### Where it must not render

- [x] **Dates tab:** no banner.
- [x] **Courseware (a unit):** no banner. The courseware metadata carries the same flag (the third temporary edit), and the hook must ignore it.

### Request count (unchanged)

- [x] **Hard-reload the outline tab as staff, wait for idle:** `course_home/outline/<id>` **1**, `course_home/progress/` **0**.
- [x] **Hard-reload the progress tab as staff, wait for idle:** `course_home/progress/<id>` **1**, `course_home/outline/` **0**.
- [x] **Hard-reload the dates tab as staff:** `course_home/dates/<id>` **1**, no outline or progress request.

### Console

- [x] No errors or warnings on any of the above beyond those present on master.

## Appendix: producing the flag for real

Only if a real-data pass is ever wanted. `get_user_course_expiration_date`
(`openedx/features/course_duration_limits/access.py`) returns a date when all
hold: `CourseDurationLimitConfig` enabled with *Enabled as of* before the
enrollment (`/admin/course_duration_limits/coursedurationlimitconfig/`); a
`verified` mode on the course (`/admin/course_modes/coursemode/`, expired
deadline fine); the learner enrolled as `audit`; and `max(enrollment.created,
course.start)` plus the expected duration in the past, so backdate
`CourseEnrollment.created` a year in the LMS shell and the course start in
Studio. `masquerading_expired_course` is true only for a *specific-student*
masquerade (`is_masquerading_as_specific_student`), not "Learner". Diagnose
from `/api/course_home/outline/<courseId>` as the learner.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
