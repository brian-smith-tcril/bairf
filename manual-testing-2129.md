# Manual testing — type the courseware normalizers (#2129)

In-browser verification against a live backend (tutor dev).

What changed: `courseware/data/utils.js` became four TypeScript files, one
per normalizer, with input and output types on each; `courseOutline.ts`
became `courseNavigationOutline.ts` with its types renamed; the outline
query is typed and renamed `useMinimalCourseOutline`;
`normalizeCourseNavigationOutline` drops an unread `courseId` argument; `now` in the
release filter is a number instead of a `Date`. No behaviour and no request
change intended.

**The bugs this layer could introduce.** (1) *The release filter* — the
`Date` → number change in `isReleased`; a wrong comparison would hide
released sequences from the outline (breadcrumbs, next-sequence navigation)
or show unreleased ones. (2) *A module rename that a runtime import missed*
— `api.js` imports the normalizers extension-less, and the sidebar's
`applyUnitCompletion` import moved; a miss would fail at load, not subtly.

## Setup

A course with several sections and sequences, ideally one with a sequence
whose release date is in the future (staff sees it; a learner does not).
Devtools Console open.

## Checks

- [x] **Courseware renders:** a unit loads with unit navigation and the sidebar outline (sections, sequences with completion icons, units).
- [ ] **Release filter:** as a learner, an unreleased sequence is absent from the breadcrumb jump menu and next/previous navigation skips it; as staff it is present.
- [x] **Completion roll-up:** complete a unit; the sidebar's sequence and section completion icons update without a reload.
- [x] **Console:** no error naming `normalizeCourseNavigationOutline`, `applyUnitCompletion`, `useMinimalCourseOutline` or a `courseware/data` module.

## Results

Run 2026-09-27 on tutor dev.

**Run**

- **Courseware renders:** a unit loaded with its navigation and the sidebar
  outline: sections, sequences with completion icons, units.
- **Completion roll-up:** completing a unit updated the sequence and section
  completion icons in the sidebar without a reload.
- **Console:** no error naming any `courseware/data` module or function.

**Not run**

- **Release filter:** no future-dated sequence was set up. The filter is
  pinned by `lmsPact.test.jsx` (*skips unreleased sequences*) and the two
  `minimalCourseOutline.test.ts` cases, and its only code change is the
  `Date` → `Date.now()` clock (decision 9).
