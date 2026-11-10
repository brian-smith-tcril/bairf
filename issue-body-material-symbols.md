> [!NOTE]
> This issue was written by Claude (Claude Code) and reviewed before posting.

**Goal:** every [Material Symbols](https://fonts.google.com/icons?icon.set=Material+Symbols) icon importable from `@openedx/paragon/icons`, the way every Material Icons Sharp glyph is today.

**Why:** Paragon's icon set is Material Icons Sharp, copied wholesale from `@material-icons/svg` by `icons/copy-mui-icons.js` (#1302, #1313). That package has had the same 2191 names since the 2022 import; new designs are drawn with Material Symbols, which has 3940 names at one weight, 2086 of them with no Material Icons counterpart, and lighter variants of the glyphs the two sets share. Today each Symbol a design needs is a one-off SVG upload (#3275 added `Newsstand` that way, #4086 asks for `QuickReferenceAll` the same way), and there is no rule for a Symbol whose name an existing icon already uses. Current example: openedx/frontend-app-learner-dashboard#879 needs the Material Symbols `import_contacts` (both pages outlined), while Paragon's `ImportContacts` is the Material Icons Sharp glyph with a solid left page.

**Prior art:**

- #1302 / #1313 (2022): export every Material Icons Sharp glyph from `@material-icons/svg`.
- #2441 (2023): `sideEffects: false` on the icons package so unused icons tree-shake.
- #3045 (2024, closed 2025-09): all Material Symbols Sharp 400 from `@material-symbols/svg-400`, added next to the existing icons, skipping any name already taken. Tripled the SVG count (2317 to 6948), the docs site build ran out of memory at the default heap, bundle impact on MFEs was not measured, and review asked that frontend-build's tree-shaking of unused Paragon icons be verified first.
- #3275 (2024): one Symbol SVG added by hand, as-is from fonts.google.com.
- #4086 (2026-01): asks for two more Symbols by hand and records that the Paragon WG wants to choose between an ingestion method and manual uploads.
- openedx/public-engineering#555: the Paragon 24 epic this issue belongs to.

**Open questions:**

1. **Style, weight, fill.** Material Symbols ship as Outlined, Rounded and Sharp, in weights 100 to 700 (one npm package per weight, `@material-symbols/svg-<weight>`), each with a `-fill` variant. Paragon's existing set is Sharp; #3045 chose Symbols Sharp 400; the openedx/frontend-app-learner-dashboard#879 Figma uses Symbols Outlined 400. Which style(s), weight(s) and fill variants Paragon exports, and under what names.
2. **Keep Material Icons?** 1854 names exist in both sets, 337 Material Icons names have no Symbol (many are renamed rather than gone, e.g. `add_circle_outline` is `add_circle` at fill 0), and the hand-added Paragon SVGs include four that are now Symbols (`close_small`, `newsstand`, `post`, `text_to_speech`). Whether Paragon 24 keeps the Material Icons set alongside the Symbols, drops it, or keeps only the 337 with no Symbol.
3. **Overlap and deprecation.** For a name in both sets: which glyph the bare export (`ImportContacts`) means, where the other one lives (a suffix, a separate entry point such as `@openedx/paragon/icons/symbols`, or not exported), and the deprecation path for consumers of the old glyph: a deprecation warning on the old export, a documented rename, and the Paragon major in which it is removed. #3045 kept the old glyph on every collision, so it never answered this.
4. **How `Icon` takes an icon.** Today `Icon`'s `src` prop is a React component, and the contract is one import per icon (`import { Add } from '@openedx/paragon/icons'; <Icon src={Add} />`): every icon is a generated component in `icons/es5`, and the export list is the icon set. Paragon 24 can revisit that. Candidates: keep component-per-icon imports; a name-based `src` (`<Icon src="add" />`) resolved from a map, which changes what tree-shaking can drop; the Material Symbols variable font, which makes style, weight and fill runtime CSS instead of build-time variants and removes the SVG set from the package. The answer constrains questions 1 to 3 and 5.
5. **Build and bundle.** The SVG count, docs site memory and MFE bundle questions from #3045, and whether frontend-build and frontend-base tree-shake unused Paragon icons, must be settled before merge.

<details>
<summary> Claude Plan </summary>

1. Answer questions 1 to 4 in this issue with the Paragon WG and design, question 4 first since it bounds the others; record the answers in the issue body.
2. If question 4 keeps SVG components: extend `icons/copy-mui-icons.js` (or a sibling script) to copy the chosen Symbols style(s) and weight(s) from `@material-symbols/svg-<weight>` on `npm run build`, applying the collision rule from question 3, with `-fill` handling from question 1. Otherwise, the `Icon` change that question 4 chose.
3. Measure: docs site build memory, icons package size, and an MFE bundle before and after, with the tree-shaking verification from question 5.
4. Deprecation mechanics for whichever Material Icons exports question 2 removes or renames: warnings on `release-23.x`, removal on the Paragon 24 line.
5. Update `icons/README.md` and the icons docs page to say where Symbols come from and how an icon is added or updated.

</details>
