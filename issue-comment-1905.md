## Shape idea: every tab is a frontend-base app

Writing this down mid-#1946 so it isn't lost. This is my braindump to Claude (Claude Code), verbatim, followed by its grounding of it against the current `frontend-base` `main` and `frontend-app-learning` `master`.

> i want to think high level about https://github.com/openedx/frontend-app-learning/issues/1905, i'm in the middle of the RQ conversion and i've had some thoughts i want to get written down on the issue (and also for you to give me some feedback on). the first idea i had was "every tab in the Learning MFE is a frontend-base app." then the actual `frontend-app-learning` app would be a "bundle app" that just loads the proper apps for each tab a course has. one snag that came to mind was because i wanted people to be able to import any given tab as an app in their sites, so someone could load just courseware or just course outline or just dates or just progress, and if we want that to work then all the data fetching hooks (the owners not the readers) would need to exist for each tab. that would lead to more duplication of requests than i'd like when the're all running together in the "bundled app" so i was thinking we have a way to tell each app "hey, i already have the hook providing this you're good you don't need to fetch it" but default the apps to fetching for themselves if they don't get something with it passed in. not sure how much sense this is making and it's kind of a wild braindump but if we can ground some of these thoughts and leave a comment on the issue that'd be cool.

> [!NOTE]
> The response below was written by Claude (Claude Code) and reviewed before posting. Every claim is linked to `frontend-base` `main` or `frontend-app-learning` `master`.

<details>
<summary>Claude's response</summary>

### 1. "One package, several apps" already exists; "an app with child apps" does not

`@openedx/frontend-base` itself exports three apps from one package (`shellApp`, `headerApp`, `footerApp` in [`shell/index.ts`](https://github.com/openedx/frontend-base/blob/main/shell/index.ts)), and [`frontend-template-site`'s `site.config.dev.tsx`](https://github.com/openedx/frontend-template-site/blob/main/site.config.dev.tsx) composes apps as a flat `apps: [...]` list. The [`App` type](https://github.com/openedx/frontend-base/blob/main/types.ts) has `routes`, `providers`, `slots`, `config`, `provides`, and no field for child apps. The runtime reads each of those per app: `getAppRoutes` ([`shell/router/getAppRoutes.ts`](https://github.com/openedx/frontend-base/blob/main/shell/router/getAppRoutes.ts)) concatenates `routes`, `CombinedAppProvider` concatenates `providers`, `getProvides` collects `provides`, and `addAppConfigs` stores `config` keyed by `appId` ([`runtime/config/index.ts`](https://github.com/openedx/frontend-base/blob/main/runtime/config/index.ts)).

So the "bundle" can take two shapes, and this is an open question:

- **A flat list.** `frontend-app-learning` exports one `App` per tab plus a `learningApps` array, and a site writes `apps: [...learningApps]`. Zero frontend-base changes. Each tab keeps its own `appId`, so operators can override one tab's `config` the way `frontend-template-site` overrides the instructor dashboard's today.
- **A parent app composed in the package.** `learningApp = { appId, routes: [...coursewareApp.routes, ...datesApp.routes, ...], slots: [...], providers: [...], provides: merged }`. Also zero frontend-base changes, because the four fields the runtime reads are all arrays or maps that concatenate cleanly. What it loses: `config` is keyed by `appId`, so per-tab operator overrides stop being addressable (there is only the parent's id). What it gains: the parent can put a shared layout route at `/course/:courseId` with the tab routes as children, and that layout element is a route-scoped place for a cross-tab owner that stays mounted across tab switches. React Router accepts absolute child paths as long as they start with the parent's path, which today's tab paths do except the `/preview/course/...` courseware routes.

A runtime-level `App.apps` that the shell flattens would give both, but that is a frontend-base change and should only be asked for once the shape is settled.

### 2. The header course bar already fetches `course_metadata` under its own key

The shell header's course bar ([`shell/header/course-bar/data/service.ts`](https://github.com/openedx/frontend-base/blob/main/shell/header/course-bar/data/service.ts)) calls `/api/course_home/course_metadata/` with `queryKey: ['org.openedx.frontend.app.header.courseMeta', courseId]`, normalizes it down to `{ tabs }`, and the masquerade widget `fetchQuery`s the same key after a toggle. Learning's `useCourseHomeMeta` fetches the same endpoint under `['learning', 'courseHome', 'metadata', courseId]` (`src/course-home/data/queryKeys.ts`). Same endpoint, two keys, two requests on every course page of a frontend-base site. This duplication exists before any tab split. It is the concrete instance of the snag, and it is between Learning and the header, not between Learning's tabs.

### 3. Frontend-base makes tab switching client-side for the first time

Today `CourseTabLink` renders an `<a href>`, so every tab click is a full page load and the cache is discarded. In frontend-base, `CourseTabsNavigation` renders a router `Link` for any tab whose role is declared by an installed app via `provides` (`isClientRoute` in [`shell/header/course-bar/utils.ts`](https://github.com/openedx/frontend-base/blob/main/shell/header/course-bar/utils.ts), ADR [0013](https://github.com/openedx/frontend-base/blob/main/docs/decisions/0013-app-provides-for-inter-app-configuration.rst)). Two consequences:

- Tabs-as-apps maps onto this directly. Each tab app declares its own route role under the course-bar `provides` id. The header then client-navigates to installed tabs and hard-links to tabs hosted elsewhere. That is the standalone-tab story without extra work. Which tabs a course *has* is already the header's job: apps register at build time, the course bar renders the tabs `course_metadata` reports.
- Cross-tab request reuse becomes possible for the first time. Today every tab page owns `useCourseHomeMeta(courseId)` (nine owner sites on `master`) and that costs nothing extra because each tab is a fresh page load. Once tab switching is a route change, a new owner mounting against a stale entry refetches on mount. So the question of who owns `course_metadata` across tabs is not created by the split, it is created by the port.

### 4. What the cache already does, and what it doesn't

All apps share one `QueryClient` ([`shell/site.tsx`](https://github.com/openedx/frontend-base/blob/main/shell/site.tsx)), and `CombinedAppProvider` hoists every app's `providers` under it. TanStack's stated behaviour ([Important Defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)):

> Query instances via `useQuery` or `useInfiniteQuery` by default **consider cached data as stale**.
> Stale queries are refetched automatically in the background when: New instances of the query mount [...]

and ([Overview](https://tanstack.com/query/latest/docs/framework/react/overview)): "Deduping multiple requests for the same data into a single request".

So with a **shared key**: observers that mount in the same render dedupe to one request; an observer that mounts later against a stale entry refetches. With **different keys** (today's header vs Learning), nothing is shared at all. "Fetch for yourself by default, skip if someone already has it" is therefore what `useQuery` on a shared key already does at the moment of the first render. The gap is only the later-mount refetch, and that is a `staleTime` decision on the shared query, not a signalling protocol.

Learning has deliberately not used `staleTime` on the tab payloads (readers pass `{ enabled: false }` instead, see the #1975/#2083 discussion): the outline and dates payloads change server-side and several writers are fire-and-forget, so refetch-on-mount is load-bearing there. `course_metadata` is a different payload and the header already treats it as reusable across a masquerade toggle (explicit `fetchQuery` after `invalidateQueries`). Whether it gets a `staleTime` is a per-payload call.

### 5. Where a "you don't need to fetch" signal would and wouldn't fit

- `App.providers` is the wrong home for an owner. Hoisted providers are site-global, so a provider that fetched `course_metadata` would run on every page including non-course ones. ADR 0013 rejects hoisted providers for the course bar for exactly this reason.
- `App.provides` is static registration data (roles, URL patterns). ADR 0013's guideline 4: not a channel for runtime behaviour. Not a fit for "I own this query".
- What does fit is what Learning already does inside a tab: the owner is the component at the top of the route, readers below it read `{ enabled: false }`. Under tabs-as-apps that owner is the tab page when the tab runs alone. When bundled, it can stay the tab page (shared key, `staleTime` on the payload), or, under the parent-app shape from section 1, move to the shared layout route with the tab pages reading through context. Both are the established direct-hooks-plus-context pattern; neither needs a new mechanism.

### What this suggests deciding before the port

1. **Whose query definition is `course_metadata`?** Header and Learning need one `queryKey` + `queryFn` + normalization, or the duplication stays. Learning cannot be the source (the header would depend on Learning). Candidates: the frontend-base runtime, since the header already fetches it, or a small shared module. This is the one item that is a frontend-base conversation.
2. **Flat list or parent app** (section 1). Decides whether per-tab operator config survives and whether there is a route-scoped home for a cross-tab owner.
3. **Shared query keys must not be namespaced by a tab.** Today's prefix is the single `appId` (`'learning'`). Under one-app-per-tab the shared payloads need a shared namespace, decided while #1946 is still shaping the keys.
4. **Tab-specific payloads stay tab-owned, with one cleanup.** Dates, progress and courseware metadata have readers only under their own page (checked on `master`). The outline payload has two off-tab readers in the shared frame: `LoadedTabPage` calls the logistration and enrollment alert hooks on every course-home tab, and its own comment says they are "only really used for the outline tab". Off the outline tab they read `undefined` today. Under one-app-per-tab they belong inside the outline app, so nothing shared reads a tab's payload.

</details>
