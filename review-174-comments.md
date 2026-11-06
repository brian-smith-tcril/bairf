# Draft review comments for openedx/frontend-app-catalog#174

Drafted 2026-11-06 against head `767011e12e`. Each comment is posted as an inline review comment on the PR, on the `RIGHT` side at the line given; the body under each heading is the text to post, verbatim. The ledger entry each one rests on is named so the record stays in `review-174.md`. Status per comment: `draft`, `pending <thread url>`, `posted <thread url>`.

The review summary carries the disclosure; the inline comments do not repeat it. Under each comment, "Diff context" shows the hunk the way the review will, with the anchor lines marked, so the draft reads as the review will.

## Review summary

Status: draft

# ***THIS SECTION WRITTEN BY BRIAN DO NOT EDIT***

> Thanks for addressing my previous review so quickly, and sorry it took me so long to get back to this!
>
> Great call on `CoursesList`! I 100% agree waiting for #176 makes sense there.
> 
> One thing that stood out to me that I didn't bring up in my previous review was
> > The public slot props `courseDataResultsLength` and `totalCourses`, so existing site plugins keep working.
> 
> I'm super happy to see care being put into not breaking the slot API, but I do think we should put effort into moving away from names that no longer make sense. I wrote up a how-to guide in `frontend-base` (still just a PR at the moment: https://github.com/openedx/frontend-base/pull/344) for handling this and other similar types of things.
>
> In the process of that, I also realized the existing slots have slot props being built using types we aren't exporting (https://github.com/openedx/frontend-base/issues/339#issuecomment-6581552081)
> 
> something about claude comments for what makes sense to do in this PR with those in mind

# ***END WRITTEN BY BRIAN SECTION***

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

> For this PR I think that's `CatalogSearchResponse` and `DataTableParams` from here, plus `TableColumn` and `TableColumnFilterChoice` from the data table slot, all exported from `src/index.ts` next to the `*SlotProps`. Since the old name is the one the slot READMEs have been showing, it'd be nice to keep it next to the new one so a site config that picked it up gets pointed at the rename instead of a missing type:
>
> ```ts
> /** @deprecated Renamed to `CatalogSearchResponse`. */
> export type CourseListSearchResponse = CatalogSearchResponse;
> ```
>
> Exporting and deprecating in the same PR feels a little odd, but it goes away in a later `feat!:`. The course-about slots have the same gap, but nothing here touches them so I'd leave those for a follow-up.

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
  37 |  
  38 |  const CourseCatalogDataTableSlot = ({
  39 |    displayData,
```

> Working through what the how-to would look like here, I first had a `v2` of this slot with `totalItems` (and of `CourseCatalogIntroSlot` with `resultsCount`), but a `v2` of a `CourseCatalog*` slot felt wrong when the point is moving away from "course catalog". [ADR 0009 §2](https://github.com/openedx/frontend-base/blob/main/docs/decisions/0009-slot-naming-and-lifecycle.rst) only bumps the version "if it still make sense to use the same Identifier", and I don't think it does once the table holds pathways too, so I think these end up as new slots instead: `CatalogDataTableSlot` (`org.openedx.frontend.slot.catalog.catalogDataTable.v1`, `totalItems`), `CatalogIntroSlot` (`catalogIntro.v1`, `resultsCount`), and the same prefix drop for the search field, control bar, card view, footer and course card. The steps from the how-to are the same, just with a new name instead of a new version suffix: new slot rendered around the old one, `@deprecated` on the old interface and props, a README each, `feat:` now and `feat!:` later. (No `idAliases` for this, that'd make them one slot with one props interface.) I'm open to other thoughts on the names!
>
> #177 adds a pathway card slot under the `courseCatalogDataTable` prefix, so I'd prefer to settle this before that lands. I made #184 to keep track of deprecations like these so each one has a DEPR ticket by the time it reaches `stable`; once this lands I'll add everything from it there.
