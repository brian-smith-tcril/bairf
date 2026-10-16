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
