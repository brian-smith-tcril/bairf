# Draft review comments for openedx/frontend-app-catalog#174

Drafted 2026-11-06 against head `767011e12e`. This review is one body with no inline comments: the asks are about the PR's scope (what gets exported, which slots are renamed), not about a line. Brian's section is his; the Claude portion is written as Claude's and labeled so in the body. Rests on ledger entries 3 and 9 in `review-174.md`. Status: `draft`, then `posted <review url>`.

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
> _____

# ***END WRITTEN BY BRIAN SECTION***

Lead-in, Brian's voice (suggested; outside the do-not-edit section so edit freely):

> With both of those in mind, I had Claude look through the PR and write up what it thinks makes sense to do here. Its write-up is below; I've read through it and agree with it.

Claude portion, posted verbatim:

> *This portion was written by Claude Code and reviewed before posting.*
>
> **Types the slot props are built from**
>
> `src/index.ts` exports only the `*SlotProps` interfaces, and the package's `exports` map rules out deep imports, so a widget can't import any of the types those interfaces use. For the slots this PR touches, that is:
>
> | Type | Declared in | Used by | Named in a README |
> |---|---|---|---|
> | `CatalogSearchResponse` | `src/data/catalog-search/types.ts` | `displayData` on the data table and card view slots | yes |
> | `DataTableParams` | `src/data/catalog-search/types.ts` | `handleFetchData` on the data table slot | yes |
> | `TableColumn` | `CourseCatalogDataTableSlot/index.tsx` | `tableColumns` on the data table slot | yes |
> | `TableColumnFilterChoice` | `CourseCatalogDataTableSlot/index.tsx` | `TableColumn.filterChoices` | no |
>
> What makes sense in this PR:
>
> - Export all four from `src/index.ts` beside the `*SlotProps`.
> - Keep the old name beside the new one as a deprecated alias.
>
>   ```ts
>   /** @deprecated Renamed to `CatalogSearchResponse`. */
>   export type CourseListSearchResponse = CatalogSearchResponse;
>   ```
>
>
> **The two slot props, and the slot names**
>
> Renaming the two props would normally mean a `v2` of each slot. Here it means a new identifier instead:
>
> - [ADR 0009 §2](https://github.com/openedx/frontend-base/blob/main/docs/decisions/0009-slot-naming-and-lifecycle.rst) bumps the version only "if it still make sense to use the same Identifier".
> - `courseCatalog*` stops making sense once the table holds pathways (#175) and a pathway card renders under it (#177).
> - So every slot in the family gets a new identifier with the prefix dropped, not a `v2`.
>
> Each slot should get exactly one new identifier across the stack, so the PR it happens in is the one where the slot's contract last changes:
>
> | Slot today | New identifier | Props change | Last contract change | Lands in |
> |---|---|---|---|---|
> | `CourseCatalogIntroSlot` | `catalog.catalogIntro.v1` | `courseDataResultsLength` → `resultsCount` | none after this PR | #174 |
> | `CourseCatalogSearchFieldSlot` | `catalog.catalogSearchField.v1` | none | none after this PR | #174 |
> | `CourseCatalogDataTableControlBarSlot` | `catalog.catalogDataTableControlBar.v1` | none | none after this PR | #174 |
> | `CourseCatalogDataTableTableFooterSlot` | `catalog.catalogDataTableTableFooter.v1` | none | none after this PR | #174 |
> | `CourseCatalogDataTableCourseCardSlot` | `catalog.catalogDataTableCourseCard.v1` | none (it is still a course card) | none after this PR | #174 |
> | `CourseCatalogDataTableSlot` | `catalog.catalogDataTable.v1` | `totalCourses` → `totalItems` | `displayData`'s type becomes the course-or-pathway union | #175 |
> | `CourseCatalogDataTableCardViewSlot` | `catalog.catalogDataTableCardView.v1` | none | `displayData`'s type becomes the union | #175 |
> | pathway card (new) | `catalog.catalogDataTablePathwayCard.v1` | — | born | #177 |
>
> The data table and card view files are untouched by #175, but the type they name changes shape there, which is the how-to's "changing a prop's type" case, so #175 needs a new version of each anyway. Doing their renames there, born with the union type, gives each one bump instead of two.
>
> The steps are otherwise the how-to's:
>
> - The new slot renders around the old one as its default content, so existing widgets and operations keep working.
> - The old interface and props get `@deprecated` notes pointing at the new ones.
> - Each version keeps its own README.
> - It lands as `feat:`; the old slots go in a later `feat!:`.
> - No `idAliases`: an alias makes old and new one slot with one props interface.

Close, Brian's voice (suggested):

> I'm open to other thoughts on the names, but I'd prefer to settle them now so #175 and #177 can build on the new ones. I made #184 to keep track of deprecations like these so each one has a DEPR ticket by the time it reaches `stable`; once this lands I'll add everything from it there. Thanks for working through this with me!
