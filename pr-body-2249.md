## Summary

The progress tab's certificate card no longer reads the learner's entrance exam status. `master`'s card reads it from the courseware metadata query without fetching, and nothing on the progress tab fetches that query, so on `master` the card never has it (#2243). Under the shell a tab switch keeps the query cache, so once the courseware pages are ported the card would start hiding for a learner whose `entrance_exam_passed` is `false`. That field is also `false` for a learner allowed to skip the exam and for enrolled course staff, so the card stops reading it. **No change a learner can see:** the card shows what it shows on `master`. The legacy tree under `src/` is untouched.

Part of #1905. Resolves #2190. Stacked above #2247.

> [!NOTE]
> **For reviewers:** this PR's first version did the opposite. It fetched the courseware metadata on the progress tab and hid the card from a learner who had not passed the exam. [Review](https://github.com/openedx/frontend-app-learning/pull/2249#discussion_r4566252439) reversed it (decision log entry 1).

## What changed

- **`CertificateStatus` calls `getCourseExitMode` without `entranceExamPassed`.** Its `useCoursewareMetadata` read and its `entranceExamPassed` line are removed, and the argument stays in the call as a commented-out line under #2243's URL. The parameter defaults to `null`, and the function's one test of it is `=== false`.
- **`ProgressTab.jsx` is as #2247 left it.** The progress tab requests no courseware metadata, on a learner's own page or on `progress/:targetUserId` (#2244).
- **The courseware metadata slice of `courseware/data/` ports here.** `coursewareMeta.ts` whole, `getCourseMetadata` in `api.js`, `coursewareMetadataQuery` and `useCoursewareMetadata` in `apiHooks.ts` in place of the stub from #2246, and the `courseMetadata` factory. Nothing fetches the query in this layer outside the tests. #2195 adds the rest of each file at the same path; `useMinimalCourseOutline` stays a stub until then.
- **Tests.** `ProgressTab.test.jsx` gains two "Entrance exam status" assertions, each on a learner's own page and on `progress/10`: no courseware metadata request, and the card showing with a failed entrance exam in the query cache. `ProgressTabComponents.test.tsx` loses the case that gave the card a failed exam, and its mock of the courseware hooks. `courseware/data/apiHooks.test.tsx` is new, with cases for the hook. One comment in the lower layers' tests, false once the query is real, is corrected.

## Known differences from `master`

- **None a learner can see.**
- **The card does not read the courseware metadata from the query cache.** On `master` that read is always empty, since every way into the progress tab is a page load. Here a tab switch keeps the cache, and the read would hide the card on that path alone once a courseware page fills it.

## Testing

At the layer's commit, in `frontend-base/`: lint, the tests, `build` and `build:ci` pass. Lint ran with the package's `.jsx` files included (openedx/frontend-base#327).

- 36 suites, 410 tests passed and 7 skipped (the six kept as `it.skip` under #2194, and the streak-celebration case under #2201).
- Run against #2247's `CertificateStatus.jsx`, which has `master`'s read, the two query-cache cases fail and the two request cases pass.

**Coverage.** The package is at 100% of lines, against its 96.15% bar. Counted from the local coverage report the way Codecov counts a patch, this layer adds 17 lines with none missed or partly covered. One line outside the patch becomes partly covered: `CertificateStatus.jsx` line 101, `master`'s last `else if` (decision log entry 6).

**Manual testing.** None for this version: nothing a learner can see changes, and the suite asserts both things the layer does (decision log entry 11).

## Decisions

What was decided while building this layer; the scope is in #2190, the card's status in #2243 and the staff view in #2244.

<details>
<summary>Full decision log</summary>

# Decisions: the entrance exam status on the progress tab (#2249)

Decisions made while building this layer of #2190. The scope is in #2190's plan, the
status on a learner's own page is #2243 and the staff view is #2244. The tab itself is
ported in #2247, the layer below.

The layer's first version, pushed 2026-11-12, made the certificate card apply the
status. Review reversed that (entry 1). The entries describe the layer as it is now and
say where the first version differed.

1. **The certificate card does not apply the entrance exam status.** `CertificateStatus`
   calls `getCourseExitMode` without `entranceExamPassed`. The parameter defaults to
   `null` and the function's one test of it is `=== false`, so the card renders as it
   would for a course with no entrance exam, which is what every learner sees on
   `master`.
   - This reverses the first version, in which `ProgressTab` fetched the courseware
     metadata on a learner's own page and waited for it, and the card rendered nothing
     for a learner whose `entrance_exam_passed` was `false`. The reason is arbrandes's
     review comment of 2026-11-13
     (https://github.com/openedx/frontend-app-learning/pull/2249#discussion_r4566252439);
     Brian agreed on 2026-11-18.
   - `entrance_exam_passed` is `false` for more learners than the exam holds back.
     [`user_has_passed_entrance_exam`](https://github.com/openedx/edx-platform/blob/d3a86602dcf70bbf4f7925727bcc50ff10e51109/lms/djangoapps/courseware/entrance_exams.py#L47-L56)
     returns whether the exam's milestone is still outstanding. The exemptions are in
     `user_can_skip_entrance_exam`, in the same file: course staff, and a learner an
     instructor allowed to skip the exam (`EntranceExamConfiguration`). The field does
     not consult it. This is read from edx-platform at that commit, not observed on a
     course with an entrance exam.
   - Those learners can take the whole course. Under the first version they would never
     see the cards for requesting a certificate, verifying their identity or upgrading.
   - The frontend cannot tell the two apart. `entrance_exam_data` in
     `GET /api/courseware/course/` has five fields (current score, enabled, id, minimum
     score, passed) and none says the learner may skip.
   - The two errors are not equal. A learner the exam does hold back sees a card that
     is true of them (not passing, or upgrade), as on `master`. Hiding takes the card
     from a learner entitled to it.

2. **What a learner sees: what `master` shows.** The layer changes nothing a learner
   can see.
   - The first version read #1429 as meaning the card to hide. That came from #1429's
     code alone: it added the read, the `entranceExamPassed` line and the extra
     argument to the card. #1429 and the issue it closed, #1415, are about the unit
     navigation's Next button; neither mentions the progress tab, and no test covered
     the card's branch.
   - The read never worked: #1429 wrote it as `useModel('coursewareMeta', courseId)` on
     a page that never loaded that model, and #2140 converted it to the query read with
     the same result.

3. **The card reads nothing from the query cache.** `master`'s line, the
   `enabled: false` read of the courseware metadata, is removed with its import and the
   `entranceExamPassed` line. It is not kept.
   - On `master` the read is always empty: nothing on the progress tab fetches that
     query and every way into the tab is a page load (#2243).
   - Under the shell a tab switch keeps the query cache. Once the courseware pages are
     ported (#2195), `CoursewareContainer` fills that query, so a learner switching
     from a courseware page to Progress would reach the card with the status cached,
     and a page load would not. Keeping `master`'s line would bring back, on that path
     only, the hiding entry 1 rejects.
   - The same holds on `progress/:targetUserId`, where the cache could hold the
     requester's own status (#2244). The first version's two `targetUserId` conditions
     are gone: no page reads the status, so none needs an exception.

4. **The argument stays in the call as a commented-out line with #2243's URL:**
   `// entranceExamPassed, // https://github.com/openedx/frontend-app-learning/issues/2243`,
   the form `courseware/data/__factories__/index.js` uses for its unported imports.
   - It shows where the argument belongs and that it is withheld on purpose. The reason
     is #2243's to state.
   - An explicit `null` with a comment was drafted and dropped: `null` is the
     parameter's default, so writing it reads as a chosen value, and four wordings of
     the comment failed to explain a choice that was not one.
   - Only the argument is commented out. The read is deleted: #2244's backend change
     puts the status in the progress response, so a commented-out read of the
     courseware metadata would point at the wrong source.

5. **`ProgressTab.jsx` is the layer below's file again.** It runs no courseware
   metadata query and waits for none. None of the first version's costs remain: no
   extra request on the page, no error view when that request fails, no user activity
   recorded for the requester.

6. **The card's last `else if` stays as `master` wrote it.**
   `else if (mode === COURSE_EXIT_MODES.celebration || certIsDownloadable)` had one way
   to its false side: `entranceExamFail` mode without a downloadable certificate. The
   card can no longer be in that mode, so the line is partly covered. It is not in the
   patch. Turning it into a plain `else` would change `master`'s logic; Brian left it.
   `getCourseExitMode` keeps the mode, which the unit navigation uses.

7. **The courseware metadata slice of `courseware/data/` stays in this layer.** It
   was ported for the first version's fetch, and the rest of the module ports with
   #2195. Moving it up to #2260 was the other candidate. It stays because it was
   reviewed here, #2260 adds the rest of each file at the same path with no change,
   and the cache case of entry 8 needs the real query key. In this layer nothing
   fetches the query outside the tests.
   - `coursewareMeta.ts` ports whole. `api.js` holds `getCourseMetadata` only, and
     `apiHooks.ts` holds `coursewareMetadataQuery` and `useCoursewareMetadata`. Each file
     has one manifest line; #2195 adds the rest of each file at the same path.
   - `useMinimalCourseOutline` stays the stub #2246 added, under #2195's URL.
   - The `courseMetadata` factory ports, with a `__factories__/index.js` whose other
     four imports are commented out under #2195's URL.
   - `useCoursewareMetadata` builds its options with `coursewareMetadataQuery(courseId!)`
     and is disabled without a course id, as the hooks in `course-home/data/apiHooks.ts`
     do.

8. **Tests.**
   - `ProgressTab.test.jsx`, "Entrance exam status": two assertions, each run on a
     learner's own page and on `progress/10`. The tab makes no request to
     `/api/courseware/course/`. With a failed entrance exam seeded in the query cache
     before the card mounts, the certificate card renders. The suite's `beforeEach` no
     longer answers the courseware request.
   - The cache cases hold entry 3. Run against the layer below's `CertificateStatus.jsx`,
     which has `master`'s read, both fail and the two request cases pass (2026-11-18).
   - `ProgressTabComponents.test.tsx` loses the case that gave the card a mocked
     `entranceExamPassed: false`, and with it the mock of
     `@src/courseware/data/apiHooks`, its import, its `beforeEach` and its comment:
     nothing the file renders reads that module now.
   - `courseware/data/apiHooks.test.tsx` is new: the query carries the query defaults,
     the hook fetches once, and it requests nothing when disabled or without a course
     id. `master` has a file at this path with cases for eleven other hooks and queries
     and none of its own for `useCoursewareMetadata`, which only does the fetching in
     its `useSequenceIds` and `useIsCourseLoaded` cases; #2195 ports those into this
     file.
   - `getCourseMetadata` and the normalizer get no cases of their own. The hook's fetch
     case runs both, and in this layer it is the only thing that does.
   - One comment in the lower layers' tests became false with the real query and stays
     corrected: `course-exit/utils.test.ts` said both courseware queries are stubs.
   - At the layer's commit (2026-11-18): `npm run lint` passes with the package's
     `.jsx` files included (openedx/frontend-base#327), and `build` and `build:ci`
     pass. The full run is entry 10.

9. **One commit.** The reversal is amended into the layer's commit, whose message is
   rewritten since the first one described the fetch. The five layers above are
   rebased onto it with their commits unchanged.

10. **Coverage at this layer (2026-11-18).** The full run: 36 suites,
    410 tests passed and 7 skipped. 100% of lines for the package. Counted from the
    local coverage report the way Codecov counts a patch, against the layer below, the
    layer adds 17 lines with none missed or partly covered. The partly covered line of
    entry 6, `CertificateStatus.jsx` line 101, is `master`'s and outside the patch. The
    `useMinimalCourseOutline` stub's function is not called (#2195).

11. **No manual pass for this version.** The layer changes nothing a learner can see,
    and the suite asserts the two things it does: no courseware metadata request, and
    the card unmoved by what the query cache holds. The first version's pass
    (2026-11-12) looked at the real request and at the card going away with the
    response faked; both were of code this version removes.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
