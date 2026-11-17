> [!NOTE]
> This comment was written by Claude (Claude Code) and reviewed before posting.

The change to `CatalogSearchResponse` in `src/data/catalog-search/types.ts` changes the shape of `displayData` on two existing slots. `CourseCatalogDataTableSlotProps` and `CourseCatalogDataTableCardViewSlotProps` both declare `displayData?: CatalogSearchResponse`, so even though neither slot file is in this diff, a widget on `courseCatalogDataTable.v1` or `courseCatalogDataTableCardView.v1` goes from getting course rows to getting course-or-pathway rows. The card view README's [own example](https://github.com/openedx/frontend-app-catalog/blob/56bc146b9177c1f2e77c1d6ace585dc698a83d9e/src/slots/CourseCatalogDataTableSlots/CourseCatalogDataTableCardViewSlot/README.md#L103-L116) stops type-checking, since it passes each row to `CatalogDataTableCourseCardSlot` as `original?: Course`.

I think those two slots need new ids, so the new slots can carry the new type while the old ones keep the shape they have today:

- `CatalogSearchResponse` stays as it is here, and is what the new slots carry.
- `CourseListSearchResponse` stops being an alias and keeps [the declaration from before this PR](https://github.com/openedx/frontend-app-catalog/blob/56bc146b9177c1f2e77c1d6ace585dc698a83d9e/src/data/catalog-search/types.ts#L1-L34) as it was, still `@deprecated`. The old slots' `displayData` is typed with it.
- `catalog.catalogDataTable.v1` (with `totalItems`) and `catalog.catalogDataTableCardView.v1` wrap the old slots the way [`CatalogIntroSlot`](https://github.com/openedx/frontend-app-catalog/blob/56bc146b9177c1f2e77c1d6ace585dc698a83d9e/src/slots/CatalogIntroSlot/index.tsx#L28-L47) does, with the old slots getting `displayData` minus the pathway rows:

  ```tsx
  <Slot id="org.openedx.frontend.slot.catalog.catalogDataTableCardView.v1" displayData={displayData}>
    <Slot id="org.openedx.frontend.slot.catalog.courseCatalogDataTableCardView.v1" displayData={courseDisplayData}>
      <CardView ... />
    </Slot>
  </Slot>
  ```

This is the "renaming a slot when its props change" example in openedx/frontend-base#344, plus the same README, export and #184 bookkeeping the five slots in #174 got.

On keeping the old type word for word, `index` and `title` included: none of the three engines in `edx-search` puts a `title` on a result ([elastic](https://github.com/openedx/edx-search/blob/cf562c2517/src/search/elastic.py#L91-L98), [meilisearch](https://github.com/openedx/edx-search/blob/cf562c2517/src/search/meilisearch.py#L635-L638), [typesense](https://github.com/openedx/edx-search/blob/cf562c2517/src/search/typesense.py#L622-L625)), so it's tempting to fix `title: string` while we're in here. But a site can swap in a search backend that does send it, and a typed widget written against `title: string` would stop compiling. Leaving the old type alone, and passing the rows through as received, is the one option that doesn't break a widget either way.
