# Draft review comments for openedx/frontend-app-learner-dashboard#879

Drafted 2026-10-31 against head `f4852b343a`. Each comment is posted as an inline review comment on the PR, on the `RIGHT` side at the line given; the body under each heading is the text to post, verbatim. The ledger entry each one rests on is named so the record stays in `review-879.md`. Status per comment: `draft`, `posted <thread url>`.

The review summary carries the disclosure; the inline comments do not repeat it. Under each comment, "Diff context" shows the hunk the way the review will, with the anchor lines marked, so the draft reads as the review will.

## Review summary

Status: pending in review https://github.com/openedx/frontend-app-learner-dashboard/pull/879#pullrequestreview-5723298330 (2026-10-31)

> I tested this out locally and it looks great! When looking through the code I noticed a few things I had questions about and left a couple comments.
> 
> The inline comments were drafted with Claude Code and reviewed before posting.

## 1. Icon

File: `src/utils/icons/CardsStackIcon.tsx`
Line: 3 (`export const CardsStackIcon`), side RIGHT
Ledger: entry 5
Status: pending as https://github.com/openedx/frontend-app-learner-dashboard/pull/879#discussion_r4432047456 (2026-10-31)

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
> - [`LibraryBooks`](https://github.com/openedx/paragon/blob/release-23.x/icons/svg/library_books.svg) <img src="https://github.com/user-attachments/assets/7d5bb0aa-c5cb-4abd-8527-09d2174a66dc" width="64" alt="LibraryBooks">
> - [`DynamicFeed`](https://github.com/openedx/paragon/blob/release-23.x/icons/svg/dynamic_feed.svg) <img src="https://github.com/user-attachments/assets/975cef85-d8af-4290-9ad4-e617279c0982" width="64" alt="DynamicFeed">
> - [`AutoAwesomeMotion`](https://github.com/openedx/paragon/blob/release-23.x/icons/svg/auto_awesome_motion.svg) <img src="https://github.com/user-attachments/assets/c6b96d65-c5aa-4454-a041-aa5749f140ff" width="64" alt="AutoAwesomeMotion">
> - [`Collections`](https://github.com/openedx/paragon/blob/release-23.x/icons/svg/collections.svg) <img src="https://github.com/user-attachments/assets/0db8fef9-8b41-40a4-99f9-6a7b139191ef" width="64" alt="Collections">
> - [`FilterNone`](https://github.com/openedx/paragon/blob/release-23.x/icons/svg/filter_none.svg) <img src="https://github.com/user-attachments/assets/9fae5821-7c50-48dc-ae87-98de42bbbc19" width="64" alt="FilterNone">
>
> If none of those are acceptable from a design perspective I can look into adding the specific material symbol icon for this to Paragon as we've done with some other SVGs in the past.

## 2. Category colors

File: `src/components/CategoryBadge.tsx`
Lines: 20 to 23 (`const hasCustomColors = ...` through `isValidCssColor(categoryTextColor)`), side RIGHT
Ledger: entry 4
Status: pending as https://github.com/openedx/frontend-app-learner-dashboard/pull/879#discussion_r4432047461 (2026-10-31)

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

> I can see `categoryBackgroundColor` and `categoryTextColor` are expected to come from the backend, and I'm assuming the plan is for them to be configurable per category by an admin. This means (unless there's a11y validation in a configuration UI) admins would be able to configure the badge colors in a way that makes the text unreadable. Is that something we're ok with?

## 3. Course badge

File: `src/containers/CourseCard/components/CourseHeaderActions.tsx`
Lines: 10 to 13 (the `<CategoryBadge ... />` for the Course label), side RIGHT
Ledger: entry 6, finding A
Status: pending as https://github.com/openedx/frontend-app-learner-dashboard/pull/879#discussion_r4432047465 (2026-10-31)

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

> This will show the "Course" badge on every course card for every learner, whether or not the site has any pathways. Is that intentional?
