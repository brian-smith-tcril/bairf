# Draft review comments for openedx/frontend-app-catalog#174

Drafted 2026-11-06 against head `767011e12e`. Each comment is posted as an inline review comment on the PR, on the `RIGHT` side at the line given; the body under each heading is the text to post, verbatim. The ledger entry each one rests on is named so the record stays in `review-174.md`. Status per comment: `draft`, `pending <thread url>`, `posted <thread url>`.

The review summary carries the disclosure; the inline comments do not repeat it. Under each comment, "Diff context" shows the hunk the way the review will, with the anchor lines marked, so the draft reads as the review will.

## Review summary

Status: draft

> Thanks for the quick turnaround on the naming! The rename reads as mechanical to me, and lint, test and build all pass locally at 767011e. I left two comments: one about exporting the types the slot props are built from, and one about the slot names and the two props that stayed under their old names. The second is the one I'd consider blocking, mostly because #177 is about to publish a new slot id under the current prefix; the first is small.
>
> `CoursesList` → `CatalogList` in #176 sounds right to me since that's where it starts rendering pathway cards, and I'd expect the `HomeCoursesListSlot` rename to go the same way as the slots in my comment. The course-about types and the page copy / `/catalog/courses` URL I'm leaving alone until a PR actually touches them.
>
> The inline comments were drafted with Claude Code and reviewed before posting.

## 1. Exports

File: `src/data/catalog-search/types.ts`
Lines: 1 to 3 (`export interface CatalogSearchResponse {` and its first two members), side RIGHT
Ledger: entry 9
Status: draft

Diff context (renamed file, every line is `+`; `>` marks the anchor):

```
> Noticed while reading this: the slot READMEs name this type (`CourseListSearchResponse` before, `CatalogSearchResponse` now) as what `displayData` is, but `src/index.ts` only exports the `*SlotProps` interfaces, so someone writing a widget can read the name and can't import it. Same for `DataTableParams`, `TableColumn` and `TableColumnFilterChoice`. I asked about this in openedx/frontend-base#339 after my first pass here, and the answer was that apps should export the types their slot props are built from.
>
> It'd be great to export those four from `src/index.ts` as part of this. And since openedx/frontend-base#343 (ADR 0018, still in review) treats renaming an export without a deprecated alias as breaking, I think the old name wants to stick around next to the new one:
>
> ```ts
> /** @deprecated Renamed to `CatalogSearchResponse`. */
> export type CourseListSearchResponse = CatalogSearchResponse;
> ```
>
> Exporting and deprecating in the same PR feels a bit odd, but the old name is the one README readers and in-repo site configs have seen, and it can go in a later `feat!:`. Not worried about the course-about types for this PR since nothing here touches them.

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
> I was going to ask for a `v2` of this slot with `totalItems` (and of the intro slot with `resultsCount`), but a `v2` of a `CourseCatalog*` slot felt wrong when the whole point is moving away from "course catalog". [ADR 0009 §2](https://github.com/openedx/frontend-base/blob/main/docs/decisions/0009-slot-naming-and-lifecycle.rst) only bumps the version "if it still make sense to use the same Identifier", and I don't think it does once this table holds pathways too. So I think what we actually want is new slots: `CatalogDataTableSlot` (`org.openedx.frontend.slot.catalog.catalogDataTable.v1`, with `totalItems`), `CatalogIntroSlot` (with `resultsCount`), and the same for the search field, control bar, card view, footer and course card, dropping the prefix everywhere. I'm open to other thoughts on the names.
>
> openedx/frontend-base#344 has a how-to for doing this without breaking existing widgets: the new slot renders around the old one as its default content, the old interface and props get `@deprecated` notes, each keeps its own README, and it lands as `feat:` with the old slots removed in a later `feat!:`. It's written for the same-identifier case, but the steps are the same with a new name instead of a new version suffix. (No `idAliases` for this one; that would make old and new a single slot with a single props interface.)
>
> #177 is about to add a pathway card slot under the `courseCatalogDataTable` prefix, so I'd prefer to sort this out here before that lands. I made #184 to keep track of deprecations like these so each has a DEPR ticket by the time it reaches `stable`; when this lands I'll add everything from it there.
