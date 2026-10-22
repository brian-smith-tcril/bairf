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
   key.** The plan listed six roles. Live and course exit lost theirs
   (effort decision 31, amended 2026-10-22): a role is a promise that
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
