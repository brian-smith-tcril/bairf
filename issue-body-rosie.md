**What:** the test suite builds its API-response fixtures with [rosie](https://github.com/rosiejs/rosie) (`Factory.define` / `Factory.build`), a library whose last release and last commit are both from 2023-11-11 (2.1.1; 14 open issues, not archived). Follow-up to #1905: the frontend-base port moves the factories and their call sites as they are, so that each test file ports once; replacing rosie is its own change, after the port lands, wide across the suite rather than inside any port layer.

**What rosie does for us today** (counts on `master`):

| feature | uses | role |
|---|---|---|
| `define` / `build` by name | 13 factories / 192 `build` calls in 31 test files | a global registry: a test calls `Factory.build('courseMetadata')` without importing the factory (the setup file imports the index) |
| `attr` with a dependency list | 20 of 34 | one attribute computed from others, in dependency order |
| `option` | 29 | build-time inputs that shape the output without appearing in it (`host`, `courseId`, `dateBlocks`, `offer`) |
| `sequence` | 7 | a unique id per build |
| `extend` | 2 | `courseHomeMetadata` and `courseMetadata` extend `courseMetadataBase` |
| `after`, `buildList` | 0 | |

Three factories do real work with this: `shared/data/__factories__/courseBlocks.factory.js` builds units, then sequences from the unit ids, then sections, then the course, then the blocks map from all four; `courseMetadataBase` and `courseHomeMetadata` compute `tabs` and URLs from `id` and `host`. The other ten (`progressTabData`, `datesTabData`, `outlineTabData`, `upgradeNotificationData`, `block`, `tab`, …) are static literals where rosie adds only the registry and the per-attribute override on build. Override semantics matter for the rewrite: `Factory.build(name, overrides, options)` replaces each overridden top-level attribute whole; it does not merge into nested objects.

**Options**

1. **Plain functions, no dependency.** Each factory becomes an exported function, e.g. `buildCourseMetadata(overrides = {}, { host = 'http://localhost:18000' } = {})` returning `{ ...defaults, ...overrides }`, which keeps rosie's override semantics exactly. Dependency chains become ordered local constants, sequences a module-level counter, the registry becomes imports. 13 factory files rewritten; the 192 call sites change mechanically from `Factory.build('x', a, b)` to `buildX(a, b)`.
2. **[fishery](https://github.com/thoughtbot/fishery)** (thoughtbot; 2.4.0, 2025-12). Its model maps onto ours: `transientParams` are rosie's options, sequences are built in, `params` are overrides, `afterBuild` exists. One semantic difference to carry through the rewrite: fishery deep-merges `params` into the defaults (arrays are replaced whole, nested plain objects are merged), where rosie replaces the top-level attribute; a test that overrides a nested object and relied on the siblings disappearing changes meaning. Same file touch as 1, plus a new dev dependency.
3. **Keep rosie.** A devDependency with no runtime dependencies and a stable API; nothing ships with it. The cost is the maintenance status above.

None of the other frontend-base-converted apps use rosie (profile, account, catalog, gradebook, learner-dashboard, instructor-dashboard: no `rosie` in `package.json` or source as of 2026-10-23); their tests build fixtures as plain object literals, which is option 1 without the shared builders.

> [!NOTE]
> This issue body was drafted by Claude (Claude Code) and reviewed before posting.
