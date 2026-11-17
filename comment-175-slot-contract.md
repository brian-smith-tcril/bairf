> [!NOTE]
> This comment was written by Claude (Claude Code) and reviewed before posting.

The change to `CatalogSearchResponse` in `src/data/catalog-search/types.ts` changes the shape of `displayData` on two existing slots. `CourseCatalogDataTableSlotProps` and `CourseCatalogDataTableCardViewSlotProps` both declare `displayData?: CatalogSearchResponse`, so even though neither slot file is in this diff, a widget on `courseCatalogDataTable.v1` or `courseCatalogDataTableCardView.v1` goes from getting course rows to getting course-or-pathway rows. For example, the widget in the [card view slot's README](https://github.com/openedx/frontend-app-catalog/blob/56bc146b9177c1f2e77c1d6ace585dc698a83d9e/src/slots/CourseCatalogDataTableSlots/CourseCatalogDataTableCardViewSlot/README.md#L103-L116) passes each row to `CatalogDataTableCourseCardSlot`, which expects a course. With this change a row can be a pathway, so that becomes a type error.

I think those two slots need new ids, so the new slots can carry the new type while the old ones keep the shape they have today:

- `CatalogSearchResponse` stays as it is here, and is what the new slots carry.
- `CourseListSearchResponse` stops being an alias and keeps [the declaration from before this PR](https://github.com/openedx/frontend-app-catalog/blob/56bc146b9177c1f2e77c1d6ace585dc698a83d9e/src/data/catalog-search/types.ts#L1-L34) as it was, still `@deprecated`. The old slots' `displayData` is typed with it. That includes `index` and `title`, even though the new type drops them: a site could be running a search backend that sends them, and a widget typed against the old shape should keep compiling.
- The new slots are `catalog.catalogDataTable.v1` and `catalog.catalogDataTableCardView.v1`. Each one renders the old slot inside it, like [`CatalogIntroSlot`](https://github.com/openedx/frontend-app-catalog/blob/56bc146b9177c1f2e77c1d6ace585dc698a83d9e/src/slots/CatalogIntroSlot/index.tsx#L28-L47) does, and passes it `displayData` with the pathway rows filtered out:

  ```tsx
  <Slot id="org.openedx.frontend.slot.catalog.catalogDataTableCardView.v1" displayData={displayData}>
    <Slot id="org.openedx.frontend.slot.catalog.courseCatalogDataTableCardView.v1" displayData={courseDisplayData}>
      <CardView ... />
    </Slot>
  </Slot>
  ```
