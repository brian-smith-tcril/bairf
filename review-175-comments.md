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
> This makes the "anything we don't recognize is a course" behavior explicit. It also means the `isCourseResult` guard and the `CourseResult` type can go away since the `switch` narrows the type for us (and sets up a `pathway` case for #176 and #177 to use).

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

> Could this be `Course | Pathway` instead of two new object types? They already have the same fields (`id`, `index?`, `type`, `data`), and the card slots already take them as `original?: Course` (and `original?: Pathway` once #176 lands). The only thing missing is for `type` to be specific enough to tell them apart:
>
> ```ts
> // src/generic/course-card/types.ts
> export interface Course {
>   // ...
>   type: 'course' | '_doc';
> }
>
> // src/generic/pathway-card/types.ts
> export interface Pathway {
>   // ...
>   type: 'pathway';
> }
>
> // src/data/catalog-search/types.ts
> export type CatalogSearchResult = Course | Pathway;
> ```
>
> On the course side the only fallout I found is `mockCourseResponse` in `src/__mocks__/course.ts`, which doesn't set `type` today and would need `type: '_doc'`. This also drops `title`, which nothing reads and which the ADR's new response shape leaves out anyway.

## Comment 3: type the mock rows instead of filtering in the tests

File: `src/home/HomePage.test.tsx`
Lines: 36-42 (the `CourseResult` type, the `isCourseResult` guard and the `courseResults` filter)
Ledger: entry 9
Status: draft

Diff context:

```
  33 |  const { getAppConfig: actualGetAppConfig } = jest.requireActual('@openedx/frontend-base');
  34 |  const mockedGetAppConfig = getAppConfig as jest.Mock;
    | -const mockCourseListSearch = useCourseListSearch as jest.Mock;
  35 | +const mockCatalogSearch = useCatalogSearch as jest.Mock;
> 36 | +/**
> 37 | + * The search response can mix courses and pathways; narrow to the course arm
> 38 | + * before reading course-only fields off `data`.
> 39 | + */
> 40 | +type CourseResult = Extract<CatalogSearchResult, { type: 'course' | '_doc' }>;
> 41 | +const isCourseResult = (result: CatalogSearchResult): result is CourseResult => result.type !== 'pathway';
> 42 | +const courseResults = mockCatalogSearchResponse.results.filter(isCourseResult);
  43 |  
  44 |  const formatDateForTest = (dateString: string) => new Intl.DateTimeFormat(
  45 |    'en-US',
```

Body:

> Could the mock export its course rows with the course type already on them?
>
> ```ts
> export const mockCourseResults: Course[] = [ /* the three rows */ ];
>
> export const mockCatalogSearchResponse: CatalogSearchResponse = {
>   // ...
>   results: mockCourseResults,
> };
> ```
>
> Then this test can read `mockCourseResults[index]` and this block isn't needed. When #176 adds pathway rows, they can go in a `mockPathwayResults` next to it, and the tests that only care about courses don't have to change.

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
> but all four are optional here. I'm not sure which one is right, but we should make sure they're aligned.

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

> Nothing in this PR reads `PathwayCardProps` (its first reader is `PathwayCard` in #176). I think it makes more sense to wait until there's something using it to add it.

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
