# Manual testing — scaffold the frontend-base package (#2187)

This layer claims **no user-visible change on `master`** and no Learning
route at all: the package registers an app with an empty route array. What
is verified by hand is the environment every later layer's record reuses.

## Environment

- Tutor dev: LMS at `http://local.openedx.io:8000`, Studio at
  `http://studio.local.openedx.io:8001`; hosts under `*.local.openedx.io`
  resolve to 127.0.0.1 through public DNS.
- The package's own site: `cd frontend-base && nvm use && npm ci && npm run dev`,
  served at `http://apps.local.openedx.io:2000/` by `openedx dev` with
  `PUBLIC_PATH=/learning`. Its `site.config.dev.tsx` registers `shellApp`,
  `headerApp`, `footerApp` and `learningApp`, with `lmsBaseUrl`, `cmsBaseUrl`,
  `loginUrl` and `logoutUrl` pointing at the Tutor hosts. This is the
  environment for every layer's manual pass; composing the package into a
  frontend-template-site checkout is the epic's close-out check.
- Port 2000 is also the port tutor dev's `mfe` service publishes for the
  legacy Learning MFE (its Caddy listens on 1984, 1993, 2000, 2001, 2002 and
  8080 on the host). With that service up, `openedx dev` cannot bind and a
  request to `:2000` is answered by the container, not by the package. Stop
  the `mfe` service (`tutor dev stop mfe`) before running the dev server.

## Verify by hand

- [x] **The dev server comes up and serves the site under `/learning`** —
      `npm run dev` from `frontend-base/`, the tutor `mfe` service stopped;
      `GET /learning/` (and any deeper path) answers 200 with the built
      document, the bundle script tags under `/learning/`, and a `#root`
      mount point. `GET /` answers 200 with the raw 261-byte
      `public/index.html` from the static directory, no scripts, so the
      browser shows a blank page there: `/` is outside `PUBLIC_PATH` and is
      not the site. The converted apps are the same (catalog and profile
      serve under `/catalog` and `/profile`, no `basename` in their site
      config, root route path equal to the public path).
- [x] **The browser shows the runtime's not-found page at every path**,
      with no header or footer: the shell's router puts its 404 error element
      on the same top-level route as the `Shell` component, so an unmatched
      URL renders `NotFoundPage` ("404", "The page you're looking for could
      not be found.") in place of the shell layout. With no Learning route
      and no app claiming the home role, every path under `/learning` is
      unmatched. The header and footer first appear with the route tree in
      #2188. Nothing in the console from the app: expected entries are
      React Router's "No routes matched location" warning (twice, once per
      render), its v7 future-flag warning, webpack-dev-server and HMR
      messages, and frontend-base's logging service recording the
      authenticated user's id (`userId <n>`), which shows the runtime read
      the user from the LMS cookies.
- [x] **Legacy workflow unaffected**: the PR's `validate` run is green with
      the package in the tree.
- [x] **The new workflow runs from the subdirectory**: the `frontend-base`
      run on the pushed stack executes lint, test (with the throwaway test
      listed), build, build:ci and i18n_extract from `frontend-base/`, and
      codecov shows the `frontend-base` flag with its files under
      `frontend-base/`.

## Left to the automated suite

- The exported app's id and empty routes and slots: `src/app.test.ts`.
- The page title from the message and site name: `src/Main.test.tsx`.
- The coverage bar: jest `coverageThreshold` (`lines: 96.15`), which the
  package meets at 100% with the three tests.

## Results

- **Dev server** — passed, 2026-10-21, Brian's `npm run dev` on the pushed
  layer (head `e0fba61a`), webpack holding `:2000`: `/learning`,
  `/learning/` and `/learning/x` each 200 with the 852-byte built document
  and the `/learning/...` bundle scripts; `/` 200 with the 261-byte static
  `public/index.html` and no scripts. A first attempt earlier that day at
  `f3b5015a` had hit the tutor `mfe` container on the same port (its page
  titled "My Open edX") while the `openedx dev` log had only printed the
  CLI banner; that result was discarded.
- **Browser** — passed, Brian, 2026-10-21: `/` blank, `/learning` and
  `/learning/` show the 404 page. Console: `No routes matched location
  "/learning/"` twice, the React Router v7 future-flag warning, webpack-dev-
  server and HMR start-up lines, a sockjs `unload` permissions-policy
  violation from the dev tooling, four `Permissions-Policy` "Unrecognized
  feature" notices that came from a browser extension (gone with it
  disabled; neither the dev server nor the LMS sends that header), the
  React DevTools hint, and `NewRelicLoggingService.js:50 userId 4`,
  frontend-base's logging service recording the authenticated user's id.
  No error from the app or the shell.
- **Legacy workflow** — passed, head `e0fba61a`: `tests` (validate.yml)
  green in 5m23s and its `coverage` job uploaded; `codecov/project` passed
  with the combined number at 96.16% against `master`'s 96.15%,
  `codecov/patch` passed; `commitlint` passed after commit 2's type was
  changed from `ci` to `build` (the org config has no `ci` type).
- **New workflow** — passed, same head: the `test` job (frontend-base.yml)
  green in 1m26s; jest ran `src/ci-smoke.test.ts`, `src/app.test.ts` and
  `src/Main.test.tsx`, 3 of 3, 100% lines; the codecov step ran with
  `working-directory: frontend-base` and uploaded `frontend-base/coverage/lcov.info`
  with `--flag frontend-base`. Codecov's flag totals for the commit: 6
  files, 9 lines, 9 hits, 100%; the repo now lists the `frontend-base`
  flag. **Not passed on paths**, found by Brian in the codecov file
  explorer the same day: the flag's six files are stored as `src/Main.tsx`,
  `src/app.ts`, `src/constants.ts`, `src/messages.ts`, `src/routes.tsx`
  and `src/slots.tsx`, without the `frontend-base/` prefix, and
  `src/constants.ts` merged into the legacy file of the same path (11 lines
  on the base, 12 on the head). Cause and fix in the decision log (entry
  6). Passed on the next push, head `7022a2db`: all eight checks green;
  the flag's six files are `frontend-base/src/Main.tsx`, `app.ts`,
  `constants.ts`, `messages.ts`, `routes.tsx` and `slots.tsx`, 9 lines, 9
  hits; legacy `src/constants.ts` back at 11 lines; combined 374 files and
  6020 lines at 96.16%; `codecov/patch` "100.00% of diff hit (target
  96.15%)"; Brian confirmed the `frontend-base/` tree in the codecov file
  explorer.
