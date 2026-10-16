# Decisions — convert Unit, UnitSuspense, UnitTitleSlot and BookmarkButton to TypeScript (#2125)

Peeled out of #2088's layer A during its code review (2026-09-25), the way
#2111 was peeled out of #2087: layer A adds a `sequenceId` to all four, and
the review caught that as four `propTypes` additions to components the repo
is otherwise moving off `propTypes`. The sixth layer of the running stack
#2121, on top of #2124 (#2123), branch `bsmith/unit-components-typescript`;
layer A (`bsmith/units-query-reads`, backed up with its docs on
`bsmith/units-query-reads-wip`) is re-added on top once this lands. Entries
landed with the code.

1. **Four `git mv` renames, `propTypes` → a `Props` interface with
   destructuring defaults, the `UnitButton.tsx` shape in the same subtree.**
   `format = null` and `isBookmarked = false` replace the two `defaultProps`;
   `onLoaded` is simply optional, as its `defaultProps: undefined` said.
   Every JavaScript import (`useModel`, `useExamAccess`,
   `useShouldDisplayHonorCode`, `ContentIFrame`, `HonorCode`, `PageLoading`)
   stays untyped at this layer; `unit` from `useModel` is `any` until layer
   A types it as `SequenceUnit`. `UnitSuspense` keeps its `import * as hooks`
   namespace import, which its suite mocks through.

2. **`renderUnitNavigation: (isAtTop: boolean) => React.ReactNode`.** What
   `Sequence.jsx` passes (`(isAtTop) => <UnitNavigation isAtTop={isAtTop} …/>`)
   and what `UnitTitleSlot` calls (`renderUnitNavigation(true)`).

3. **`UnitTitleSlot`'s `unit` shape is inlined in `Props`, with
   `bookmarkedUpdateState` optional.** The `propTypes` said
   `isRequired`, but the field exists only after the bookmark writer's first
   write (`useSetBookmarked` sets it; the sequence endpoint never sends it),
   so a fresh unit always rendered without it, with a dev-mode propTypes
   warning. The type says what is true, with no comment (the `?` carries
   it; the provenance is recorded here). Inline rather than a named
   interface, settled in review: nothing else references the shape, and
   layer A replaces it with `SequenceUnit`, which carries the same
   optionality.

4. **`getIFrameUrl`'s `preview` becomes a boolean, and the builder encodes
   it.** `Unit` passed `shouldDisplayUnitPreview ? '1' : '0'` into a
   parameter `urls.ts` declared `boolean` and sent as `String(preview)`, so
   production URLs carry `preview=1` / `preview=0` while the builder's own
   case named *preview is true and url param equals 1* asserted
   `preview=true`. Checked against `openedx-platform`
   (`lms/djangoapps/courseware/views/views.py:1602`):
   `is_preview = request.GET.get('preview', '0') == '1'`, so a boolean sent
   as-is would have silently disabled preview. The encoding now lives in the
   builder — `searchParams.set('preview', preview ? '1' : '0')`, no comment
   — `Unit` passes the boolean, and the
   `urls.test.ts` expectations read `preview=0` / `preview=1`, what the last
   case's name always claimed. No request changes. A first version typed the
   parameter as `'1' | '0'`, the wire value, and was replaced in review: the
   caller was doing the builder's job. `jumpToId` keeps its `string |
   undefined` type; `Unit` passes `searchParams.get('jumpToId') ?? undefined`,
   since `URLSearchParams.get` returns `null` for an absent param and the
   builder's `if (jumpToId)` treats both the same. A first version widened
   the builder's type to `string | null` instead, pushing the caller's source
   quirk into the interface.

5. **Commit: `refactor:`, no `!`.** No behaviour change, no request change,
   no plugin-facing change: `UnitTitleSlot`'s `pluginProps` keep their shape,
   `BookmarkButton`'s props are the same three, and the `.tsx` files resolve
   at the same import paths (`courseware/course/bookmark/index.js`,
   `'./Unit'`, `'./UnitSuspense'`, `'../../../../plugin-slots/UnitTitleSlot'`).

6. **Two cases in `Unit/index.test.jsx` for the branches the conversion
   introduced.** Codecov flagged `Unit/index.tsx` on the first push: the
   `format = null` destructuring default is a branch where `defaultProps`
   was not, and `searchParams.get('jumpToId') ?? undefined` is a branch where
   the bare `get` was not; no case omitted `format` or passed a `jumpToId`.
   *omits format from the iframe url when the unit has none* and *passes
   jumpToId from the search params into the iframe url* cover them, in their
   own describe because the `ContentIFrame` describe's `beforeEach` renders
   a unit of its own. The two branches still uncovered — the public view for
   an anonymous user and the preview route — predate this layer.
