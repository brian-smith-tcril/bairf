# Decisions — the outline tab's sequence due dates ignore the learner's timezone preference (#2148)

Found while planning #2130 (`plan-2130.md`, finding 1): typing the outline
data from what `getOutlineTabData` emits turned `SequenceDueDate.tsx`'s
`userTimezone` read into a compile error, and the history showed why. Layer
of the running stack #2141 above #2146 (#2135), branch
`bsmith/sequence-due-date-timezone`; #2130's layer goes on top. Settled with
the user 2026-10-01.

1. **Fix the read, do not delete it.** The read has yielded `undefined`
   since PR #606 (2021), which moved `userTimezone` to the course-home
   metadata for `OutlineTab.jsx` and `CourseDates.jsx` but in
   `SequenceLink.jsx` only removed the `datesWidget` nesting and left the
   model as `'outline'` (provenance in the issue). Deleting the read as dead
   code was proposed and rejected: it throws away the broken thing instead
   of fixing it. The change is the one #606 meant to make, the read
   `CourseDates.jsx` and `Day.jsx` have had since that PR:
   `useCourseHomeMeta(courseId, { enabled: false }).data?.userTimezone`.

2. **Its own layer, below #2130, one commit.** The typing layer cannot land
   with the read as it was (no `userTimezone` on the complete outline type;
   deleting or casting rejected), so the fix sits below it. The repo's
   bug-fix layers are usually two commits, test then fix, for the
   fail-to-pass CI evidence; the user chose one commit here, test and fix
   together.

3. **The test is in `OutlineTab.test.jsx`, not `Section.test.tsx`.**
   `Section.test.tsx` has one test and renders with no data; the outline
   suite already renders the real tab through the real queries with
   `setMetadata` / `setTabData` / `fetchAndRender`, and had no due-date
   assertion. The case builds one sequence block with
   `due: '2030-04-01T12:00:00Z'` through `buildMinimalCourseBlocks`'s
   `sequenceBlocks` option and sets `user_timezone: 'Asia/Tokyo'` on the
   metadata. Tests run in UTC (`global-setup.js`) and the metadata factory's
   default `user_timezone` is `'UTC'`, so the defaults could not tell the
   preference from the browser fallback; a non-UTC zone can. Observed:
   before the fix the row renders ` due Apr 1, 2030, 12:00 PM UTC`; after,
   `due Apr 1, 2030, 9:00 PM GMT+9`, which the test pins exactly.

4. **`userTimezone: string | null` is added to `CourseHomeMeta`.** With the
   fix the reader reads it off the metadata, where it came through the
   index signature as `unknown`, and `{ timeZone: unknown }` fails
   `FormattedTime`'s `DateTimeFormatOptions`. Named per #2130's "name what we
   read" rule; nullable because the view sets it from
   `user_timezone_locale_prefs`, which is `None` for a user without a
   preference (the platform's `test_view.py` asserts
   `dates_widget.user_timezone is None` for that user). #2130 moves the
   type beside its function.

5. **The `userTimezone?: string` placeholder on `OutlineTabData` stays.** It
   now has no reader, but it is #2130's to remove with the type it sits
   on; this layer touches only what the fix needs.

Full suite on this layer: 119 suites, 1186 tests; lint and types clean.
