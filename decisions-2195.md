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
   (`35bdb046`), `bsmith/courseware-route-wrappers` (`e0cef2b8`) and
   `bsmith/courseware-container` (`53eaf560`) sit on the stack above
   `bsmith/outline-tab` (`84f00e55`); nothing is pushed and no PR
   exists. Each layer's decisions are in
   `notes-2195-courseware-data.md`,
   `notes-2195-courseware-route-wrappers.md` and
   `notes-2195-courseware-container.md`, to be renamed by PR
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
   - The unreachable branch in the `sequenceMetadata` factory is
     dropped on Brian's word (data layer, entry 10), amended into the
     data layer, and the two layers above rebased onto it and checked
     again; every layer's patch now has no missed and no partial line.
   - The container's position effect limits itself with a ref and
     lists every value it reads, on Brian's word (container layer,
     entry 2); lint now reports nothing on any layer.
   - To put in the issue body before the push, if Brian wants it
     there: the two more URL forms and their guard, the retry default's
     type, and the position effect's guard.
   - Not done: the push and the draft PRs, the PR bodies, the manual
     passes of layers 2 and 3.

5. **The body carries what the implementation settled (2026-11-17).**
   On Brian's "ok i guess we can update the issue body", one PATCH of
   #2195 from `issue-body-courseware-container.md`; the live body was
   read back and equals the file. Added, each as a clause or a bullet
   in the plan block: the three new forms in `courseware/urls.ts` and
   their guard; the position effect's ref guard; the retry default's
   type; the factory builder commented out under #2196 and the
   factory's dead branch; the probe pages the wrapper tests render;
   the landing table's result; the two retry counts; the new position
   case; the parked sequence navigation assertions and the virtual
   mock.

6. **Brian is reviewing each layer's diff before the push
   (2026-11-17), the data layer first**, in the diff viewer on the
   output of `bin/port-diff`. Changes from the review are amended into
   the layer and the layers above rebased locally; the layer logs
   carry each one. So far: the `sequenceMetadata` factory's bare
   `courseId` option (data layer, entry 10). The body draft is ahead
   of the live body by that sentence; the PATCH waits for the end of
   the review. After each amend the amended layer and the top layer
   are checked in full; the middle layer is run again once the review
   ends, before anything is pushed.
   - The data layer's code is reviewed (Brian, 2026-11-17: "i think
     the code for this layer looks good"). He would have submitted its
     draft there and then, but a submit takes the whole stack, so the
     three go up together after the other two are reviewed. The route
     wrappers are next.
   - The wrappers layer's code is reviewed (Brian, 2026-11-17: "code
     for this layer looks good"), after three changes from the review:
     `index.test.jsx` keeps `master`'s prop-bag shape, asserts on a spy
     of the router's `navigate`, and the test helper is
     `replacePages`. The container layer is next.
   - **To follow up after this review (Brian, 2026-11-18: "let's make
     a note to follow up on that after this review"): the intermittent
     failure in `OutlineTab.test.jsx`, "Certificate Available Alert ›
     appears".** Seen once on 2026-11-17 in a full run of the
     container layer (container layer's log, entry 15), and passing on
     every rerun. The case is `master`'s (the assertion's text dates
     from #901, 2022) and came into the package with #2252's port
     commit, `74b0eb31`; the harness around it, `fetchAndRender`, is
     #2252's. #2252 is open, out of draft and green at `84f00e55`, so
     its CI has not shown it. Not diagnosed. The guess to test first:
     the case asserts with `queryByText` straight after
     `fetchAndRender`, and the alert arrives a tick later under load.
     It failed a second time on 2026-11-18, in a full run, and passed
     on the next: about one full run in ten so far.
   - The container layer's code is reviewed (Brian, 2026-11-18: "i
     think i'm ok with this layer now too"), after the changes its
     log's entries 7 to 9 carry. All three layers are reviewed;
     nothing is pushed.

7. **The manual pass is drafted (2026-11-18)**, as
   `manual-testing-2195.md`, one section per layer, each step with
   what the layer changed and what it needs. Two things came up while
   preparing it, both checked without Brian and neither this issue's:
   - A course key with a non-ASCII letter renders nothing under a
     browser router, with this layer's wrapper and with `master`'s
     (throwaway cases in jsdom, run and deleted): the browser holds
     the address encoded, the wrapper decodes it, and the two never
     match.
   - The body's acceptance line "The courseware tab is active in the
     shell course bar on courseware routes" is from the 2026-10-20
     text and has not been checked. The shell selects the tab whose
     URL is the longest prefix of the address (`findActiveTab` in
     frontend-base's `shell/header/course-bar/data/service`), and a
     unit's address is under no tab's URL, so by reading no tab is
     selected. The pass records what shows (container section, step
     6); the line is corrected after.

8. **The manual pass is run (2026-11-18)**: Brian ticked the four
   steps of the wrappers section on `e0cef2b8` and the eight of the
   container section on `53eaf560`; `manual-testing-2195.md` has the
   record.
   - One difference from `master` came out of it: on a unit page the
     shell's course bar selects no tab, where `master` selects the
     Course tab. It is the shell's rule (`findActiveTab`: the tab
     whose URL is the longest prefix of the address), not this
     layer's code. The body's acceptance line "The courseware tab is
     active in the shell course bar on courseware routes" cannot be
     met by this issue; what to do with the line and whether to file
     the gap on frontend-base are Brian's.
   - Brian: the tab "doesn't feel like it should block these PRs, but
     we should definitely make a frontend-base issue for it and add it
     to the epic". Drafted as `issue-body-course-bar-selected-tab.md`
     (unpublished).
   - Left out of that issue on Brian's word ("drop the section"), and
     kept here for #2194: the shell's masquerade bar calls the same
     `findActiveTab` after a masquerade change
     (`shell/header/course-bar/masquerade/hooks.ts`) and navigates to
     the first tab when it returns nothing. On a courseware page it
     returns nothing for every user, so by reading a masquerade change
     made on a unit's page sends the user to the course home, where
     `master`'s widget reloads the page in place. Read, not observed;
     to be checked on the dev site with a staff user when #2194 is
     taken up, and filed on its own if it happens.
   - Also left out of the issue on Brian's word: with the per-course
     waffle flag `course_experience.disable_course_outline_page` on,
     the platform's `default_course_url` gives the Course tab the
     courseware address `…/course/<course>`, every course page is
     under it, and the course bar's rule would select the Course tab
     in courseware. Read in `openedx/features/course_experience`,
     not observed. The issue says the tab's link is the course home
     "by default".
   - Filed on Brian's word (2026-11-18, "ok go ahead and file it"):
     openedx/frontend-base#359, "The course bar selects no tab in
     courseware", created from the draft and read back equal, then
     added as a sub-issue of openedx/frontend-app-learning#1905, as
     #332, #348 and #349 are. `UPSTREAM.md` has it `in-review`. The
     body draft's acceptance line about the courseware tab now says
     what was seen and points at #359; the live #2195 body gets it
     with the pending PATCH.

9. **The body carries what the review and the manual pass settled
   (2026-11-18).** On Brian's "yeah, patch the body", one PATCH of
   #2195 from `issue-body-courseware-container.md`; the live body was
   read back and equals the file. Before it went up, a scan for
   statements the review had made stale found one more, the plan's
   manual-testing paragraph, which still asked for the page event by
   hand and said the courseware tab is active; it now says what the
   pass asked and saw.

10. **Ready to push (2026-11-18).** The two blocks added at the end
    of `CoursewareContainer.test.jsx` stay there (Brian: "yeah, leave
    them"): they share the suite's setup and read as plain additions.
    Each layer is checked on the commit that would go up:
    `35bdb046` (43 suites, 643 passed, 11 skipped; patch 238 lines),
    `e0cef2b8` (46 suites, 792 passed, 11 skipped; patch 20 lines),
    `53eaf560` (49 suites, 846 passed, 17 skipped; patch 154 lines);
    lint clean, both builds passing, 100% of lines and no missed or
    partial patch line on all three. The push and the draft PRs wait
    for Brian's word.

11. **The three layers are up as drafts (2026-11-18).** On Brian's
    "go ahead and submit", `gh stack submit --auto --remote upstream`
    pushed the three branches and opened #2260 (the courseware data
    module, `35bdb046`, on `bsmith/outline-tab`), #2261 (the route
    wrappers, `e0cef2b8`) and #2262 (the container and redirects,
    `53eaf560`), all drafts, on stack #2248 with #2249, #2251 and
    #2252, which were left as they were. The layer logs written while
    building and reviewing become `notes-2195-*.md`, the effort's own
    record of how each change came about; `decisions-2260.md`,
    `decisions-2261.md` and `decisions-2262.md` are the logs the PRs
    carry.


12. **The three PR bodies are set (2026-11-18).** `pr-body-2260.md`,
    `pr-body-2261.md` and `pr-body-2262.md`, each applied with one
    `gh pr edit --body-file` and read back equal to its file, the
    stack footer gone. Each embeds its `decisions-<pr>.md` whole;
    #2261 and #2262 embed `manual-testing-2195.md` whole, and #2260
    has no manual pass.
    - Corrected while writing the public logs, against the code: the
      non-null assertions in `apiHooks.ts` are eleven, on `master` and
      in the port (the layer notes said ten); the "Start null so first
      render triggers unit shift logic" comment is on the ref's
      creation in `sidebar/SidebarContext.tsx`, not in
      `useUnitShiftBehavior.ts`; gradebook's `src/data/query.ts` is on
      its `master` branch, linked at `b98b972a`.
    - Left out of the public logs: the account and profile retry
      prior art, not re-read in this session.
    - `manual-testing-2195.md`'s "Put to Brian as a possible discovery
      issue" reads "No issue is filed for it".
    - GitHub lists no closing issue for #2262: its base is not the
      default branch, as with #2252 and #2191.
    - Still owed: the follow-up on the intermittent
      `OutlineTab.test.jsx` "Certificate Available Alert › appears"
      failure (entry 6), and Brian's word on whether the two
      pre-existing findings get discovery issues (the outline tab
      throwing for a denied learner whose outline request fails; a
      non-ASCII course key rendering nothing).

13. **The denied-learner throw gets a discovery issue, outside the
    epic (2026-11-18).** Brian asked what the two unfiled findings
    were, whether both are on `master`, and whether either has an
    issue.
    - The non-ASCII course URL has one: #1802 (open since 2025-10-06,
      no comments), a real-browser "white page" with a Cyrillic course
      key. The issue names no cause; the `DecodePageRoute` loop fits
      and is not confirmed as what the reporter hit. No new issue.
      Such keys need `ALLOW_UNICODE_COURSE_ID`, `False` by default
      (`cms/envs/common.py`); opaque-keys itself allows any Unicode
      word character.
    - The denied-learner throw is from Redux days, not the React Query
      conversion: #1259 (`ab871670`, merged 2024-01-22) made
      `fetchTab` report `denied` whatever the tab-data request did;
      #1997 kept that order in `deriveView`. Brian: "we can make a
      discovery issue for it on frontend-app-learning but keep it out
      of the epic". Drafted as
      `issue-body-outline-denied-failed-outline.md`, `unpublished` in
      `UPSTREAM.md`, with no "Part of #1905" and no sub-issue link.
    - Two sentences in the posted PR logs are wrong and wait for
      Brian's word to correct. #2261 entry 7: "Course keys made in
      Studio are ASCII" holds only by default. #2262 entry 16:
      "`master`'s container suite lands on that page in two cases
      with the outline request unanswered and does not notice" is
      false; `master`'s suite renders only the courseware routes, so
      the outline tab never renders at that address.

14. **The discovery issue is filed (2026-11-18): #2263**, "Outline tab
    throws for a denied learner when the outline request fails", from
    `issue-body-outline-denied-failed-outline.md`, on Brian's "just
    file it". Not a sub-issue of #1905 and no "Part of" line.
    `UPSTREAM.md`'s row is `in-review`.
    - Three things Brian took out of the draft, each for the same
      reason: the issue is `master`'s, from #1259 (January 2024), and
      must not read as a frontend-base issue. Out: a "both versions of
      Learning have it" paragraph; a mention above the fold of the
      port's failing test; "before the React Query conversion". Above
      the fold it says only that it was not seen on a running site,
      was found by reading the code, and dates from #1259.
    - The disclosure note covers the whole issue ("This issue was
      written by Claude…"), not "the details below".
    - Offered and not taken up: reproducing the throw with a throwaway
      case in `master`'s outline suite. "How it was seen" stays inside
      the details block, naming the port's suite.

15. **The two PR log sentences are corrected (2026-11-18), on Brian's
    "go ahead and fix the two PR log corrections".** Each edited in
    its decisions file and its PR body, one `gh pr edit` per PR, both
    read back equal to their files.
    - #2261 entry 7: course keys made in Studio are ASCII by default;
      Studio rejects other characters unless `ALLOW_UNICODE_COURSE_ID`
      is set, linked to `course.py` and `cms/envs/common.py`.
    - #2262 entry 16: `master`'s container suite renders only the
      courseware routes, so the outline tab never renders at that
      address there; "Filed as #2263" in place of "No issue is filed
      for it".
    - Changed with them, for the same reason: "no issue is filed for
      it" came out of #2261 entry 7 and of `manual-testing-2195.md`
      (embedded in both bodies), since #1802 reports a white page for
      a Cyrillic course key. #1802 is not named in either body: a
      mention would put a cross-reference on someone else's issue,
      which is Brian's call.

16. **The outline suite's intermittent failure is fixed in #2252
    (2026-11-18).** The follow-up of entries 6 and 12. Reproduced on
    `bsmith/outline-tab` under load, traced to two of `master`'s
    cases asserting synchronously on a lazily loaded alert, fixed by
    having them wait with `findByText`, amended into #2252's port
    commit, the three #2195 layers replayed onto it and the stack
    pushed (#2252 `0e9a8e22`, #2260 `2a1754c3`, #2261 `aa5cc29b`,
    #2262 `371a0e6a`). #2252's body carries the change (decision log
    entries 20 and 21). The whole account is in
    `notes-outline-cert-alert-flake.md`.
    - Not looked at: whether other suites with the same helper shape
      (the progress tab's, for one) assert synchronously on a lazy
      alert's first showing.
