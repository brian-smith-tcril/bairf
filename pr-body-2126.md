## Summary

`Unit`, `UnitSuspense`, `UnitTitleSlot` and `BookmarkButton` become `.tsx`, with a `Props` interface in place of `propTypes` / `defaultProps`, the `UnitButton.tsx` shape already in the same subtree. Peeled out of #2088's units layer, which threads a `sequenceId` through all four: with the interfaces in place that layer changes a type in each instead of adding four `propTypes` entries to components the repo is moving off `propTypes`. **No behaviour change and no request change.** The one value-level edit the conversion forced is in `getIFrameUrl`: it now encodes its `preview` boolean itself (`preview ? '1' : '0'`), where `Unit` used to pre-encode the string before calling it — see *What changed*. Part of the Redux → React Query migration (#1946, Stage 1); sixth layer of stack #2121, on top of #2124. Closes #2125.

## What changed

- **Four `git mv` renames to `.tsx`.** `propTypes` → a `Props` interface; the two `defaultProps` (`format: null`, `isBookmarked: false`) → destructuring defaults; `onLoaded` simply optional. JavaScript imports (`useModel`, `useExamAccess`, `useShouldDisplayHonorCode`, `ContentIFrame`, `HonorCode`, `PageLoading`) stay untyped at this layer, so `unit` from `useModel` is `any` until #2088's units layer types it as `SequenceUnit`. `UnitSuspense` keeps the `import * as hooks` its suite mocks through. `renderUnitNavigation` is `(isAtTop: boolean) => React.ReactNode`, what `Sequence.jsx` passes and `UnitTitleSlot` calls.
- **`UnitTitleSlot`'s `unit` shape is inlined in `Props`, with `bookmarkedUpdateState` optional.** The `propTypes` said `isRequired`, but the sequence endpoint never sends the field and the bookmark writer sets it, so a fresh unit always rendered without it, with a dev-mode propTypes warning. Inline rather than a named interface (decision 3): nothing else references the shape, and the units layer replaces it with `SequenceUnit`.
- **`getIFrameUrl` encodes `preview` itself.** `Unit` passed `shouldDisplayUnitPreview ? '1' : '0'` into a parameter `urls.ts` declared `boolean` and sent as `String(preview)`; the endpoint compares `request.GET.get('preview', '0') == '1'` (`openedx-platform`, `lms/djangoapps/courseware/views/views.py:1602`), so a boolean sent as-is would have disabled preview, and the builder's own case named *preview is true and url param equals 1* asserted `preview=true`. Once `Unit` was typed the mismatch surfaced. The builder now sends `preview ? '1' : '0'`, `Unit` passes the boolean, and the `urls.test.ts` expectations read `preview=0` / `preview=1`, what that case's name always claimed. Production URLs are unchanged. `Unit` passes `jumpToId` as `undefined` when the search param is absent, where `URLSearchParams.get` gives `null` (decision 4).

## Testing

`npm run types` and `npm run lint` clean; full suite 116 suites, 1177 passed, 0 skipped (two cases added after the first push for the branches the conversion introduced, decision 6). Spot check on tutor dev of the one value-level change: the unit iframe `src` carries `preview=0` on the learner route and `preview=1` under `/preview/course/…` — see the checklist below.

## Decisions

<details>
<summary>Full decision log</summary>

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

</details>

## Manual testing

<details>
<summary>Checklist</summary>

# Manual testing — convert Unit, UnitSuspense, UnitTitleSlot and BookmarkButton to TypeScript (#2125)

In-browser verification against a live backend (tutor dev).

What changed: four `.jsx` files became `.tsx` with `Props` interfaces in
place of `propTypes` / `defaultProps`; `getIFrameUrl`'s `preview` parameter
is typed as the `'1' | '0'` string the request has always carried. No
behaviour change and no request change intended.

**The bugs this layer could introduce.** (1) *A default that changed* — the
two `defaultProps` (`format: null`, `isBookmarked: false`) became
destructuring defaults; a wrong default would show as a missing `format`
query parameter on the unit iframe or a bookmark button that starts as
"Bookmarked". (2) *The preview flag* — the only value-level touchpoint: the
iframe URL must still carry `preview=1` in preview mode and `preview=0`
otherwise (decision 4).

## Setup

A course with a unit; staff access for preview mode. Devtools Elements (or
Network filtered to `xblock/`) to read the unit iframe's `src`.

## Checks

- [x] **Unit renders:** title, bookmark button, unit navigation and the iframe, as before.
- [x] **Iframe `src` (learner route):** contains `preview=0`, `format=<the sequence format>` when the sequence has one, and `view=student_view`.
- [x] **Iframe `src` (staff, `/preview/course/…`):** contains `preview=1`; the unit renders the draft content.
- [ ] **Bookmark button:** starts un-bookmarked on an un-bookmarked unit, "Bookmarked" on a bookmarked one; toggles.
- [ ] **Console:** no propTypes warnings about `UnitTitleSlot`, `Unit`, `UnitSuspense` or `BookmarkButton` (the `bookmarkedUpdateState` warning on a fresh unit is gone with the `propTypes`).

## Results

Run 2026-09-25 on tutor dev, as a spot check of the one value-level change
rather than a full run.

**Run**

- **Preview flag:** on the learner route the unit iframe `src` carries
  `preview=0`; under `/preview/course/…` as staff it carries `preview=1` and
  preview works.
- **Unit renders** on both routes.

**Not run**

- **`format=` on the iframe `src`:** no sequence with a format in the test
  course. The `format = null` destructuring default replaces a `defaultProps`
  of the same value, and *format provided, exam access and token available*
  in `urls.test.ts` pins the parameter's presence.
- **Bookmark button start state and toggle:** not exercised; `isBookmarked =
  false` replaces a `defaultProps` of the same value, and
  `BookmarkButton.test.jsx` covers both start states.
- **Console for propTypes warnings:** not checked.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
