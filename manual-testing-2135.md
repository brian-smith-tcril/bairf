# Manual testing — make the courseware redirects declarative and drop their fire-once guards (#2135)

In-browser verification against a live backend (tutor local). PR #2146.

What changed: the seven memoized redirect rules and `Course.jsx`'s render-time
`/preview` strip are eight rule hooks in `CoursewareRedirects.tsx`, applied first
match wins and rendered as one `<Navigate replace>`; the two lookups are queries
(the resume block keyed by the visit, the parent sequence kept for the session);
the position save is an effect on the route's unit id; the container fetches the
minimal course outline. Three deliberate behaviour changes (decision entry 13):
the non-staff `/preview` strip now fires; staff keep `/preview` through the
section → first sequence and empty-sequence redirects; an empty sequence at its
own URL no longer replaces the history entry with itself. Everything else should
land where it did.

**The bugs this layer could introduce.**
- *A rule misordered or misgated.* A redirect to the wrong place, a redirect
  that never fires, or one that fires before the course has loaded.
- *The resume lookup serving a stale answer.* A second visit to the course root
  in one session landing on the previous position.
- *A lookup fetched when its rule does not apply,* or more than once.
- *The position save firing on load,* or not on a unit change.

## Setup

- A course with two or more sections of several sequences each, some with
  several units, one sequence with no units, and a staff account plus a learner
  account.
- Devtools Network filtered to
  `courseware/course|course_outline|course_metadata|resume|blocks|goto_position`,
  Console open.
- **For the outline-failure checks,** make the outline request fail with a 500
  (a `throw` at the top of `getLearningSequencesOutline` in
  `src/courseware/data/api.js`), as for #2139; remove it afterwards. The redirect
  lands after the query client's three retries (about 7 s), as on #2144.

## Checks

### Request count (unchanged)

- [ ] **Hard-reload a unit, wait for idle:** `api/courseware/course/{id}` **1**, `learning_sequences/v1/course_outline/{id}` **1**, `course_home/course_metadata/{id}` **1**; no `resume` or `blocks` request.

### Redirects, each from a typed URL

- [x] **Course root, visited course:** `/course/{id}` lands on the last-visited unit; one `resume` request.
- [x] **Course root, never-visited course:** lands on the first unit of the first sequence.
- [ ] **Course root revisited in-session** (no page reload between the two visits; a typed URL reloads the app and empties the query cache, so the visit has to be in-app, and no UI link goes to the root): from a loaded unit, in the console run `history.pushState({}, '', '/course/{id}'); dispatchEvent(new PopStateEvent('popstate'));` → one `resume` request, lands on unit A. Click Next to unit B and let it render (completion is what the server's resume block follows). Run the console line again → a **second** `resume` request, lands on B, not A.
- [x] **Section:** `/course/{id}/{sectionId}` lands on the section's first sequence, at that sequence's saved position (its active unit) or its first unit when it has none; a section whose first sequence you were last in lands on the unit you left, any other section on the first unit. An empty section goes to the course root.
- [x] **Section and unit:** `/course/{id}/{sectionId}/{unitId}` lands on that unit within its sequence; one `blocks` request.
- [x] **Unit alone:** `/course/{id}/{unitId}` lands on the unit within its parent sequence; one `blocks` request.
- [x] **Sequence alone:** `/course/{id}/{sequenceId}` lands on its active unit.
- [x] **`/first` and `/last`:** land on those units.
- [ ] **Empty sequence:** `/course/{id}/{emptySeqId}/first` lands on `/course/{id}/{emptySeqId}`; `/course/{id}/{emptySeqId}` stays, and the history length does not change (`history.length` in the console before and after).
- [x] **Unknown id in the sequence slot:** `/course/{id}/not-a-block-id` goes to the course root; no `blocks` request.
- [ ] **Outline failure, with access:** a unit URL goes to `/course/{id}/home`; a sequence URL (`/course/{id}/{sequenceId}`) goes there directly, not via its unit.

### Preview

- [ ] **Staff, section URL under `/preview`:** `/preview/course/{id}/{sectionId}` lands on `/preview/course/{id}/{seq}/{unit}`, prefix kept, and the unit renders the draft (change a unit in Studio without publishing first).
- [ ] **Staff, empty sequence under `/preview`:** `/preview/course/{id}/{emptySeqId}/first` lands on `/preview/course/{id}/{emptySeqId}`.
- [ ] **Staff, unknown id under `/preview`:** goes to `/course/{id}` (no preview route for the root).
- [ ] **Learner, unit URL under `/preview`:** lands on the same URL without the prefix; the console shows no "You should call navigate() in a React.useEffect()" warning.
- [ ] **Learner, unit id in the sequence slot under `/preview`:** `/preview/course/{id}/{unitId}` lands on `/course/{id}/{seq}/{unitId}`; one `blocks` request.

### Position

- [x] **Next and Previous** each POST `goto_position` once per unit change within a sequence; nothing is posted on page load or when the sequence finishes loading. *Observed 2026-10-01:* crossing into another sequence posts twice, the first with `position: 0` for the `/first` or `/last` marker segment; pre-existing since #1137, same in the class component, not this layer's (decision entry 14, #2147).
- [x] **Sequence alone, then Next:** landing on `/course/{id}/{sequenceId}` and being redirected to the active unit posts `goto_position` once (the redirect is a unit change), then once more on Next.

## Results

Run 2026-10-01 on tutor local: **10 of 19 checks run, all passing; 9 not run.**
Nothing failed. The unchecked boxes above are checks that were not run, each
covered by a `CoursewareContainer.test.jsx` case:

- Request count: *requests the … once per load* (four cases).
- Course root revisited in-session: *should ask for the resume block again on a
  later visit to the course root*.
- Empty sequence: *should redirect a unit marker to the sequence*, *should stay
  on the sequence without a redirect to it*.
- Outline failure: *should go to the course home*, *should go to the course home
  rather than the sequence's unit*.
- The five preview checks, including the layer's one intended behaviour change
  (staff keep the prefix through a section redirect): *should keep the prefix
  when redirecting staff from a section to its first sequence*, *should drop the
  prefix when redirecting staff to the course root*, *should send a user who is
  not staff to the same URL without the prefix* (also asserts no router warning),
  *should send a user who is not staff from a unit ID in the sequence slot to the
  unit without the prefix*, *should keep staff on the preview URL*.

One finding, pre-existing and filed separately as #2147: crossing a sequence
boundary posts `goto_position` twice, the first with `position: 0` for the
marker segment (Position row above; decision entry 14).

Notes from the run: the **Section** row was first tested with sequence ids by
mistake (a section id is the `type@chapter` block; the row's wording was
corrected), and the **Unknown id** row's destination is the course *root*, which
then resumes, not the course home.
