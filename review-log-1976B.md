# Review log — courseware Redux slice teardown (#1976, layer B)

Running log of review discussion on the B layer (`9b0129da` at review start).
Broader than the decision doc: everything discussed lands here as it happens —
questions asked and their answers, things checked and found fine, small
wording/placement tweaks — and anything decision-doc-worthy gets promoted to
`decisions-1976B.md` as it comes up.

Format: one entry per topic, newest last. Each entry: what was raised, what we
found, what (if anything) changed.

---

## 1. constants.ts — are the status constants still needed?

Raised: `StatusValue` was removed but the constants powering it weren't.
Found (per-constant grep): `LOADING`/`LOADED`/`FAILED` have live consumers
outside the retired tab-status vocabulary — `preferences-unsubscribe` (local
component state), `course-exit/track.js` (analytics labels for
`recommendations_status`), and the `courseHome` slice's remaining writers
(#1978's teardown). `DENIED` had exactly one consumer left — TabPage's string
branch — so it died with this layer and its removal was missed.
Changed: `DENIED` deleted from `constants.ts`; decision doc §6 corrected.

## 2. Redirect helpers — positional booleans are unreadable; move to typed options objects

Raised: the boolean reshape made the helper tests illegible — e.g. "returns
when routeUnitId is defined" went from `'loaded', 'loaded'` to `true, false`
(the second value sits in the *failed* slot, so the faithful translation reads
like a semantic flip). Positional params were the real problem (6–9 args even
pre-B).
Discussed: per-helper typed options objects; the load-bearing subtlety is
memoization — these are fire-once guards called from a no-dep-array effect,
and `defaultMemoize`'s per-arg `===` never matches a fresh object literal, so
a naive object arg would fire the guards every render (`getResumeBlock` GET
per render, repeated navigations). Fix: `defaultMemoize(fn, shallowEqual)` —
one-level field-wise `===` on the args object, exactly the comparison depth
the nine positional args get today. Probed whether that holds for the object
fields (`sequence` in the marker helper): yes — reference equality on the
model object is today's semantics too, and RTK's immutable updates make
reference-change ⇔ content-change, so re-fires on model updates (e.g. the
optimistic `activeUnitIndex` write) behave identically. Constraint recorded:
no args field may be a per-render fresh literal, or the guard is quietly
defeated.
Changed: six helpers take per-helper typed args objects,
`memoize(fn, shallowEqual)`; container call sites go shorthand; test call
sites become named (and their truthy/falsy stand-ins for `section` become
honest values — `null` / a minimal `{ sequenceIds: [] }` — to satisfy the
types). Decision doc §2 rewritten.

## 3. Redirect-args interfaces — dedup via a base + one shared family

Raised: five interfaces repeated the same fields.
Changed: `RedirectArgsBase` (`courseId`/`navigate`/`isPreview`) with four
extenders; the two section-resolving helpers share `SectionRedirectArgs`;
`SequenceRedirectArgs` (already shared by the two sequence-loaded helpers)
now extends the base. `checkSectionToSequenceRedirect` accepts-but-ignores
`isPreview` through the shared type (chosen over an `Omit` for family
clarity; the container passes it). Noted in passing: that helper never
preview-prefixed its navigations — a preview learner on a section URL drops
out of preview — pre-existing (same family as the A4 jumpnav gap), untouched.
Stopped short of facet intersections for `isCourseLoaded`/`isSequenceFailed`;
the distinctive fields per interface are the readable part.

## 4. The fire-once comment sat on the wrong declaration

Raised: the block above `RedirectArgsBase` felt off.
Found: it described the helpers' memoization contract, not the interface;
half of it was rationale that already lives in decision doc §2.
Changed: deleted from the interface; the one load-bearing constraint (no
per-render fresh literals in the args objects) moved to the effect's
call-site cluster — the place a future edit would introduce one.

## 5. Redirect machinery extracted to `src/courseware/redirects.ts`

Raised: the fire-once comment hid among giant comment blocks; the stale
"move this into the thunks layer (TNL-8182)" comment aspired to a layer this
stack deleted; `check*` names were class-era mechanics, not the job.
Changed: the subsystem has a home and a grounded name — ADR 0008's
"liberal courseware path handling" redirect rules. `redirects.ts` carries a
module header (normalization story + the fire-once/shallowEqual constraint,
once), the six rules renamed without the `check` prefix
(`resumeRedirect`, `sectionUnitToUnitRedirect`, `sectionToSequenceRedirect`,
`unitToSequenceUnitRedirect`, `sequenceToSequenceUnitRedirect`,
`sequenceUnitMarkerToSequenceUnitRedirect`) with their route-diagram comments
attached to the rules, and a self-contained `useCoursewareRedirects()` hook
owning the no-dep-array effect and the redirect-only derivations
(`sectionViaSequenceId`, `firstSequenceId`). The container shrank ~90 lines
to its rendering job (TabPage/Course data, handlers, the save-position
guard); `modelsOf`/`CoursewareModels` moved to `data/modelReads.ts` (both
files read models). The stale thunks-layer comment and the six "Look at
where this is called" lines died. Tests moved to `redirects.test.ts`;
going TS surfaced three artifacts: slice-era `sequenceId: null` values
(runtime is route-param `undefined`), a `URL` object passed where the other
describe used `.href`, and six `sectionToSequenceRedirect` calls missing the
now-shared `isPreview` field.

## 6. The outline-failure bounce was a stranded redirect rule

Raised: the "with access granted, a failed outline" block in the container
felt like it came out of nowhere.
Found: it was routing policy left behind by the extraction — the seventh
rule, orphaned in a component about rendering.
Changed: it is now `outlineFailureRedirect` in `redirects.ts` (route-diagram
comment, `OutlineFailureRedirectArgs`, shallowEqual memoize, three unit
tests), applied by `useCoursewareRedirects`, which gains its own
outline/courseHomeMeta subscriptions. The container loses the block and its
`outlineQuery`/`Navigate` imports — it now holds only what it renders.
Accepted timing delta: effect-time `navigate()` like its siblings instead of
a render-time `<Navigate>`, so the outline-error edge can paint one frame of
chrome before redirecting (the other six rules already have exactly this
character; the old bridge-era DENIED redirected pre-paint).

## 7. The convenience-id reads get a named helper

Raised: `const [courseId] = Object.keys(models.coursewareMeta);` (Course.test)
is hard to read — map-keys trivia plus array-destructure for "first element",
repeated at every call site.
Changed: `getTestStoreIds(store)` in `setupTest.js` returns
`{ courseId, sequenceId }`; the "single-course/single-sequence factories, ids
are the sole map keys" reasoning is stated once at the helper. All ~30 reads
across 19 files converted; call sites read like the pre-B destructure
(`const { courseId, sequenceId } = getTestStoreIds(store)`), and the
MasqueradeWidget pair drops its structural cast. Sites reading ids off a
factory-built `outline` object (not the store) were left alone. Locals
(`models`/`state`/`storeState`) that existed only to feed the reads were
deleted; ones still feeding `models.units` reads stay.

Follow-up: single-value reads use property access
(`courseId = getTestStoreIds(store).courseId;`) instead of a parenthesized
one-key destructure — the parens (required for a bare `{ ... } =` assignment
to outer `let`s) weren't earning their cleverness for one value. The
two-value sites (UnitButton, CourseOutlineTray) keep the parenthesized
destructure.

## 8. apiHooks.ts `| undefined` — rationale to the decisions doc

Raised: why `| undefined` instead of `?`, and the inline comment neither
explained that nor needed to be inline.
Answer: `?` means the argument/field may be omitted; `| undefined` means it
must be passed but may hold undefined — which is what route params are. `?`
would let `checkBlockCompletion(courseId)` compile with sequenceId dropped.
Changed: both inline comments deleted; the rationale now lives in decisions
doc item 7.

## 9. `modelReads.ts`/`modelsOf` → `modelReader.ts`/`readModels`

Raised: the file's only consumed export is the reader, and "modelsOf" as a
name felt completely separate from "modelReads" as a file name.
Changed: the file is `modelReader.ts` and exports `readModels(state)` — the
two names now share one idea. `CoursewareModels` keeps its name (internal to
the file; redirects.ts references it in a comment only).

## 10. The `sequence: any` comment decodes only if you already know the answer

Raised: the block comment above `SequenceRedirectArgs` ("null-ness is guarded
by the sibling isSequenceLoaded boolean, which TypeScript cannot narrow
across fields") felt confusing.
Changed: block comment deleted; a terse trailing note on the surprising line
states the facts a reader needs — `// untyped model-store object; null until
isSequenceLoaded (store dissolves in #1977)` — and the TypeScript-narrowing
rationale stays in decisions doc item 2. The #1977 pointer records that the
`any` has a planned expiry: once reads come off the typed query results, the
sibling-boolean guard and the untyped object collapse into one narrowable
value.

## 11. outlineFailureRedirect's parenthetical — discussed, kept

Raised: why the "(A 403 outline means no access, which TabPage's denied
redirect covers via courseHomeMeta.)" clause is in the rule's comment.
Answer: it justifies the `hasAccess` gate — the rule yields to TabPage's
denied redirect, which carries the specific access-error URL that this rule's
generic `/course/:courseId/home` would otherwise clobber. Duplicates
decisions doc item 4, but kept inline as the gate is the rule's one
surprising condition. No change.

## 12. The deleted `./tab-page` mock in index.test.jsx — explained, noted

Raised: why index.test.jsx no longer mocks tab-page.
Answer: the mock (`{ TabContainer: 'Tab Container' }`) was left over from
when index.jsx wrapped tab routes in TabContainer directly; since the tab
conversions nothing in the registry test's tree imports ./tab-page (the only
route-level TabPage consumer, CoursewareContainer, is itself mocked), and
with TabContainer deleted the mock would have declared an export that no
longer exists. It never stubbed TabPage. No code change beyond the deletion
already in the diff; rationale added to decisions doc item 6.

## 13. TabPage.test.jsx deletions audited, mapped in the decisions doc

Raised: five tests are fully removed — is everything they tested still tested
or truly obsolete?
Answer: each maps to a query-branch case (loading -> the two isPending cases;
unrecognized-string fall-through -> the isError cases, with the bad input now
unrepresentable by type; the two hand-dispatched slice custom-message cases ->
the two 403-detail cases, the slice transports having been dead in production
since the tab conversions / A2; no-custom-message generic -> the non-403 and
bodyless-403 cases). Changed: a removed-test -> coverage-now table added to
decisions doc item 8.

## 14. Codecov project drop traced to the orphaned `fetchTabFailure` reducer

Raised: the codecov project check failed (-0.22%) on #2074.
Found: base-vs-head coverage diff localized every newly-uncovered line to
`course-home/data/slice.js` — `fetchTabFailure`'s body (4 lines, 4 branches),
whose only exercisers were the deleted TabPage string-branch tests
(hand-dispatching the action). No production dispatcher since #2006; not an
exported surface. The new `redirects.ts` is fully covered and the container's
uncovered celebration block predates B.
Changed: the reducer, its export, and its `FAILED` import delete (decisions
item 8, the live-tab precedent); the rest of the courseHome slice waits for
#1978.
