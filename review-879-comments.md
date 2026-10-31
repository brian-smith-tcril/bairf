# Draft review comments for openedx/frontend-app-learner-dashboard#879

Drafted 2026-10-31 against head `f4852b343a`. Each comment is posted as an inline review comment on the PR, on the `RIGHT` side at the line given; the body under each heading is the text to post, verbatim. The ledger entry each one rests on is named so the record stays in `review-879.md`. Status per comment: `draft`, `posted <thread url>`.

The review summary carries the disclosure; the inline comments do not repeat it. Under each comment, "Diff context" shows the hunk the way the review will, with the anchor lines marked, so the draft reads as the review will.

## Review summary

Status: draft

> Three things from a first pass, all inline: the heading icon, the category colours, and the Course badge. The icon one is what I'd want changed before merge; the other two are conversations that reach past this PR. The inline comments were drafted with Claude Code and reviewed before posting.

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

> This is the Material Symbols Outlined `cards_stack` glyph: the path is byte-identical to https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/cards_stack/default/24px.svg, including the `0 -960 960 960` viewBox. It is inlined with no source or licence note, and this repo has no other inlined icon components (the SVGs under `src/assets` are illustrations).
>
> Paragon's icon set is Material Icons (the sharp variant, copied from `@material-icons/svg`), not Material Symbols, so there is no exact match. There are close ones at the same filled weight as the `MenuBook` the Courses heading gets in #878:
>
> - `LibraryBooks`: a card with text lines over a trailing card, the nearest silhouette, and "library" fits a collection of learning content.
> - `DynamicFeed`: stacked cards with a header bar.
> - `AutoAwesomeMotion`: three stacked rounded squares.
>
> Could you switch to one of those, `LibraryBooks` for preference, so the heading icon comes from the same set as the rest of the dashboard and themes with it? If the design team wants the Material Symbols glyph specifically, then this file needs the source URL and the Apache 2.0 attribution, plus a line on why Paragon's set doesn't cover it.

## 2. Category colours

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

> The colour pair this reads (`categoryBackgroundColor`, `categoryTextColor`) has no producer yet. `PathwayCategory` in openedx-core (`src/openedx_catalog/models/pathway_category.py`) has `category_code`, `title` and `title_plural` and no colour fields; openedx/openedx-core#820 adds none; the `PathwaySerializer` in openedx/openedx-platform#39204 emits `category` and `categoryLabel` only. The Willow Pathways Decision Log does say each category gets its own badge colour, set by the instance admin, so the intent is there; nothing in the open backend work carries it yet.
>
> Two things I'd like settled across those PRs before the frontend relies on the pair:
>
> 1. Where it is defined and validated. The decision log puts it in the Django admin per category. `isValidCssColor` here only answers "is this a CSS colour", so any contrast guard has to live on the admin side, and that side has no field today.
> 2. The shape. openedx/frontend-app-catalog#176 documents the same pair as canonical `#RRGGBB` from a "category registry"; this accepts any CSS colour (`red`, `rgb(...)`). One rule for both apps, decided where the field is added.
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
