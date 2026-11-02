# Plan for openedx/frontend-base#341

Written 2026-11-02 against `72d7053` on `main`, settled with Brian in a grilling session the same day. The ADR is written on Brian's word.

## What the ADR decides

An app is an npm package released by semantic-release on the branches OEP-10 ADR 0002 (Frontend Stable Branches) defines. "Breaking change for an app" means a change that obliges a `feat!:` / `BREAKING CHANGE:` commit. The classification is per commit and ignores the channel: on `2.0.0-alpha.*` the same commit yields the next alpha. The point of marking is the graduation of main onto `stable` (OEP-10 ADR 0002 section 4): the DEPR for a new major is written then, from the release notes that accumulated on main, so each footer says enough for the DEPR writer to know what to write.

ADR 0009 answers this for one slot's own contract, ADR 0016 preserved the shell's default widget ids without a general rule, and ADR 0012 is marked Moved to OEP-10 ADR 0002. Nothing lists the app-level surface. This ADR does.

### Protected consumers

Site configs (operators), widget authors, and packages that import the app. frontend-base's own shell is an app under the same rule.

### Slots

- ADR 0009 section 2 is the baseline for a slot's contract (props, page location, kind of content) and is not reopened.
- The roles a slot's layout recognizes (`widgetList.byRole`) are slot API alongside the props: dropping or renaming one is breaking, adding one is not.
- Adding a `v2` slot beside a still-working `v1` (wrapping or siblings, Brian's #340 comment) is not breaking. Removing a slot, or one version of it, is.
- Not slot API: React contexts mounted around the slot (an exported context changes under the exports rule, not the slot rule); markup, styles and layout around the slot.

### Widgets

- Every widget id the app registers, in any slot, is contract (#336: existence yes). Removing one, or renaming one without keeping the old id in `idAliases` (#334, merged in #335), is breaking.
- Default widget order is not contract (#336: order no). Relative operations place against the target's current position.
- The options a widget reads through `useWidgetOptions` are contract: adding one is free, removing or retyping one is breaking. No existing ADR covers this; ADR 0011 and ADR 0013 mention the hook only in passing.
- An alias has no fixed window. Dropping it is a removal of an id and its own `feat!:`.

### Exports

Anything a consumer can import from the package is surface, including the types slot props are built from (#339). Removing an export is breaking. Changing one so existing code no longer compiles or behaves the same is breaking; adding an optional field or a new export is not. A rename without the old name kept as a deprecated alias is breaking.

### App config keys

A config key an operator could have set is contract while the thing it configures still exists. Six cases, with real keys, as the ADR's examples:

| Change | Example | Breaking |
|---|---|---|
| Feature removed, key with it | learner-dashboard drops the unenroll survey and `SHOW_UNENROLL_SURVEY` | No: the feature's change, the key is incidental |
| Key renamed, meaning kept | `COURSE_ABOUT_TWITTER_ACCOUNT` to `COURSE_ABOUT_X_ACCOUNT` | Yes |
| Value's shape changes | `NON_BROWSABLE_COURSES` from comma-separated string to array | Yes |
| Opt-in flag removed, feature always on | `ENABLE_COURSE_DISCOVERY` goes, discovery unconditional | Yes: a chosen behaviour is taken away |
| Default value changes | catalog `defaultConfig.HOMEPAGE_COURSE_MAX` | No: behaviour change for the unconfigured case |
| Key moves to `commonAppConfig` | per-app value still wins in `getAppConfig`'s merge order | No |

### Routes and provides

- Route roles (`handle.roles`, targeted by an operation's `active` / `inactive` condition) are contract like widget ids: removing or renaming is breaking, adding is not.
- `provides` keys and the shape under each are contract, as ADR 0013 guideline 3 already says: remove, rename or incompatibly reshape is breaking, add is not.

### Peer dependency ranges

Narrowing a range so a major it accepts today falls out (`react: ^18` to `^19`) is breaking. Widening (`^18 || ^19`) and raising the floor within a major are not. frontend-base's precedent: paragon `^22` to `^23` as `feat!:` (6451c53), `^23.4.5` to `^23.20.0` as `feat:` (37e3901). Same rule for the `@openedx/frontend-base` peer range.

### Where it lands

- A new ADR in `docs/decisions/`, rst. Number free at write time: `0017` is taken by an unmerged commit (`97241feb`, `App.defaultConfig`) and `0018` by openedx/frontend-base#326. References ADR 0009, ADR 0011, ADR 0013, ADR 0016 and OEP-10 ADR 0002; none is edited, since none records a decision this one changes. Clarifications of 0009 (roles are slot API; the default-content exclusion governs the slot's version only) live in the new ADR's text.
- In the same PR: the TSDoc on the relative widget operations in `runtime/slots/widget/types.ts` gets the order rule, and the `idAliases` TSDoc's "at least one release" becomes "until a breaking change removes it".
- Procedures (rename path, deprecation marking) stay in #340.

### Gates (`adr-policy`)

1. Hard to reverse: every app's major-version history and graduation DEPR keys off it.
2. Surprising without context: ADR 0009 reads as a licence to change default content "at any time", and nothing says peer ranges, exports, options, roles or config keys are contract.
3. Trade-off weighed: existence versus order of default widgets (#336); narrow versus wide export surface (#339); which config-key changes count (the six cases).
4. Only frontend-base decides it (ecosystem rule). Checked against ADR 0009, 0011, 0013, 0016 and OEP-10 ADR 0002: none lists the app-level surface.

## Parked as cans of worms

Left out of the ADR on purpose, to be named in the ADR PR's body so they are part of the discussion:

- **Message ids.** Removing or adding one is not breaking on its own; renames have not been treated as breaking before. Not mentioned in the ADR at all, rather than declared out.
- **Route paths.** Whether changing a URL is an app-contract break (with a redirect exception) or a product and deployment concern. Route roles are in; paths are not decided.
- **Regular `dependencies`.** A non-peer major bump is the app's own business unless its types leak through an export, but Brian recalls these get tricky; not decided.
