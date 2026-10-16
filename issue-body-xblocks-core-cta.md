> [!NOTE]
> This issue was written by Claude (Claude Code). The investigation was driven by me — I hit the bug in a live environment and directed the diagnosis; Claude traced the provenance and drafted the write-up, which I reviewed before posting.

## Summary

The **"Shift due dates"** call-to-action rendered beneath a past-due problem does nothing when clicked: no request, no toast, no state change. Its `onclick` attribute is not valid JavaScript, so the handler never runs.

`xblocks_contrib/problem/capa/templates/problem.html`, line 69 (current `main`, and released in `xblocks-contrib` 0.17.0):

```django
<button class="submit-cta-link-button btn-link btn-small"
        onclick="emit_event('{{ submit_disabled_cta.event_data }}')">
```

`submit_disabled_cta.event_data` is a Python `dict`, whose `repr` uses single quotes. Wrapping the interpolation in single quotes means the first `'` of the payload terminates the string literal that the template's own `'` opened, so the browser sees:

```js
emit_event('{'event_name': 'post_event', 'post_data': { ... }}')
//          ^^^ string "{" followed by the identifier `event_name`
```

which fails to parse:

```
SyntaxError: missing ) after argument list
```

## Expected

Clicking the CTA should `postMessage` the event to the parent frame — the same behaviour as the equivalent banner in the vertical/unit view, which the Learning MFE receives and turns into a `reset_course_deadlines` POST plus a confirmation toast.

## How it happened

The Mako original was correct — `openedx-platform`, `lms/templates/problem.html:61`:

```mako
onclick="emit_event(${submit_disabled_cta['event_data']})"
```

The quotes were introduced when that template was converted to a Django template, in `openedx-platform` commit `99c6e901d9` — *"Convert Problem Block Mako Templates to Django Templates (openedx/openedx-platform#37570)"*. The file later moved to `xmodule/capa/templates/problem.html`, was removed from `openedx-platform` by `cd733fee2f` (*"refactor: Remove capa folders (openedx/openedx-platform#38045)"*), and was carried into this repo verbatim by #63.

The sibling CTA in `openedx-platform`'s `lms/templates/vert_module.html:45` was **not** part of that conversion and is still Mako:

```mako
onclick="emit_event(${vertical_banner_cta['event_data']})"
```

It works correctly today, which is why the unit-level banner shifts dates while the problem-level CTA does nothing. Both get their payload from the same builder, `openedx/features/personalized_learner_schedules/call_to_action.py`.

## Suggested fix

Drop the two quote characters:

```diff
-                            onclick="emit_event('{{ submit_disabled_cta.event_data }}')">
+                            onclick="emit_event({{ submit_disabled_cta.event_data }})">
```

Django autoescapes the `repr`'s `'` to `&#x27;`, but HTML decodes character references in attribute values before the JavaScript is parsed, so the unquoted form works as-is; `|safe` would be a legibility choice rather than a requirement.

Line 94 of the same template is the non-MFE fallback (a real form submit, no `onclick`) and is unaffected.

## Reproduction

1. A self-paced course with Personalized Learner Schedules active (`course_experience.relative_dates`), containing a graded problem with a relative due date.
2. Backdate the learner's `Schedule.start_date` so that due date is in the past.
3. Open the unit in the Learning MFE.
4. The unit-level banner's **"Shift due dates"** button works: toast, and the dates shift.
5. The **"Shift due dates"** button rendered under the past-due problem does nothing; the console logs `Uncaught SyntaxError: missing ) after argument list`.

Environment: `xblocks-contrib` 0.17.0, Tutor dev (`openedx-dev:21.0.7-main`), `frontend-app-learning` on `master`. The same line is present on this repo's `main`.

## Impact

Minor and non-blocking — a learner can still shift dates from the unit banner, the Dates tab, or the course outline.
