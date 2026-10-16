`.env.test` sets `SITE_NAME='edX'`, so every page title and site-name string the test suite renders says "edX" rather than the platform's name:

```
SITE_NAME='edX'
```

Twelve components read `getConfig().SITE_NAME` (the page titles in `Course`, `LoadedTabPage` and the three course-exit pages, `HonorCode`, `SocialIcons`, `NewUserCourseHomeTourModal`, `UpgradeBullets`, `AccountActivationAlert`). With the value changed to `Open edX`, all of their suites pass except two assertions that hard-code the old name:

- `src/courseware/course/Course.test.jsx`: the `| edX` at the end of the page-title assertion in `loads learning sequence`.
- `src/generic/upgrade-bullets/UpgradeBullets.test.jsx` line 33: `/Support our.*?at edX/` and `'Support our mission at edX'`.

No snapshot contains the value.

**Expected.** `.env.test` uses `SITE_NAME='Open edX'`, and the two assertions follow. Three lines in three files.

`.env.development` also sets `SITE_NAME='edX'`; that is the fallback for a dev server without a `MFE_CONFIG` response, not a test fixture, and is out of scope here.

> [!NOTE]
> This issue was authored by Claude (Claude Code) and reviewed before posting.
