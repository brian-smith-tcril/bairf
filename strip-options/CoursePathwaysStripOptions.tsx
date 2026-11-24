// Review prototype, not part of the PR: the strip's design built from Paragon components as they come,
// with a utility class only where something visibly broke without it. Rendered under the PR's strip
// from TabPage for comparison. No stylesheet.
import { useState, type ReactNode } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import classNames from 'classnames';
import {
  Badge, Button, Hyperlink, ModalPopup, Stack, useIndexOfLastVisibleChild, useToggle,
} from '@openedx/paragon';
import { ArrowDropDown } from '@openedx/paragon/icons';

import { useCoursePathways } from '../data/apiHooks';
import type { PathwayData } from '../data/types';
import messages from './messages';

const nameOf = (pathway: PathwayData) => pathway.pathway.content.displayName;
// Stand-in for the pathway outline URL that #2231 adds
const hrefOf = (pathway: PathwayData) => `#${pathway.pathway.id}`;

const Strip = ({ pathways }: { pathways: PathwayData[] }) => {
  const { formatMessage } = useIntl();
  const [row, setRow] = useState<HTMLDivElement | null>(null);
  const [triggerBox, setTriggerBox] = useState<HTMLDivElement | null>(null);
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
  const [isOpen, open, close] = useToggle(false);
  // Child 0 of the row is the lead-in, so pathway i is child i + 1
  const visibleCount = Math.max(useIndexOfLastVisibleChild(row, triggerBox), 0);
  const hiddenPathways = pathways.slice(visibleCount);

  return (
    <nav aria-labelledby="course-pathways-strip-label" className="bg-primary small">
      <Stack ref={setRow} direction="horizontal" className="container-xl py-2">
        <span id="course-pathways-strip-label" className="text-gray-200">{formatMessage(messages.includedIn)}</span>
        {pathways.map((pathway, index) => (
          <Hyperlink
            key={pathway.pathway.id}
            destination={hrefOf(pathway)}
            className={classNames('text-white px-2.5 flex-shrink-0', {
              'border-left border-light-700': index > 0,
              'position-absolute invisible': index >= visibleCount,
            })}
          >
            {nameOf(pathway)}
          </Hyperlink>
        ))}
        {hiddenPathways.length > 0 && (
          <div ref={setTriggerBox} className={classNames({ 'border-left border-light-700 pl-2': visibleCount > 0 })}>
            <Button
              ref={setTrigger}
              variant="inverse-tertiary"
              size="sm"
              iconAfter={ArrowDropDown}
              className="py-0"
              aria-label={formatMessage(messages.morePathways, { count: hiddenPathways.length })}
              onClick={open}
            >
              <Badge pill variant="light">{hiddenPathways.length}</Badge>
            </Button>
          </div>
        )}
      </Stack>
      <ModalPopup positionRef={trigger} isOpen={isOpen} onClose={close} placement="bottom" hasArrow withPortal>
        <div className="bg-white p-3 rounded shadow border small">
          <ul className="mb-0 pl-3">
            {hiddenPathways.map((pathway) => (
              <li key={pathway.pathway.id}>
                <Hyperlink destination={hrefOf(pathway)} isInline>{nameOf(pathway)}</Hyperlink>
              </li>
            ))}
          </ul>
        </div>
      </ModalPopup>
    </nav>
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
      <Caption>Paragon components as they come, plus justified utility classes; no stylesheet</Caption>
      <Strip pathways={pathways} />
    </>
  );
};
