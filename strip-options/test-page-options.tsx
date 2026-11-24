import { useState, type ReactNode } from 'react';
import { useIntl } from 'react-intl';
import classNames from 'classnames';
import {
  Badge, Bubble, Button, Chip, ChipCarousel, Dropdown, Hyperlink, Nav, breakpoints,
  useIndexOfLastVisibleChild, useMediaQuery,
} from '@openedx/paragon';

import type { PathwayData } from '@src/pathways/data/types';

const LEAD_IN = 'Course included in';
const MORE = (count: number) => `Show ${count} more ${count === 1 ? 'pathway' : 'pathways'}`;

const nameOf = (pathway: PathwayData) => pathway.pathway.content.displayName;
// Stand-in for the pathway outline URL that #2231 adds
const hrefOf = (pathway: PathwayData) => `#${pathway.pathway.id}`;

export type LinkStyle = 'nav' | 'hyperlink' | 'button';

export interface StripProps {
  id: string;
  pathways: PathwayData[];
  menuOpen?: boolean;
  count?: (count: number) => ReactNode;
  linkStyle?: LinkStyle;
}

const Band = ({ children }: { children: ReactNode }) => (
  <div className="bg-primary text-white small">{children}</div>
);

interface MoreMenuProps {
  id: string;
  pathways: PathwayData[];
  open?: boolean;
  className?: string;
  children?: ReactNode;
  setElement?: (element: HTMLDivElement | null) => void;
}

// The overflow control: a Paragon Dropdown whose toggle is an inverse-tertiary Button.
const MoreMenu = ({
  id, pathways, open, className, children, setElement,
}: MoreMenuProps) => (
  <Dropdown ref={setElement} show={open} className={className}>
    <Dropdown.Toggle
      id={`${id}-more`}
      variant="inverse-tertiary"
      size="sm"
      className="py-0"
      aria-label={MORE(pathways.length)}
    >
      {children ?? <Badge pill variant="light">{pathways.length}</Badge>}
    </Dropdown.Toggle>
    <Dropdown.Menu alignRight>
      {pathways.map((pathway) => (
        <Dropdown.Item key={pathway.pathway.id} href={hrefOf(pathway)} className="text-wrap">
          {nameOf(pathway)}
        </Dropdown.Item>
      ))}
    </Dropdown.Menu>
  </Dropdown>
);

// 1. One line. Everything that fits shows, the rest goes in a menu; Paragon's own overflow hook measures.
export const StripRow = ({
  id, pathways, menuOpen, count, linkStyle = 'hyperlink',
}: StripProps) => {
  const [wrapper, setWrapper] = useState<HTMLDivElement | null>(null);
  const [more, setMore] = useState<HTMLDivElement | null>(null);
  const nav = (wrapper?.firstElementChild ?? null) as HTMLElement | null;
  // Child 0 of the nav is the lead-in, so pathway i is child i + 1
  const lastVisibleChild = useIndexOfLastVisibleChild(nav, more);
  const visibleCount = Math.max(lastVisibleChild, 0);
  const hiddenPathways = pathways.slice(visibleCount);

  return (
    <Band>
      <div ref={setWrapper} className="container-xl">
        <Nav as="nav" aria-labelledby={`${id}-label`} className="flex-nowrap align-items-center position-relative">
          <span id={`${id}-label`} className="text-gray-200 flex-shrink-0 py-2 pr-1">{LEAD_IN}</span>
          {pathways.map((pathway, index) => {
            const itemClassName = classNames('flex-shrink-0', {
              'border-left border-light-700': index > 0,
              'position-absolute invisible mw-100 overflow-hidden': index >= visibleCount,
            });
            if (linkStyle === 'button') {
              return (
                <div key={pathway.pathway.id} className={classNames(itemClassName, 'px-1')}>
                  <Button as="a" href={hrefOf(pathway)} variant="inverse-tertiary" size="sm" className="py-0 text-nowrap">
                    {nameOf(pathway)}
                  </Button>
                </div>
              );
            }
            if (linkStyle === 'nav') {
              return (
                <Nav.Link
                  key={pathway.pathway.id}
                  href={hrefOf(pathway)}
                  className={classNames(itemClassName, 'text-white text-nowrap py-0 px-2.5')}
                >
                  {nameOf(pathway)}
                </Nav.Link>
              );
            }
            return (
              <div key={pathway.pathway.id} className={classNames(itemClassName, 'px-2.5')}>
                <Hyperlink destination={hrefOf(pathway)} className="text-white text-nowrap">{nameOf(pathway)}</Hyperlink>
              </div>
            );
          })}
          <MoreMenu
            id={id}
            pathways={hiddenPathways}
            open={menuOpen}
            className={classNames('flex-shrink-0', {
              // The separator belongs between the last visible pathway and the trigger
              'border-left border-light-700 pl-2': visibleCount > 0,
              'position-absolute invisible': hiddenPathways.length === 0,
            })}
            setElement={setMore}
          >
            {count?.(hiddenPathways.length)}
          </MoreMenu>
        </Nav>
      </div>
    </Band>
  );
};

// 2. A sentence. Every pathway is an inline link in a localized list ("A, B, and C") that wraps like text.
// 3. The same sentence with a cap: the first `cap` pathways are named, the rest are behind "N more".
export const StripSentence = ({
  id, pathways, menuOpen, cap,
}: StripProps & { cap?: number }) => {
  const { formatList } = useIntl();
  // A menu holding a single pathway would hide a name to save nothing, so the cap needs two or more left over
  const named = cap && pathways.length > cap + 1 ? pathways.slice(0, cap) : pathways;
  const rest = pathways.slice(named.length);
  const parts: ReactNode[] = named.map((pathway) => (
    <Hyperlink key={pathway.pathway.id} destination={hrefOf(pathway)} className="d-inline text-white">
      {nameOf(pathway)}
    </Hyperlink>
  ));
  if (rest.length > 0) {
    parts.push(
      <MoreMenu key="more" id={id} pathways={rest} open={menuOpen} className="d-inline-block">
        {`${rest.length} more`}
      </MoreMenu>,
    );
  }
  return (
    <Band>
      <nav aria-labelledby={`${id}-label`} className="container-xl py-2">
        <span id={`${id}-label`} className="text-gray-200">{LEAD_IN}</span>
        {' '}
        {formatList(parts, { type: 'conjunction' })}
      </nav>
    </Band>
  );
};

// Tried and set aside: the number of visible pathways decided by the breakpoint, the row free to wrap.
export const StripBreakpoint = ({ id, pathways, menuOpen }: StripProps) => {
  const isMedium = useMediaQuery({ minWidth: breakpoints.medium.minWidth });
  const isExtraLarge = useMediaQuery({ minWidth: breakpoints.extraLarge.minWidth });
  let visibleCount = 1;
  if (isExtraLarge) {
    visibleCount = 3;
  } else if (isMedium) {
    visibleCount = 2;
  }
  const hiddenPathways = pathways.slice(visibleCount);
  return (
    <Band>
      <div className="container-xl">
        <Nav as="nav" aria-labelledby={`${id}-label`} className="align-items-center">
          <span id={`${id}-label`} className="text-gray-200 py-2 pr-1">{LEAD_IN}</span>
          {pathways.slice(0, visibleCount).map((pathway, index) => (
            <Nav.Link
              key={pathway.pathway.id}
              href={hrefOf(pathway)}
              className={classNames('text-white py-0 px-2.5', { 'border-left border-light-700': index > 0 })}
            >
              {nameOf(pathway)}
            </Nav.Link>
          ))}
          {hiddenPathways.length > 0 && <MoreMenu id={id} pathways={hiddenPathways} open={menuOpen} />}
        </Nav>
      </div>
    </Band>
  );
};

// Tried and set aside: Paragon's ChipCarousel whole, pathways as chips in a row that scrolls with arrow buttons.
export const StripChips = ({ id, pathways }: StripProps) => (
  <Band>
    <div className="container-xl d-flex align-items-center py-1">
      <span id={`${id}-label`} className="text-gray-200 flex-shrink-0 pr-3">{LEAD_IN}</span>
      <ChipCarousel
        className="flex-grow-1 overflow-hidden"
        ariaLabel={LEAD_IN}
        canScrollHorizontal
        gap={2}
        items={pathways.map((pathway) => (
          <Chip key={pathway.pathway.id} variant="dark" onClick={() => {}}>{nameOf(pathway)}</Chip>
        ))}
      />
    </div>
  </Band>
);

// The count inside the trigger, as its own choice
export const counts: { label: string; render: (count: number) => ReactNode }[] = [
  { label: 'Badge pill, light (the PR\'s element with no custom CSS)', render: (count) => <Badge pill variant="light">{count}</Badge> },
  { label: 'Badge, light, not pill', render: (count) => <Badge variant="light">{count}</Badge> },
  { label: 'Bubble with bg-light text-gray-700', render: (count) => <Bubble className="bg-light text-gray-700">{count}</Bubble> },
  { label: 'Text: +N', render: (count) => `+${count}` },
  { label: 'Text: N more', render: (count) => `${count} more` },
];
