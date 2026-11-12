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

1. **No manifest line for `public/static/LmsHtmlFragment.css`.** The
   posted plan gives it one, pointing at `LmsHtmlFragment.jsx`. Two
   things are against it: `port-diff` stops on a target with two legacy
   files ("a merge of several legacy files"), and `rebase-audit` only
   reads `master`'s changes under `src/`, so a line for a `public/` path
   audits nothing. The plan and the issue body say otherwise until
   Brian is told and the body is edited.
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
5. **Lint.** Eleven messages gain a `description` (six in
   `messages.ts`, two in the certificate alert's, three inline in the
   scheduled content alert, one inline in the certificate alert);
   `eslint-disable` comments for rules the package's lint does not have
   are removed (`import/no-extraneous-dependencies` in the three
   factories, `import/prefer-default-export` in two alert hooks);
   `OutlineTab.jsx`'s `start_course` effect gains a
   `react-hooks/exhaustive-deps` disable comment, keeping `master`'s
   dependency list; `HiddenSequenceLink.tsx` drops its empty `Props`
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

## Open, for Brian

- **Factories and coverage.** `courseBlocks.factory.js` ports whole,
  but the outline suite uses only `buildMinimalCourseBlocks`;
  `buildSimpleCourseBlocks` and `buildBinaryCourseBlocks` are used by
  courseware suites (#2195 on). Factories count toward coverage here,
  as on `master`, so about 31 of the file's lines are uncovered in this
  layer, and two in `block.factory.js`. The package is at 100% of lines
  below this layer, and codecov's patch target is the base's coverage.
- The plan's "new cases for what the port changes" and the coverage
  commit are not written yet.
