# Decisions — port the dates tab (#2189)

Decisions made while implementing. The scope, the import and config
mapping, the root providers and the test conventions are in #2189's plan
and are not repeated.

1. **The mock user is `MockUser` with a numeric id.** `master`'s test user
   is `{ userId: 'abc123', username: 'MockUser', roles: [], administrator: false }`;
   frontend-base's `User` type requires `userId: number`, `name` and
   `email`. The package's user keeps the username, since later ports'
   tests build URLs from it (product tours, courseware), and takes
   `userId: 123`, a name and an email to satisfy the type. It lives in
   `src/tests/authenticatedUser.ts`, imported by the setup file, so a test
   that needs the identity imports it from there rather than from the
   setup file as on `master`.

2. **Test helpers under `src/tests/` are excluded from coverage.** With
   `collectCoverageFrom: ['src/**/*']`, the query-client helpers counted
   as uncovered product lines before any page used them and tripped the
   96.15 threshold. They are test infrastructure like the setup file and
   the mocks, which the template already excludes, so `src/tests` joins
   `coveragePathIgnorePatterns`; the build already excludes the directory.

3. **Caret ranges for the two test dependencies.** `master` pins
   `axios-mock-adapter` to exactly `2.1.0`; the package takes npm's
   default `^2.1.0` (and `^13.2.0` for Pact), the caret convention the
   template and OEP-67 use. The exact pin dates from the dependency's
   arrival with the 2020 data integration tests (`eac9bf9c`) and was only
   ever moved by renovate (`19b8df35`, 2024-11-20), which keeps whatever
   range style it finds; no commit names a reason for it.

4. **The Pact consumer test is dropped, with its contract.** `master`'s
   `src/course-home/data/pact-tests/lmsPact.test.jsx` runs in the suite
   and was maintained (last touched by #2099), but what it produces is
   unconsumed: the contract it writes, `src/pacts/frontend-app-learning-lms.json`,
   is in merge mode and still carries interactions for courseware
   endpoints whose tests were deleted years ago and an old
   `/api/course_home/v1/course_metadata` path; nothing publishes or
   verifies it (openedx-platform's one Pact verifier,
   `lms/djangoapps/courseware/tests/pacts/verify_pact.py`, loads its own
   xblock-handler contract; `master` has no broker, stub script or CI
   step). The two functions it exercised are covered by `api.test.js`.
   The test, `src/pacts/constants.js` and the contract file get `dropped`
   manifest lines and `@pact-foundation/pact` is not added; a later layer
   can bring them back from `master`'s history if a provider-side
   verifier appears. The epic's "Pact is a per-port check" stands, with
   the check answered here.
