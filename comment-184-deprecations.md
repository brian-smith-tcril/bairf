> [!NOTE]
> This comment was written by Claude (Claude Code) and reviewed before posting.

Deprecations from #174 (56bc146, first released in `v1.0.0-alpha.5`).

**Slot ids**, all under `org.openedx.frontend.slot.catalog.`

| Deprecated | Use instead | How the old id keeps working |
|---|---|---|
| `courseCatalogIntro.v1` | `catalogIntro.v1` | rendered inside the new slot |
| `courseCatalogSearchField.v1` | `catalogSearchField.v1` | `idAliases` on the new slot |
| `courseCatalogDataTableControlBar.v1` | `catalogDataTableControlBar.v1` | `idAliases` on the new slot |
| `courseCatalogDataTableTableFooter.v1` | `catalogDataTableTableFooter.v1` | `idAliases` on the new slot |
| `courseCatalogDataTableCourseCard.v1` | `catalogDataTableCourseCard.v1` | `idAliases` on the new slot |

**Slot prop**

| Deprecated | Use instead |
|---|---|
| `courseDataResultsLength` on `courseCatalogIntro.v1` | `resultsCount` on `catalogIntro.v1` |

**Exported types**

| Deprecated | Use instead |
|---|---|
| `CourseCatalogIntroSlotProps` | `CatalogIntroSlotProps` |
| `CourseCatalogSearchFieldSlotProps` | `CatalogSearchFieldSlotProps` |
| `CourseCatalogDataTableControlBarSlotProps` | `CatalogDataTableControlBarSlotProps` |
| `CourseCatalogDataTableCourseCardSlotProps` | `CatalogDataTableCourseCardSlotProps` |
| `CourseListSearchResponse` | `CatalogSearchResponse` |
| `CourseListSearchParams` | `CatalogSearchParams` |
