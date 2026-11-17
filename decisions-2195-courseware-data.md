# Decisions: the courseware data module (layer 1 of #2195)

Decisions made while building this layer. The scope and the import
mapping are in #2195's plan and are not repeated. Renamed to
`decisions-<pr>.md` once the PR has a number.

1. **The bottom layer of three, one commit.** The rest of
   `courseware/data/` ports whole; the two route wrappers and the
   container with its redirects are the layers above. Nothing renders
   on a route in this layer.

2. **`api.js` and `apiHooks.ts` are `master`'s files with three kinds
   of change.** Platform imports become `@openedx/frontend-base` ones;
   `getConfig().LMS_BASE_URL` becomes `getSiteConfig().lmsBaseUrl`
   (twelve reads); each of the eight `queryOptions` calls spreads
   `queryDefaults` first, so `sequenceMetadataQuery`'s own
   `retry: false` still wins. The ten non-null assertions `master`'s
   `apiHooks.ts` carries port as they are; the port adds none.

3. **`useIsPreview` compares against the learning role's URL.** It is
   `pathname.startsWith(`${getUrlByRouteRole(learningRole)}/preview`)`.
   `master`'s `startsWith('/preview')` reads a pathname its router has
   stripped of `/learning`; under the shell the pathname starts with
   it. Three cases pin it: the preview path, the course path, and
   `master`'s unprefixed `/preview/...` path, which is no longer a
   preview.

4. **Tests.** `master`'s `apiHooks.test.tsx` is merged into the file
   the entrance-exam fix created: that file's describe block stays
   first, and `master`'s eleven follow. Changed in `master`'s cases:
   the imports, the mock logging service read from
   `getLoggingService()`, and the preview case's path. Added:
   - each query carries the query defaults, and
     `sequenceMetadataQuery` keeps its `retry: false`;
   - `resumeBlockQuery` and `parentSequenceQuery`, which `master` runs
     only through the container's suite: the resume response in camel
     case; the parent of a unit, with the request's four parameters; a
     unit no sequence holds; an empty `username` with no signed-in
     user (`getSequenceForUnitDeprecatedUrl`'s other branch, which an
     anonymous visitor to a public course takes);
   - a sidebar toggles response without the flag, the `|| false`
     branch no `master` case takes.

5. **Factories.** `learningSequencesOutline`, `sequenceMetadata` and
   `buildSimpleCourseBlocks` are built by the hook tests and come here.
   `buildBinaryCourseBlocks` waits for the container suite. No suite
   of this issue builds `courseRecommendations` or `discussionTopics`:
   `master` builds them in `CourseExit.test.jsx` and in the discussions
   widget's two tests, so their commented imports now name #2202 and
   #2199. The two factories lose `master`'s
   `eslint-disable-line import/no-extraneous-dependencies`, a rule the
   package's lint does not define.

6. **The Pact consumer test is `dropped`.**
   `courseware/data/pact-tests/lmsPact.test.jsx` gets a `dropped`
   manifest line, as the course-home one did in #2234: nothing
   publishes or verifies the contract it writes.

7. **The comment in `course-exit/utils.test.ts`** said the outline
   query was a stub until this issue. It now says nothing there fetches
   the metadata or the outline, which is why the cases supply both.

8. **Lines `master` reaches only through later suites get cases
   here.** The first count of the patch left out the layer's new files
   (the script diffs tracked files, and they were not yet added);
   counted again from the commit, the layer had 14 missed and 5 partial
   lines. Added to `apiHooks.test.tsx`: a sequence with a saved
   position (`activeUnitIndex`); a sidebar outline whose section and
   sequence have no `children`; a unit completed in a sequence that
   holds another, so the sequence stays incomplete; a loaded course
   whose outline has no sections (`buildEmptyOutline`, which nothing on
   `master` calls); the factory's own guard for a missing course id.

9. **`buildSimpleCourseAndSequenceMetadata` is commented out under
   #2196's URL**, with its import, as `courseBlocks.factory.js` carried
   its two builders until this issue. Only `master`'s course-request
   harness (`mockCourseRequests` in `setupTest.js`) calls it, and the
   harness arrives with the first suite that uses it.

10. **The `sequenceMetadata` factory's course id is an option with no
    default (settled with Brian 2026-11-17, in two steps).** `master`
    has `.option('courseId', (courseId) => { if (courseId) { return
    courseId; } throw … })`. rosie calls an option's default only when
    the caller gave no value, with the option's dependencies as
    arguments (`_optionValue`, `_buildWithDependencies`; the README's
    `instance.option` section: "This list of `dependencies` will match
    the parameters that are passed to the `generator_function`"). This
    option declares none, so `courseId` is always undefined there and
    the `if` never passes: one missed and one partial line that no
    input reaches.
    - First the `if` went and the default was `() => { throw … }`
      ("dropping the dead if seems fine"). Reviewing the diff, Brian
      found a default that only throws confusing.
    - rosie has the requirement built in: an option defined with no
      default must be given a value, or the build throws ``option
      `courseId` has no default value and none was provided``. The
      factory is now `.option('courseId')` ("bare is fine and reads
      the cleanest"). `master`'s message goes; the case in
      `apiHooks.test.tsx` asserts rosie's.

11. **Checks at this layer (2026-11-17).** Lint clean with the local
    `.jsx` block in place; 43 suites, 643 passed, 11 skipped; 100% of
    lines; `build` and `build:ci` pass. The patch counted as codecov
    counts it: 238 lines, none missed, none partial. Local commit
    `35bdb046` on `bsmith/courseware-data`, not pushed.
