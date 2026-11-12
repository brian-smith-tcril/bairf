# Manual testing — the outline tab (#2191)

One section per layer of the stack. A layer's section asks only for what that layer changes
and a test cannot see, and says what each step needs beyond the page itself.

## Shared modules (#2251)

Nothing to do. No route renders these modules until the next layer.

## The outline tab layer

Drafted 2026-11-12 before the pass. The boxes are Brian's ticks; what was and was not
observed is under Record, below the steps.

What needs eyes: the page in the real shell with real data, its styles, the flags, the
two frames, the in-page links navigating inside the site, and a real browser's console.
What depends on particular data (the five alerts, the proctoring panel's statuses, the
account activation cookie, the not-enrolled view) is left to the suite, listed at the end.

### Setup

The same as for the progress tab; nothing new.

- The package's dev site on `bsmith/outline-tab`: `cd frontend-base && nvm use && npm ci &&
  npm run dev`, served at `http://apps.local.openedx.io:2000/learning/`, with tutor dev's
  `mfe` service stopped so the port is free.
- Tutor dev with `LEARNING_MICROFRONTEND_URL` pointing at
  `apps.local.openedx.io:2000/learning`, as for #2189.
- One user: a learner enrolled in the demo course, `course-v1:OpenedX+DemoX+DemoCourse`.

### The page

Open `http://apps.local.openedx.io:2000/learning/course/course-v1:OpenedX+DemoX+DemoCourse/home`
as the enrolled learner.

- [x] **1. The page and its styles** — the outline renders inside the shell with the
      Course tab selected: the title, the start or resume card, the section list with
      its "Expand all" button, and the right column (goal card if the course has goals
      on, course tools, dates, handouts). The cards have a soft shadow and no border.
      *Why here:* the route now loads the real page; `style.scss` gains three partials
      and the card-header rule copied from `master`'s `index.scss`.
- [x] **2. The console** — DevTools, Console, reload. No errors or warnings from
      Learning's code.
- [x] **3. A sequence title** — expand a section and click a sequence title. The address
      becomes `/learning/course/<course>/<sequence id>` and the courseware stub shows,
      with no page load (the Network tab shows no document request).
      *Why here:* the title's link is `getSequenceUrl`'s where `master` wrote
      `/course/<course>/<sequence>`.
- [x] **4. The all-dates link** — in the dates widget, "View all course dates" opens the
      dates tab with no page load. Before clicking, compare its look with the links
      around it: it is a Paragon `Hyperlink` now where `master` has a bare anchor.
      *Needs:* a course with at least one date, so the widget shows.
- [ ] **5. The goal card's flags** (not run) — each of the three goal buttons shows its flag
      (outline, half grey, black), and selecting one gives it the selected border.
      *Needs:* weekly learning goals on for the course: the outline view sets
      `weekly_learning_goal_enabled` when `ENABLE_COURSE_GOALS` is enabled for the course
      (`lms/djangoapps/course_home_api/outline/views.py`), the waffle flag
      `course_experience.enable_course_goals`, off by default. Skip and say so if it is off.
      *Why here:* the flags are `<img>` elements now; the button styles come from
      `FlagButton.scss` through `style.scss`.
- [x] **6. The handouts and welcome message frames** (the welcome message only) — each frame shows its text with
      links coloured and, in the welcome message, underlined; the handouts text is
      smaller than the page's.
      *Needs:* a welcome message and a handout for the course. The outline response's
      `welcome_message_html` is the course's current update (`get_current_update_for_user`
      in the outline view), so both are added in Studio; the record names the page and
      controls as they read when it is done.
      *Why here:* the three rules are inline in the frame document where `master` linked
      a stylesheet file.
- [x] **7. The narrow card header** — at a window under 576 pixels wide, the start or
      resume card's button sits under its title, not beside it.
      *Why here:* the one `index.scss` rule copied into `style.scss`.
- [x] **8. The progress tab's outline links** — on the progress tab, the outline links
      that #2247 left on the stub now open this page with no page load.

### Record

**2026-11-12, Brian, on the dev site, on `bsmith/outline-tab`.**

- Brian ticked steps 1, 2, 3, 4, 7 and 8, with no notes on any of them. Three details
  those steps ask about were not noted and stay unrecorded: how the all-dates link
  looked beside the links around it (step 4), whether the console held warnings that
  are not Learning's (step 2), and whether the welcome message held a link (step 6).
- Step 5 was not run. Brian: "not testing because setting up goals sounds like a
  pain". So the goal card, its three flag images and its `FlagButton.scss` styles have
  not been seen in the app. The suite checks that each goal button holds an image
  whose source is the SVG's URL, with the SVG import mocked; the CI site build emits
  the three files; and the image form was compared with the inline form outside the
  app (below).
- Step 6 was run for the welcome message only. Brian: "just welcome message, didn't
  do anything for handouts". So the handouts frame, and with it the `small` rule, has
  not been seen in a browser.
- Brian is not running the steps that were not run; they stand as gaps in this pass.

### Checked outside the app

- **The flags as images** — the three goal buttons were drawn twice in one page
  layout, once with each SVG inline, as `master` renders it, and once as
  `<img src>` of the same file, as this layer does, and rendered in headless Chrome
  157 at 560 by 220 pixels: the two screenshots are byte-identical, with the
  outline, half-grey and black flags in place and the middle button selected. The
  page used stand-in styles for the button and its layout classes, the same in both
  renderings, not Paragon's or the app's stylesheet. So this holds that an image
  draws what the inline SVG drew; it does not show the card in the app, which
  step 5 would have.
- **Lint, tests and both builds** at the layer's head (`2a1a017b`) and at its port
  commit alone (`c2315c2d`), 2026-11-12: all pass. Head: 41 suites, 543 passed, 11
  skipped, 100% of lines. Port commit: 525 passed, 11 skipped, 98.4% of lines. The
  CI site build emits the three flag files and the `learning-outline` chunk.

### Left to the suite

| State | Test |
|---|---|
| The course start, course end, certificate, private course and scheduled content alerts | `OutlineTab.test.jsx`, "Alert List" and "Links to Learning pages" |
| A course without a dates tab: no all-dates link, no schedule button | `OutlineTab.test.jsx`, "Links to Learning pages" |
| The proctoring panel's statuses | `OutlineTab.test.jsx`, "Proctoring Info Panel" |
| The account activation alert and its cookie | `AccountActivationAlert.test.tsx` (#2251) and `OutlineTab.test.jsx`, "Account Activation Alert" |
| The not-enrolled view | `OutlineTab.test.jsx`, "Private Course Alert" |
| `weekly_goal` and `start_course` in the address | `OutlineTab.test.jsx`, "Weekly Learning Goal" |
| The theme name in the frame's stylesheet link | `OutlineTab.test.jsx`, "Handouts and welcome message frames" |
