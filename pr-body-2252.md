## Summary

The outline tab, the course home under the "Course" tab, now runs in Learning's frontend-base package. At `/learning/course/:courseId/home` a learner sees the section and sequence outline, the start or resume card, the weekly goal card, the course tools, dates and handouts, the welcome message and the tab's alerts, inside the tab-page frame from #2234. **No user-facing change on `master`**: the legacy tree under `src/` is untouched.

Part of #1905. Resolves #2191. Stacked above #2251.

> [!NOTE]
> **For reviewers:** two commits, meant to be read apart. The first is the port, with `master`'s tests adapted. The second only adds tests, for code `master`'s own suite leaves unrun. The ported files are added under `frontend-base/src/` as new files, so this diff cannot show what changed from `master`; the `port-diff` script in #2234's description prints that diff, from `frontend-base/manifest.tsv`. Fourteen of the ported files are identical to `master`'s.

## What changed

- **The outline tab.** `course-home/outline-tab/` moves to the same path under `frontend-base/src/`, and the `home` route loads it lazily in place of its stub, in the `learning-outline` chunk. Platform imports become `@openedx/frontend-base` ones; `LMS_BASE_URL` reads become `getSiteConfig().lmsBaseUrl`; `SUPPORT_URL_ID_VERIFICATION` and `LEGACY_THEME_NAME` are read from the app config, the second a new key with `master`'s default of `null`.
- **Sequence titles link through `getSequenceUrl`.** `master` writes `/course/<course>/<sequence>`, a path at the root of its own site. The block's `lms_web_url` still decides whether a title is a link. Until #2195 the link lands on the courseware stub.
- **The two dates links resolve the dates role.** The dates widget's all-dates link and the scheduled content alert's button read `useDatesTabUrl()` where `master` reads the outline response's `datesTabLink`, and render through `getLinkProps`, so the click stays in the site. The certificate alert's link to the progress tab becomes a router link the same way.
- **The frames carry their three rules inline.** `master`'s frame document links `<BASE_URL>/static/LmsHtmlFragment.css`, copied out of `public/static/` by its webpack config. Nothing serves a package's file at the site's base URL, so the three rules are written into the document in a `<style>` element where the `<link>` stood. `LEGACY_THEME_NAME` still selects the `lms-main.css` linked before them. The stylesheet file is `dropped` in the manifest.
- **The goal card's flags are images.** frontend-base has no SVGR loader, and its migration guide asks for the default URL import in an `<img>`. The three SVGs move into `widgets/assets/`, which the package's build copies into `dist/`.
- **The goal card clears `weekly_goal` through the router**, since frontend-base exports no `history`.
- **Placeholder slots.** The section outline slot renders its default content; the tab notifications slot, which has none, renders nothing. Both wait for #2185. Their READMEs and images are dropped with the plugin-framework contract they document.
- **Console and lint fixes in the components**, since the suite fails on console output: three components lose their `defaultProps`; `WelcomeMessage`'s ref prop type names `HTMLElement` where it named `HTMLInputElement` for a ref that is a button; the certificate alert and the course tools render an icon only when they have one; the `start_course` effect lists the values it reads; eleven messages gain a `description`.
- **Styles.** `style.scss` loads the `DateSummary`, `FlagButton` and `ProctoringInfoPanel` partials and takes the one rule of `master`'s `index.scss` that styles this tab.
- **Factories and packages.** The `outlineTabData`, `block` and `courseBlocks` factories port. `courseBlocks.factory.js` keeps two builders commented out until #2195, whose suites are their first callers. The package declares `truncate-html`, `lodash.camelcase` and the regular Font Awesome icons at `master`'s versions.
- **The test render helpers put the authenticated user in the site context.** They mounted no `SiteContext` provider, so a component reading the context saw no user. The private course alert is the first ported code whose tested outcome depends on it.
- **Manifest.** Lines for every file moved or dropped.

## Known differences from `master`

- **A course whose tab list has no dates tab shows neither dates link** (#2250). `master` shows the scheduled content alert's button for a course whose Dates tab is hidden, where it opens a dates page with no dates, and shows both links to a learner the entrance exam still gates.
- **The all-dates link is a Paragon `Hyperlink`** with `master`'s classes; `master` has a bare anchor.
- **The handouts stylesheet is no longer a file.** A deployment that replaced `LmsHtmlFragment.css` in its build has to restyle the frames through the theme's `lms-main.css`.
- **The course tools list ends in an empty item** until the product tours port (#2208): the launch-tour button is a stub.

## Testing

At the layer's head and at the port commit alone, in `frontend-base/`: lint, the tests, `build` and `build:ci` pass. Lint ran with the package's `.jsx` files included (openedx/frontend-base#327).

- **Head:** 41 suites, 543 tests passed and 11 skipped (the four this layer skips, named in decision log entry 13, and seven from earlier layers).
- **Port commit alone:** 41 suites, 525 passed, 11 skipped.

**Coverage.** The package is at 100% of lines at the head, against its 96.15% bar, and at 98.4% at the port commit alone.

**Manual testing** on the package's dev site against tutor dev is run on this draft; its record is below and is filled in as the pass is done.

## Decisions

What was decided while building this layer; the scope and the import and config mapping are in #2191.

<details>
<summary>Full decision log</summary>

# Decisions: the outline tab (#2252)

Decisions made while building this layer of #2191. The scope and the
import and config mapping are in #2191's plan and are not repeated.

1. **The top layer of two, in two commits.** The shared modules are
   #2251. This layer's first commit is the port, with `master`'s tests
   and the cases for what the port changes; the second holds the cases
   that add coverage, so the port's diff shows only what the port
   changes.

2. **A sequence title links to `getSequenceUrl(courseId, id)`.**
   `master` writes `/course/<course>/<sequence>`, a path at the root of
   its own site; under the shell Learning's routes sit below
   `/learning`. The element stays react-router's `Link`, and the
   block's `lms_web_url` (`showLink`) still decides whether the title
   is a link.
   - `useParams()` types the course id as possibly undefined. The
     title is a link when `showLink && courseId`, in one expression,
     with no non-null assertion. `master` built the link element first
     and chose after; `getSequenceUrl` throws when no route provides
     the courseware role, so here it runs only for a title that shows
     a link.

3. **The two dates links read `useDatesTabUrl()`.** `master` reads
   `datesTabLink` from the outline response, which the outline view
   builds as `get_learning_mfe_home_url(course_key,
   url_fragment='dates')`: Learning's dates tab, reached by a full page
   load. The hook resolves the dates role for the course, and both
   links render through `getLinkProps`, so the switch stays in the
   site.
   - The hook returns nothing when the course metadata's `tabs` has no
     dates tab, and then neither link renders. That is the fix for
     #2250: `master` shows the scheduled content alert's button for a
     course whose Dates tab is hidden, and both links to a learner the
     entrance exam still gates.
   - The all-dates link is a Paragon `Hyperlink` carrying `master`'s
     classes, as #2247 made the progress tab's subsection titles;
     `master` has a bare anchor. The scheduled content alert's `Button`
     takes the link props directly.

4. **The certificate alert's button renders through `getLinkProps` in
   one line.** `{...(buttonLink && getLinkProps(buttonLink))}` stands
   where `master` has `href={buttonLink}`. The certificate web view
   and the ID verification support URL are absolute, so they stay
   plain `href`s; the progress tab's URL is a path in the site and
   becomes a router link; an empty or missing link renders a button,
   as `master`'s falsy `href` did.

5. **The frames' three rules are inline, and the stylesheet file is
   `dropped`.** `master`'s frame document links
   `<BASE_URL>/static/LmsHtmlFragment.css`, a file its
   `webpack.prod.config.js` copies out of `public/static/`. The package
   is a library a site bundles: nothing serves a file of its at the
   site's base URL, frontend-base's webpack gives every `.css` import
   to its stylesheet rule (the host page, not the frame's document),
   and no rule returns a file's text. The rules are written into
   `LmsHtmlFragment.jsx` in a `<style>` element where the `<link>`
   stood.
   - Theming is unchanged. The frame's content is themed through
     `LEGACY_THEME_NAME` (#785), which selects the `lms-main.css`
     linked before these rules; a `<style>` element in the `<link>`'s
     place has the same position and specificity in the cascade.
   - Replacing the file in a fork or an image was never part of
     Learning's API, so this is not called a breaking change. A search
     of public GitHub for files named `LmsHtmlFragment.css` finds only
     copies of this repository, each holding the unchanged file.
   - The manifest line is `public/static/LmsHtmlFragment.css` to
     `dropped`. A line pointing at the component would give that
     target two legacy files, on which the `port-diff` script stops.

6. **The goal card's flags are images under `widgets/assets/`.**
   `master` imports each SVG's `ReactComponent`, which frontend-build's
   `@svgr/webpack` rule provides. frontend-base's migration guide
   (`docs/how_tos/migrate-frontend-app.md`, "SVGR "ReactComponent"
   imports have been removed") says: "Please replace that export with
   the default URL export and set the URL as the source of an `<img>`
   tag, rather than using `ReactComponent`." The same guide's `build`
   target copies `*.scss` files and files under an `assets/` directory
   into `dist/`, which is all the package publishes, so the three files
   move there; the manifest carries the move. The package's own dev
   site and CI build bundle from `src/` and would not show a file
   missing from `dist/`.

7. **The goal card clears `weekly_goal` through the router.** `master`
   calls `history.replace({ search })` on frontend-platform's
   `history`, an instance of its own beside the router's, so the
   address bar changes and the router's location does not.
   frontend-base exports no `history`. The effect calls
   `navigate({ search }, { replace: true })`; the router's location
   then changes, the effect runs once more and finds no `weekly_goal`.
   The goal is saved once either way, and a case holds that.

8. **The `start_course` effect lists the values it reads.** Its
   dependency list on `master` is `[location.search]`, though it also
   reads `location.pathname` and `navigate`. `master`'s lint has
   `react-hooks/exhaustive-deps` turned off; the package's reports it
   as a warning. The two are added to the list instead of a disable
   comment. When the effect runs again `start_course` is already out
   of the address, so nothing changes, and a case holds that the event
   is sent once. The two other `exhaustive-deps` comments in this
   directory (`Section.tsx`, `WeeklyLearningGoalCard.jsx`) are
   `master`'s and stay: adding dependencies there would change when
   those effects run.

9. **Console output fixed in the components.**
   - `DateSummary`, `LmsHtmlFragment` and `WeeklyLearningGoalCard`
     lose their `defaultProps`. The last two take default parameters,
     since their defaults are read (a class name written into the
     frame document, a goal compared with `null`).
   - `WelcomeMessage`'s `nextElementRef` prop type names `HTMLElement`
     where it named `HTMLInputElement`. The tab passes the "Expand all"
     button's ref, so every re-render failed the check. The type came
     in with #1580 and is `HTMLInputElement` in all of its commits,
     while the ref is on the button in all of them and the case it
     added asserts the button has focus; nothing in that PR says why
     an input. The component only calls `.focus()`. Prop types are
     checked in React's development build only, so nothing else
     changes.
   - `CertificateStatusAlert` and `CourseTools` render their icon only
     when they have one. The not-passing variant of the alert has no
     icon, and a tool with an analytics id the widget does not know
     has none either; react-fontawesome reports an icon it cannot
     find. Course tools come from a plugin point
     (`CourseToolsPluginManager`), so an unknown id can occur.

10. **Lint.** Eleven messages gain a `description`, their ids and
    default messages untouched: six in `messages.ts`, two in the
    certificate alert's, three inline in the scheduled content alert
    and one inline in the certificate alert. `eslint-disable` comments
    for rules the package's lint does not have or does not report are
    removed, each with its whole line. `HiddenSequenceLink.tsx` drops
    an empty `Props` interface, and `WelcomeMessage`'s show-more
    button, an element in an array, gains a `key`.

11. **`courseBlocks.factory.js` ports with two builders commented
    out.** The outline suite uses `buildMinimalCourseBlocks` only.
    `buildSimpleCourseBlocks` and `buildBinaryCourseBlocks` are first
    called by courseware suites, so they are line-commented under
    #2195's URL. Factories count toward coverage here, as on `master`,
    and the package is at 100% of lines below this layer. Uncommented,
    the file is `master`'s apart from two lint comments.

12. **The test render helpers put the authenticated user in the site
    context.** `render` and `renderRoutes` mounted no `SiteContext`
    provider, so `useContext(SiteContext)` gave the context's default,
    no user, while `getAuthenticatedUser()` returned the mock user.
    `master`'s `AppProvider` put the user in `AppContext`. The private
    course alert is the first ported code whose tested outcome depends
    on it, and four outline cases failed. Both helpers now wrap their
    tree in a `SiteContext.Provider` holding `getAuthenticatedUser()`,
    read at render time. No other suite changed result.

13. **The outline test through the route array.**
    - `fetchAndRender` keeps its `path` argument for the query-string
      cases and waits for the level-one heading with `hidden: true`:
      the account activation modal hides the page behind it from the
      accessibility tree.
    - Three cases render the instructor toolbar for real and are
      `it.skip` under #2194's URL: the two access expiration banner
      cases and the request count with the toolbar mounted. The case
      that asserts the plugin slot's test id is `it.skip` under
      #2185's URL.
    - A case that clicks a link stops the navigation with
      `preventNavigation`. The upgrade button calls `location.replace`
      itself, which a prevented click does not stop, so its case stubs
      the location with `mockLocation`, as the dates suite does for
      the same button.
    - The case that sets `LEGACY_THEME_NAME` resets it inside `act`
      while the page is still mounted, as the progress suite resets
      its flag.

14. **Cases for what the port changes, in the first commit:** the
    sequence title's `href`; the dates widget link (its `href`, and a
    click staying in the site) and the scheduled content button, each
    also absent without a dates tab; the not-passing alert's link to
    the progress tab; the frame document (base, stylesheet link, the
    three rules, the theme name); each goal button's flag image;
    `weekly_goal` and `start_course` gone from the router's location,
    with one save and one event; the page-rule assertion, moved from
    `routes.test.tsx`. The three lines #2234 left for this suite are
    run by `master`'s own cases once ported.

15. **Cases that add coverage, in the second commit:** a section's
    toggles; the start or resume button's click event and its absence
    without a URL; each tool's icon, an unknown tool, a tool click;
    the certificate and grades buttons' click events; the past-due
    onboarding button; the frame's resize message. Two cases run
    factory code: an outline built from the course blocks factory's
    defaults, which include a unit, and a sequence block built with
    its own URLs.

16. **Checks (2026-11-12).** At the first commit: `npm run lint` clean,
    with the package's `.jsx` files included
    (openedx/frontend-base#327); `npm test`, 41 suites, 525 passed, 11
    skipped, lines 98.4. At the second: lint clean; 543 passed, 11
    skipped; lines 100 for the package. `npm run build` and
    `npm run build:ci` pass; `dist/` holds the three flag images, and
    the CI build emits them and the `learning-outline` chunk.

</details>

<details>
<summary>Manual testing</summary>

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

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
