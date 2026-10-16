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
