# Manual testing — stop the progress tab data refetching from components under the tab (#2103)

In-browser verification against a live backend (tutor dev).

What changed: `useProgressData()` — and `useExamsData()`, which reads through
it — no longer fetch `/api/course_home/progress/`. `ProgressTab` is the only
thing fetching it; everything under the tab subscribes to that cache entry
without fetching. One request per progress-tab load instead of two.

**The bug this layer could introduce is a reader that never sees loaded
data.** A disabled observer with nothing fetching its query stays `pending`,
so a component reads `undefined` and renders its empty state without erroring.
In the app nothing should be in that position — every reader renders under
`ProgressTab` — so the tab checks below are mostly "does everything still
render". The plugin checks are the contract change this layer makes.

## Setup

An ordinary course with **graded subsections** (so the grade tables have rows)
and, ideally, at least one **timed or proctored exam** (so `useExamsData` has
something to show). Test as **staff** so `/progress/:targetUserId` works.

**Two checks need plugin widgets** in `env.config.jsx` (untracked — check a
stale local copy is not carrying other overrides). Both go in one config:

```jsx
import { PLUGIN_OPERATIONS, DIRECT_PLUGIN } from '@openedx/frontend-plugin-framework';
import { useParams } from 'react-router-dom';
import { useProgressTabData } from './src/course-home/data/apiHooks';
import { useExamsData } from './src/course-home/progress-tab/hooks';

// The README example: a widget in a progress-tab slot. Documented use — must keep working.
const ExamAttemptSummary = () => {
  const examsData = useExamsData();
  return (
    <p data-testid="exam-attempt-summary">
      exams: {examsData ? examsData.map((exam) => exam.examName ?? '-').join(', ') : 'null'}
    </p>
  );
};

// Off-tab, reading only. After this layer: null, no request.
const OutlineExamsReader = () => {
  const examsData = useExamsData();
  return <p data-testid="outline-exams-reader">outline reader: {examsData ? examsData.length : 'null'}</p>;
};

// Off-tab, the migration shape from the README / BREAKING CHANGE footer: mounts the fetch itself.
const OutlineExamsOwner = () => {
  const { courseId } = useParams();
  useProgressTabData(courseId);
  const examsData = useExamsData();
  return <p data-testid="outline-exams-owner">outline owner: {examsData ? examsData.length : 'null'}</p>;
};

const config = {
  pluginSlots: {
    'org.openedx.frontend.learning.progress_tab_course_grade.v1': {
      plugins: [{
        op: PLUGIN_OPERATIONS.Insert,
        widget: { id: 'exam-attempt-summary', type: DIRECT_PLUGIN, RenderWidget: ExamAttemptSummary },
      }],
    },
    'org.openedx.frontend.learning.course_outline_tab_notifications.v1': {
      plugins: [
        {
          op: PLUGIN_OPERATIONS.Insert,
          widget: { id: 'outline-exams-reader', type: DIRECT_PLUGIN, RenderWidget: OutlineExamsReader },
        },
        {
          op: PLUGIN_OPERATIONS.Insert,
          widget: { id: 'outline-exams-owner', type: DIRECT_PLUGIN, RenderWidget: OutlineExamsOwner },
        },
      ],
    },
  },
};
export default config;
```

Slot ids are from `src/plugin-slots/*/index.*`; the outline notifications slot
is rendered by `OutlineTab.jsx` in the side column.

**Request-count protocol** (same as #2083 / #2098): hard reload the page, wait
for the Network tab to go idle, filter on `course_home/progress`, count.

## Verify by hand

### Request count (the point of the layer)

| page | before (on #2105) | after |
|---|---|---|
| `/course/:courseId/progress`, hard reload | 2 | 1 |
| `/course/:courseId/progress/:targetUserId` (staff, real learner), hard reload | 2 | 1 |

"Before" for the plain URL was measured when #2103 was filed; the
`targetUserId` row is inferred from the same mechanism.

- [x] **One `/api/course_home/progress/…` request** on a hard reload of the
      progress tab, with the exam-attempt widget installed (it is a reader
      too, so it must not add one).
- [x] **One request** on a hard reload of `/progress/:targetUserId`.

### The tab still renders (every reader now reads without fetching)

- [x] **Header** — course title / "Your progress" (or "Course progress for
      <username>" on the `targetUserId` URL), Studio link for staff.
- [x] **Course completion** — the donut chart and its percentages.
- [ ] **Certificate status** — whichever card the course state produces.
- [x] **Grade summary** — the grade bar, current-grade and grade-range
      tooltips, the assignment-type table and its footer / droppable footnote
      where the grading policy has drops.
- [x] **Detailed grades** — the per-subsection table with subsection title
      links; the "grades feature locked" overlay if the course gates it.
- [ ] **Credit information** — if the course offers credit; otherwise
      confirm its absence is unchanged.
- [x] **Related links** — the outline and dates links.
- [x] **Masquerade as a learner** via the masquerade bar: the tab renders that
      learner's data as before.

### Plugins

- [x] **The documented use keeps working.** On the progress tab the
      exam-attempt widget renders `exams: <names>` (or `-` per non-exam
      subsection), and the Network tab shows one `/exam/attempt/` request per
      subsection — the attempts fetch is unchanged and still fires only
      because a plugin asked.
- [x] **Off-tab reader reads null and fetches nothing.** On the outline,
      `outline reader: null`, and no `course_home/progress` request in the
      Network tab. This is the breaking change.
- [x] **Off-tab owner works.** On the same outline, `outline owner: <count>`
      once its own progress fetch resolves, and exactly one
      `course_home/progress` request (the owner's; the reader beside it adds
      none). With both widgets installed the *reader* shows the count too —
      the cache is shared, so the owner's fetch feeds every reader on the
      page; the reader-reads-null check above was run with the owner widget
      removed.

### General

- [ ] **No new console errors** on any of the above. (didn't see any but didn't check super hard)

Not covered:

- **A plugin in a progress-tab slot other than `progress_tab_course_grade`**:
  every progress-tab slot renders under `ProgressTabContent`, so the owner is
  above all of them; the one slot checked stands for the rest.
- **`useIFrameBehavior`-style invalidation**: nothing under the progress tab
  invalidates the progress key, so there is no refetch-through-owner path to
  exercise here (unlike #2098).

## Results

Run 2026-09-23 on tutor dev, as staff, with the three widgets installed.
Eleven of fourteen checks pass as written: one progress request per load on
both the plain and `targetUserId` URLs (two before); header, completion,
grade summary, detailed grades, related links and masquerade render as
before; the README-example widget renders exam names with one attempt request
per subsection; the off-tab reader reads `null` with no progress request (run
with the owner widget removed — with both installed the reader shows the count
too, since the owner's fetch feeds every reader on the page); the off-tab
owner reads the count with exactly one progress request. Not run: certificate
status and credit information (the course produced neither), and the console
was looked at but not compared against a before capture.
