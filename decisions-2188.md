# Decisions — route tree with stub pages, roles and provides (#2188)

Decisions made while implementing. The route table, roles, `provides` and
the test approach are in #2188's plan and are not repeated.

1. **Route tests render the real array through a data router, and the
   jest environment supplies the Fetch globals from Node.** The first run
   of `routes.test.tsx` failed with `ReferenceError: Request is not
   defined`: react-router's data routers (`createMemoryRouter`, the test
   twin of the shell's `createBrowserRouter`) build a `Request` at
   initialization for any route with `lazy` or a loader, and jest's jsdom
   environment has no Fetch API. The facts behind the fix, as read on
   2026-10-22:
   - jest's maintainer on jestjs/jest#13834 ("Fetch API unavailable in
     jsdom test environment"): "`fetch` is only available in using the
     node environment atm. See jsdom/jsdom#1724." That jsdom issue,
     "Implement the Fetch API", is open (jsdom 30.1.3 is current); even
     the newest `jest-environment-jsdom` (30.5.2) has no `Request`. The
     package is on jest 29 with jsdom 20.
   - react-router's own suite, `packages/react-router/__tests__/setup.ts`
     on `main` (last changed 2026-05-28, react-router 8.5.0, under
     `jest-environment-jsdom`), assigns `globalThis.fetch`, `Request`,
     `Response` and `Headers` from `undici` when they are missing;
     remix-run/react-router#12171 dropped the library's `installGlobals`
     because "`fetch` is stable in Node 20", telling users to "write your
     own `installGlobals` in userland".
   - `whatwg-fetch` was rejected: remix-run/react-router#9722 shows it is
     the polyfill CRA used, that it "does not implement `.body`", and the
     maintainer declined to "support a non-spec-compliant `fetch`
     polyfill just for testing purposes". One openedx repository lists it
     (frontend-app-ora-grading, a legacy MFE) with no import found.
   - react-router's docs say nothing about the environment (the data-mode
     testing page is a pointer to the framework guide, which names no
     setup), and steer route-level tests toward end-to-end runs. The
     redirect layers (#2204, #2205) port as loaders returning `redirect()`,
     whose value is a `Response`, so the globals are needed for their unit
     tests regardless; Brian took that as the reason to set route testing
     up now.
   The mechanism is a custom jest environment, `jsdom-environment-with-node-fetch.mjs`,
   extending `jest-environment-jsdom` and forwarding Node's own `fetch`,
   `Headers`, `Request`, `Response`, `AbortController` and `AbortSignal`
   into the sandbox (the last two because the router passes an
   `AbortSignal` to the `Request`, and Node's `Request` rejects jsdom's:
   "Expected signal to be an instance of AbortSignal"). Node's classes
   rather than the `undici` package: a `setupFiles` script runs inside the
   sandbox and cannot reach Node's globals (jestjs/jest#2549), which is
   why react-router imports `undici`; an environment runs outside it and
   can hand over the classes Node already ships, the same implementation,
   with no dependency and the version pinned by `.nvmrc`. The pattern is
   `jest-fixed-jsdom`'s (mswjs), whose export-conditions change is not
   taken. The file is an ES module, `jsdom-environment-with-node-fetch.mjs`
   (class `JSDOMEnvironmentWithNodeFetch`, named for what it is rather
   than for the app), which jest 29 loads as a test environment (checked
   by running the suite), so it needs no `require` and therefore no
   exception in `eslint.config.js`,
   which stays the template's shape like every converted app's; a
   CommonJS version would have needed an override, since the base lint
   config exempts only `babel.config.js`, `jest.config.js` and
   `eslint.config.js` from the `require` rule. `jest.config.js` points
   `testEnvironment` at the file; the file's one comment says it can be
   removed if the jsdom issue is resolved (the rest of this entry is the
   rationale and stays here); `tsconfig.json` includes it beside the
   other config files, which is what lets the TypeScript project service
   parse it for lint.

2. **No unmatched-path test.** Rendering the array alone at a path no
   child matches reaches react-router's default error boundary, which
   logs to `console.error` and fails under the console hook; the shell's
   `errorElement` is what handles it at runtime. The not-found behavior is
   the shell's and is checked on the dev site.

3. **Four page roles, named with the glossary; route ids share the page
   key.** The plan listed six roles. Live and course exit lost theirs,
   by the rule #2188's plan states: a role is a promise that
   another app may resolve it to link there, live is reached only from
   the course bar (which navigates by the tab URLs `course_metadata`
   supplies, not by role) and course exit only from inside courseware.
   The four that stay, `courseOutline`, `courseDates`, `courseProgress`
   and `courseware`, each have a plausible outside consumer and are each a
   course-bar tab. The landing tab's role is `courseOutline` rather than
   the config review's `courseHome`: the repo glossary's "course home" is
   the whole tab-page side, the effort glossary's name for the page is
   "outline tab", and the shell's course-bar slug is `outline`; the
   collision with the navigation sidebar that the glossary guards against
   is not a risk inside a role id. The `course` prefix on dates and
   progress is disambiguation, not app naming (bare `dates` says nothing
   about what they are dates of), on the pattern of catalog's
   `courseAbout`; `courseware` is the platform's own word and stays one
   word like `gradebook`. Route ids are
   `org.openedx.frontend.route.learning.<page>` with the page key on the
   first path of a page, and the key matches the role's noun where a role
   exists (`outline`, `dates`, `progress`, `courseware`); the stub prints
   the same key, so the dev site and the tests name a page one way.
   A role declared on several paths resolves to the first one declared
   (frontend-base's `getUrlByRouteRole` walks the tree in order), so the
   base path is listed first for progress and courseware, and a
   `role resolution` block has one test per role naming the URL it
   resolves to and, for the two multi-path roles, what it must not be (a
   sequence, unit or preview path; another user's progress): the order is
   what every other app's link depends on, nothing else in the suite
   would notice a reorder, and one case per role reads as the table of
   link targets. The route tests
   assert declarations (`declaredRolesByChildPath`), not which roles are
   active at a URL; the runtime merges ancestors' roles, which is
   frontend-base's to test.

4. **Route objects written out, one named array per page.** A first cut
   built the sixteen child routes through a helper with conditional
   spreads; it hid what each route was. The file now has one
   `RoleRouteObject[]` per page (`outlineRoutes`, `coursewareRoutes`, ...)
   with every object explicit, spread into the root's children in table
   order. A port replaces its page's array with real routes, so the
   explicit shape is the one that lasts; the repetition across a page's
   paths is the honest shape of "one route object per path".

5. **Test helpers live in `src/tests/`, excluded from the build.** The
   helper that renders the route array under a memory router and the intl
   provider started in a new `src/testing/` directory. `master` keeps its
   helpers in `src/tests/` (`CourseQueryGate.tsx`, `MountCourseQueryHooks.tsx`,
   `SidebarState.tsx`), as do account and profile, and the ports bring
   those files along, so the helper moved there. The template's
   `tsconfig.build.json` excludes only test files, mocks and the setup
   file, which would have shipped the directory in `dist/` (instructor
   dashboard's `testUtils.tsx` is in its published build); account's
   `src/**/tests/**/*` exclusion is added and a build confirmed `dist/`
   has no `tests/`.
   Amended 2026-10-29: the directory is also excluded from coverage
   (`'src/tests'` in `coveragePathIgnorePatterns`), as the template
   excludes the setup file and the mocks. #2189 had added the exclusion
   when its query-client helpers arrived before any test used them
   (decisions-2189 entry 2); it belongs where the directory starts.

6. **Route tests are one `describe` per page.** The first cut was one
   `it.each` table of seventeen rows, hard to read and wrong the moment a
   page is real. Each page now has its own block and one test per path,
   through `renderAt(path)` and `expectStub(page, params)`, where the
   params a case names are the ones its path captures; `StubPage` prints
   one list item per param for that. A page's block changes with its port
   instead of being deleted, so the file keeps saying that every URL
   reaches its page through the real array. The test course id is
   `course-v1:OpenedX+DemoX+DemoCourse`, the current demo course.

7. **The course bar and masquerade roles come from course layout routes,
   not the root.** The manual pass found `GET /courses//masquerade` 404
   four times on the goal-unsubscribe page: the shell mounts
   `MasqueradeBar` wherever a role listed under the masquerade id is
   active, the root `learning` role was that role and is active on every
   Learning route, and `MasqueradeBar` hands `useParams().courseId`,
   `''` on a non-course page, to a query with no `enabled` guard (its
   sibling, the course bar's `course_metadata` query, has `enabled:
   !!courseId`). The bar renders nothing because the 404 reads as denied;
   the request and the console noise remain, refetched on each window
   focus. The deeper point, from Brian: a course-bar role declares "this
   route is a course page" (frontend-base ADR 0013's example and
   instructor dashboard's role both sit on a `:courseId` route), and
   `learning` on the root said that of three pages with no course. So
   the tree gained two layout routes, `course/:courseId` and
   `preview/course/:courseId`, each an `Outlet` carrying a new role,
   `org.openedx.frontend.role.learningCourse`, and `provides` lists that
   role under both ids. `learning` stays on the root meaning "inside the
   Learning app", unprovided; the page roles are unchanged; the three
   non-course pages sit directly under the root. `learningCourse`
   resolves to `/learning/course/:courseId`, which prefix-matches every
   tab URL for client-side navigation, and the masquerade bar now mounts
   only where a course exists. Two notes for frontend-base, not filed:
   the unguarded masquerade query, and that a role on an index route
   resolves with a trailing slash (`findRoleInRoutes` joins an empty
   segment), which is why `courseware` resolves to
   `/learning/course/:courseId/`; harmless for navigation.

8. **Route tests assert the page rules, in a commit of their own.**
   Moved down from #2189 on 2026-10-29 (decisions-2189 entry 24), once
   frontend-base was no longer vendored there: `runPageRules` and its
   `mainLandmark` rule come from openedx/frontend-base#329, first
   published in 2.0.0-alpha.17, which #2217's scaffold commit locks.
   Each stub renders one `<main>` inside `Main.tsx`'s `div`
   (decisions-2187 entry 9), so every path passes. `routes.test.tsx`
   asserts `expect(runPageRules(document)).toEqual([])` in a
   `describe('page rules')` of its own, one case per path, rather than
   inside each page's block, so the "renders at" titles keep claiming
   only the route match; a page's port moves its path out of that list
   and asserts the rules in its own route test. A second commit, Brian's
   call, so the first stays the route tree.
