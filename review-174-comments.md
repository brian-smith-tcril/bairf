# Draft review comments for openedx/frontend-app-catalog#174

Drafted 2026-11-06 against head `767011e12e`. This review is one body with no inline comments: the asks are about the PR's scope (what gets exported, which slots are renamed), not about a line. Brian's section is his; the Claude portion is written as Claude's and labeled so in the body. Rests on ledger entries 3 and 9 in `review-174.md`. Status: `draft`, then `posted <review url>`.

## Review summary

Status: posted https://github.com/openedx/frontend-app-catalog/pull/174#pullrequestreview-5803908229 (2026-11-06, submitted as a comment review, no inline comments)

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
> The steps are the how-to's, with the new name standing in for the new version suffix. `idAliases` doesn't fit here: an alias would make old and new one slot with one props interface.
>
> _____

# ***THIS SECTION WRITTEN BY BRIAN DO NOT EDIT***

> I'm open to other names (my goal was just "don't say 'Course Catalog' anymore"), and other thoughts on when to make new slots/slot versions (you have a better sense of what's yet-to-come than I do).
> 
> Let me know if you have any questions/concerns (or suggestions for how to improve the `frontend-base` docs I PR'd!)
> 
> I know this review has gotten a little bigger/gone a little deeper than either of us expected at first, so I want to say thank you for being so patient and understanding. Looking forward to getting this one landed!

# ***END WRITTEN BY BRIAN SECTION***

## Reply to rpenido's 2026-11-06 comment

Status: posted by Brian in his own words https://github.com/openedx/frontend-app-catalog/pull/174#issuecomment-6714097028 (2026-11-07 22:51Z). His comment: #344 gained slot rename examples; #346 is the "how to document slots" issue; README names as `README.{oldSlotName}.{oldSlotVersion}.md`; some of these are pure renames, so `idAliases` instead of wrapping. Not in it, from the draft below: which four slots are the pure renames, the alias code, the single-README consequence, the #175 data table and card view staying wrapped, and the stale PR body. Those are open for the next pass. Rests on ledger entries 3 and 12. Anchors: rpenido's comment https://github.com/openedx/frontend-app-catalog/pull/174#issuecomment-6693801468, head `1e1c048994`.

# ***THIS SECTION WRITTEN BY BRIAN DO NOT EDIT***

> (quote about renames not covered in how-to)
> great call! i added a section to the how-to to cover those.
>
> i also realized that some of these are *pure* renames (with no prop changes), so we can skip the wrapping and just use aliases instead.

# ***END WRITTEN BY BRIAN SECTION***

The quote to fill in, from rpenido's comment:

> Note that we have a case still not covered by https://github.com/openedx/frontend-base/pull/344: Since this is not a new version, we are deprecating one slot in favor of another. Since I renamed the old folder, I kept the older documentation as `README.deprecated.md` in each (new) slot folder, and the README links to it.

Facts the comment can carry, for Brian to fold in or leave out (not Claude-voiced; no disclosure needed unless he keeps the list verbatim):

- The pure renames at `1e1c048994`, props identical old to new, old `*SlotProps` declared as a type alias of the new: `CatalogSearchFieldSlot`, `CatalogDataTableControlBarSlot`, `CatalogDataTableTableFooterSlot` (no props), `CatalogDataTableCourseCardSlot`.
- What each becomes: one `<Slot id="<new id>" idAliases={['<old id>']} ...props>`, no inner `<Slot>`, no `README.deprecated.md`; the one README notes the old id as a deprecated alias. The deprecated `*SlotProps` type alias stays as is (the type name changed even though the shape did not).
- The intro stays wrapped: `courseDataResultsLength` → `resultsCount` is a prop change, so one props interface cannot serve both ids. The data table in #175 is the same case.
- The `idAliases` mechanism is openedx/frontend-base#178 (merged 2026-02-26): operations under an alias id apply to the slot as if under its id.
- The PR body still lists the slot props and ids as unchanged (entry 12); worth a line asking for the body to catch up, if Brian wants it in this comment.

Draft of the whole comment, Brian's voice, his two sentences kept verbatim (capitalization is his call). Nothing here is Claude-voiced unless he keeps it as is, in which case the disclosure line from the review goes at the top:

> > Note that we have a case still not covered by https://github.com/openedx/frontend-base/pull/344: Since this is not a new version, we are deprecating one slot in favor of another. Since I renamed the old folder, I kept the older documentation as `README.deprecated.md` in each (new) slot folder, and the README links to it.
>
> great call! i added a section to the how-to to cover those.
>
> i also realized that some of these are *pure* renames (with no prop changes), so we can skip the wrapping and just use aliases instead.
>
> The how-to now has two rename examples: [renaming a slot](https://github.com/brian-smith-tcril/frontend-base/blob/079dc92/docs/how_tos/add-a-slot-version.md#example-renaming-a-slot), where nothing about the slot's props changes and the old id is kept in `idAliases`, and [renaming a slot when its props change](https://github.com/brian-smith-tcril/frontend-base/blob/079dc92/docs/how_tos/add-a-slot-version.md#example-renaming-a-slot-when-its-props-change), which is the wrapping you did here.
>
> For this PR that works out to:
>
> | Slot | Props change | Approach |
> |---|---|---|
> | `catalogIntro` | `courseDataResultsLength` → `resultsCount` | wrap, as you have it |
> | `catalogSearchField` | none | `idAliases` |
> | `catalogDataTableControlBar` | none | `idAliases` |
> | `catalogDataTableTableFooter` | none | `idAliases` |
> | `catalogDataTableCourseCard` | none | `idAliases` |
>
> So for those four, would you mind swapping the inner `<Slot>` for an alias on the outer one, e.g.
>
> ```tsx
> <Slot
>   id="org.openedx.frontend.slot.catalog.catalogSearchField.v1"
>   idAliases={['org.openedx.frontend.slot.catalog.courseCatalogSearchField.v1']}
>   ...
> ```
>
> With that there's one slot per folder again, so each of those goes back to a single `README.md` (with a note at the top that the old id is a deprecated alias) instead of `README.md` + `README.deprecated.md`. The deprecated `CourseCatalog*SlotProps` type aliases are good as they are.
>
> For the intro (and the data table and card view in #175, since `displayData`'s type changes there), the wrapping is right. On the README naming for those, the how-to names the old one after the old slot, so `README.courseCatalogIntro.v1.md` rather than `README.deprecated.md`. That convention is only shown by example at the moment; writing it down properly is https://github.com/openedx/frontend-base/issues/346.
>
> One last small thing: it'd be great to update the PR body, it still lists the slot ids and the two props as unchanged.
>
> Thanks again for working through all of this with me!

Facts behind the table, checked at `1e1c048994`: `CatalogSearchFieldSlot`, `CatalogDataTableControlBarSlot`, `CatalogDataTableTableFooterSlot` and `CatalogDataTableCourseCardSlot` each render the new id around the old, with the old `*SlotProps` declared as a type alias of the new (the footer has no props), and each folder holds `README.md`, `README.deprecated.md`, `images/` and `index.tsx`. The intro renames `courseDataResultsLength` to `resultsCount`. The alias mechanism is openedx/frontend-base#178. The anchors are GitHub's for the `## Example:` headings on `079dc92`.

