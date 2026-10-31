# Draft review comments for openedx/frontend-app-learner-dashboard#879

Drafted 2026-10-31 against head `f4852b343a`. Each comment is posted as an inline review comment on the PR, on the `RIGHT` side at the line given; the body under each heading is the text to post, verbatim. The ledger entry each one rests on is named so the record stays in `review-879.md`. Status per comment: `draft`, `posted <thread url>`.

The review summary carries the disclosure; the inline comments do not repeat it. Under each comment, "Diff context" shows the hunk the way the review will, with the anchor lines marked, so the draft reads as the review will.

## Review summary

Status: draft

> Three things from a first pass, all inline: the heading icon, the category colors, and the Course badge. The icon one is what I'd want changed before merge; the other two are conversations that reach past this PR. The inline comments were drafted with Claude Code and reviewed before posting.

## 1. Icon

File: `src/utils/icons/CardsStackIcon.tsx`
Line: 3 (`export const CardsStackIcon`), side RIGHT
Ledger: entry 5
Status: draft

Diff context (new file, every line is `+`; `>` marks the anchor):

```
   1 | +import React from 'react';
   2 | +
>  3 | +export const CardsStackIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
   4 | +  <svg
   5 | +    xmlns="http://www.w3.org/2000/svg"
   6 | +    width={24}
```

> Is there a specific reason for using an inline SVG here? From the conversation in Figma I can see that it's [from Material Symbols](https://fonts.google.com/icons?selected=Material+Symbols+Outlined:cards_stack:FILL@0;wght@400;GRAD@0;opsz@24&icon.query=card&icon.size=24&icon.color=%23e3e3e3&icon.set=Material+Symbols). I'd much prefer to use an [existing Paragon icon](https://paragon-openedx.netlify.app/foundations/icons/) here instead. The ones that seem the most visually similar to me are:
>
> - [`LibraryBooks`](https://github.com/openedx/paragon/blob/release-23.x/icons/svg/library_books.svg) <img src="https://raw.githubusercontent.com/openedx/paragon/release-23.x/icons/svg/library_books.svg" width="32" alt="LibraryBooks">
> - [`DynamicFeed`](https://github.com/openedx/paragon/blob/release-23.x/icons/svg/dynamic_feed.svg) <img src="https://raw.githubusercontent.com/openedx/paragon/release-23.x/icons/svg/dynamic_feed.svg" width="32" alt="DynamicFeed">
> - [`AutoAwesomeMotion`](https://github.com/openedx/paragon/blob/release-23.x/icons/svg/auto_awesome_motion.svg) <img src="https://raw.githubusercontent.com/openedx/paragon/release-23.x/icons/svg/auto_awesome_motion.svg" width="32" alt="AutoAwesomeMotion">
> - [`Collections`](https://github.com/openedx/paragon/blob/release-23.x/icons/svg/collections.svg) <img src="https://raw.githubusercontent.com/openedx/paragon/release-23.x/icons/svg/collections.svg" width="32" alt="Collections">
> - [`FilterNone`](https://github.com/openedx/paragon/blob/release-23.x/icons/svg/filter_none.svg) <img src="https://raw.githubusercontent.com/openedx/paragon/release-23.x/icons/svg/filter_none.svg" width="32" alt="FilterNone">
>
> If none of those are acceptable from a design perspective I can look into adding the specific material symbol icon for this to Paragon as we've done with some other SVGs in the past.

## 2. Category colors

File: `src/components/CategoryBadge.tsx`
Lines: 20 to 23 (`const hasCustomColors = ...` through `isValidCssColor(categoryTextColor)`), side RIGHT
Ledger: entry 4
Status: draft

Diff context (new file, every line is `+`; `>` marks the anchor):

```
  17 | +  categoryTextColor,
  18 | +  className,
  19 | +}: CategoryBadgeProps) => {
> 20 | +  const hasCustomColors = !!categoryBackgroundColor
> 21 | +    && !!categoryTextColor
> 22 | +    && isValidCssColor(categoryBackgroundColor)
> 23 | +    && isValidCssColor(categoryTextColor);
  24 | +
  25 | +  return (
  26 | +    <Badge
```

> The color pair this reads (`categoryBackgroundColor`, `categoryTextColor`) has no producer yet. `PathwayCategory` in openedx-core (`src/openedx_catalog/models/pathway_category.py`) has `category_code`, `title` and `title_plural` and no color fields; openedx/openedx-core#820 adds none; the `PathwaySerializer` in openedx/openedx-platform#39204 emits `category` and `categoryLabel` only. The Willow Pathways Decision Log does say each category gets its own badge color, set by the instance admin, so the intent is there; nothing in the open backend work carries it yet.
>
> Two things I'd like settled across those PRs before the frontend relies on the pair:
>
> 1. Where it is defined and validated. The decision log puts it in the Django admin per category. `isValidCssColor` here only answers "is this a CSS color", so any contrast guard has to live on the admin side, and that side has no field today.
> 2. The shape. openedx/frontend-app-catalog#176 documents the same pair as canonical `#RRGGBB` from a "category registry"; this accepts any CSS color (`red`, `rgb(...)`). One rule for both apps, decided where the field is added.
>
> Not blocking this PR on its own. Small thing while here: the default text utility is `text-info-800` where the decision log gives info/900 (`#004C77`).

## 3. Course badge

File: `src/containers/CourseCard/components/CourseHeaderActions.tsx`
Lines: 10 to 13 (the `<CategoryBadge ... />` for the Course label), side RIGHT
Ledger: entry 6, finding A
Status: draft

Diff context (new file, every line is `+`; `>` marks the anchor):

```
   7 | +
   8 | +export const CourseHeaderActions = ({ cardId }: { cardId: string }) => (
   9 | +  <Stack direction="horizontal" gap={1}>
> 10 | +    <CategoryBadge
> 11 | +      categoryLabel={<FormattedMessage {...messages.courseBadge} />}
> 12 | +      className="text-dark-900 bg-light-500"
> 13 | +    />
  14 | +    <CourseCardMenu cardId={cardId} />
  15 | +  </Stack>
  16 | +);
```

> This renders the "Course" badge on every course card unconditionally, so it ships to every learner on every site as soon as this merges, before any pathway exists anywhere.
>
> In #875 it sat behind the pilot flag. When the flag was dropped (https://github.com/openedx/frontend-app-learner-dashboard/pull/875#discussion_r4393046991) the reasoning was that an operator who doesn't want pathways won't create any. That holds for the panel, which renders nothing without pathways, but this badge has no such gate. You made the point yourself on the ItemBadge thread (https://github.com/openedx/frontend-app-learner-dashboard/pull/875#discussion_r4175039413): using the badge for courses "only makes sense if another item exists".
>
> Could it be gated on the learner having at least one pathway? `usePathwaysByCategory` is already on the page. If instead the Course badge is meant as a permanent design change regardless of pathways, could the description say so, so it's a deliberate call rather than a side effect of dropping the flag?
