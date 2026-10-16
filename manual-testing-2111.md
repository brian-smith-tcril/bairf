# Manual testing — clean up `SidebarContextProvider` for React Query and convert it to TypeScript (#2111)

In-browser verification against a live backend (tutor dev).

What changed: the courseware sidebar's discussions widget loads its topics
through a `Provider` that observes the topics query with `enabled`, instead of
the provider's `prefetch` effect; the effect, the `courseMetaRef` workaround
and the `prefetch` widget-config field are gone. `SidebarContext` has no
default value. The provider, the context, both built-in widget configs and the
upgrade widget's context module are TypeScript. The topics still land in the
model store for the three `useModel` readers (#2087 converts them).

**The three bugs this layer could introduce.** (1) The topics request fires
more than once per sidebar mount, or fires again on a metadata write — the
observer's `enabled` gate or its dependency on nothing but the key is wrong.
(2) The topics never load — the gate never passes (wrong `tabs` read, wrong
config key), so the trigger never appears on any unit. (3) A consumer renders
outside the provider — now an error instead of an empty render; in the app
every consumer is under `Course`, so this would only show as a crash on the
courseware page.

## Setup

A course with the **Open edX** discussions provider (Authoring → Pages &
Resources → Discussions) and a verified mode, `DISCUSSIONS_MFE_BASE_URL` set
in the tutor config (it is by default). At least one unit with in-context
discussions on and one with it off (Authoring, the unit sidebar's discussion
toggle). Browser devtools open on the Network tab, filtered to `discussion`.

## Checks

Hard reload each page and wait for the Network tab to go idle before counting.

### Request counts (bug 1)

Learning makes exactly two discussion requests, both from `DiscussionsProvider`:
`GET …/api/discussion/v1/courses/{courseId}` and `GET …/api/discussion/v2/course_topics/{courseId}`.
The Network tab also shows the discussions MFE's own requests once the panel is open, because the
iframe is a frame of the same tab — `…/api/discussion/v1/threads/…`, `…/api/discussion/v2/courses/{courseId}/`,
and more. Count with the panel **closed** (the trigger renders without the iframe), or use the
Initiator column: learning's requests come from the learning bundle, the iframe's from the
discussions MFE.

- [x] **Unit with a topic, hard reload, panel closed:** `v1/courses/{courseId}` **1**, `v2/course_topics/{courseId}` **1**, nothing else under `/api/discussion/`.
- [x] **Navigate to the next unit (in-app, sidebar stays mounted):** no new discussion requests.
- [x] **Navigate to another sequence (in-app):** the sidebar remounts with `Course`; one new pair of discussion requests at most, none if the sequence did not remount the provider. Record what was observed.
- [ ] **A metadata write while on the unit:** on a fresh enrolment in a course with celebrations enabled, click *Next* past the first section's last unit so the first-section celebration modal opens (this writes `courseHomeMeta` with `setQueryData`). No new discussion requests. *Skip if no such course is set up; the `DiscussionsProvider` test pins this case.*

### The topics load and gate the widget (bug 2)

- [x] **Unit with an in-context topic:** the discussions trigger shows in the sidebar strip; clicking it opens the panel with an iframe at `{DISCUSSIONS_MFE_BASE_URL}/{courseId}/category/{unitId}?inContextSidebar`.
- [x] **Unit with in-context discussions off (same course):** no discussions trigger; an open discussions panel closes. What opens instead, if anything, is the cascade's call (`useUnitShiftBehavior` / `useSidebarSync`, unchanged here).
- [x] **Stored preference:** with `sidebar.{courseId}` = `"DISCUSSIONS"` in localStorage (open discussions once, reload), the discussions panel auto-opens once the topics resolve.
- [ ] **Upgrade trigger (the other built-in, now typed):** shows on a verified-mode course; the panel opens and closes; the red dot clears on first open.
- [ ] **Legacy-provider course:** only the `v1/courses` request; no trigger on any unit. *If no legacy course exists locally, the `discussionTopicsQuery` legacy case carries it — note that here.*

### A stored panel restores on a narrow viewport (the `master` bug this layer fixes)

- [x] **Narrow viewport (below 1200px), open the discussions panel from its trigger, hard reload:** the panel is open again after the reload. On `master` it is closed (reproduced 2026-09-24).
- [x] **Desktop viewport, same steps:** the panel is open again after the reload, with no flash of the outline first.

### Nothing renders outside the provider (bug 3)

- [x] **Courseware page loads with no console error** naming `useSidebar` or a null destructure, on a unit with a topic and one without, with the paywall (a gated unit as an audit learner) and the sequence navigation visible.

### The breaking change is real

- [x] **An `env.config.jsx` widget still declaring `prefetch`:** register a minimal widget with `prefetch: () => console.log('prefetch')`; nothing logs, the widget's `Sidebar`/`Trigger` behave per its `isAvailable`. *Optional; documents that the field is inert.*

## Results

Run 2026-09-24 on tutor dev, course `course-v1:OpenedX+DemoX+DemoCourse` (Open edX discussions provider). 10 of 13 checks run, all passing; 3 not run. The two narrow-viewport checks were run 2026-09-25, after the fix was added.

**Run**

- **Hard reload, unit with a topic, panel closed:** learning's `v1/courses/{courseId}` once and `v2/course_topics/{courseId}` once; with the panel open the iframe added its own `v1/threads/?…` and `v2/courses/{courseId}/`.
- **Next unit (in-app):** no new discussion requests.
- **Another sequence (in-app):** panel closed — no new `v2/course_topics` request (`v1/courses` not checked); panel open — only the iframe's requests. So the provider did not remount across sequences.
- **Unit with an in-context topic:** trigger shown; panel opened with the discussions iframe.
- **Unit with in-context discussions off (same course):** navigating onto it removed the trigger and closed the open discussions panel; nothing opened in its place.
- **Stored preference:** the discussions panel auto-opened after reload once the topics resolved.
- **Stored panel restores on a narrow viewport (run 2026-09-25):** below 1200px, discussions opened from its trigger, hard reload — the panel was open again. Desktop viewport, same steps — open again, with no flash of the outline first. The bug this fixes was reproduced by hand on `master` 2026-09-24 (panel closed after a narrow-viewport reload).
- **Console:** nothing matched `useSidebar` or `Cannot destructure`. The remaining console noise (`defaultProps` deprecations; a Paragon `Dropdown` `id` prop-type warning from `@edx/frontend-component-header`'s `AuthenticatedUserDropdown`) is unrelated to this layer and present on `master`.
- **`env.config.jsx` widget declaring `prefetch` (the breaking change):** a probe widget with both `prefetch` and `Provider` (each logging): the "Probe" trigger rendered and its panel opened; `[probe] Provider mounted` logged (twice, React `StrictMode`'s development double-invoke — one real mount); `[probe] prefetch called` never logged. The field is inert, as documented.

**Not run**

- **Metadata write while on the unit:** needs a fresh enrolment in a course with celebrations enabled. Covered by `DiscussionsProvider.test.tsx` *does not load the topics again when the course metadata changes*.
- **Upgrade trigger:** needs a course with a paid track (`verifiedMode`). The upgrade widget's runtime is unchanged in this layer (its config, `utils.ts` and `UpgradeWidgetContext.tsx` converted with bodies intact); its four suites pass.
- **Legacy-provider course:** none set up locally. Covered by the `discussionTopicsQuery` legacy case in `apiHooks.test.tsx` and the *no discussion tab* case in `DiscussionsProvider.test.tsx`.
