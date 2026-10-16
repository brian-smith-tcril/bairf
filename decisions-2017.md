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
