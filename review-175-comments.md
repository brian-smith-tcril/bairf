# Draft review comments for openedx/frontend-app-catalog#175

Drafted 2026-11-06 against head `089a0cda88`. Six inline comments and a summary. Rests on ledger entries 2, 8, 9 and 10 in `review-175.md`. Status per comment: `draft`, then `pending <thread url>`, then `posted <thread url>`.

## Review summary

Status: draft

Suggested, Brian's voice, edit freely:

> I read through the one commit this PR adds on top of #174 and left a few comments. None of them are blocking on their own. The slot change for `displayData` that we're working through on #174 will carry into this PR once it's rebased, so I'll do another pass then.
>

# ***THIS SECTION WRITTEN BY BRIAN DO NOT EDIT***

> Thanks for splitting these PRs up! I looked through a bit of the diff against #174 and things are mostly looking good! I did notice a couple things, so I had Claude write up a few inline comments.

# ***END WRITTEN BY BRIAN SECTION***

> The inline comments were drafted with Claude Code and reviewed before posting.
>

## Comment 1: switch on `type` in the home list

File: `src/home/components/courses-list/CoursesList.tsx`
Lines: 21-24 (the `CourseResult` extract and the `isCourseResult` guard)
Ledger: entry 8
Status: draft

Diff context:

```
  18 |  
  19 |  import messages from './messages';
  20 |  
> 21 | +type CourseResult = Extract<CatalogSearchResult, { type: 'course' | '_doc' }>;
> 22 | +
> 23 | +/** The home list renders course cards only until pathway cards land. */
> 24 | +const isCourseResult = (result: CatalogSearchResult): result is CourseResult => result.type !== 'pathway';
  25 | +
  26 |  const CARD_GRID_LAYOUT = {
  27 |    xs: 12, md: 6, lg: 4, xl: 3,
```

Body:

> I think we could use `switch`/`case` to clarify the intention here, with `pathway` rendering nothing for now and `course` plus `default` rendering the course card:
>
> ```tsx
> {catalogData?.results?.map((result) => {
>   switch (result.type) {
>     case 'pathway':
>       return null;
>     case 'course':
>     default:
>       return <HomeCourseCardSlot key={result.id} original={result} />;
>   }
> })}
> ```
>
> This makes the "anything we don't recognize is a course" behavior explicit. It also means the `isCourseResult` guard and the `CourseResult` type can go away since the `switch` narrows the type for us. It also sets up a `pathway` case for #176 and #177 to fill in.

## Comment 2: build the union from `Course` and `Pathway`

File: `src/data/catalog-search/types.ts`
Lines: 24-38 (the `CatalogSearchResult` union)
Ledger: entry 9
Status: draft

Diff context:

```
  21 | + * `index` and `title` come from the legacy engine-shaped response; the future
  22 | + * application response shape omits them, so they are optional and unused.
  23 | + */
> 24 | +export type CatalogSearchResult =
> 25 | +  | {
> 26 | +    id: string;
> 27 | +    index?: string;
> 28 | +    type: 'course' | '_doc';
> 29 | +    title?: string;
> 30 | +    data: CourseData;
> 31 | +  }
> 32 | +  | {
> 33 | +    id: string;
> 34 | +    index?: string;
> 35 | +    type: 'pathway';
> 36 | +    title?: string;
> 37 | +    data: PathwayData;
> 38 | +  };
  39 | +
  40 | +/** Search response that can mix course and pathway results. */
  41 | +export interface CatalogSearchResponse extends SearchResponseBase {
```

Body:

> Could this be built from the wrappers that already exist instead of inline members? `Course` (`course-card/types.ts`) and `Pathway` (`pathway-card/types.ts`) are this shape already, and the card slots read them as `original?: Course` (and `original?: Pathway` from #176 on). Narrowing their `type` fields is enough for the union to discriminate, with no new names:
>
> ```ts
> // course-card/types.ts
> type: 'course' | '_doc';
>
> // pathway-card/types.ts
> type: 'pathway';
>
> // here
> export type CatalogSearchResult = Course | Pathway;
> ```
>
> On the course side the only thing that has to change is `mockCourseResponse` in `src/__mocks__/course.ts`, which sets no `type` today. `title` isn't on either wrapper and nothing reads it, which lines up with the ADR's new shape omitting it.

## Comment 3: the mock says "courses" up front

File: `src/__mocks__/catalogSearch.ts`
Lines: 3 (the mock typed as `CatalogSearchResponse`)
Ledger: entry 9
Status: draft

Diff context:

```
   1 | +import type { CatalogSearchResponse } from '@src/data/catalog-search/types';
   2 | +
>  3 | +export const mockCatalogSearchResponse: CatalogSearchResponse = {
   4 | +  took: 1,
   5 | +  total: 3,
   6 | +  results: [
```

Body:

> Typing the mock as the union is what makes `CatalogPage.test.tsx` and `HomePage.test.tsx` each add an `isCourseResult` guard and filter the results before reading course fields, and the filter removes nothing at runtime since every row here is a course. It'd be nice for the mock to say that up front: export the rows as `mockCourseResults: Course[]` and build `mockCatalogSearchResponse` around them, so the tests iterate the typed rows and both guard blocks go.
>
> When pathway rows arrive in #176 they can be a `mockPathwayResults` and a mixed response beside this one, and the course-only assertions (the `Showing 1 - 3` ones, the org counts) don't have to move.

## Comment 4: "Future" and the required category fields

File: `src/generic/pathway-card/types.ts`
Lines: 27-31 (the category fields on `PathwayData`)
Ledger: entry 10
Status: draft

Diff context:

```
  24 | +  imageUrl?: string;
  25 | +  start?: string;
  26 | +  advertisedStart?: string;
> 27 | +  /** Future category badge fields. */
> 28 | +  category?: string;
> 29 | +  categoryLabel?: string;
> 30 | +  categoryBackgroundColor?: string;
> 31 | +  categoryTextColor?: string;
  32 | +  content: PathwayContent;
  33 | +}
  34 | +
```

Body:

> "Future" confused me here (same on `PathwayCardProps` above). I tracked it back to [db76b2d](https://github.com/open-craft/frontend-app-catalog/commit/db76b2d30629e2ac3a3fe64657e48a5edee4e0d0) in #169, when the response shape was still to be decided; now that the ADR specifies it, I'd drop the comment.
>
> Also, the ADR's [Category registry](https://github.com/openedx/frontend-app-catalog/blob/089a0cda88/docs/decisions/0003-use-a-generic-catalog-search-endpoint.rst#L123-L137) section says
> > Pathway `data` includes required `category` and `category_label` and optional `category_background_color`/`category_text_color`.
>
> so I'd expect `category: string` and `categoryLabel: string` here, with just the color pair optional.

## Comment 5: `PathwayCardProps` has no reader here

File: `src/generic/pathway-card/types.ts`
Lines: 1 (`PathwayCardProps`)
Ledger: entry 10
Status: draft

Diff context:

```
>  1 | +export interface PathwayCardProps {
   2 | +  isLoading?: boolean;
   3 | +  pathwayId?: string;
   4 | +  name?: string;
```

Body:

> Nit: nothing in this PR reads `PathwayCardProps` (its first reader is `PathwayCard` in #176). Would you mind moving it there with the card, so this PR stays on the data layer? Non-blocking.

## Comment 6: the `terms` fix is its own PR

File: `src/data/catalog-search/api.ts`
Lines: 36-40 (`terms` and `labels` kept verbatim)
Ledger: entry 2
Status: draft

Diff context:

```
  33 | +      Object.entries(aggs as Record<string, any>).map(([facetName, facet]) => [
  34 | +        facetName,
  35 | +        {
> 36 | +          ...camelCaseObject(facet),
> 37 | +          // Preserve dynamic slug/label keys exactly.
> 38 | +          terms: facet.terms,
> 39 | +          ...(facet.labels ? { labels: facet.labels } : {}),
> 40 | +        },
  41 | +      ]),
  42 | +    );
  43 | +  }
```

Body:

> Keeping `terms` verbatim fixes a bug on master: `camelCaseObject` was rewriting the facet term keys that `transformAggregationsToFilterChoices` sends back as filter values, so any org or slug lodash alters (`open-edx` → `openEdx`) never matched. Since that stands on its own, would you mind breaking it out (with the test for it) into a separate PR ahead of this one? `labels` is new with the ADR's response and belongs here.
