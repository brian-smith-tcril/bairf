## Summary

Move the plugin override registry off Redux onto React context. `generic/plugin-store` let a plugin rendered in a slot register an override for a host-computed value (`registerOverrideMethod`), and the host folded the registered overrides over its default (`usePluginsCallback`); its one in-repo consumer is the unit content iframe URL. It was learning's own Redux and the only reason `store.ts` carried a middleware option. Nothing in it is server state, so it becomes a `PluginOverridesProvider` with the same contract — payload, fold order, overwrite, persistence — and only the transport changes. `store.ts` is now `models` + `specialExams`. Part of the Redux → React Query migration (#1946, Stage 1), stacked on #2081. Closes #2017.

## What changed

- **`generic/plugin-overrides/PluginOverridesContext.tsx` (new, replaces `generic/plugin-store/{slice,hooks,index}.js`).** `PluginOverridesProvider` holds `pluginName → methodName → method` in `useState`; `usePluginOverrides()` exposes `registerOverrideMethod` (same `{ pluginName, methodName, method }` payload as the old action creator, overwrite on re-register) and a new `unregisterOverrideMethod`; `usePluginsCallback(methodName, defaultMethod)` keeps its signature and fold (default first, then each registered override receives the previous result, in registration order). Both hooks throw outside the provider, like `useToast`. No `any`: the stored map is typed `(previousResult: never) => unknown`, which accepts any `OverrideMethod<T>` on registration without a cast and is uncallable until the host asserts its `T` in the fold — the single cast in the module, at the one place the host knows the type.
- **No implicit cleanup on unmount, by design.** `SequenceContent` renders `<Unit key={unitId}>`, so the slot widget remounts per unit; for a registrar gated behind an async fetch, cleanup would make the next unit's iframe load un-overridden and then reload. Today's behavior (the previous unit's override covers the first render) is preserved; plugins that want cleanup call `unregisterOverrideMethod` from their effect.
- **`src/index.jsx`** mounts `PluginOverridesProvider` around `Routes`, inside `ToastProvider`.
- **`src/store.ts`** drops the `pluginsReducer` and the entire `middleware` option (the serializable-check exemption existed for this slice alone).
- **`Unit/index.jsx`** changes only its import path.
- **`generic/plugin-overrides/README.md` (new):** the plugin-author contract (registering, fold semantics, the `getIFrameUrl` method the host folds today, adding a host method) and a before/after migration note from the Redux version.
- **Tests:** the module gets its first test file — default-only, composition order across two plugins, overwrite, skipping other method names, per-call default evaluation, `unregister` removing exactly one entry, persistence after the registrar unmounts, and the throw outside the provider. `setupTest.js`'s render wrapper provides `PluginOverridesProvider` and the module mock is deleted (it faked an empty registry because the test store never mounted the reducer), so `Unit/index.test.jsx`'s existing iframe-URL assertion now runs the real fold; it also gains a case where a sibling component registers a `getIFrameUrl` override and the iframe `src` reflects it.

## Breaking change

`registerOverrideMethod` is no longer a Redux action creator and cannot be `dispatch`ed; plugins import `usePluginOverrides` from `@src/generic/plugin-overrides` (was `@src/generic/plugin-store`) and call `registerOverrideMethod(payload)` from an effect. The `plugins` reducer is gone from the store. Same class as #2077. The one known external registrar (`@edx/unit-translation-selector-plugin`, see the baseline-example comment on #2017) also imports the model store's `useModel`, which #1977 will break — the two should ship as one plugin release.

## Testing

`npm run types` (0 errors), `npm run lint` (clean), full jest suite green at head (109 suites, 1112 passed / 3 pre-existing skips). Manual pass on tutor local with the baseline example plugin from the #2017 issue comment ported to the new API: all five by-hand checks passed; the store shape and override persistence rest on `store.ts` and the context tests respectively — see the details block below.

## Decisions

<details>
<summary>Full decision log</summary>

# Decisions — plugin override registry off Redux onto React context (#2017)

Entries 1–9 were settled in the plan (issue #2017 body, 2026-09-20) before
implementation; 10 onward landed with the code.

1. **Client state → React context, not React Query.** Nothing in the registry
   is fetched, cached or invalidated: plugins (descendants) contribute
   overrides and the host component (an ancestor) reads them. That is the
   context half of OEP-0067 ADR-0010. `PluginOverridesProvider` holds the
   registry in `useState` and is mounted once at the route root beside
   `ToastProvider`, the migration's established client-state pattern (state
   in the provider, use in the consumer).

2. **The generic contract is preserved; only the transport changes.** The
   `registerOverrideMethod({ pluginName, methodName, method })` payload, the
   fold (default first, then each registered override receives the previous
   result, in registration order), overwrite on re-register, and persistence
   after the registrar unmounts are unchanged. The registry is a public
   extension surface — operator `env.config.jsx` plugins are untracked and
   unsearchable — so replacing it with per-behavior typed hooks would break
   plugins we can't see. Functions in state were only awkward under Redux's
   serializability rule (the `store.ts` middleware exemption); context has no
   such rule, so keeping the generic shape costs nothing.

3. **Plugins register imperatively from their own effect.** Today's
   "action creator + dispatch inside the plugin's `useEffect`" becomes
   "setter from context + call inside the plugin's `useEffect`". The plugin
   keeps ownership of *when* it registers (its deps). An effect-owning
   convenience hook can be added later without breaking this; not in this PR.

4. **No implicit cleanup on unmount; additive `unregisterOverrideMethod`.**
   `SequenceContent` renders `<Unit key={unitId}>`, so `Unit` and the slot
   widget remount on every unit change. For a registrar gated behind an async
   fetch (the known external plugin renders nothing until its config fetch
   resolves), implicit cleanup would mean unit B's first render has no
   override → iframe loads un-overridden → fetch resolves → register → URL
   changes → iframe reloads. Today unit A's override covers B's first render
   and the iframe loads once. So the provider does not clean up on its own;
   it exposes `unregisterOverrideMethod({ pluginName, methodName })` for
   plugins that want cleanup from their effect.

5. **Names drop the Redux vocabulary; plugin-facing verbs stay.**
   `generic/plugin-store` → `generic/plugin-overrides` ("store" is the word
   being removed; the break is happening anyway so the import-path change
   rides in the same major). `PluginOverridesProvider` / `usePluginOverrides()`.
   `registerOverrideMethod` keeps its name — it describes what the plugin
   does, not the transport. Host-side `usePluginsCallback(methodName,
   defaultMethod)` keeps its name and signature; `Unit/index.jsx` changes only
   its import path.

6. **Throw outside the provider**, matching `useToast`. The provider is
   mounted at the root in the app and in `setupTest`'s `render` wrapper.

7. **`store.ts` loses its only middleware option along with the reducer.**
   The `serializableCheck` exemption existed for this slice alone; the store
   is now `configureStore({ reducer: { models, specialExams } })`.

8. **BREAKING (`refactor!:` + `BREAKING CHANGE:` footer), same class as
   #2077.** `registerOverrideMethod` can no longer be `dispatch`ed and the
   import path moves. A `generic/plugin-overrides/README.md` carries the
   plugin-author contract and the before/after migration note. The one known
   external registrar (`@edx/unit-translation-selector-plugin`) also imports
   the model store's `useModel`, which #1977 breaks — the two should ship as
   one plugin release.

9. **`never` in the stored map, one cast in the fold — no `any`.** The
   method-name set is open (decision 2) and each name's value type is the
   host's business, so the map can't name them. Two ways to say "unknown per
   key": `any` (instantly readable, two `no-explicit-any` disables, but
   unsound in both directions and silently — the fold would return `any` into
   the `T` accumulator with no visible assertion) or a parameter of `never`:
   `Record<string, Record<string, (previousResult: never) => unknown>>`. A
   function taking `string` is assignable to one taking `never`, so any
   `OverrideMethod<T>` registers without a cast (including from a typed
   plugin), and the stored method is uncallable until the host asserts its
   `T` — `(plugin[methodName] as OverrideMethod<T>)(result)` in
   `usePluginsCallback`. That forces the single trust point onto the page at
   the one place the host knows `T`, needs no lint disables, and doesn't
   propagate the way `any` does. Chosen over `any` for that visibility; the
   readability cost is paid once by the comment on the type. JS plugins
   (`env.config.jsx`, compiled npm packages) are unaffected: types are erased
   and `tsc` never includes root `.jsx` files.

10. **Tests run the real registry for the first time.** The module had no
    tests, and `setupTest.js` mocked `usePluginsCallback` because the test
    store never mounted the `plugins` reducer (the real hook would have thrown
    on `Object.values(undefined)`). The test `render` wrapper now provides
    `PluginOverridesProvider`, the module mock is deleted, and
    `Unit/index.test.jsx`'s existing iframe-URL assertion therefore exercises
    the real (empty) fold. New `PluginOverridesContext.test.tsx` pins:
    default-only, composition order across two plugins, overwrite, skip of
    other method names, per-call default evaluation, `unregister` removing
    exactly one entry, persistence after the registrar unmounts (decision 4),
    and the throw outside the provider. `Unit/index.test.jsx` gains a
    consumer-level case: a sibling component registers a `getIFrameUrl`
    override and the iframe `src` reflects it.

11. **Generic functions avoid shapes the autofixer breaks.** A generic arrow
    (`<T,>(…) =>`) in a `.tsx` file is autofixed by the repo's ESLint into
    `<T>(…)`, which the parser then reads as JSX and fails on; a named
    generic function expression inside `useCallback` gets rewritten to an
    arrow by `prefer-arrow-callback` and loses its `<T>` (and because Babel
    strips types, tests still pass — only `tsc` catches it, so run `lint:fix`
    *before* `types`). Hence `usePluginsCallback` is a `function`
    declaration, and `registerOverrideMethod` is typed through
    `useCallback<PluginOverridesContextValue['registerOverrideMethod']>(…)`,
    letting the arrow's parameter pick up `T` contextually.

</details>

## Manual testing

<details>
<summary>Checklist</summary>

# Manual testing — plugin override registry onto React context (#2017)

In-browser verification against a live backend (tutor local). This layer
claims **no user-visible change** for a learner: with no plugin registered the
unit iframe URL is exactly what `getIFrameUrl` builds, and with a plugin
registered the override applies the same way it did through Redux. The
observable changes are for plugin authors (the registration API) and in the
store (no `plugins` slice).

## Setup (DemoX on tutor local)

Course id: `course-v1:OpenedX+DemoX+DemoCourse`; any unit under
`/course/course-v1:OpenedX+DemoX+DemoCourse/...`.

- The baseline example plugin from the #2017 issue comment, ported to the new
  API, lives in the repo-root `env.config.jsx` (gitignored). It inserts a
  `DIRECT_PLUGIN` into `org.openedx.frontend.learning.unit_title.v1` that
  renders a Paragon Card with a switch; the switch registers a `getIFrameUrl`
  override that sets `show_title=1` (the `getIFrameUrl` default is `0`) or a
  pass-through.
- `nvm use && npm run dev`; the dev server picks up `env.config.jsx` at the
  repo root automatically (frontend-build resolves `env.config`).
- Inspect the iframe with the `#unit-iframe` element's `src` attribute in
  devtools; "the in-iframe title" means the unit title the LMS renders inside
  the xblock content when `show_title=1`.

## Verify by hand

- [x] **Example renders through the real provider** — open any unit: the
      "Plugin override example" card appears above the unit title, the
      default title and bookmark button still render (`keepDefault`), no
      console error from `usePluginOverrides`.
- [x] **Pass-through override leaves the default URL alone** — switch off:
      `#unit-iframe` `src` has `show_title=0`; no in-iframe title.
- [x] **Override applies** — switch on: `src` changes to `show_title=1` and
      the in-iframe title appears (the title now shows twice: MFE + LMS).
- [x] **Re-register overwrites** — switch off again: `src` back to
      `show_title=0`, in-iframe title gone. Toggle a few times; each flip
      takes effect (latest registration wins, no stacking).
- [x] **Courseware without the example** — remove/rename `env.config.jsx`,
      restart dev: a unit renders with the default title row and the iframe
      `src` has `show_title=0`; no errors (the provider is mounted with an
      empty registry).

## Left to the automated suite (not re-done by hand)

- The store no longer carrying a `plugins` slice — not a runtime observation:
  the reducer map *is* `src/store.ts` (`models` + `specialExams`), `tsc`
  checks `RootState` against every remaining reader, and `git grep
  'state\.plugins'` over `src` is empty.
- Fold semantics — `PluginOverridesContext.test.tsx`: default-only,
  composition order across two plugins, overwrite, skipping other method
  names, per-call default evaluation, `unregisterOverrideMethod` removing
  exactly one entry, persistence after the registrar unmounts, throw outside
  the provider.
- The override reaching the iframe `src` — `Unit/index.test.jsx`
  (`applies a registered override to the iframe src`); the existing
  `generates correct iframeUrl` case now runs the real (empty) fold instead
  of the deleted `setupTest` mock.
- Two plugins composing on a live page — not exercised by hand (one example
  plugin); rests on the composition-order unit test.
- Override persistence across the unit remount (decision 4) —
  `PluginOverridesContext.test.tsx` (`keeps an override after the component
  that registered it unmounts`). A by-hand version was tried and dropped: the
  example widget keeps its switch in `useState`, so on the `<Unit key={unitId}>`
  remount it comes back off and re-registers the pass-through, overwriting the
  persisted override — the same thing the Redux slice would do. That tests the
  example's state handling, not the registry. A plugin that re-registers the
  same transform after a remount (the translations plugin keeps its language
  in `localStorage`) gets the first-render coverage decision 4 describes.

## Results

Env: tutor local, DemoX, local branch `bsmith/plugin-overrides-context` @
`0c924bda` (no PR yet). Run 2026-09-20.

- **Example renders through the real provider** — passed.
- **Pass-through override leaves the default URL alone** — passed.
- **Override applies** — passed.
- **Re-register overwrites** — passed.
- **Courseware without the example** — passed (example config commented
  out, dev server restarted).
- **Override persists across the unit remount** — tried and dropped from the
  by-hand list: after navigating to the next unit the iframe `src` was back to
  `show_title=0`, because the example's switch state reset on the remount and
  it re-registered the pass-through. That is the example overwriting its own
  entry, which the Redux slice would also have done; registry persistence is
  covered by the unit test named above.
- **No `plugins` slice in the store** — not run by hand (static property of
  `store.ts`; see above).

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
