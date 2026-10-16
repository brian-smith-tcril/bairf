## Summary

One load of the progress tab requested `/api/course_home/progress/` **twice**. `ProgressTab` fetches it and gates on it; everything under the gate reads it through `useProgressData()`, which was also a *fetching* observer of the same query — 22 call sites, 21 files under `course-home/progress-tab/` plus the grade-breakdown slot. They mount in one commit after the data has landed, find it stale at the default `staleTime` of 0, and refetch. React Query dedupes them against each other (two requests, not twenty-two) but not against the owner's already-settled fetch.

This is the defect #2083 fixed on the outline and dates tabs and #2098 fixed on the courseware gate, and it gets the same fix: the owner fetches, the readers under it subscribe without fetching. `useProgressData()` never fetches; `ProgressTab` keeps fetching. One request per load.

Part of the Redux → React Query migration (#1946, Stage 1). Closes #2103. Stacked above #2105 (#2104), which moved the progress query's 404 redirect out of the `queryFn` so that the migration step below — a plugin mounting the fetch itself — has no side effect.

## What changed

- **`useProgressTabData` takes `{ enabled }`**, the course-home `QueryOptions`, in the two-positional-plus-options shape `useProctoringInfoData` has. Plain `enabled`, no `!!courseId` guard — the hook never had one and the route always supplies a `courseId`.
- **`useProgressData()` passes `{ enabled: false }` and takes no option of its own** — the shape #2098 settled for `useIsCourseLoaded`. Every caller renders under `ProgressTab`, which fetches the same key from the same route params, so no caller wants the reader to fetch; a default-on option would let a new reader silently reintroduce the duplicate. A disabled observer returns the query's current state and re-renders when the owner's fetch lands, so every reader sees the same value as before.
- **No `staleTime`.** It would hide the reader fetches without deciding who owns them, and would change the owner's freshness too: the progress payload changes server-side with no app action, and `useRequestCert`, which renders under this tab, relies on refetch-on-mount to resync.
- **README.** `progress-tab/README.md` now says `useExamsData()` reads the progress tab's own data, is for widgets in progress-tab slots, and returns `null` elsewhere unless something rendered on the page fetches that data.
- **Tests.** A disabled case for `useProgressTabData` (endpoint mocked 200, zero requests, `fetchStatus === 'idle'`); a `useProgressData` describe in `hooks.test.jsx` with the two cases `useIsCourseLoaded` has — *fetches nothing on its own* and *reads the owner's result without fetching again* — sharing the route wrapper with the `useExamsData` cases, whose first case now also asserts zero progress requests; and a request count in `ProgressTab.test.jsx` that waits for the client to go idle and then counts one progress request. All five fail against the layer below (the count reads 2 there).

## Plugins — breaking

`useExamsData()` (documented in `progress-tab/README.md`) and `useProgressData()`, both exported from `./src/course-home/progress-tab/hooks`, were fetching observers and now only read what `ProgressTab` has fetched. In a progress-tab slot — the documented use — they return exactly what they did. Rendered anywhere else they return `null` / `undefined` unless something rendered on the page fetches the progress data.

No default serves both placements: `useExamsData()` is built on `useProgressData()`, so a fetching default would put the duplicate request back into the documented use. Off the tab, some rendered widget has to own the fetch — the query cache is shared, so one fetching observer on the page populates it for every reader on that page. The simplest shape is the reader mounting it alongside itself:

```js
import { useParams } from 'react-router-dom';
import { useProgressTabData } from './src/course-home/data/apiHooks';
import { useExamsData } from './src/course-home/progress-tab/hooks';

RenderWidget: () => {
  const { courseId } = useParams();
  useProgressTabData(courseId); // fetches; useExamsData reads the result
  const examsData = useExamsData();
  // ...
},
```

Both sides build the same key (`targetUserId` is undefined off the progress route), so the one-argument call lands on the entry the reader hooks use. With #2105 below this layer, that fetch has no side effect: on a course whose MFE progress tab is disabled the widget's query errors and the page stays put. `useExamsData`'s own exam-attempts query is unchanged.

## Testing

`npm run types`, `npm run lint` and the full suite (113 suites, 1145 passed, 3 skipped) are green.

Manually verified on tutor dev as staff, with three `env.config.jsx` widgets installed: the README example in a progress-tab slot, an off-tab reader calling `useExamsData()` alone, and an off-tab owner mounting `useProgressTabData` beside it. One `course_home/progress` request per load on both the plain progress URL and `/progress/:targetUserId` (two before this layer); header, completion chart, grade summary, detailed grades, related links and masquerade render as before; the README-example widget renders exam names with one attempt request per subsection; the off-tab reader reads `null` with no progress request; the off-tab owner reads the data with exactly one progress request. With both off-tab widgets installed the reader shows the data too — the cache is shared, so one fetching observer on the page feeds every reader — which is what the README sentence now says. Not run: certificate status and credit information (the test course produced neither), and the console was not compared against a before capture.

## Decisions

Working notes for this layer, kept out of the tree:

<details>
<summary>Full decision log</summary>

# Decisions — stop the progress tab data refetching from components under the tab (#2103)

Layer on top of #2104 (PR #2105). The diagnosis, the ownership fix, the
non-fetching reader shape, the plugin contract and the commit type were
settled in the plan on issue #2103; entries here record choices made while
implementing, and confirm the plan's expectations against the code.

1. **`useProgressData()` never fetches and takes no option.** The shape
   `decisions-2098.md` entry 4 settled for `useIsCourseLoaded`: every one of
   the 22 call sites renders under `ProgressTab`, which fetches the same key
   from the same `useParams()` values, so no caller wants the reader to fetch.
   A default-`true` option would let a new reader silently reintroduce the
   duplicate request; always-non-fetching fails loudly instead (a reader with
   no owner reads `undefined` forever). `useExamsData()` reads through it and
   inherits the shape — see entry 3 for why no default serves both of its
   placements.

2. **Plain `enabled`, no `!!courseId` guard.** Every sibling course-home hook
   with the option guards on `courseId`; `useProgressTabData` never has, and
   an undefined `courseId` cannot happen on its route. Adding the guard would
   be a behaviour addition, not a faithful change, so the inconsistency in the
   diff is deliberate.

3. **The plugin contract narrows, and that is `refactor!:`.** `useExamsData()`
   (documented in `progress-tab/README.md`) and `useProgressData()` were
   fetching observers and now only read what `ProgressTab` has fetched. In a
   progress-tab slot — the documented use — they return exactly what they did.
   Anywhere else they now return `null` / `undefined` instead of triggering
   the fetch. Keeping a fetching default so the off-tab use kept working was
   rejected: `useExamsData()` is built on `useProgressData()`, so that shape
   puts the duplicate request back into the documented use (a widget under the
   tab mounts after the gate, finds the data stale, refetches). No default
   serves both placements. The off-tab use gets a migration path instead —
   mount `useProgressTabData(courseId)` alongside the reader, the same
   owner-fetches / reader-reads mechanism `src/tests/MountCourseQueryHooks.tsx`
   uses — stated in the README sentence, the `BREAKING CHANGE` footer and the
   PR's Plugins section. Plugins can observe the change through the import
   path the README gives, and #2075's footer told them to migrate onto
   `useExamsData`, so it gets the footer the epic's three earlier `refactor!:`
   commits got. With #2104 below this layer, the fetch the migration note
   tells plugins to mount has no side effect (the 404 redirect now belongs to
   `ProgressTab`), which is why #2104 was sequenced first.

4. **The README sentence names the fix, not just the constraint.** The README
   was example-only and is the hook's only public contract. After this change
   a widget calling `useExamsData()` off the tab reads `null` with no error
   and no log, so the placement constraint is stated where plugin authors
   read, together with the one-line way out. `decisions-2098.md` entry 4's
   no-comment reasoning is about in-repo readers whose owner is a few frames
   up — a different audience.

   **Wording, after manual testing.** The first draft said the hook returns
   `null` off the tab "unless the widget also calls `useProgressTabData`".
   Testing with both an off-tab reader widget and an off-tab owner widget
   installed showed the reader reporting the count too: the query cache is
   shared, so one fetching observer anywhere on the page populates the entry
   for every reader on that page, and the owner need not be the same widget.
   Removing the owner widget took the reader back to `null`. The sentence
   now says "unless something rendered on the page fetches that data", with
   the self-owning widget as the example, and the `BREAKING CHANGE` footer and
   PR body say the same.

5. **The component-level request count waits for the client to go idle.**
   `fetchAndRender` returns when `TabPage`'s loading indicator disappears,
   which is when the readers mount; any refetch they trigger reaches the mock
   adapter a few microtasks later, so an immediate assertion could read one
   even on the old code. The test waits for `queryClient.isFetching()` to be
   0, then counts. Confirmed against the #2104 source: the count reads **2**
   there and **1** here. Neither #2083 nor #2098 pinned a count at component
   level; this suite already renders the owner against a mocked endpoint, so
   it is the one place the number the manual protocol counts can live in code.

6. **`hooks.test.jsx` hoists the route wrapper, mock adapter and query client
   to module scope.** The new `useProgressData` describe needs the same
   `MemoryRouter` + `QueryClientProvider` wrapper and per-test client the
   `useExamsData` describe had built inside itself. Duplicating them was the
   alternative; hoisting them (plus `courseId` and a `progressRequests`
   helper) lets both describes share one setup, with each describe's
   `beforeEach` registering only its own mocks. The `useExamsData` cases are
   otherwise unchanged apart from the first one also asserting zero progress
   requests — on the #2104 baseline it fired an unmocked GET that the adapter
   answered 404, which the *requests nothing* claim did not count.

7. **The disabled-hook test mocks the endpoint with a 200.** *Stays idle with
   no request when disabled* registers a successful handler for the progress
   URL before rendering the disabled hook, so a zero request count proves the
   option held the fetch back rather than a missing handler failing it.

8. **Negative check.** With `apiHooks.ts` and `hooks.jsx` stashed back to the
   #2104 state, all five new or tightened assertions fail: the disabled hook
   reads `fetching`, `useProgressData` fetches on its own and again beside an
   owner, the first `useExamsData` case fires a progress GET, and the
   `ProgressTab` count reads 2.

</details>

## Manual testing

<details>
<summary>Checklist</summary>

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

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
