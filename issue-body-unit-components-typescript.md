Part of #1946 — Redux → React Query migration (Stage 1). Peeled out of #2088 (layers D1 + D2 of the model-store dissolution, #1977), the way #2111 was peeled out of #2087: a small layer below, so the conversion layer's changes to these components land as typed interface changes rather than as `propTypes` additions.

**Goal:** convert `Unit`, `UnitSuspense`, `UnitTitleSlot` and `BookmarkButton` to TypeScript, so that #2088's `units` layer — which threads a `sequenceId` through all four (from `SequenceContent` to `Unit`, on to `UnitSuspense`, and from `UnitTitleSlot`'s `unit` to `BookmarkButton`) — changes a `Props` interface in each instead of adding a `PropTypes.string.isRequired` to four components the repo is otherwise moving off `propTypes`.

**Context.** The four are the unit subtree `SequenceContent` renders once a unit is in the loaded sequence, and its title slot's bookmark control:

| File | `propTypes` entries | `defaultProps` |
|---|---|---|
| `courseware/course/sequence/Unit/index.jsx` | 6 (`courseId`, `format`, `id`, `onLoaded`, `isOriginalUserStaff`, `renderUnitNavigation`) | `format: null`, `onLoaded: undefined` |
| `courseware/course/sequence/Unit/UnitSuspense.jsx` | 2 (`courseId`, `id`) | — |
| `plugin-slots/UnitTitleSlot/index.jsx` | `unitId`, `renderUnitNavigation`, and a `unit` shape (`id`, `bookmarked`, `title`, `bookmarkedUpdateState`) | — |
| `courseware/course/bookmark/BookmarkButton.jsx` | 3 (`unitId`, `isBookmarked`, `isProcessing`) | `isBookmarked: false` |

`UnitButton.tsx` in the same subtree is already the model: a `Props` interface, destructuring defaults, no `propTypes`. Consumers are `SequenceContent.jsx` (`Unit`), `Unit` (`UnitSuspense`, `UnitTitleSlot`), and `UnitTitleSlot` (`BookmarkButton`, through `courseware/course/bookmark/index.js`); the three suites (`Unit/index.test.jsx`, `UnitSuspense.test.jsx`, `BookmarkButton.test.jsx`) import without extensions and mock `./hooks` / `../honor-code` by path, so they need no change beyond what the types surface.

**Tasks**
- **`Unit/index.jsx` → `.tsx`**: `propTypes` → a `Props` interface with destructuring defaults (`format`, `onLoaded` optional). Type what the file reads: `authenticatedUser` from `AppContext`, `useExamAccess`'s result, `usePluginsCallback`, `getIFrameUrl`'s argument (`urls.ts` is already typed). The `unit` read is `useModel`'s untyped value at this layer; it becomes `SequenceUnit` in #2088.
- **`UnitSuspense.jsx` → `.tsx`**: `Props` interface; keep the `import * as hooks` namespace import the suite mocks through.
- **`UnitTitleSlot/index.jsx` → `.tsx`**: `Props` interface; the `unit` shape becomes a named interface for the fields the slot reads (#2088 replaces it with `SequenceUnit`). `pluginProps` keeps its shape. The slot README's `unit` description is unchanged.
- **`BookmarkButton.jsx` → `.tsx`**: `Props` interface, `isBookmarked = false` as a destructuring default.
- No behaviour change, no data-layer change, no new files beyond the renames.

**Not in scope:** the `useModel('units', …)` reads in these files and the `sequenceId` they will carry (#2088); `useShouldDisplayHonorCode.js` and the other `Unit/hooks/*.js` files; `ContentIFrame.jsx`; the tests' own file types.

**Verify:** `npm run types`, `npm run lint` and the full suite green; the unit renders, the bookmark button toggles, the honor-code and content-gating gates show, exactly as before.

> [!NOTE]
> This issue was authored by Claude (Claude Code) and reviewed before posting.
