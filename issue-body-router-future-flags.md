**What:** react-router 6 prints its v7 future flag deprecation warnings for the shell's router, in the browser console of every frontend-base site in development and in the test output of every app that mounts a router. Deciding what to do about them belongs here, since the runtime router is the shell's.

**Where it comes from:** `shell/router/createRouter.tsx` calls `createBrowserRouter(routes, { basename })` with no `future` option. react-router 6.26 and later (`package.json` pins `^6.26.1`; apps install 6.30) warn once per router for each v7 flag that is not opted into:

```
⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early.
```

Seen on 2026-10-21 in the dev console of an app's `openedx dev` site (the first message), and in every test file that renders a `BrowserRouter` or `MemoryRouter` (both messages; 58 of frontend-app-learning's 124 suites on `master`). The 6.30 runtime knows eight such flags (`v7_startTransition`, `v7_relativeSplatPath`, `v7_partialHydration`, `v7_fetcherPersist`, `v7_normalizeFormMethod`, `v7_skipActionErrorRevalidation`, `v7_prependBasename`, `v7_throwAbortReason`); the two above are the ones that warn in these setups.

**Why it is not an app's fix:** an app never creates the runtime router, and react-router offers no way to silence a deprecation other than opting into the flag it announces. Each flag is a behavior change for every app in the site (`v7_startTransition` wraps router state updates in `React.startTransition`; `v7_relativeSplatPath` changes how relative paths resolve inside splat routes), so opting in is a shell decision with an app-by-app check behind it. Upgrade guide: https://reactrouter.com/v6/upgrading/future.

**Options**

1. Opt into the flags in `createRouter.tsx`, one at a time, after checking the converted apps against each. Apps' test routers then set the same flags so tests run under the runtime's semantics.
2. Move to react-router 7, where the flags are the defaults and the warnings do not exist. Renovate's v7 PR (#47) was auto-closed; the migration is larger than the flags.
3. Filter the two messages in the shell's development entry point until 1 or 2 happens.

> [!NOTE]
> This issue body was drafted by Claude (Claude Code) and reviewed before posting.
