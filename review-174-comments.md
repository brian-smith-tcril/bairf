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
> **Types the slot props are built from.** The two data table slots' props use `CatalogSearchResponse` and `DataTableParams` from `src/data/catalog-search/types.ts`, and `TableColumn` and `TableColumnFilterChoice` declared in `CourseCatalogDataTableSlot/index.tsx`. `src/index.ts` exports only the `*SlotProps` interfaces, and the package's `exports` map rules out deep imports, so none of the four can be imported by a widget today, even though the slot READMEs name three of them. Exporting all four from `src/index.ts` beside the `*SlotProps` closes that. Since the READMEs showed `CourseListSearchResponse` until this PR, keeping it beside the new name as a deprecated alias gives anything that picked the name up a pointer to the rename, and it can be removed in a later `feat!:`:
>
> ```ts
> /** @deprecated Renamed to `CatalogSearchResponse`. */
> export type CourseListSearchResponse = CatalogSearchResponse;
> ```
>
> The course-about slots have the same gap (`CourseAboutData`, `SinglePaidMode`, `SocialLink` and two more), but nothing in this PR touches them, so that is a follow-up.
>
> **The two slot props, and the slot names.** The how-to's path for `courseDataResultsLength` → `resultsCount` and `totalCourses` → `totalItems` would be a `v2` of `CourseCatalogIntroSlot` and `CourseCatalogDataTableSlot`. But [ADR 0009 §2](https://github.com/openedx/frontend-base/blob/main/docs/decisions/0009-slot-naming-and-lifecycle.rst) only increments the version "if it still make sense to use the same Identifier", and `courseCatalog*` stops making sense once the table holds pathways (#175) and a pathway card renders under it (#177). So the change is a new identifier rather than a version bump, with the prefix dropped from the whole family. Each slot should get exactly one new identifier across the stack, so where it happens depends on where the slot's contract last changes. Five slots have no contract change after this PR, so they can be done here: `CatalogIntroSlot` (`org.openedx.frontend.slot.catalog.catalogIntro.v1`, with `resultsCount`), `CatalogSearchFieldSlot`, `CatalogDataTableControlBarSlot`, `CatalogDataTableTableFooterSlot` and `CatalogDataTableCourseCardSlot` (`catalogDataTableCourseCard.v1`; the card itself is still a course card). The data table and card view slots are different: #175 changes the shape of `CatalogSearchResponse` (results become a course-or-pathway union), which changes `displayData`'s contract on both even though the slot files are untouched, so #175 needs a new version of each anyway. Doing `CatalogDataTableSlot` (`catalogDataTable.v1`, with `totalItems`) and `CatalogDataTableCardViewSlot` there, born with the union type, gives each one bump instead of two. The pathway card slot added in #177 then lands as `catalogDataTablePathwayCard.v1` under the new prefix. The steps are otherwise the how-to's: the new slot renders around the old one as its default content so existing widgets and operations keep working, the old interface and props get `@deprecated` notes, each version keeps its own README, it lands as `feat:` and the old slots go in a later `feat!:`. `idAliases` does not fit here, since an alias makes old and new one slot with one props interface.

Close, Brian's voice (suggested):

> I'm open to other thoughts on the names, but I'd prefer to settle them now so #175 and #177 can build on the new ones. I made #184 to keep track of deprecations like these so each one has a DEPR ticket by the time it reaches `stable`; once this lands I'll add everything from it there. Thanks for working through this with me!
