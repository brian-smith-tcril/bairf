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

    More cases take the branches those lines left untaken, so that no
    added line is partly covered: a date with a linked title and a
    description, and a link that is not the upgrade deadline; a
    completed sequence, a sequence without a URL, and dates with no
    time zone set; an anonymous visitor and an enterprise learner; an
    outline response without course goals, certificate data or an
    enroll alert; a proctoring status the panel does not know; a
    weekly goal changed, and the reminder switch while masquerading; a
    frame message of another type; and the course blocks factory given
    its sequences as one block, the side of its two helpers no caller
    used.

    `OutlineTabComponents.test.tsx` renders components alone in states
    the route never gives them, as `ProgressTabComponents.test.tsx`
    does for the progress tab: the certificate alert with a status it
    does not know and with a time zone in its payload; its hook
    without course metadata; the course end alert with a time zone;
    the private course alert and the goal card without course
    metadata; the handouts without an outline; and the frame without a
    class name and under a page with and without a `dir` attribute.

16. **A `?? {}` on a query read goes where it only moves a throw.**
    `master` reads the outline and course metadata queries as
    `.data ?? {}`. Where the same or the next statement destructures a
    nested key or reads through the result, the code throws with the
    fallback and throws without it, so the fallback has no outcome of
    its own and no test can take its side. Nine go: both reads in
    `OutlineTab.jsx`, the outline read in the certificate hook, the
    course end and scheduled content hooks, `CourseDates`,
    `StartOrResumeCourseCard`, `CourseTools` and `WelcomeMessage`.
    Four stay, because they change what renders, each with a case that
    renders the component alone: the certificate hook's metadata read
    (no alert), `PrivateCourseAlert` (a welcome with no course title),
    `CourseHandouts` (nothing) and `WeeklyLearningGoalCard` (it
    renders).

17. **Conditions that were always true where they stood are written
    out.** Each is `master`'s, and each left a branch no input can
    take. No behavior changes.
    - `ProctoringInfoPanel.jsx`: `else if (!isNotYetReleased(releaseDate))`
      and `else if (readableStatus !== …otherCourseApproved)` each
      repeat the negation of the condition before them, and become
      `else`.
    - `CertificateStatusAlert.jsx`: `renderCertAwardedStatus` runs only
      for the three awarded statuses, picked by the `switch` below it,
      so the last `else if` of its chain was never false. The chain is
      a `switch` over the same three statuses, which keeps each
      status's name on its arm; it has no `default`, as the chain had
      no final `else`.
    - `CertificateStatusAlert.jsx`: the button's handler was
      `if (buttonAction) { buttonAction(); }`. `buttonVisible` and
      `buttonAction` are set only in this file, in the same four
      objects, so every button it renders has an action; the handler
      is `onClick={buttonAction}`. The progress tab's
      `CertificateStatus.jsx` keeps its own guard, which it needs: its
      button can render with a link and no action.

18. **The certificate and course end alerts get no time zone, as on
    `master`.** Their hooks read `userTimezone` from the outline data,
    which has no such key; the course metadata carries it. The port
    keeps the read. The two cases that reach the alerts' time zone
    branch hand the component a payload.

19. **Checks (2026-11-12).** At the first commit: `npm run lint` clean,
    with the package's `.jsx` files included
    (openedx/frontend-base#327); `npm test`, 41 suites, 525 passed, 11
    skipped, lines 98.4. At the second: lint clean; 42 suites, 569
    passed, 11 skipped; lines 100 for the package. Counted as codecov
    counts a patch, against #2251's head: 526 added lines, none missed
    and none partly covered. `npm run build` and `npm run build:ci`
    pass at both; `dist/` holds the three flag images, and the CI
    build emits them and the `learning-outline` chunk.
