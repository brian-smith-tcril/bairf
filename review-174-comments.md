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

Status: posted by Brian in his own words https://github.com/openedx/frontend-app-catalog/pull/174#issuecomment-6714097028 (2026-11-07 22:51Z). His comment: #344 gained slot rename examples; #346 is the "how to document slots" issue; README names as `README.{oldSlotName}.{oldSlotVersion}.md`; some of these are pure renames, so `idAliases` instead of wrapping. Not in it, from the draft below: which four slots are the pure renames, the alias code, the single-README consequence, the #175 data table and card view staying wrapped, and the stale PR body. rpenido did all of the first four unprompted in 9a5363a06 (2026-11-10; entry 12, "At cb882add42"); the stale PR body is still not asked for. Rests on ledger entries 3 and 12. Anchors: rpenido's comment https://github.com/openedx/frontend-app-catalog/pull/174#issuecomment-6693801468, head `1e1c048994`.

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

## Review summary, 2026-11-16 review

Status: draft. Anchors and the patch are against head `cb882add42`. Brian submits this review himself and pastes the summary; his own part (the approval, and the PR body ask, non-blocking, stale points in ledger entry 12) is his to write and goes above the portion below. The disclosure line covers comments 1 to 5 as well, since the summary is the one place it goes; keeping or rewording it is his call.

The README wording for the four READMEs whose prose lines are outside the diff goes here, not inline (Brian, 2026-11-16). The patch was generated from the files at `cb882add42` by replacing "Course catalog" with "Catalog" on the 18 prose lines (search field 16, 22, 63, 65, 95; control bar 15, 21, 62, 64, 94; table footer 10, 16, 57, 59; course card 21, 27, 72, 102) and passes `git apply --check --unidiff-zero` in the code worktree at that head.

Claude portion:

> *This portion was written by Claude Code and reviewed before posting.*
>
> The inline suggestions on `src/slots/CatalogIntroSlot/README.md` change "Course catalog" to "Catalog" in its prose. The other four renamed READMEs have the same wording on lines that aren't part of the diff, so the same change for those is here instead.
>
> <details>
> <summary>Patch for the four READMEs (18 lines, applies with <code>git apply --unidiff-zero</code>)</summary>
>
> ```diff
> --- a/src/slots/CatalogSearchFieldSlot/README.md
> +++ b/src/slots/CatalogSearchFieldSlot/README.md
> @@ -16 +16 @@
> -This slot is used to replace/modify/hide the entire Course catalog page search field.
> +This slot is used to replace/modify/hide the entire Catalog page search field.
> @@ -22 +22 @@
> -![Course catalog page search field slot with default content](./images/screenshot_default.png)
> +![Catalog page search field slot with default content](./images/screenshot_default.png)
> @@ -63 +63 @@
> -![🔍 in Course catalog page search field slot](./images/screenshot_custom_simple.png)
> +![🔍 in Catalog page search field slot](./images/screenshot_custom_simple.png)
> @@ -65 +65 @@
> -Add the following to your site config to replace the Course catalog search field entirely (in this case with a centered "🔍" `h1` tag).
> +Add the following to your site config to replace the Catalog search field entirely (in this case with a centered "🔍" `h1` tag).
> @@ -95 +95 @@
> -Add the following to your site config to replace the Course catalog search field with a floating-label input plus a row of "popular searches" chips that invoke `setSearchInput` / `handleSearch` when clicked.
> +Add the following to your site config to replace the Catalog search field with a floating-label input plus a row of "popular searches" chips that invoke `setSearchInput` / `handleSearch` when clicked.
> --- a/src/slots/CourseCatalogDataTableSlots/CatalogDataTableControlBarSlot/README.md
> +++ b/src/slots/CourseCatalogDataTableSlots/CatalogDataTableControlBarSlot/README.md
> @@ -15 +15 @@
> -This slot is used to replace/modify/hide the entire Course catalog page data table control bar.
> +This slot is used to replace/modify/hide the entire Catalog page data table control bar.
> @@ -21 +21 @@
> -![Course catalog page data table control bar slot with default content](./images/screenshot_default.png)
> +![Catalog page data table control bar slot with default content](./images/screenshot_default.png)
> @@ -62 +62 @@
> -![🎛️ in Course catalog page data table control bar slot](./images/screenshot_custom_simple.png)
> +![🎛️ in Catalog page data table control bar slot](./images/screenshot_custom_simple.png)
> @@ -64 +64 @@
> -Add the following to your site config to replace the Course catalog control bar entirely (in this case with a centered "🎛️" `h1` tag).
> +Add the following to your site config to replace the Catalog control bar entirely (in this case with a centered "🎛️" `h1` tag).
> @@ -94 +94 @@
> -Add the following to your site config to replace the Course catalog control bar with an alert component that reads the slot's `currentPageResultsCount` and `totalResultsCount` props.
> +Add the following to your site config to replace the Catalog control bar with an alert component that reads the slot's `currentPageResultsCount` and `totalResultsCount` props.
> --- a/src/slots/CourseCatalogDataTableSlots/CatalogDataTableTableFooterSlot/README.md
> +++ b/src/slots/CourseCatalogDataTableSlots/CatalogDataTableTableFooterSlot/README.md
> @@ -10 +10 @@
> -This slot is used to replace/modify/hide the entire Course catalog page data table footer.
> +This slot is used to replace/modify/hide the entire Catalog page data table footer.
> @@ -16 +16 @@
> -![Course catalog page data table footer slot with default content](./images/screenshot_default.png)
> +![Catalog page data table footer slot with default content](./images/screenshot_default.png)
> @@ -57 +57 @@
> -![🦶 in Course catalog page data table footer slot](./images/screenshot_custom_simple.png)
> +![🦶 in Catalog page data table footer slot](./images/screenshot_custom_simple.png)
> @@ -59 +59 @@
> -Add the following to your site config to replace the Course catalog data table footer entirely (in this case with a centered "🦶" `h1` tag).
> +Add the following to your site config to replace the Catalog data table footer entirely (in this case with a centered "🦶" `h1` tag).
> --- a/src/slots/CourseCatalogDataTableSlots/CourseCatalogDataTableCardViewSlot/CatalogDataTableCourseCardSlot/README.md
> +++ b/src/slots/CourseCatalogDataTableSlots/CourseCatalogDataTableCardViewSlot/CatalogDataTableCourseCardSlot/README.md
> @@ -21 +21 @@
> -This slot is used to replace/modify/hide the entire Course catalog page data table course card.
> +This slot is used to replace/modify/hide the entire Catalog page data table course card.
> @@ -27 +27 @@
> -![Course catalog page data table course card slot with default content](./images/screenshot_default.png)
> +![Catalog page data table course card slot with default content](./images/screenshot_default.png)
> @@ -72 +72 @@
> -![🃏 in Course catalog page data table course card slot](./images/screenshot_custom_simple.png)
> +![🃏 in Catalog page data table course card slot](./images/screenshot_custom_simple.png)
> @@ -102 +102 @@
> -![Custom card in Course catalog page data table course card slot](./images/screenshot_custom_with_props.png)
> +![Custom card in Catalog page data table course card slot](./images/screenshot_custom_with_props.png)
> ```
>
> </details>

## Comment 1: member-level `@deprecated` on `courseDataResultsLength`

Drafted 2026-11-16 against head `cb882add42`; the sections above were drafted against earlier heads and are posted.

File: `src/slots/CatalogIntroSlot/index.tsx`
Lines: 16 (the `courseDataResultsLength` member of the deprecated `CourseCatalogIntroSlotProps`)
Ledger: entry 12
Status: draft

**Diff context**

```
  13 | +/** @deprecated Use `CatalogIntroSlotProps` and `org.openedx.frontend.slot.catalog.catalogIntro.v1`. */
  14 | +export interface CourseCatalogIntroSlotProps {
  15 | +  searchString: string;
> 16 | +  courseDataResultsLength?: number;
  17 | +}
  18 | +
  19 | +const CatalogIntroSlot = ({
```

> It'd be nice to have a note on the prop itself too, so hovering it in an existing widget points at its new name.
>
> ```suggestion
>   /** @deprecated Use `resultsCount` on `CatalogIntroSlotProps`. */
>   courseDataResultsLength?: number;
> ```

## Comment 2: "Course catalog" wording in the intro README, lines 11-16

File: `src/slots/CatalogIntroSlot/README.md`
Lines: 11-16 (the `searchString` prop description and the Description sentence; 2 lines changed by the suggestion)
Ledger: entry 12
Status: draft

**Diff context**

```
   8 | +
   9 | +### Slot Props
  10 | +
> 11 | +* `searchString: string` — the current search query string entered in the course catalog search field.
> 12 | +* `resultsCount?: number` — the number of results on the current search page (undefined until the search response arrives).
> 13 | +
> 14 | +## Description
> 15 | +
> 16 | +This slot is used to replace/modify/hide the entire Course catalog page intro section.
  17 | +
  18 | +## Examples
  19 | +
```

Suggestion only, no text (Brian, 2026-11-16).

> ```suggestion
> * `searchString: string` — the current search query string entered in the catalog search field.
> * `resultsCount?: number` — the number of results on the current search page (undefined until the search response arrives).
>
> ## Description
>
> This slot is used to replace/modify/hide the entire Catalog page intro section.
> ```

## Comment 3: "Course catalog" wording in the intro README, lines 22-26

File: `src/slots/CatalogIntroSlot/README.md`
Lines: 22-26 (the two image alt texts under "Default content" and "Wrapped with a red border"; 2 lines changed by the suggestion)
Ledger: entry 12
Status: draft

**Diff context**

```
  19 | +
  20 | +### Default content
  21 | +
> 22 | +![Course catalog page intro slot with default content](./images/screenshot_default.png)
> 23 | +
> 24 | +### Wrapped with a red border (custom layout)
> 25 | +
> 26 | +![Course catalog intro wrapped in a dashed red border](./images/screenshot_custom_wrap.png)
  27 | +
  28 | +To keep the default content but wrap it in extra markup, replace the slot's **layout**.
  29 | +
```

Suggestion only, no text (Brian, 2026-11-16).

> ```suggestion
> ![Catalog page intro slot with default content](./images/screenshot_default.png)
>
> ### Wrapped with a red border (custom layout)
>
> ![Catalog intro wrapped in a dashed red border](./images/screenshot_custom_wrap.png)
> ```

## Comment 4: "Course catalog" wording in the intro README, lines 63-65

File: `src/slots/CatalogIntroSlot/README.md`
Lines: 63-65 (the image alt text and the sentence under "Replaced with a simple custom component"; 2 lines changed by the suggestion)
Ledger: entry 12
Status: draft

**Diff context**

```
  60 | +
  61 | +### Replaced with a simple custom component
  62 | +
> 63 | +![🕵️ in Course catalog page intro slot](./images/screenshot_custom_simple.png)
> 64 | +
> 65 | +Add the following to your site config to replace the Course catalog intro entirely (in this case with a centered "🕵️" `h1` tag).
  66 | +
  67 | +```diff
  68 | +-import { EnvironmentTypes, SiteConfig, ... } from '@openedx/frontend-base';
```

Suggestion only, no text (Brian, 2026-11-16).

> ```suggestion
> ![🕵️ in Catalog page intro slot](./images/screenshot_custom_simple.png)
>
> Add the following to your site config to replace the Catalog intro entirely (in this case with a centered "🕵️" `h1` tag).
> ```

## Comment 5: "Course catalog" wording in the intro README, line 95

File: `src/slots/CatalogIntroSlot/README.md`
Lines: 95 (the sentence introducing the alert example; 1 line changed by the suggestion)
Ledger: entry 12
Status: draft

**Diff context**

```
  92 | +
  93 | +![Alert component reading searchString and resultsCount](./images/screenshot_custom_with_props.png)
  94 | +
> 95 | +Add the following to your site config to replace the Course catalog intro with an alert component that reads the slot's `searchString` and `resultsCount` props.
  96 | +
  97 | +```diff
  98 | +-import { EnvironmentTypes, SiteConfig, ... } from '@openedx/frontend-base';
```

Suggestion only, no text (Brian, 2026-11-16).

> ```suggestion
> Add the following to your site config to replace the Catalog intro with an alert component that reads the slot's `searchString` and `resultsCount` props.
> ```
