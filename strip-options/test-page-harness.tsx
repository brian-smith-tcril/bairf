import { type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { coursePathwaysQueryKeys } from '@src/pathways/data/apiHooks';
import {
  dataEngineering, loremIpsum, machineLearning, nemoEnim, sedUt,
} from '@src/pathways/data/__fixtures__/pathways';
import { CoursePathwaysStrip } from '@src/pathways/pathways-strip/CoursePathwaysStrip';
import { CoursePathwaysStripOptions } from '@src/pathways/pathways-strip/CoursePathwaysStripOptions';

import {
  StripBreakpoint, StripChips, StripRow, StripSentence, counts, type StripProps,
} from './options';

const all = [dataEngineering, machineLearning, loremIpsum, sedUt, nemoEnim];
const sets = { five: all, two: all.slice(0, 2), one: all.slice(0, 1) };
const longFirst = [loremIpsum, sedUt, dataEngineering, machineLearning, nemoEnim];

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
Object.entries(sets).forEach(([key, pathways]) => {
  queryClient.setQueryData(coursePathwaysQueryKeys.course(key), { [key]: pathways });
});

const Row = ({ caption, children }: { caption: string; children: ReactNode }) => (
  <div className="mb-3">
    <div className="text-muted x-small px-2">{caption}</div>
    {children}
  </div>
);

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="mb-4">
    <h2 className="h5 px-2">{title}</h2>
    {children}
  </section>
);

const rows = (Strip: (props: StripProps) => JSX.Element, id: string, withMenu: boolean) => (
  <>
    <Row caption="5 pathways"><Strip id={`${id}-5`} pathways={sets.five} /></Row>
    <Row caption="2 pathways"><Strip id={`${id}-2`} pathways={sets.two} /></Row>
    <Row caption="1 pathway"><Strip id={`${id}-1`} pathways={sets.one} /></Row>
    <Row caption="5 pathways, long titles first"><Strip id={`${id}-l`} pathways={longFirst} /></Row>
    {withMenu && (
      <Row caption="5 pathways, menu open">
        <Strip id={`${id}-o`} pathways={sets.five} menuOpen />
        <div style={{ height: 190 }} />
      </Row>
    )}
  </>
);

const SentenceCapped = (props: StripProps) => <StripSentence {...props} cap={2} />;

const sections: Record<string, ReactNode> = {
  pr: (
    <Section title="PR as it stands (3201351b93)">
      <Row caption="5 pathways"><CoursePathwaysStrip courseId="five" /></Row>
      <Row caption="2 pathways"><CoursePathwaysStrip courseId="two" /></Row>
      <Row caption="1 pathway"><CoursePathwaysStrip courseId="one" /></Row>
    </Section>
  ),
  row: <Section title="1. One line, what fits; the rest in a menu">{rows(StripRow, 'row', true)}</Section>,
  sentence: <Section title="2. A sentence, every pathway named">{rows(StripSentence, 'sentence', false)}</Section>,
  capped: <Section title="3. A sentence, two named, the rest in a menu">{rows(SentenceCapped, 'capped', true)}</Section>,
  links: (
    <Section title="The pathway link, shown on option 1">
      <Row caption="Hyperlink + text-white"><StripRow id="link-h" pathways={all} linkStyle="hyperlink" /></Row>
      <Row caption="Nav.Link + text-white"><StripRow id="link-n" pathways={all} linkStyle="nav" /></Row>
      <Row caption="Button as a link, inverse-tertiary"><StripRow id="link-b" pathways={all} linkStyle="button" /></Row>
    </Section>
  ),
  counts: (
    <Section title="The count in the trigger, shown on option 1">
      {counts.map(({ label, render }, index) => (
        <Row key={label} caption={label}>
          <StripRow id={`count-${index}`} pathways={all} count={render} />
        </Row>
      ))}
    </Section>
  ),
  dropin: (
    <Section title="The file placed in the code worktree, as TabPage would render it">
      <CoursePathwaysStrip courseId="five" />
      <CoursePathwaysStripOptions courseId="five" />
    </Section>
  ),
  breakpoint: <Section title="Set aside: count by breakpoint">{rows(StripBreakpoint, 'bp', false)}</Section>,
  chips: <Section title="Set aside: ChipCarousel">{rows(StripChips, 'chips', false)}</Section>,
};

const wanted = window.location.hash.slice(1).split(',').filter(Boolean);
const shown = wanted.length ? wanted : Object.keys(sections);

createRoot(document.getElementById('root')!).render(
  <IntlProvider locale="en" messages={{}} onError={() => {}}>
    <QueryClientProvider client={queryClient}>
      {shown.map((key) => <div key={key}>{sections[key]}</div>)}
    </QueryClientProvider>
  </IntlProvider>,
);
