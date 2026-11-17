# Decisions — port the courseware container and redirects (#2195)

The effort's working log for #2195: what was settled and done, in order.
Each layer's own decisions are in its `decisions-<pr>.md`, embedded in
its PR.

1. **Planning (2026-11-12), not yet settled or posted.** `plan-2195.md`
   is a draft; #2195's body is still the 2026-10-20 text. Settled with
   Brian so far:
   - **Three layers on the running stack**, above `bsmith/outline-tab`:
     the courseware data module, the two wrappers, the container with
     its redirects ("3 layers sound good"; "build on the existing
     stack, nothing wrong with having more open layers").
   - **`DecodePageRoute` decodes every path segment and reads no route
     list; its trailing-slash redirect is let go** ("no list, let the
     trailing slash redirect go"). Three candidates were put to Brian
     as code. He ruled out a ported `DECODE_ROUTES` first: two
     definitions of the course routes was enough ("the plain list
     option's con of two sources of truth is enough for me to rule it
     out"). Patterns derived in `routes.tsx` and passed as a prop was
     my recommendation until he asked why it beat no list; it kept
     `master`'s algorithm and bought nothing a learner sees. The
     reasoning, the two differences from `master` and the
     react-router reading are in the plan under "What changes".
   - On the way Brian asked where the links come from. Neither
     wrapper's PR names a producer (#693, #1090), and the address is
     the same before and after the conversion (decision 21); `master`'s
     router strips `/learning` as its basename and the shell's does
     not, which is all the prefix in the port stands for (plan,
     Baseline).
   - The handlers question, open at this point, is settled below.
   - Brian asked for the history of `index.test.jsx`'s "should only
     decode the url params and not the entire url" ("it feels like
     there must have been a reason behind that"). Read #1090, its
     commit, #1128 and #2047: the only recorded reason is the code
     comment "it is just to be safe and less prone to errors"; the
     params were what react-router 5's `computedMatch` handed the
     wrapper; `DECODE_ROUTES` arrived with the react-router 6 upgrade
     to recreate that match. The ticket #1090 cites is 2U-internal.
     Detail in the plan under the `DecodePageRoute` bullet.
   - With that history in hand Brian kept no list: "my gut feeling is
     that the previous 'only decode the params' thing was likely
     overzealous"; the Jira ticket is closed to him too and asking for
     access "wouldn't be fast/easy". The removed `index.test.jsx` case
     and this reasoning are named in the layer's PR.
   - **The container's three handlers are tested at layer 3, in their
     own test file, and the cases stay.** I first proposed a mock of
     `./course` whose cases #2196 would delete; Brian: "why would we
     need to write tests that will be removed instead of adding
     coverage at a layer that matches the stuff we're adding like we
     did with previous layers?" The deletion was never needed. The
     cases mock `./course` in a new file beside `master`'s suite, as
     `ProgressTabComponents.test.tsx` (#2247) and
     `OutlineTabComponents.test.tsx` (#2252) sit beside theirs;
     `master`'s suite ports whole with five cases `it.skip` under
     #2196, which unskips them. The plan has no open questions.

2. **The amended body is drafted, ahead of the live one (2026-11-12).**
   `issue-body-courseware-container.md` is rebuilt from the settled
   plan and `plan-2195.md` now mirrors its plan block (decision numbers
   kept in the plan, restated in words in the body); the planning
   discussion stays in entry 1. #2195 on GitHub still carries the
   2026-10-20 text until Brian says to post. Drafting choices Brian
   has not yet seen, each put to him with the draft:
   - "Depends on #2191" replaces "Depends on #2189": the layers sit
     above `bsmith/outline-tab` and restore lines #2246, #2249, #2251
     and #2252 left commented under this issue's URL.
   - The unit form in `courseware/urls.ts` moves from layer 1 to layer
     3, where `coursewarePath`, its first caller, is.
   - `courseRecommendations` and `discussionTopics` are built by no
     suite ported here (`master`: `CourseExit.test.jsx`; the
     discussions widget's two tests), so their commented imports stay
     and are re-pointed at #2202 and #2199.
   - The redirect table gains the rows `master`'s eight rules have and
     the 2026-10-20 table lacked: a unit id in the sequence slot, an
     id that is none of the three, and preview as staff; its column is
     where a path settles, since rules chain.
   - Branch names proposed: `bsmith/courseware-data`,
     `bsmith/courseware-route-wrappers`, `bsmith/courseware-container`.
   - A third summary line above the plan names the two wrapper
     differences and the returning page event.
   - Brian, 2026-11-17: "Depends on #2191" stands ("sounds good"); the
     unit form in layer 3 ("that seems reasonable i think"); the two
     factory comments re-pointed ("sounds reasonable"); the branch
     names ("seem fine"). He asked for more on the redirect table and
     on the third summary line; both still open.
   - **Redirect tests assert the landing, and each hop of a multi-hop
     form** (Brian, 2026-11-17: "redirect tests for 'where to we
     eventually land' makes sense. if we're doing multi-hop redirects
     then also testing each hop individually is good"). `master`'s
     suite already asserts landings, since it runs the real router to
     the end of a chain; it asserts no intermediate address. The table
     gains a "Through" column, and a multi-hop form gets a case that
     reads every address the router visits from the router
     `renderRoutes` returns (how the router reports them is confirmed
     when the case is written).
   - Corrected the same day: I told Brian the course root is a
     three-hop chain, reading the resume response's `sectionId` as a
     section. It is the sequence (`Resume` in
     `openedx/core/djangoapps/courseware_api/views.py` fills
     `section_id` from `path[2]`, the sequential), so the root with a
     resume position is one hop, as `master`'s case mocks it. The
     draft body never carried the wrong chain.
   - The third summary line is two paragraphs, "Behavior changes from
     `master`" and "Also fixed here" (Brian, 2026-11-17: "that wording
     works"). My first version put the returning page event under
     "What differs from `master`", where it is the opposite, and he
     could not tell what the paragraph meant.

3. **The amended body is posted (2026-11-17).** One PATCH of #2195's
   body from `issue-body-courseware-container.md` on Brian's "go"; the
   live body was read back and equals the file. `UPSTREAM.md`'s row
   stays `settled`. Implementation of the three layers waits for
   Brian's word.

4. **The three layers are built locally (2026-11-17), on Brian's "go
   ahead and implement all 3 layers".** `bsmith/courseware-data`
   (`35c7c958`), `bsmith/courseware-route-wrappers` (`3745502f`) and
   `bsmith/courseware-container` (`9a8c77f8`) sit on the stack above
   `bsmith/outline-tab` (`84f00e55`); nothing is pushed and no PR
   exists. Each layer's decisions are in
   `decisions-2195-courseware-data.md`,
   `decisions-2195-courseware-route-wrappers.md` and
   `decisions-2195-courseware-container.md`, to be renamed by PR
   number.
   - What the implementation settled that the plan left as read, not
     run: the landing table passes unchanged through the route array
     (134 rows); escaped fixed segments decode; a trailing slash stays;
     the router's `subscribe` reports every address of a redirect
     chain, and the seven chains are as the plan's table has them.
   - Two differences from the posted plan's wording, both in the
     layers' logs: `courseware/urls.ts` also gains `getCoursewareUrl`
     and `getCourseOutlineUrl` behind one guard (the plan names only
     the unit form), and `queryClient.ts` types the retry default
     (not in the plan; found by the build).
   - Open for Brian: the unreachable branch in the `sequenceMetadata`
     factory (data layer, entry 10) and the `exhaustive-deps` warning
     on the container's position effect (container layer, entry 2).
   - Not done: the push and the draft PRs, the PR bodies, the manual
     passes of layers 2 and 3.

