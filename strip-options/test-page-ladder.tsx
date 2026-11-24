// The strip built from Paragon components with no class at all, then one justified addition at a time.
// `level` is how many of `steps` are switched on; at level 0 nothing in here has a className.
import { useState } from 'react';
import classNames from 'classnames';
import {
  Badge, Button, Hyperlink, ModalPopup, Stack, useIndexOfLastVisibleChild,
} from '@openedx/paragon';
import { ArrowDropDown } from '@openedx/paragon/icons';

import type { PathwayData } from '@src/pathways/data/types';

const LEAD_IN = 'Course included in';
const MORE = (count: number) => `Show ${count} more ${count === 1 ? 'pathway' : 'pathways'}`;
const nameOf = (pathway: PathwayData) => pathway.pathway.content.displayName;
// Stand-in for the pathway outline URL that #2231 adds
const hrefOf = (pathway: PathwayData) => `#${pathway.pathway.id}`;

export const steps = [
  { key: 'band', adds: 'bg-primary on the nav' },
  { key: 'leadIn', adds: 'text-gray-200 on the lead-in' },
  { key: 'linkColor', adds: 'text-white on each Hyperlink' },
  { key: 'small', adds: 'small on the nav' },
  { key: 'spacing', adds: 'px-2.5 on each Hyperlink' },
  { key: 'separator', adds: 'border-left border-light-700 on each Hyperlink after the first' },
  { key: 'container', adds: 'container-xl on the Stack' },
  { key: 'height', adds: 'py-2 on the Stack' },
  { key: 'overflow', adds: 'useIndexOfLastVisibleChild, with position-absolute invisible on each Hyperlink that does not fit' },
  { key: 'noShrink', adds: 'flex-shrink-0 on each Hyperlink' },
  { key: 'triggerSeparator', adds: 'a div with border-left border-light-700 pl-2 around the Button' },
  { key: 'compact', adds: 'py-0 on the Button' },
  { key: 'surface', adds: 'bg-white p-3 rounded shadow on the box inside ModalPopup' },
  { key: 'list', adds: 'mb-0 pl-3 on the list in the box' },
  { key: 'arrow', adds: 'hasArrow on ModalPopup (a prop, plus border on the box as in Paragon\'s example)' },
  { key: 'links', adds: 'Hyperlink isInline for each item in the box (a component, no class)' },
] as const;

export type StepKey = typeof steps[number]['key'];

export interface LadderProps {
  id: string;
  pathways: PathwayData[];
  level?: number;
  // Steps to leave out of an otherwise complete build, to show what each one is for
  without?: StepKey[];
  open?: boolean;
  // Before the overflow step, how many names to show, so the early steps are comparable with the PR
  staticCount?: number;
}

const none = undefined;

export const Ladder = ({
  id, pathways, level = steps.length, without = [], open = false, staticCount = 3,
}: LadderProps) => {
  const on = (key: StepKey) => steps.findIndex((step) => step.key === key) < level && !without.includes(key);
  const [row, setRow] = useState<HTMLDivElement | null>(null);
  const [triggerBox, setTriggerBox] = useState<HTMLElement | null>(null);
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
  const [isOpen, setOpen] = useState(open);
  // Child 0 of the row is the lead-in, so pathway i is child i + 1
  const lastVisibleChild = useIndexOfLastVisibleChild(on('overflow') ? row : null, on('overflow') ? triggerBox : null);
  const visibleCount = on('overflow') ? Math.max(lastVisibleChild, 0) : Math.min(staticCount, pathways.length);
  const hiddenPathways = pathways.slice(visibleCount);
  const rendered = on('overflow') ? pathways : pathways.slice(0, visibleCount);

  return (
    <nav aria-labelledby={`${id}-label`} className={classNames({ 'bg-primary': on('band'), small: on('small') }) || none}>
      <Stack
        ref={setRow}
        direction="horizontal"
        className={classNames({ 'container-xl': on('container'), 'py-2': on('height') }) || none}
      >
        <span id={`${id}-label`} className={on('leadIn') ? 'text-gray-200' : none}>{LEAD_IN}</span>
        {rendered.map((pathway, index) => (
          <Hyperlink
            key={pathway.pathway.id}
            destination={hrefOf(pathway)}
            className={classNames({
              'text-white': on('linkColor'),
              'px-2.5': on('spacing'),
              'border-left border-light-700': on('separator') && index > 0,
              'flex-shrink-0': on('noShrink'),
              'position-absolute invisible': on('overflow') && index >= visibleCount,
            }) || none}
          >
            {nameOf(pathway)}
          </Hyperlink>
        ))}
        {(hiddenPathways.length > 0 || on('overflow')) && (
          <div
            ref={setTriggerBox}
            className={classNames({
              'border-left border-light-700 pl-2': on('triggerSeparator') && visibleCount > 0,
              'position-absolute invisible': on('overflow') && hiddenPathways.length === 0,
            }) || none}
          >
            <Button
              ref={setTrigger}
              variant="inverse-tertiary"
              size="sm"
              iconAfter={ArrowDropDown}
              aria-label={MORE(hiddenPathways.length)}
              onClick={() => setOpen(true)}
              className={on('compact') ? 'py-0' : none}
            >
              <Badge pill variant="light">{hiddenPathways.length}</Badge>
            </Button>
          </div>
        )}
      </Stack>
      <ModalPopup
        positionRef={trigger}
        isOpen={isOpen && !!trigger}
        onClose={() => setOpen(false)}
        placement="bottom-end"
        hasArrow={on('arrow')}
        withPortal
      >
        <div className={classNames({ 'bg-white p-3 rounded shadow': on('surface'), border: on('arrow') }) || none}>
          <ul className={on('list') ? 'mb-0 pl-3' : none}>
            {hiddenPathways.map((pathway) => (
              <li key={pathway.pathway.id}>
                {on('links')
                  ? <Hyperlink destination={hrefOf(pathway)} isInline>{nameOf(pathway)}</Hyperlink>
                  : nameOf(pathway)}
              </li>
            ))}
          </ul>
        </div>
      </ModalPopup>
    </nav>
  );
};
