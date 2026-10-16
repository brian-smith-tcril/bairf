# Decisions — restore the 403 detail message (#1976, layer B-prep)

1. **This layer shrank in review: it is the 403-detail restoration, nothing
   else.** A first draft also widened TabPage's `CourseStatus` with an
   optional `outlineQuery` (outline pending → loading, outline error →
   denied) so B's container could pass its third query. Rejected — TabPage's
   two-slot contract (`metadataQuery` = access authority, `tabDataQuery` =
   the tab's content) is generic, and the outline is courseware-specific
   routing policy that belongs in the component that owns routing policy: the
   container. In B, the container passes the standard two-slot shape and
   itself renders the home redirect on outline failure (the
   `getAccessDeniedRedirectUrl` default-branch outcome the bridge's `denied`
   produced); outline-pending needs no handling post-A3 (children tolerate a
   not-yet-loaded outline; the only delta is a transient chrome-while-outline-
   finishes tail, documented in B). The branch name
   (`bsmith/tabpage-outline-query`) predates this reshape.

2. **The fix this layer ships.** The old shared `fetchTab` thunk's catch
   block (visible at `d6d9a619~1`, pre-#1987) extracted `detail`/`error_code`
   from a 403 body into `fetchTabFailure`, which TabPage rendered. The tab
   conversions #1987→#2006 removed its dispatchers tab by tab (#2006 deleted
   `fetchTab` outright), leaving `state.courseHomeMeta.errorMessage`
   permanently null — converted course-home tabs have shown the generic
   failure text where they used to show the 403's `detail`. Courseware never
   regressed (its status bridge does the same extraction into
   `state.courseware.errorMessage`). Committed as `fix:`, not `refactor:` —
   it is a user-visible repair with standalone value.

3. **The body-shape knowledge lives in `src/data/http-error.ts`**
   (`getErrorDetail(error)`, named beside `getResponseStatus`) next to
   `RequestError`, which already models `response.data.detail` — TabPage
   imports it and stays a renderer. Shaped in review as a status switch —
   "which statuses' messages do learners see" — with per-case notes: 403
   returns `data?.detail` (access denials carry backend-authored,
   learner-facing prose; exactly the old thunk's and the bridge's condition),
   everything else returns undefined (other statuses' `detail` is DRF
   plumbing like "Not found."), and the default arm is where a future status
   would be added. An `accessErrorDetail` draft name was rejected: components
   call it on errors that aren't access errors, so the filter semantics
   belong inside, not in the name. `errorCode` is not carried over anywhere —
   the thunk and bridge wrote it, nothing ever read it.

4. **`deriveView` owns the error detail for both caller shapes.** Three
   review rounds landed here. Draft one OR-ed the query extraction onto the
   two slice reads — rejected: not three parallel sources but the same
   message on two transports, and the chain only worked by the other era's
   values being null. Draft two branched on the `courseStatus` shape inside
   `renderError` — rejected: review found a hole (a failing *tab-data*
   request's 403 detail, which the old shared thunk also surfaced, wasn't
   covered) and the slice reads still competed with the derived value. End
   state: `TabView` gains `errorDetail?`; the query branch sets it from
   whichever query failed (`metadataQuery` first, matching its precedence in
   the view; then `tabDataQuery`), and the string branch sets it from
   `sliceErrorMessage` — a transitional second parameter the component feeds
   with `courseHomeErrorMessage || coursewareErrorMessage`, so the slices are
   the string era's *input*, not a competing output. `renderError` is just
   `{errorDetail || generic}`. In B the string branch, the param, and both
   slice reads delete together, leaving the unary derivation.

   To head off the natural review question — this is deliberately the *error*
   path, not the *denied* path. There are two different 403s: a resolved
   denial (HTTP 200, `hasAccess: false` + an `errorCode`) drives `isDenied`,
   which never renders a message — it computes a redirect from the errorCode
   or renders the page; a rejected request (HTTP 403 with a `detail` body)
   drives `isError`, whose error paragraph is the only UI — the flow the old
   thunk's catch block served and this layer restores. CourseExit — the one
   query caller whose detail previously traveled bridge→slice — gets the
   identical detail from the extraction (its `metadataQuery` is the
   courseHomeMeta query; its existing 403-detail integration test passes
   unchanged on the new path).

5. **Tests:** four new query-branch cases — 403-with-detail on the metadata
   query renders the detail, 403-with-detail on the tab-data query renders
   its detail (the review-found hole), non-403 and bodyless 403 render the
   generic message. The string-branch cases are untouched (their message now
   flows through `deriveView`'s transitional param) and die in B.
