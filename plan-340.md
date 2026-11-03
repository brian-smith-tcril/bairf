# Plan for openedx/frontend-base#340

Written 2026-11-02 against `72d7053` on `main`, from the issue body, Brian's two comments on it, the #339 answer ("Yes. They should export."), and the ADR 0018 draft in openedx/frontend-base#343. Not yet settled with Brian; open questions at the end.

## What the how-to is for

An app maintainer has a slot and wants to change its props: add one, rename one, remove one, change one's type, or rename the type it is built from. The how-to classifies the change, names the path, and walks the path step by step, ending with what the plugin author sees. It turns ADR 0009 sections 2 and 3 into a procedure; it decides nothing ADR 0009 or ADR 0018 does not.

## How slot props reach a plugin today

Stated in the how-to's first section, because every classification rests on it:

- `Slot` spreads every prop except `id`, `idAliases`, `children` and `layout` into `SlotContext` (`runtime/slots/Slot.tsx`). `useWidgets()` strips `id` and `children` and hands the rest to `createWidgets` as `componentProps` (`runtime/slots/widget/hooks.ts`); `createIdentifiedWidget` renders a `component` widget as `<operation.component {...componentProps} />` (`runtime/slots/widget/utils.tsx`). So a widget declared with `component` receives the slot's props as its React props, under the slot's names. An `element` widget and an iframe widget receive nothing. A replacement layout reads them through `useSlotContext()`.
- A site config types its widget against the app's exported `*SlotProps` interface (the catalog READMEs' "using the slot's props" example: `({ searchString, courseDataResultsLength }: CourseCatalogIntroSlotProps)`).

So a prop is seen by a plugin in two places: at runtime by name, and at compile time through the exported interface. A change that alters either for an existing widget is the break ADR 0009 section 2 describes.

## 1. Classifying the change

One table, each row grounded in the mechanism above:

| Change | What an existing widget sees | Path |
|---|---|---|
| Add an optional prop | nothing; extra props are ignored | same version |
| Add a required prop | nothing for widgets (the requirement binds the app's own call sites) | same version |
| Make a required prop optional | `undefined` where it assumed a value | new version |
| Rename a prop | `undefined` at runtime; a typed site config stops compiling | new version |
| Remove a prop | same | new version |
| Change a prop's type incompatibly (#175's `results[]` union) | compile failure or wrong behaviour | new version |
| Rename the type a prop is built from, shape unchanged (#174's `CourseListSearchResponse` to `CatalogSearchResponse`) | nothing through the slot; the export changes | export rule, not the slot's version (below) |
| Change the default content | nothing contractual (ADR 0009 section 2's exclusion) | same version |
| Rename the slot's Module or Identifier, contract unchanged | operations targeting the old id stop matching | `idAliases` on `Slot` (#178), same version |

The last row is the one place the how-to documents slot `idAliases`; nothing else does (bairf's frontend-base README, read 2026-10-30). The how-to is explicit that an alias is for an id rename with the contract unchanged, and that a prop change is never aliased: an alias applies v1 operations to the v2 slot, whose props are the ones v1 widgets do not understand.

## 2. The new-version path, step by step

The rename is the running example, with the real names from openedx/frontend-app-catalog#174: `courseDataResultsLength` on `org.openedx.frontend.slot.catalog.courseCatalogIntro.v1` becomes `resultsCount` on `...courseCatalogIntro.v2`.

1. **Declare v2's props as a new interface.** v1's interface keeps its name and members for as long as v1 renders (a typed site config must still compile: ADR 0018 draft section 6). Naming is open question 2.
2. **Render both versions, each with its own props.** The value is computed once and passed under each version's name. Three arrangements, from Brian's comment; the how-to describes all three and says which fits which slot:
   - *v2 wraps v1*: the v1 `Slot` is v2's default content. Every v1 operation keeps working inside v2's `defaultContent` widget. A v2 `REPLACE` of `defaultContent` replaces v1 and its widgets too, which is what an operator moving to v2 expects. Fits a slot whose documented use is replacing the default content (the catalog slots).
   - *v1 wraps v2*: the reverse. A v1 `REPLACE` of `defaultContent`, the operation every catalog README shows, removes v2 and every v2 widget, so a site that has not migrated never sees v2 plugins. The how-to names this cost; the arrangement fits only when v1 operations are known to be additive.
   - *siblings*: both render, default content in one of them. Fits a slot whose contract is "append widgets here" with little or no default content (the shell's footer link slots).
3. **Mark v1 deprecated where a plugin author will see it.** `@deprecated` TSDoc on v1's props interface, naming the v2 id and the prop mapping, so an editor strikes it through at the site-config type annotation. The v1 `Slot` id is a string literal in JSX; nothing in the editor marks it, so the README carries it: a deprecation admonition at the top of the v1 section, the v2 id, the old-name to new-name mapping, and the DEPR link; every example retargets v2. OEP-21's "Plan Accepted" step says deprecated JavaScript gets a `console.log` message; whether a slot version gets a runtime warning is open question 4.
4. **Commit as `feat:`**, not `feat!:`: adding a version beside a working one is not breaking (ADR 0018 draft section 2). The body says which version is deprecated and where the replacement is; that text is the release note (semantic-release, `release-notes-generator`).
5. **Propose v1's deprecation** per ADR 0009 section 3. How that meets ADR 0018 draft section 8 is open question 1.
6. **Remove v1** after the deprecation runs and at least one named release has shipped both (ADR 0009 section 3): delete the inner `Slot`, the v1 interface and its README section, as a `feat!:` with a `BREAKING CHANGE:` footer naming the slot id and the replacement (ADR 0018 draft section 1).

## 3. Why not two names on one slot

The issue plan's "additive path" (new prop beside the old one on the same slot, old one `@deprecated`, removed at the next version). Brian's comment: the alias and multi-prop options "all ended up being more complicated". The how-to states the reasons in one paragraph rather than offering it as a path:

- Both names reach every `component` widget as props, so the slot's runtime contract carries two names for one value and the README has to explain the pair.
- `@deprecated` on an interface member is invisible at runtime; a widget reading the old name is never told.
- Removing the old name is itself a prop removal: a new version anyway. The path only defers the version bump and leaves a hybrid contract in the meantime. The new-version path pays the same bump now and keeps each version's contract exactly as published.

## 4. The types a prop is built from

Brian's second comment and the #339 answer: apps export the types their slot props are built from, from `src/index.ts` beside the `*SlotProps` interfaces (today catalog's `src/index.ts` exports only `catalogApp`, `catalogRoutes` and the `*SlotProps` types; `package.json` `exports` is `{".": "./dist/index.js"}` and `moduleResolution: "bundler"` enforces it, so nothing else is reachable). The how-to's section:

- Export each type a documented prop names (`CatalogSearchResponse`, `TableColumn`, `DataTableParams`, ...), so a plugin author can type a widget the way the README describes it.
- A rename of such a type, shape unchanged, keeps the old name as `/** @deprecated */ export type Old = New;` until the next breaking release: an export change under ADR 0018 draft section 6, not a slot version.
- An incompatible change to its shape is a prop type change: row 6 of the table, new slot version.

## 5. What the plugin author sees

One short section, in the order a plugin author meets it: the release note; the strike-through on the v1 props type in the site config; the README's deprecation admonition with the mapping; the v2 id to retarget to. The README is named as the one place that has everything.

## Where it lives and what links to it

- `docs/how_tos/slot-versioning.md` (issue's candidates were `slot-props.md` or `slots.md`; the content is the version path, with props as the usual trigger). Markdown, as `migrate-frontend-app.md`, `permissions.md` and `theming.md` are.
- Linked from the migration how-to's "Refactor slots" section (line 1088), which today points only at ADR 0009 and `src/shell/dev`.
- Not linked from ADR 0009: `adr-policy` amends an ADR only when a decision changes, and a how-to link is not one. The issue body proposed the link; this plan drops it (open question 5 if Brian wants it anyway).
- No code change in frontend-base. The worked example is catalog's; #174 may be the first slot to walk the path, and the how-to can be updated to cite it once it has.

## Out of scope, named in the how-to or the PR body

- A lint rule or type-level check that a renamed prop goes through a version (issue open question 3): follow-up issue if wanted.
- Routes, widget ids, options, config keys: ADR 0018's surface, not slot props.

## Open questions for Brian

1. **ADR 0009 section 3 against ADR 0018 draft section 8.** 0009: propose the old version's deprecation through the DEPR process and keep it at least one named release. 0018 draft: a DEPR is filed when main lands on `stable` as a new major, listing every breaking change. The sibling task recorded this as unreconciled. The how-to has to say one thing at step 5. Candidates: (a) a DEPR ticket per deprecated slot version at deprecation time, as 0009 reads, with 0018's graduation DEPR as the roll-up that lists the removal; (b) no per-version ticket, deprecation marking plus release note on main, and the graduation DEPR is the DEPR, which would need 0009 section 3 amended (in #343 or after). The how-to follows whichever is decided; (a) needs no ADR change.
2. **Naming the props interfaces once a slot has two versions.** The unversioned `CourseCatalogIntroSlotProps` must keep meaning v1 while v1 renders (ADR 0018 draft section 6). Lean: from the first version bump, `CourseCatalogIntroSlotV1Props` and `CourseCatalogIntroSlotV2Props`, with the unversioned name kept as a `@deprecated` alias of V1 until v1 is removed; after that only versioned names exist for that slot. Alternative: unversioned name stays v1's forever and only v2 gets a suffix, which reads wrong once v1 is gone.
3. **Pre-release apps.** catalog has published only `1.0.0-alpha.*`. ADR 0018 draft section 1 classifies per commit "on every branch"; the issue's open question 2 asked whether such apps may rename outright. Lean: same path, no exception; an app that wants to rename outright on alpha does so as `feat!:` and says so, which the how-to can state in one sentence.
4. **Runtime warning for a deprecated slot version.** OEP-21 marks deprecated JavaScript with a console message. Nothing in `Slot` supports it; a maintainer could `console.warn` by hand in the v1 branch. Lean: the how-to says nothing about runtime warnings now, and a `deprecatedBy` prop on `Slot` that warns once when an operation targets the id is a follow-up issue on frontend-base.
5. **Link from ADR 0009's Consequences**, as the issue body proposed, against `adr-policy`. Lean: no.
6. **Wrapping direction.** The how-to describes all three arrangements with the `REPLACE defaultContent` cost of v1-wraps-v2 spelled out. Or it prescribes v2-wraps-v1 as the default and siblings for append-only slots, and leaves v1-wraps-v2 out. Lean: prescribe the two and name the third as not recommended, since the how-to exists to spare the maintainer the working-out.

## Prior art: every v1/v2 pair in the openedx org, read 2026-11-02

Background only. The how-to does not mention FPF or any of these slots (Brian, 2026-11-02); they show what shape the examples need.

`gh search code "org.openedx.frontend" ".v2" --owner openedx` finds three slots with two live versions, all FPF-era (`PluginSlot`). No frontend-base `<Slot>` has a `v2` yet. No FPF or frontend-base slot has ever had a prop renamed across versions: each v2 changed what the slot wraps or when it renders, and kept or extended the props.

| Slot | Repo, PR, date | Why v2 | Arrangement | v1 marked deprecated | DEPR |
|---|---|---|---|---|---|
| `org.openedx.frontend.authoring.course_unit_sidebar` | openedx/frontend-app-authoring#2000 (tecoholic, 2025-06-10) | v1 wrapped only part of the sidebar and only for `vertical` units; v2 wraps the whole column and adds `isUnitVerticalType`, `isSplitTestType` props | v2 wraps v1: v1 renders inside v2's default content, in `src/course-unit/legacy-sidebar/index.tsx`, still behind `isUnitVerticalType` | README only: `README.v1.md` with an IMPORTANT admonition ("recommended to use ... v2") and the v1 limitations in practical terms; no `@deprecated`, no warning | none filed in 17 months; both versions still render, the docs site lists both |
| `org.openedx.frontend.layout.header_desktop_secondary_menu` | openedx/frontend-component-header#663 (awais-ansari, 2026-04-09) | a second default child (the notifications tray) beside the menu items; adding it inside v1 would break operators using FPF's `Modify` on `widget.content` (single child only) | v2 wraps v1 as a sibling of the new child: `<v2><HeaderNotificationsSlot/><v1 menu/></v2>`; the `desktop_secondary_menu_slot` alias stays on v1 | no; the README table lists both as current ("Menu items only" / "Full secondary menu area") | none; v1 is not deprecated, it is the narrower slot |
| `org.openedx.frontend.layout.learning_header_actions` | openedx/frontend-component-header#682 (ChrisChV, 2026-09-19) | v1 only rendered when `showUserDropdown` and an authenticated user; v2 always renders and gets a `showDefaultActions` prop | v2 wraps v1: `{showDefaultActions && <V1/>}` as v2's default content | three ways: `@deprecated` TSDoc on the v1 component naming the replacement and the DEPR; a one-shot `console.warn` when `getConfig().pluginSlots[v1 id]` is set; a "Deprecated" blockquote at the top of `v1/README.md` and "(Deprecated, use `.v2`)" in the slot index | openedx/frontend-component-header#681, filed 2026-08-23 before the PR merged, RFC to 08-31, accepted 09-16, breaking changes unblocked 10-23, earliest named release Willow; removal PR not yet open (2026-11-02) |

What the three settle for the how-to:

- **Arrangement.** All three are v2-wraps-v1. Brian's #2000 review set the pattern in pseudocode (`<PluginSlot id="v2"> ... <PluginSlot id="v1"> ... </PluginSlot> ... </PluginSlot>`) and called the change "a breaking change ... handle[d] as expand/contract", with "at least one release where both v1 and v2 exist" and a DEPR after landing. #663's review (Brian, 2026-04-02) also marks the limit: a v2 that only double-wraps a single existing slot adds nothing; the split is needed when v1 wraps a non-slot component and the contract changes.
- **README shape.** Per-version docs, split so the v1 text can be deleted whole: `README.v1.md` linked from `README.md` (#2000, Brian's suggestion), or `v1/` and `v2/` directories with a table in the parent README (#663, #682). Brian on #663: the combined README was "a bit confusing"; link v1 from v2 instead.
- **Deprecation marking.** #682 is the full set and the only one with a code-level mark; the DEPR ticket itself asked "Is there no native way to deprecate a plugin slot?". #2000 shows the cost of README-only marking: nothing nudged anyone to file the DEPR.
- **DEPR timing.** #681 was filed at v2 time, per ADR 0009 section 3 as written (FPF ADR 0003 is the same text), with the named-release field filled in. That is candidate (a) of open question 1, in practice.
- **Compat.** `frontend-base-compat`'s header map carries `header_desktop_secondary_menu.v2` and `learning_header_actions.v1` only (`src/mappings/slotMaps/header.ts`), so an app's FPF-era version pairs do not all survive the port; not the how-to's concern, noted for the migration how-to.

## Examples the how-to carries

Derived from the three pairs, written in frontend-base terms only, one running case: `courseCatalogIntro` with `courseDataResultsLength` becoming `resultsCount`. Each is a diff the maintainer or plugin author can apply.

1. **The slot component, before and after.** v1 alone; then v2 wrapping v1, the value computed once and passed as `resultsCount` to v2 and `courseDataResultsLength` to v1, default content unchanged inside v1.
2. **The props interfaces.** v2's new interface; v1's unchanged but `@deprecated`, the TSDoc naming the v2 id and the prop mapping (naming per open question 2).
3. **The README.** The v2 section with the "uses the slot's props" example retargeted; the v1 section headed by the deprecation admonition, the mapping and the DEPR link, its examples left as they were.
4. **The plugin author's move.** A site-config diff: `slotId` from `.v1` to `.v2`, the destructured prop from the old name to the new one, the type annotation to the v2 interface.
5. **Coexistence, in prose.** A v1 operation keeps working inside v2's default content; a v2 `REPLACE` of `defaultContent`, or a v2 layout replacement, takes v1 and its widgets with it. No code.
6. **The removal.** The diff deleting the inner `Slot`, the v1 interface and the v1 README section, with the `feat!:` subject and `BREAKING CHANGE:` footer text.

Not carried over from the pairs: a v2 whose only purpose is a new default child (default content is outside the contract under ADR 0009 section 2, and layouts replace FPF's `Modify`), and a v2 that double-wraps a single existing slot with the same contract (adds nothing; stated once under classification). A second worked example for a non-prop trigger, a slot that grows to wrap more of the page, is open: one sentence under classification, or a short second case.

## Open questions for the PR body

Carry these into `pr-body-<n>.md` when the PR is opened (Brian, 2026-11-03):

1. **How do people find out a slot version is deprecated?** A `feat!:` subject or a `BREAKING CHANGE:` footer is easy to search for, but the `feat:` commit that adds `v2` and deprecates `v1` is not, and the deprecation sits there for at least a named release before the breaking removal. Should deprecations be tracked somewhere findable: a commit convention, a list in the repo, the DEPR ticket alone, or something else?

## Example to write later in this how-to: a slot whose default widget takes widget options (Brian, 2026-11-03; after the banner example, in this PR)

Also set aside for a later example (Brian, 2026-11-03, while shaping the list example): a prop whose set of allowed values widens, where a `v1` widget typed against the narrow union can receive a value it was never written for.

The FPF "modify props" pattern now lives in widget `OPTIONS` handled by the app's default widget: openedx/frontend-app-catalog `src/slots/CourseAboutSidebarSocialSlot` (frontend-base version; the FPF one at `legacy-mfe:src/plugin-slots/CourseAboutSidebarSocialSlot` had "modify items"). Mechanism checked in frontend-base `runtime/slots/widget/hooks.ts`: `useWidgetOptions()` reads `slotId`/`widgetId` from `WidgetContext` and collects `OPTIONS` operations for that slot id only. In the v2-wraps-v1 arrangement the default widget sits inside the v1 `<Slot>`, so a v2 operator's `OPTIONS` on `defaultContent` targets the inner `<Slot>` element and is read by nothing. An example with options has to show the default widget reading both ids (`useWidgetOptionsForId` on the v2 id, if exported) or another arrangement. Not needed for the banner example: its default widget takes no options, so v1 operators reach the message only through a `component` widget or a layout calling `useSlotContext()`, and both keep working wrapped.

## Tests for the how-to's examples (Brian, 2026-11-03; implemented the same day, decision 12)

Why: the examples stay inline in the markdown for readability; tests verify that each example works and that the markdown has not drifted from the code the tests exercise.

### Where

- Fixtures: `runtime/slots/testMocks/` (excluded from the published build by `tsconfig.build.json`'s `**/testMocks/**`; precedent `runtime/testMocks/`, `shell/testMocks/`). Nothing under `docs/` runs or type-checks: jest's projects are `tools`, `runtime`, `shell`; `tsconfig.json` includes `runtime/**` and `shell/**`.
- Tests: beside `runtime/slots/Slot.test.tsx`. No config change.
- Imports: no `paths` mapping for `@openedx/frontend-base` inside the repo, so fixtures import `Slot` from the relative path. The drift test therefore ignores `import` lines.

### Fixtures, one module per state the markdown shows

| File | State | Exports |
|---|---|---|
| `GreetingSlotV1.tsx` | before | `GreetingSlotProps`, default `GreetingSlot` |
| `GreetingSlotV1V2.tsx` | v2 wrapping v1, after step 3 | `GreetingSlotV1Props`, `GreetingSlotProps` alias, `GreetingSlotV2Props`, default |
| `GreetingSlotV2.tsx` | after removal | `GreetingSlotV2Props`, default |
| `BannerSlotV1.tsx` / `BannerSlotV1V2.tsx` / `BannerSlotV2.tsx` | same three | same shape plus `Notice`; a minimal local `Banner` component (not shown in the markdown) renders `message` or `notice.message` |
| `TaggableItemSlotV1.tsx` / `TaggableItemSlotV1V2.tsx` / `TaggableItemSlotV2.tsx` | same three | `selectedTag` becoming `selectedTags`; `v1` gains `selectedTags` too (decision 14) |
| `TaggableItemSlotV1V2FirstTagOnly.tsx` | v2 wrapping v1 before `selectedTags` is added to `v1`: step 1's first two blocks and the before side of its diff | `TaggableItemSlotV1Props { selectedTag }`, alias, `TaggableItemSlotV2Props`, default (decision 16) |
| `GreetingSlotRenamedInPlace.tsx` / `GreetingSlotBumpedInPlace.tsx` | the two what-not-to-do diffs' after-states | `GreetingSlotProps { displayName }` on the `v1` id / on the `v2` id (decision 13) |
| `greetingWidgets.tsx` | the operator diff's before and after | `customGreetingV1`, `customGreetingV2` (decision 13) |

Each fixture's non-import text contains the markdown's blocks verbatim, so a fixture is written by pasting the blocks and adding only imports and the local `Banner`.

### Behaviour tests: `runtime/slots/howToExamples.test.tsx`

Setup as in `Slot.test.tsx`: `setSiteConfig({ ...getSiteConfig(), apps: [{ appId, slots: [...] }] })`, render inside `MemoryRouter`, `afterEach` resets `apps`. Do not mock `useLayoutForSlotId`; it resolves layout operations from site config (`runtime/slots/layout/hooks.ts`), so real `LayoutOperationTypes.REPLACE` operations work. Check during implementation whether `useActiveRoles` needs a provider in tests.

Cases, run with `describe.each` over the states where they must hold:

| # | Operation in site config | Assert | v1 only | v1+v2 | v2 only |
|---|---|---|---|---|---|
| 1 | none | default content renders the value ("Hello, Ada") | x | x | x |
| 2 | v1 `APPEND` `component: ({ userName }) => ...` | widget rendered with the value under the old name | x | x | |
| 3 | v2 `APPEND` `component: ({ displayName }) => ...` | widget rendered with the value under the new name | | x | x |
| 4 | v1 `REPLACE` `defaultContent` | replacement rendered, default content gone | x | x | |
| 5 | v2 `REPLACE` `defaultContent` plus a v1 `APPEND` | replacement rendered; default content and the v1 widget both gone (the inner slot went with it) | | x | x (without the v1 op) |
| 6 | v1 layout `REPLACE` whose component reads `useSlotContext()` | layout sees the old prop name | x | x | |
| 7 | v2 layout `REPLACE` reading `useSlotContext()` | layout sees the new prop name; v1 default content still rendered inside it | | x | x |
| 8 | v1 widget typed `GreetingSlotProps` (deprecated alias) | compiles under `npm run types`; no runtime assertion beyond case 2 | | x | |

Banner: the same table with `notice={{ message: 'Hi', severity: 'info', onDismiss }}`; case 2 asserts the v1 widget received `message === 'Hi'`, case 6 that a v1 layout reads `message` from context, case 3/7 that v2 sees `notice.severity`.

Taggable item: the same table with `selectedTags={['red']}`, plus three cases: on v2 wrapping v1 before the list is added to v1, a v1 widget sees only the first of `['red', 'blue']` (decision 16); on v1+v2 with `['red', 'blue']`, a v1 widget reading both props prints "red of red, blue" (decision 14); on v1+v2 with `[]`, a v1 widget reading `selectedTag` gets `""` (decision 17).

Added after the review round (decision 13): the operator's widget from the how-to's diff (a `component` `REPLACE` of `defaultContent`) replaces the default content on v1 only and v1+v2 before the move, on v1+v2 and v2 only after it, and does nothing to v2 only before the move; the renamed-in-place slot gives a widget reading `userName` undefined, with `@ts-expect-error` on that widget so the typecheck enforces "would stop compiling"; the bumped-in-place slot renders the default content and not the operator's v1 widget.

### Drift test: `runtime/slots/howToExamples.drift.test.ts`

- Reads `docs/how_tos/add-a-slot-version.md` via `path.resolve(__dirname, '../../docs/how_tos/add-a-slot-version.md')`; a comment names the doc it guards. Fails if the file is missing.
- Splits on `## Example:` headings; maps each heading to its fixture files (`renaming a prop` → the three Greeting files, `changing a prop's type` → the three Banner files). An example heading with no mapping, or a mapped heading absent from the doc, fails, so a retitle is caught.
- From each example's section, takes every fenced block tagged `tsx` (not `diff`, `markdown`, or untagged commit blocks). Strips `import` lines, collapses whitespace. Asserts each block is a substring of at least one of that example's fixtures, normalised the same way; the failure message names the example and the block's first line.
- Asserts each example has at least one `tsx` block.

### Checks and commit

- `nvm use`, `npm ci` (not yet run in this clone), then `npm run types`, `npm run lint`, `npm run test -- runtime/slots`. No `no-deprecated` lint rule is configured (checked `eslint.config.js`), so case 8 needs no disable comment.
- Second commit on `slot-versioning-how-to`: `test: cover the slot versioning how-to examples`, body naming the fixtures, the case table's intent and the drift guard. Same PR as the docs commit.

### Open while implementing

- Whether a `Banner` local component in a fixture trips a lint rule (one component per file, display name).
- Whether `useActiveRoles` needs a wrapper; `Slot.test.tsx` renders bare in `MemoryRouter`, so probably not.
- Case 5's "v1 widget gone" assertion depends on `v2` `REPLACE` of `defaultContent` removing the inner `<Slot>` element: the how-to's step 2 states this; the test is what confirms it.
