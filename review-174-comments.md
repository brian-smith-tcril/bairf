# Draft review comments for openedx/frontend-app-catalog#174

Drafted 2026-11-06 against head `767011e12e`. Each comment is posted as an inline review comment on the PR, on the `RIGHT` side at the line given; the body under each heading is the text to post, verbatim. The ledger entry each one rests on is named so the record stays in `review-174.md`. Status per comment: `draft`, `pending <thread url>`, `posted <thread url>`.

The review summary carries the disclosure; the inline comments do not repeat it. Under each comment, "Diff context" shows the hunk the way the review will, with the anchor lines marked, so the draft reads as the review will.

## Review summary

Status: draft

> Thanks for the quick turnaround on the naming! The rename itself reads as mechanical to me, and `npm run lint`, `npm run test` and `npm run build` all pass locally at 767011e. I left two comments, both change requests, and I'd like both addressed before this lands: one on exporting the types the slot props are built from, and one on the slot names and the two props the description leaves under their old names. Both lean on things that landed or are in review in frontend-base since the first pass, and the comments link to them.
>
> A few things I'm deliberately not asking for here: `CoursesList` → `CatalogList` in #176 sounds right to me since that's where it starts rendering pathway cards (the `HomeCoursesListSlot` rename would go the same way as the slots below); the course-about slot types can stay as they are until something in this stack touches them; and the page copy and the `/catalog/courses` URL are a question for the PR that makes the page mixed, not this one.
>
> The inline comments were drafted with Claude Code and reviewed before posting.

## 1. Exports

File: `src/data/catalog-search/types.ts`
Lines: 1 to 3 (`export interface CatalogSearchResponse {` and its first two members), side RIGHT
Ledger: entry 9
Status: draft

Diff context (renamed file, every line is `+`; `>` marks the anchor):

```
>  1 | +export interface CatalogSearchResponse {
>  2 | +  took: number;
>  3 | +  total: number;
   4 | +  results: {
   5 | +    id: string;
   6 | +    index: string;
```

> This type is what `CourseCatalogDataTableSlotProps.displayData` and `CourseCatalogDataTableCardViewSlotProps.displayData` are built from, and the slot READMEs name it, but nothing exports it: `src/index.ts` exports the `*SlotProps` interfaces and nothing else type-wise, and `package.json`'s `exports` map blocks deep imports. So a widget author can read the name in the README and can't import it. The same goes for `DataTableParams` here and for `TableColumn` and `TableColumnFilterChoice` in the data table slot's `index.tsx`.
>
> I raised this as openedx/frontend-base#339 after the first pass on this PR, and the answer is that apps export the types their slot props are built from. openedx/frontend-base#343 (ADR 0018, in review) makes every export part of the app's contract, and says that renaming one without keeping the old name as a deprecated alias is breaking.
>
> I'd like to see `CatalogSearchResponse`, `DataTableParams`, `TableColumn` and `TableColumnFilterChoice` exported from `src/index.ts` beside the `*SlotProps`, and the old name kept next to the new one here:
>
> ```ts
> /** @deprecated Renamed to `CatalogSearchResponse`. */
> export type CourseListSearchResponse = CatalogSearchResponse;
> ```
>
> The old name was never importable, so the alias is there for the README readers and in-repo site configs that met it, and it goes out in a later `feat!:`. I'm not asking for the course-about slot types in this PR since nothing here touches them.

## 2. Slot names and props

File: `src/slots/CourseCatalogDataTableSlots/CourseCatalogDataTableSlot/index.tsx`
Lines: 29 to 36 (the `CourseCatalogDataTableSlotProps` interface), side RIGHT
Ledger: entry 3
Status: draft

Diff context (`>` marks the anchor; `+`/`-` per the diff):

```
  26 |    filterChoices: TableColumnFilterChoice[];
  27 |  }
  28 |  
> 29 |  export interface CourseCatalogDataTableSlotProps {
    | -  displayData?: CourseListSearchResponse;
> 30 | +  displayData?: CatalogSearchResponse;
> 31 |    totalCourses: number;
> 32 |    pageCount: number;
> 33 |    pageIndex: number;
> 34 |    tableColumns: TableColumn[];
> 35 |    handleFetchData: (params: DataTableParams) => void;
> 36 |  }
```

> The description keeps `totalCourses` here and `courseDataResultsLength` on the intro slot "so existing site plugins keep working", and leaves the seven `CourseCatalog*` slots and their ids (`org.openedx.frontend.slot.catalog.courseCatalog*.v1`) as they are. I'd like to see both change in this PR, and I think it can be done without breaking anyone.
>
> On the names: "course catalog" isn't a term the app should keep once this table holds pathways too, and #177 is about to add a pathway card slot under the `courseCatalogDataTable` prefix, so this is the last cheap moment to settle it. [ADR 0009 §2](https://github.com/openedx/frontend-base/blob/main/docs/decisions/0009-slot-naming-and-lifecycle.rst) bumps the version only "if it still make sense to use the same Identifier", and here it doesn't, so these are new identifiers rather than `v2`s: `CatalogDataTableSlot` with id `org.openedx.frontend.slot.catalog.catalogDataTable.v1` and `totalItems`, `CatalogIntroSlot` with `catalogIntro.v1` and `resultsCount`, and likewise for the search field, control bar, card view, footer and the course card (`catalogDataTableCourseCard.v1`, the card itself is still a course card).
>
> On how: openedx/frontend-base#344 adds a how-to for exactly this shape, a new slot rendered around the old one as its default content, so every existing widget and operation on the old id keeps working, the old interface and the renamed props get `@deprecated` notes pointing at the new ones, each version keeps its own README, and it lands as `feat:`. The how-to walks the same-identifier case; the only difference here is that the new slot's name changes instead of its version suffix. No `idAliases` for this, since an alias would make old and new one slot with one props interface and we want the old props to go away eventually.
>
> The old slots then get removed in a later `feat!:`. I opened #184 to track deprecations like these so each one has a DEPR ticket by the time it reaches `stable`; when this lands I'll add everything from it there.
