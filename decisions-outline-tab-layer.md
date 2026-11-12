# Decisions: the outline tab (draft; renamed to the PR number when the layer is submitted)

Decisions made while building this layer of #2191. The scope and the
import and config mapping are in #2191's plan and are not repeated.
Working notes, 2026-11-12, in the order found; rewritten into entries
before the layer is submitted.

## Done on the working tree (`bsmith/outline-tab`, uncommitted)

- The 43 files of `course-home/outline-tab/` copied (flags into
  `widgets/assets/`), the two slot modules, the three factories; imports
  folded into `@openedx/frontend-base`; the plan's source changes
  applied; `home` route lazy; `LEGACY_THEME_NAME: null` in
  `defaultConfig`; three `@use` lines and the card-header rule in
  `style.scss`; `truncate-html`, `lodash.camelcase` and
  `@fortawesome/free-regular-svg-icons` declared at `master`'s versions
  (the lock resolves the same versions as the legacy lock); 53 manifest
  lines, 5 of them `dropped`.
- `OutlineTab.test.jsx` and `Section.test.tsx` ported: 80 pass, 4 are
  `it.skip` (three under #2194, one under #2185). Full suite: 41 suites,
  512 passed, 11 skipped; lines 97.06. Lint clean. `npm run build`
  passes and `dist/` holds the three flag SVGs.

## Found, each needing an entry

1. **`public/static/LmsHtmlFragment.css` is `dropped` in the manifest
   (Brian).** The posted plan gave it a line pointing at
   `LmsHtmlFragment.jsx`. That makes the component a target with two
   legacy files, on which `port-diff` stops ("a merge of several legacy
   files"). `dropped` is what the manifest calls a file that is not
   ported, names no target, and so leaves the component with one legacy
   file. The commit and the PR say where the three rules went. The
   plan and the issue body mirror carry the correction; #2191's live
   body is edited on Brian's word. `rebase-audit` reads `master`'s
   changes under `src/` only, so the line is not audited either way.
2. **The test render helpers had no authenticated user in the site
   context.** `render` and `renderRoutes` in `tests/render.tsx` mounted
   no `SiteContext` provider, so `useContext(SiteContext)` gave the
   context's default, `authenticatedUser: null`, while
   `getAuthenticatedUser()` returned the mock user. `master`'s
   `AppProvider` put the user in `AppContext`. The private course alert
   is the first ported reader whose tested outcome depends on it
   (`authenticatedUser !== null`): four outline cases failed until both
   helpers wrapped their tree in a `SiteContext.Provider` holding
   `getAuthenticatedUser()`, read at render time. No other suite
   changed result.
3. **Lazy alerts and the account activation modal in the route test.**
   `fetchAndRender` waits for the level-one heading with
   `hidden: true`: the modal hides the page behind it from the
   accessibility tree.
4. **Console output fixed in components.**
   - `WelcomeMessage`'s `nextElementRef` prop type named
     `HTMLInputElement`; the tab passes the expand button's ref. Now
     `HTMLElement`.
   - `CertificateStatusAlert` rendered `FontAwesomeIcon` with no icon
     for the not-passing variant, which react-fontawesome reports
     ("Could not find icon undefined"). The icon renders only when the
     variant has one.
   - jsdom's "Not implemented: navigation": the upgrade button's
     `location.replace` is stubbed with `mockLocation`; the two link
     clicks use `preventNavigation`.
5. **Lint.** (The three welcome message descriptions first said
   "course update", the platform's word for where the field comes
   from; Brian asked where it came from. Learning's code says
   "welcome message" throughout, and the descriptions do now.)
   Eleven messages gain a `description` (six in
   `messages.ts`, two in the certificate alert's, three inline in the
   scheduled content alert, one inline in the certificate alert);
   `eslint-disable` comments for rules the package's lint does not have
   are removed (`import/no-extraneous-dependencies` in the three
   factories, `import/prefer-default-export` in two alert hooks);
   `OutlineTab.jsx`'s `start_course` effect lists the two dependencies
   it reads beside `location.search` (`location.pathname`, `navigate`),
   which the package's lint reports as a warning and `master`'s lint,
   with `react-hooks/exhaustive-deps` turned off, does not. I first
   added a disable comment; Brian: adding the dependencies is better
   than ignoring a lint rule, the more so as it does not change
   behavior. When the effect runs again `start_course` is already out
   of the address, and a case holds that the event is sent once; `HiddenSequenceLink.tsx` drops its empty `Props`
   interface; `WelcomeMessage`'s show-more button, an element in an
   array, gains a `key`.
6. **The certificate alert's button takes `getLinkProps` for every
   variant that has a link**, in one line:
   `{...(buttonLink && getLinkProps(buttonLink))}` where `master` has
   `href={buttonLink}`. The certificate web view and the support URL
   are absolute, so they stay plain `href`s; the progress URL is a path
   in the site and becomes a router link; an empty or missing link
   renders a button, as `master`'s falsy `href` did. The plan said
   only the grades button changes; the outcome is the same.
7. **The all-dates link is a Paragon `Hyperlink`** with `master`'s
   classes and `getLinkProps`, as #2247 made the progress tab's
   subsection titles; `master` has a bare anchor. Its look beside the
   widget's other anchors is a manual-pass item.

7a. **`SequenceTitle.tsx` guards the course id, no assertion.** I first
   wrote `getSequenceUrl(courseId!, id)`, since `useParams()` types
   the id as possibly undefined; Brian flagged the `!`, as he had on
   `resolveRouteByRole` in #2190. The title is a link when
   `showLink && courseId`, in one expression where `master` built
   the link element first and chose after, so `getSequenceUrl`, which
   throws when no route provides the courseware role, runs only for
   a title that shows a link. No other file of the two outline
   layers has an assertion the port added.
7b. **Where the lint fixer removed a directive, the line goes with
   it.** The package's lint removes an `eslint-disable` comment for a
   rule it does not report. It left an empty line in its place in
   `ProctoringInfoPanel.jsx`, `WeeklyLearningGoalCard.jsx` and
   `courseBlocks.factory.js`, and, for the JSX comment in
   `StartOrResumeCourseCard.jsx`, an empty expression container,
   `{ }`, which Brian caught. All four are deleted, so each reads as
   `master`'s file minus the comment line. The directives `master`
   carries for rules the package does report are kept. The line under
   the comment, `<Card.Footer><></></Card.Footer>`, stays as `master`
   has it (Brian): the empty fragment is not needed, but the line is
   unchanged from `master`.
8. **`courseBlocks.factory.js` ports with two builders commented out
   (Brian).** The outline suite uses `buildMinimalCourseBlocks` only;
   `buildSimpleCourseBlocks` and `buildBinaryCourseBlocks` are used by
   courseware suites and are line-commented under #2195's URL until
   then. Factories count toward coverage here, as on `master`, and the
   package is at 100% of lines below this layer. Uncommented, the file
   is `master`'s apart from two stale lint comments the fixer removed.
   The factory's default options and `block.factory.js`'s two
   pass-through URLs are run by two cases of the coverage commit.
9. **`CourseTools` renders an icon only for a tool it knows.** For any
   other analytics id `renderIcon` returns `null`, and react-fontawesome
   reports an icon it cannot find. Course tools are a plugin point
   (`CourseToolsPluginManager`), so an unknown id can occur. Found
   writing the coverage case for that branch; the fix is in the port's
   commit, its case in the coverage commit.
10. **Cases for what the port changes, with the port:** the sequence
    title's `href`; the dates widget link (its `href`, and a click
    staying in the site) and the scheduled content button, each also
    absent without a dates tab; the not-passing alert's link to the
    progress tab; the frame document (base, stylesheet link, the three
    rules, the theme name); each goal button's flag image;
    `weekly_goal` gone from the router's location after the save; the
    page-rule assertion. `SESSION_COOKIE_DOMAIN` is covered in #2251.
    The three lines #2234 left for this suite are run by `master`'s own
    cases once ported.
11. **Coverage cases, in their own commit:** the section's toggles; an
    outline whose blocks include a unit; a sequence block built with its
    own URLs; the start or resume button's click event and its absence
    without a URL; each tool's icon, an unknown tool, a tool click; the
    certificate and grades buttons' click events; the past-due
    onboarding button; the frame's resize message.

## State (2026-11-12)

- Working tree on `bsmith/outline-tab`, uncommitted. Two commit objects
  on no branch hold it as it will be committed: the port, and the
  coverage cases on top (186 lines added to `OutlineTab.test.jsx`).
- The port alone: 41 suites, 525 passed, 11 skipped; lines 98.4; lint
  clean. With the coverage cases: 543 passed, 11 skipped; lines 100 for
  the package; lint clean; `build` and `build:ci` pass, the CI build
  emitting the three flag images and the `learning-outline` chunk.
- Waiting on Brian: reading the diff; #2191's live body (the `dropped`
  line for the stylesheet); the manual pass, drafted in
  `manual-testing-2191.md`.
