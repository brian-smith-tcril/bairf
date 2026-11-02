> [!NOTE]
> This issue was written by Claude (Claude Code) and reviewed before posting.

**Goal:** decide how an app exposes the types its slot props are built from, so a plugin author can type a widget the way the slot's README describes, and say what changing one of those types means for the slot's API.

**Why:** in frontend-app-catalog, `src/index.ts` exports each `*SlotProps` interface and nothing else type-wise, and `package.json` `exports` is `{ ".": "./dist/index.js" }`, both as [the migration how-to](https://github.com/openedx/frontend-base/blob/main/docs/how_tos/migrate-frontend-app.md) prescribes ("`index.ts`: the MFE is now a library, and this is where all the interesting bits are exported"; "The `exports` map decouples your public API from the internal `dist/` directory structure"). The slot READMEs, though, document props by the types they are built from, for example `displayData?: CatalogSearchResponse`, `tableColumns: TableColumn[]`, `handleFetchData: (params: DataTableParams) => void`, `singlePaidMode: SinglePaidMode`, `courseAboutData: CourseAboutData`, `socialLinks: SocialLink[]`. None of those types is exported, and with the `exports` map plus the shared tsconfig's `"moduleResolution": "bundler"`, no deep import into `dist/` reaches them either. The only way a plugin can name one today is an indexed access such as `CourseCatalogDataTableSlotProps['displayData']`.

This came up reviewing openedx/frontend-app-catalog#174, which renames that type (`CourseListSearchResponse` → `CatalogSearchResponse`, same shape: no plugin can see it), and openedx/frontend-app-catalog#175, which changes its shape (`results[]` becomes a union of course and pathway results: every plugin typed from the slot props sees it, with no name having changed).

[ADR 0009](https://github.com/openedx/frontend-base/blob/main/docs/decisions/0009-slot-naming-and-lifecycle.rst) already makes the props the contract: "a given slot's API contract is comprised of: Its React props, with the notable exclusion of `props.children`", with a version bump and the deprecation process when a change would break existing widgets. So the shape of a prop's type is part of the contract whether or not the type is exported; exporting it would make that visible and typeable.

**My lean:** apps export the types their slot props are built from (from `src/index.ts`, beside the `*SlotProps` interfaces), and an incompatible change to one of them is a breaking slot API change under ADR 0009. I'd like to leave this open for discussion rather than decide it here.

<details>
<summary> Claude Plan </summary>

Open questions, in the order they would need answering:

1. Is exporting the constituent types a convention (a line in the migration how-to and the slot README template) or something enforced (a lint rule, or a type-level check that every member type of an exported `*SlotProps` is itself exported)?
2. What exactly becomes contract once a type is exported: its shape only, or its name too? Under shape-only, #174's rename is fine and #175's union is the break. Under name-too, a rename needs a deprecated alias for a release.
3. Where the rule lives: an amendment to ADR 0009's "Versioning" section, a new ADR, or the how-to only.
4. Whether a prop type change that breaks widgets takes the full ADR 0009 path (`v2` slot nesting the `v1`, DEPR) or whether a documented prop-type change with a deprecated alias is enough when the prop keeps its name and meaning.
5. Whether this applies to apps that have published only pre-release versions. frontend-app-catalog has published `1.0.0-alpha.0` to `1.0.0-alpha.4` only.

What this issue does not propose: exporting the data layer (hooks, fetchers, URL builders) or deep paths in the `exports` map. Only the types a documented slot prop is built from.

</details>
