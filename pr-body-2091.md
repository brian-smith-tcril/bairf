## Summary

Convert the two suggested-schedule alerts to TypeScript. **No user-facing change** — structural only: both components still read `useModel(model, courseId)` and render the same markup. Peeled out of #2083, which gives both of them new props, so that layer edits a `Props` interface instead of growing `propTypes` that TypeScript would delete one layer later — the peel convention #2065 used ahead of #2014. Part of the Redux → React Query migration (#1946, Stage 1) and the model-store dissolution (#1977). Closes #2091. Stacked above #2082.

## What changed

- `ShiftDatesAlert.jsx` → `ShiftDatesAlert.tsx` and `UpgradeToShiftDatesAlert.jsx` → `UpgradeToShiftDatesAlert.tsx`; git detects both as renames, so the diff reads as edits rather than delete-plus-add.
- `propTypes` + `defaultProps` → a `Props` interface with destructuring defaults — the shape `UnitButton` uses (#2065), rather than `React.FC` + `defaultProps`.
- `ShiftDatesAlert` passes `courseId` to two query keys and to the reset-deadlines mutation, all of which want a `string`, while `useParams()` yields `string | undefined`. Rather than assert it three times, `!courseId` joins the early return the component already has, which narrows it for the rest of the body including both closures.
- Nothing else. Neither component's data source, markup, or gating changes.

## Testing

`npm run types`, `npm run lint` and the full suite (109 suites, 1112 passed, 3 skipped) are green.

Manually verified on tutor dev against a self-paced course with a seeded missed deadline, on this layer alone with #2083 not applied: both banners render on the dates and outline tabs, the reset posts and the dates shift, and neither renders where it shouldn't. Five of the eight checks were run by hand — the two upgrade-variant checks need an audit learner with missed gated content, which that course cannot produce (`content_type_gating_enabled: false`), and the per-tab research event rests on `apiHooks.test.tsx`, which asserts the exact request body.

## Decisions

Working notes for this layer, kept out of the tree:

<details>
<summary>Full decision log</summary>

# Decisions — suggested-schedule alerts to TypeScript (#2091)

Peel below #2083 (layer A of the model-store dissolution, #1977). Structural
only — the data-source change stays in #2083.

1. **Peeled out rather than folded into #2083.** #2083 gives both alerts new
   props, so without this layer that diff would edit `propTypes` entries
   TypeScript deletes one layer later. Same reasoning as #2065, peeled out of
   #2014: structural change first, conversion second, each reviewable on its
   own.

2. **Scope is the two components that gain props.**
   `UpgradeToCompleteAlert.jsx` keeps the props it has today — #2083 only
   changes where it reads its data — so it stays `.jsx`. Converting the whole
   directory for symmetry would be scope the conversion doesn't need.

3. **`Props` interface with destructuring defaults, not `React.FC` +
   `defaultProps`.** Matches `UnitButton.tsx` (#2065), the epic's most recent
   TypeScript conversion. `Section.tsx` and `SequenceLink.tsx` use
   `React.FC<Props>`, but that predates this effort and `defaultProps` on
   function components is on its way out.

4. **`courseId` is narrowed, not asserted.** `ShiftDatesAlert` feeds it to
   `courseHomeQueryKeys.datesTab`/`outlineTab` and to the reset-deadlines
   mutation, all typed `string`, while `useParams()` yields
   `string | undefined`. Adding `!courseId` to the early return the component
   already has narrows it for the whole body below, including the
   `refreshTabData` and `onClick` closures, so all three `courseId!` go away.
   The repo's other `courseId!` uses all sit in `apiHooks.ts` next to
   `enabled: !!courseId`, where the query cannot run with an undefined id;
   a component-level assertion has nothing backing it.

5. **The guard is unreachable, and that is understood.** With an undefined
   `courseId`, `useModel` returns `{}` and the `datesBannerInfo` destructure
   above the guard throws first, so `!courseId` cannot fire in this layer. It
   becomes reachable only once #2083 passes that data in as a prop, and even
   then only off a course route — where it renders nothing instead of a button
   that would POST `course_key: undefined` and invalidate cache keys containing
   `undefined`. Accepted as the cost of dropping the assertions.

6. **No test changes.** Neither component has its own test file; both are
   covered through `DatesTab.test.jsx` and `OutlineTab.test.jsx`, which stay
   green unchanged.

</details>

## Manual testing

<details>
<summary>Checklist</summary>

# Manual testing — suggested-schedule alerts to TypeScript (#2091)

In-browser verification against a live backend (tutor local). This layer claims
**no user-visible change at all**: `ShiftDatesAlert` and `UpgradeToShiftDatesAlert`
move from `.jsx` to `.tsx` and from `propTypes` to a `Props` interface, still
reading `useModel(model, courseId)` and rendering the same markup. So the test is
that both banners still appear under the same conditions and their buttons still
do the same thing.

Nothing here exercises the `!courseId` guard added to `ShiftDatesAlert` — it is
unreachable in this layer (`useModel` returns `{}` for a missing id, so the
`datesBannerInfo` destructure above it throws first), and both components only
render under `/course/:courseId/...`.

## Setup — producing a missed deadline (tutor local)

Both banners are driven by **Personalized Learner Schedules**. The suggested
schedule is not a field you set: it is derived from the learner's
`Schedule.start_date` plus relative due dates on the course's **graded**
subsections. So the lever is "make relative dates exist, then backdate the
schedule". These steps were used for the dates-tab (#1984) and outline-tab
(#1991) passes and are known to work:

1. **Self-paced course with a graded subsection** — Studio → Settings →
   Schedule & Details → Course Pacing → Self-Paced, and at least one subsection
   set to Grade as *Homework*. PLS only schedules *graded* subsections. The
   course used previously was `course-v1:OpenedX+PD1+PD1_1` as `tutorsuper`;
   DemoX on its own was **not** sufficient, because a graded subsection still
   has no relative due date until one is written to edx-when (step 5).
2. **Relative dates flag on** — LMS admin `/admin/waffle/flag/`, create
   `course_experience.relative_dates` with **Everyone = Yes** (per-course
   alternative: `/admin/waffle_utils/waffleflagcourseoverridemodel/`, override
   choice *On*). Definitive check, in `tutor local exec lms ./manage.py lms shell`:

   ```python
   from openedx.features.course_experience import RELATIVE_DATES_FLAG
   from opaque_keys.edx.keys import CourseKey
   RELATIVE_DATES_FLAG.is_enabled(CourseKey.from_string('course-v1:OpenedX+DemoX+DemoCourse'))
   ```

3. **Course end date in the future** — `hasEnded` suppresses both banners.
4. **Enrollment mode picks which banner you get** — verified, or a course with
   content-type gating off, gives the plain "Shift due dates"; audit plus gated
   content the learner missed gives "Upgrade to shift due dates".
5. **Arm it** — one LMS-shell script gives the graded subsection a relative due
   date and backdates the schedule so that date is in the past:

   ```bash
   tutor dev run lms ./manage.py lms shell   # or `tutor local ...`, per your setup
   ```

   ```python
   from datetime import timedelta
   from django.utils import timezone
   from opaque_keys.edx.keys import CourseKey
   from xmodule.modulestore.django import modulestore
   from edx_when import api as when_api
   from openedx.core.djangoapps.schedules.models import Schedule

   COURSE_ID = 'course-v1:OpenedX+PD1+PD1_1'
   USERNAME = 'fake'
   ck = CourseKey.from_string(COURSE_ID)

   graded = [seq.location
             for chapter in modulestore().get_course(ck).get_children()
             for seq in chapter.get_children() if seq.graded]
   assert graded, 'No graded subsection — set one to Grade as Homework in Studio first.'

   when_api.set_dates_for_course(ck, [(graded[0], {'due': timedelta(weeks=1)})])

   s = Schedule.objects.get(enrollment__user__username=USERNAME, enrollment__course_id=ck)
   s.start_date = timezone.now() - timedelta(days=30)
   s.save()
   ```

   Get the `Schedule` row matching **both** the username and this exact course
   id — editing the wrong one is the easy mistake, and the dates payload's
   enrollment-date block tells you whether it took.

   **Do not re-publish the course afterwards.** A publish re-syncs edx-when from
   the block's own fields, which have no due date, wiping the relative date.

6. **Re-arm between runs** — clicking "Shift due dates" resets `start_date` to
   now, which is the feature working, so the banner disappears and you cannot
   immediately retest. The edx-when date persists, so re-arming is just the
   backdate:

   ```bash
   tutor dev run lms ./manage.py lms shell -c "from datetime import timedelta; from django.utils import timezone; from opaque_keys.edx.keys import CourseKey; from openedx.core.djangoapps.schedules.models import Schedule; ck = CourseKey.from_string('course-v1:OpenedX+PD1+PD1_1'); s = Schedule.objects.get(enrollment__user__username='tutorsuper', enrollment__course_id=ck); s.start_date = timezone.now() - timedelta(days=30); s.save()"
   ```

   The backend is shared, so one re-arm covers whichever frontend you point at —
   useful for taking a master baseline and then re-checking on the branch.

**Read it off the API, not the screen:** DevTools → Network →
`/api/course_home/dates/<courseId>` → `dates_banner_info`
(`missed_deadlines`, `missed_gated_content`, `content_type_gating_enabled`). If
`course_date_blocks` holds only an "Enrollment Date" entry, the course has no
graded assignments and there is nothing to miss — backdating won't help.

The two banners are mutually exclusive on `missedGatedContent`:

| Banner | Shows when |
|---|---|
| `ShiftDatesAlert` ("shift dates") | `missedDeadlines && !missedGatedContent && !hasEnded` |
| `UpgradeToShiftDatesAlert` ("upgrade to shift") | `contentTypeGatingEnabled && missedDeadlines && missedGatedContent && verifiedUpgradeLink && !hasEnded` |

So the shift-dates banner needs an enrolled learner past a due date in a
self-paced course; the upgrade variant additionally needs content-type gating,
a verified mode with an upgrade link, and gated content the learner has missed.
Both render on **two** pages — the outline tab (`/home`) and the dates tab
(`/dates`) — which is the reason these components took a `model` prop at all, so
each check is worth doing on both.

`nvm use && npm run dev`, then sign in as the enrolled learner.

## Verify by hand

- [x] **Shift-dates banner renders on the dates tab** — self-paced course with a
      missed deadline: the warning alert appears above the timeline with the
      "missed deadlines" heading and a "Shift dates" button.
- [x] **Shift-dates banner renders on the outline tab** — same course, `/home`:
      same alert, above the start/resume card.
- [x] **Its button still resets deadlines** — click "Shift dates": the toast
      appears and the due dates have moved forward.
- [ ] **The per-tab research event** — the POST to
      `/api/course_experience/v1/reset_course_deadlines` carries
      `research_event_data.location` = `dates-tab` from the dates tab and
      `outline-tab` from the outline tab, the one thing the `model` prop still
      feeds. Not checked by hand; see Results.
- [ ] **Upgrade-to-shift banner renders** (audit learner, content-gated course
      with missed gated content), on both `/home` and `/dates`.
- [ ] **Its button still upgrades** — click it: the analytics event fires
      (`edx.bi.ecommerce.upsell_links_clicked`, `linkName` =
      `course_home_upgrade_shift_dates` from the outline tab,
      `dates_upgrade` from the dates tab) and the browser navigates to the
      verified upgrade link.
- [x] **Neither renders where it shouldn't** — an instructor-paced course, or a
      self-paced course with no missed deadlines: no banner on either page.
- [x] **No new console noise** — no React warnings from either component.

## Results

Env: tutor dev, `course-v1:OpenedX+PD1+PD1_1`, user `tutorsuper`, branch
`bsmith/suggested-schedule-alerts-typescript` @ `d221640d` — the TypeScript layer
on its own, with #2083 not yet applied, so both alerts were still reading
`useModel(model, courseId)`.

Five of the eight checks passed, matching the behaviour seen before the
conversion. No divergence found. On the reset itself, what was observed is the
toast appearing and the dates having moved forward — confirmed by navigating
between pages and refreshing, not by watching the request.

The **per-tab research event** was not checked by hand. It is covered
automatically: `apiHooks.test.tsx` asserts the exact request body,
`{"course_key":"course-1","research_event_data":{"location":"dates-tab"}}`, so
the `model` → `location: '<model>-tab'` mapping is pinned by a test. What that
test does not cover is each tab passing the right literal, and those are
unchanged by this layer — `model="dates"` in `DatesTab.jsx` and `model="outline"`
in `OutlineTab.jsx`, both visible in the diff as untouched.

The two **upgrade-to-shift** checks were **not run**: that variant needs an audit
learner with missed *gated* content, and PD1 reports
`content_type_gating_enabled: false`, so `missed_gated_content` never becomes
true there and the banner cannot render. `UpgradeToShiftDatesAlert`'s conversion
rests on its rendering being exercised by `DatesTab.test.jsx` /
`OutlineTab.test.jsx` and on the layer being structural — same markup, same
gate, only `propTypes` → `Props`.

Not applicable to this layer: the in-unit banner (`vert_module.html`, untouched
by this work). The "Shift due dates" CTA rendered under a past-due *problem* is
broken upstream and does nothing on any branch — openedx/xblocks-core#305.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
