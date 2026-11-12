# Manual testing — the outline tab (#2191)

One section per layer of the stack. A layer's section asks only for what that layer changes
and a test cannot see, and says what each step needs beyond the page itself.

## Shared modules (#2251)

Nothing to do. No route renders these modules until the next layer.

## The outline tab layer

Drafted 2026-11-12 before the pass; nothing below has been observed yet. Each box is
ticked by Brian, with what was seen written under it.

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

- [ ] **1. The page and its styles** — the outline renders inside the shell with the
      Course tab selected: the title, the start or resume card, the section list with
      its "Expand all" button, and the right column (goal card if the course has goals
      on, course tools, dates, handouts). The cards have a soft shadow and no border.
      *Why here:* the route now loads the real page; `style.scss` gains three partials
      and the card-header rule copied from `master`'s `index.scss`.
- [ ] **2. The console** — DevTools, Console, reload. No errors or warnings from
      Learning's code.
- [ ] **3. A sequence title** — expand a section and click a sequence title. The address
      becomes `/learning/course/<course>/<sequence id>` and the courseware stub shows,
      with no page load (the Network tab shows no document request).
      *Why here:* the title's link is `getSequenceUrl`'s where `master` wrote
      `/course/<course>/<sequence>`.
- [ ] **4. The all-dates link** — in the dates widget, "View all course dates" opens the
      dates tab with no page load. Before clicking, compare its look with the links
      around it: it is a Paragon `Hyperlink` now where `master` has a bare anchor.
      *Needs:* a course with at least one date, so the widget shows.
- [ ] **5. The goal card's flags** — each of the three goal buttons shows its flag
      (outline, half grey, black), and selecting one gives it the selected border.
      *Needs:* weekly learning goals on for the course: the outline view sets
      `weekly_learning_goal_enabled` when `ENABLE_COURSE_GOALS` is enabled for the course
      (`lms/djangoapps/course_home_api/outline/views.py`). Skip and say so if it is off.
      *Why here:* the flags are `<img>` elements now; the button styles come from
      `FlagButton.scss` through `style.scss`.
- [ ] **6. The handouts and welcome message frames** — each frame shows its text with
      links coloured and, in the welcome message, underlined; the handouts text is
      smaller than the page's.
      *Needs:* a welcome message and a handout for the course. The outline response's
      `welcome_message_html` is the course's current update (`get_current_update_for_user`
      in the outline view), so both are added in Studio; the record names the page and
      controls as they read when it is done.
      *Why here:* the three rules are inline in the frame document where `master` linked
      a stylesheet file.
- [ ] **7. The narrow card header** — at a window under 576 pixels wide, the start or
      resume card's button sits under its title, not beside it.
      *Why here:* the one `index.scss` rule copied into `style.scss`.
- [ ] **8. The progress tab's outline links** — on the progress tab, the outline links
      that #2247 left on the stub now open this page with no page load.

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
