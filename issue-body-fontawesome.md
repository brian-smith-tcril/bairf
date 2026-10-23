**What:** replace Font Awesome with Paragon icons across the app and drop the four `@fortawesome/*` dependencies. Follow-up to #1905: the port moves the Font Awesome sites as they are and the frontend-base package declares the dependencies its files import (`@fortawesome/react-fontawesome`, `@fortawesome/free-solid-svg-icons`, `@fortawesome/fontawesome-svg-core`), so this is one change across the app after the port lands rather than one inside each port layer.

**Inventory on `master`:**

| | count |
|---|---|
| source files importing Font Awesome | 20 (no test file imports it) |
| `<FontAwesomeIcon>` render sites | 24 |
| distinct icons | 32: 26 from `free-solid`, 3 from `free-regular` (`faCalendarAlt`, `faNewspaper`, `faCopyright`), 7 from `free-brands` (`faLinkedinIn` and six Creative Commons marks) |
| tests asserting on Font Awesome output | 3, all through `fa-*` class selectors: `UnitIcon.test.jsx`, `SequenceNavigation.test.jsx`, `CoursewareContainer.test.jsx` |

**Direct Paragon matches, 25 of 32 icons.** `Lock`, `Calendar`/`CalendarToday`, `Check`, `Cancel`/`HighlightOff`, `Book`/`MenuBook`, `Videocam`, `Assignment`, `Star`, `Search`, `Help`, `Edit`, `Newspaper`/`Article`, `Info`, `Home`, `Warning`, `Equals`, `Copyright`, `CheckCircle`, `Verified`, `Calculate`, `Bookmark`, and `BsLinkedin` from Paragon's Bootstrap set for the LinkedIn mark; `faSpinner spin` (two sites) becomes Paragon's `Spinner`. Each site is `<Icon src={...} />` with a `size`: Font Awesome icons are 1em and Paragon's `Icon` is 24px by default, and most of these sit inline before a label (`mr-2`), so they want `inline` or `sm`.

**No Paragon match: the Creative Commons marks.** [`CourseLicense.jsx`](https://github.com/openedx/frontend-app-learning/blob/master/src/courseware/course/course-license/CourseLicense.jsx) renders `faCreativeCommons` plus one of By, Nc, Nd, Sa, Zero per license tag; Paragon's `Cc` is closed captions. To settle here before the swap: inline SVGs of the CC marks checked into the repo (Creative Commons publishes them for this use under its trademark policy), text badges without glyphs, or keeping `free-brands-svg-icons` for this one file.

**Font Awesome's stylesheet is a hidden dependency.** `fontawesome-svg-core` injects its CSS at runtime on first render (`autoAddCss: true`), and three places use it without importing anything: [`UpgradeBullets.jsx`](https://github.com/openedx/frontend-app-learning/blob/master/src/generic/upgrade-bullets/UpgradeBullets.jsx) and [`LockPaywall.jsx`](https://github.com/openedx/frontend-app-learning/blob/master/src/courseware/course/sequence/lock-paywall/LockPaywall.jsx) lay out their lists with `fa-ul`/`fa-li` (and `UpgradeBullets.scss` positions `.fa-li`), `Day.jsx` uses `fa-xs`, and `DateSummary.jsx` and `CourseTools.jsx` pass `fixedWidth`. The bullet layout becomes a few lines of the repo's own SCSS; the rest becomes Paragon sizes.

**Tests.** The three `fa-*` assertions switch to what Paragon's `Icon` renders (a `data-testid` on the site, or the `src` component); `UnitIcon.test.jsx` is a table keyed on the class names and is rewritten.

**Size:** about 20 files, 24 call sites, one SCSS file, three tests, four `package.json` lines, plus the frontend-base package's three. A wide change, one PR, `refactor:`, no user-facing change beyond the glyphs themselves.

> [!NOTE]
> This issue body was drafted by Claude (Claude Code) and reviewed before posting.
