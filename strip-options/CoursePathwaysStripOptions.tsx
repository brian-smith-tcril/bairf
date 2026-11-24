// Review prototype, not part of the PR: three ways to build the strip from Paragon components and
// utilities with no stylesheet of its own. Rendered under the PR's strip from TabPage for comparison.
import { useState, type ReactNode } from 'react';
import { defineMessages, useIntl } from '@edx/frontend-platform/i18n';
import classNames from 'classnames';
import {
  Badge, Dropdown, Hyperlink, Nav, useIndexOfLastVisibleChild,
} from '@openedx/paragon';

import { useCoursePathways } from '../data/apiHooks';
import type { PathwayData } from '../data/types';
import messages from './messages';

const optionMessages = defineMessages({
  sentence: {
    id: 'learning.coursePathways.sentence',
    defaultMessage: '<lead>Course included in</lead> {pathways}',
    description: 'Sentence naming the pathways, in which the learner is enrolled, that include this course',
  },
  more: {
    id: 'learning.coursePathways.more',
    defaultMessage: '{count} more',
    description: 'Button that follows a list of pathway names and opens a menu with the ones not named',
  },
});

const nameOf = (pathway: PathwayData) => pathway.pathway.content.displayName;
// Stand-in for the pathway outline URL that #2231 adds
const hrefOf = (pathway: PathwayData) => `#${pathway.pathway.id}`;

interface StripProps {
  id: string;
  pathways: PathwayData[];
}

const Band = ({ children }: { children: ReactNode }) => (
  <div className="bg-primary text-white small">{children}</div>
);

interface MoreMenuProps {
  id: string;
  pathways: PathwayData[];
  className?: string;
  children?: ReactNode;
  setElement?: (element: HTMLDivElement | null) => void;
}

// The overflow control: a Paragon Dropdown whose toggle is an inverse-tertiary Button.
const MoreMenu = ({
  id, pathways, className, children, setElement,
}: MoreMenuProps) => {
  const { formatMessage } = useIntl();
  return (
    <Dropdown ref={setElement} className={className}>
      <Dropdown.Toggle
        id={`${id}-more`}
        variant="inverse-tertiary"
        size="sm"
        className="py-0"
        aria-label={formatMessage(messages.morePathways, { count: pathways.length })}
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
};

// 1. One line. Everything that fits shows, the rest goes in a menu; Paragon's own overflow hook measures.
const StripRow = ({ id, pathways }: StripProps) => {
  const { formatMessage } = useIntl();
  const [wrapper, setWrapper] = useState<HTMLDivElement | null>(null);
  const [more, setMore] = useState<HTMLDivElement | null>(null);
  // Paragon's Nav does not forward a ref
  const nav = (wrapper?.firstElementChild ?? null) as HTMLElement | null;
  // Child 0 of the nav is the lead-in, so pathway i is child i + 1
  const lastVisibleChild = useIndexOfLastVisibleChild(nav, more);
  const visibleCount = Math.max(lastVisibleChild, 0);
  const hiddenPathways = pathways.slice(visibleCount);

  return (
    <Band>
      <div ref={setWrapper} className="container-xl">
        <Nav as="nav" aria-labelledby={`${id}-label`} className="flex-nowrap align-items-center position-relative">
          <span id={`${id}-label`} className="text-gray-200 flex-shrink-0 py-2 pr-1">
            {formatMessage(messages.includedIn)}
          </span>
          {pathways.map((pathway, index) => (
            <div
              key={pathway.pathway.id}
              className={classNames('flex-shrink-0 px-2.5', {
                'border-left border-light-700': index > 0,
                // Out of the row but still measurable, which is what the hook needs
                'position-absolute invisible mw-100 overflow-hidden': index >= visibleCount,
              })}
            >
              <Hyperlink destination={hrefOf(pathway)} className="text-white text-nowrap">{nameOf(pathway)}</Hyperlink>
            </div>
          ))}
          <MoreMenu
            id={id}
            pathways={hiddenPathways}
            className={classNames('flex-shrink-0', {
              // The separator belongs between the last visible pathway and the trigger
              'border-left border-light-700 pl-2': visibleCount > 0,
              'position-absolute invisible': hiddenPathways.length === 0,
            })}
            setElement={setMore}
          />
        </Nav>
      </div>
    </Band>
  );
};

// 2. A sentence. Every pathway is an inline link in a localized list ("A, B, and C") that wraps like text.
// 3. The same sentence with a cap: the first `cap` pathways are named, the rest are behind "N more".
const StripSentence = ({ id, pathways, cap }: StripProps & { cap?: number }) => {
  const { formatList, formatMessage } = useIntl();
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
      <MoreMenu key="more" id={id} pathways={rest} className="d-inline-block">
        {formatMessage(optionMessages.more, { count: rest.length })}
      </MoreMenu>,
    );
  }
  return (
    <Band>
      <nav aria-labelledby={`${id}-label`} className="container-xl py-2">
        {formatMessage(optionMessages.sentence, {
          lead: (chunks: ReactNode) => <span key="lead" id={`${id}-label`} className="text-gray-200">{chunks}</span>,
          pathways: formatList(parts, { type: 'conjunction' }),
        })}
      </nav>
    </Band>
  );
};

const Caption = ({ children }: { children: ReactNode }) => (
  <div className="container-xl x-small text-muted pt-2">{children}</div>
);

export const CoursePathwaysStripOptions = ({ courseId }: { courseId?: string }) => {
  const { data: pathways = [] } = useCoursePathways(courseId);
  if (!pathways.length) {
    return null;
  }
  return (
    <>
      <Caption>Option 1: one line, what fits; the rest in a menu</Caption>
      <StripRow id="pathways-option-row" pathways={pathways} />
      <Caption>Option 2: a sentence, every pathway named</Caption>
      <StripSentence id="pathways-option-sentence" pathways={pathways} />
      <Caption>Option 3: a sentence, two named, the rest in a menu</Caption>
      <StripSentence id="pathways-option-capped" pathways={pathways} cap={2} />
    </>
  );
};
