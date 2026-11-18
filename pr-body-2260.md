## Summary

The rest of Learning's courseware data module now lives in the frontend-base package: `courseware/data/api.js` and `apiHooks.ts` in full, the three normalizers behind them, and the factories their tests build. **No user-facing change**: no route renders any of it until the courseware container ports two layers up (#2262), and the legacy tree under `src/` is untouched.

Part of #1905. Part of #2195. Stacked above #2252; the route wrappers (#2261) and the container with its redirects (#2262) follow.

> [!NOTE]
> **For reviewers:** the ported files are added or filled in under `frontend-base/src/`, so this diff cannot show what changed from `master`. The `port-diff` script in #2234's description prints that diff, from `frontend-base/manifest.tsv`. Three of the ported files are identical to `master`'s: `courseware/data/index.js`, `minimalCourseOutline.ts` and `minimalCourseOutline.test.ts`. Three more differ in one import line: `courseNavigationOutline.ts`, `sequenceMetadata.ts` and `learningSequencesOutline.factory.js`.

## What changed

- **`api.js` and `apiHooks.ts` port in full**, at the paths where their metadata slice already was. Platform imports become `@openedx/frontend-base` ones and the twelve `getConfig().LMS_BASE_URL` reads become `getSiteConfig().lmsBaseUrl`. Each of the eight queries spreads `queryDefaults`, as every ported query has since #2189; `sequenceMetadataQuery` keeps its own `retry: false` after the spread.
- **`useIsPreview` compares the pathname with the learning role's URL followed by `/preview`.** `master` tests `startsWith('/preview')` on a pathname its router has stripped of `/learning`; under the shell `learning` is a route, and the pathname starts with it.
- **`useMinimalCourseOutline` is the real query** in place of its stub, and `courseware/data/index.js` exports `getResumeBlock` and `getSequenceForUnitDeprecated` again, so the index is `master`'s.
- **The three normalizers**: `courseNavigationOutline.ts`, `minimalCourseOutline.ts` and `sequenceMetadata.ts`.
- **Factories.** `learningSequencesOutline`, `sequenceMetadata` and `buildSimpleCourseBlocks` come with the hook tests that build them. `buildSimpleCourseAndSequenceMetadata`, which only `master`'s course-request harness calls, is commented out under #2196's URL. The `courseRecommendations` and `discussionTopics` imports stay commented out, now under the issues whose suites build them (#2202, #2199).
- **The `sequenceMetadata` factory declares its course id as an option with no default**, which rosie requires a value for. `master` gives the option a default that returns its argument or throws; rosie passes that default no argument, so it only ever threw, behind a branch no input reaches (decision log entry 9).
- **The Pact consumer test is `dropped`** in the manifest, as the course-home one was in #2234: nothing publishes or verifies the contract it writes.
- **Manifest.** Eight lines for the files moved or dropped.

## Testing

In `frontend-base/`: lint, the tests, `build` and `build:ci` pass. 43 suites, 643 tests passed and 11 skipped (all skipped in earlier layers, under the issues that port what they render). Lint ran with the package's `.jsx` files included (openedx/frontend-base#327).

**`master`'s tests.** `minimalCourseOutline.test.ts` is `master`'s file. `master`'s `apiHooks.test.tsx` joins the cases #2249 wrote in the same file; its cases change in their imports, the mock logging service and the preview case's path, which is under `/learning/preview`.

**New cases, for what the port changes:** each query carries the query defaults, and `sequenceMetadataQuery` keeps its `retry: false`; `useIsPreview` on the preview path, the course path and `master`'s unprefixed `/preview/…` path, which is no longer a preview.

**New cases, for lines `master` runs only through suites that port later** (the container's and the course component's), since each layer's patch is covered by its own tests: the resume lookup; the parent-sequence lookup with its request parameters, for a unit no sequence holds, and with no signed-in user; a sequence with a saved position; a sidebar outline whose section and sequence have no children; a unit completed in a sequence that holds another; a sidebar toggles response without the flag; a loaded course whose outline has no sections; and the `sequenceMetadata` factory built without a course id.

**Coverage.** The package is at 100% of lines at this layer, against its 96.15% bar. Counted as codecov counts a patch, against #2252's head, the layer adds 238 lines with none missed and none partly covered.

**Manual testing.** None: no route renders this module yet. The two layers above carry the manual passes.

## Decisions

What was decided while building this layer; the scope and the import mapping are in #2195.

<details>
<summary>Full decision log</summary>

# Decisions: the courseware data module (#2260)

Decisions made while building this layer of #2195. The scope and the
import mapping are in #2195's plan and are not repeated.

1. **The bottom layer of three, one commit.** The rest of
   `courseware/data/` ports whole; the two route wrappers (#2261) and
   the container with its redirects (#2262) are the layers above.
   Nothing renders on a route in this layer.

2. **`api.js` and `apiHooks.ts` are `master`'s files with three kinds
   of change.** Platform imports become `@openedx/frontend-base` ones;
   `getConfig().LMS_BASE_URL` becomes `getSiteConfig().lmsBaseUrl`
   (twelve reads, all in `api.js`); each of the eight `queryOptions`
   calls spreads `queryDefaults` first, so `sequenceMetadataQuery`'s
   own `retry: false` still wins. The eleven non-null assertions
   `master`'s `apiHooks.ts` carries port as they are; the port adds
   none.

3. **`useIsPreview` compares against the learning role's URL.** It is
   `pathname.startsWith(`${getUrlByRouteRole(learningRole)}/preview`)`.
   `master`'s `startsWith('/preview')` reads a pathname its router has
   stripped of `/learning`; under the shell the pathname starts with
   it. Three cases pin it: the preview path, the course path, and
   `master`'s unprefixed `/preview/...` path, which is no longer a
   preview.

4. **The spread stays on each query.** Eight `...queryDefaults` in one
   file read as repetition, and a helper that wraps `queryOptions` and
   adds the defaults was weighed on review. Not taken: the queries
   ported before this layer carry the spread too (seven in
   `course-home/data/apiHooks.ts`, one in this file since #2249), so a
   helper would touch all fifteen definitions in both files to save a
   line in each, which is more machinery than the repetition costs.
   openedx/frontend-app-gradebook has such a wrapper, on the hook:
   `useGradebookQuery` spreads `gradebookQueryOptions` in
   [`src/data/query.ts`](https://github.com/openedx/frontend-app-gradebook/blob/b98b972a9785ab9c634c59d87d874c1057174915/src/data/query.ts).

5. **Tests.** `master`'s `apiHooks.test.tsx` is merged into the file
   #2249 created: that file's describe block stays first, and
   `master`'s eleven follow. Changed in `master`'s cases: the imports,
   the mock logging service read from `getLoggingService()`, and the
   preview case's path. Added for what the port changes:
   - each query carries the query defaults, and
     `sequenceMetadataQuery` keeps its `retry: false`;
   - `useIsPreview` on the three paths of entry 3.

6. **Lines `master` reaches only through later suites get cases
   here.** Each layer's patch is covered by tests in that layer (the
   coverage rule in #2195). Counted as codecov counts a patch, the
   port with only the cases of entry 5 left 14 lines missed and 5
   partly covered, all of them lines `master` runs through the
   container's suite or the course component's. Added to
   `apiHooks.test.tsx`:
   - `resumeBlockQuery`: the resume response in camel case;
   - `parentSequenceQuery`: the parent of a unit, with the request's
     four parameters; a unit no sequence holds; an empty `username`
     with no signed-in user (`getSequenceForUnitDeprecatedUrl`'s other
     branch, which an anonymous visitor to a public course takes);
   - a sequence with a saved position (`activeUnitIndex`);
   - a sidebar outline whose section and sequence have no `children`;
   - a unit completed in a sequence that holds another, so the
     sequence stays incomplete;
   - a sidebar toggles response without the flag, the `|| false`
     branch no `master` case takes;
   - a loaded course whose outline has no sections
     (`buildEmptyOutline`, which nothing on `master` calls).

7. **Factories.** `learningSequencesOutline`, `sequenceMetadata` and
   `buildSimpleCourseBlocks` are built by the hook tests and come here.
   `buildBinaryCourseBlocks` waits for the container suite (#2262). No
   suite of #2195 builds `courseRecommendations` or `discussionTopics`:
   `master` builds them in `CourseExit.test.jsx` and in the discussions
   widget's two tests, so their commented imports now name #2202 and
   #2199. The two factories lose `master`'s
   `eslint-disable-line import/no-extraneous-dependencies`, a rule the
   package's lint does not define.

8. **`buildSimpleCourseAndSequenceMetadata` is commented out under
   #2196's URL**, with its import, as `courseBlocks.factory.js` carried
   its two builders until #2195. Only `master`'s course-request
   harness (`mockCourseRequests` in `setupTest.js`) calls it, and the
   harness arrives with the first suite that uses it.

9. **The `sequenceMetadata` factory's course id is an option with no
   default.** `master` has `.option('courseId', (courseId) => { if
   (courseId) { return courseId; } throw … })`. rosie calls an
   option's generator only when the caller gave no value, and passes
   it the option's declared dependencies: its README, under
   [`instance.option`](https://github.com/rosiejs/rosie#instanceoption),
   says "This list of `dependencies` will match the parameters that
   are passed to the `generator_function`". This option declares
   none, so `courseId` is always undefined in the generator and the
   `if` never passes: one missed and one partly covered line that no
   input reaches.
   - A generator that only throws was the first replacement, and read
     as confusing on review.
   - rosie has the requirement built in: an option defined with no
     default must be given a value, or the build throws ``option
     `courseId` has no default value and none was provided``
     (`src/rosie.js`). The factory is `.option('courseId')`.
     `master`'s message goes; a case in `apiHooks.test.tsx` asserts
     rosie's.

10. **The Pact consumer test is `dropped`.**
    `courseware/data/pact-tests/lmsPact.test.jsx` gets a `dropped`
    manifest line, as the course-home one did in #2234: nothing
    publishes or verifies the contract it writes.

11. **The comment in `course-exit/utils.test.ts`** said the outline
    query was a stub until #2195. It now says nothing there fetches
    the metadata or the outline, which is why the cases supply both.

12. **Checks (2026-11-17).** `npm run lint` clean, with the package's
    `.jsx` files included (openedx/frontend-base#327); `npm test`, 43
    suites, 643 passed, 11 skipped (all from earlier layers); 100% of
    lines for the package. `npm run build` and `npm run build:ci`
    pass. Counted as codecov counts a patch, against #2252's head: 238
    added lines, none missed and none partly covered.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
