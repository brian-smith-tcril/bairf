# Issue and PR bodies on Open edX repos

Every body is drafted in the effort worktree first and applied with `--body-file` or a `jq --rawfile` PATCH. The worktree file stays a mirror of the body on GitHub.

## The worktree docs a body is built from

- `decisions-<effort>.md` (named by the epic or task number): the effort-level decision log, numbered entries. Stays in the worktree; never embedded or cited by number outside it. An issue that rests on one of its entries restates the entry whole in its body's plan, scrubbed of effort-only references (wayfinder tickets, worktree files, scripts).
- `plan-<issue>.md`: the issue body's plan block, mirrored. Written in the shape the issue carries: effort-level decisions it rests on are restated whole, and nothing effort-only is named. Replaces the plan the issue was created with once implementation planning is done.
- `decisions-<issue>.md`: the decisions made while implementing the layer, numbered entries, grounded in merged code and public issue numbers (unpushed branches are never referenced). An inherited effort-level decision is named by the issue's own wording ("the coverage policy in #2187"), never by its number. Embedded whole in the PR.
- `manual-testing-<issue>.md`: what was observed in the browser per step on tutor dev, written during the layer's manual pass. A step done in frontend-app-authoring names the control the way its UI does ("Open edX" discussions provider), not the platform setting or API value behind it; the API value goes in parentheses only when it helps read a response. Embedded whole in the PR.
- `issue-body-<slug>.md`, `pr-body-<n>.md`: the bodies themselves.

## New issue

```
> [!NOTE]
> This issue was written by Claude (Claude Code) and reviewed before posting.

<short human summary: Goal, Why, links>

<details>
<summary> Claude Plan </summary>

<plan, with process noise such as `@me` lines and "after approval" notes stripped>

</details>
```

Sub-issue linking: a conversion or implementation issue that blocks an epic's completion is a direct sub-issue of the epic (never a sub-sub-issue); a discovery or follow-up issue says "Part of #N" in its body and stays unlinked. `POST repos/<owner>/<repo>/issues/<epic>/sub_issues -F sub_issue_id=<database id>`.

## PR description

Canonical example: openedx/frontend-app-learning#2021.

```
## Summary

<what and why, in prose; the key claim in bold, e.g. **No user-facing change**>

Part of #<epic>. Resolves #<issue>. Stacked above #<pr>.

## What changed

- <bullet per concrete change>

## Plugins — breaking            <- only on a `refactor!:` PR

<what stopped working, who is affected, the replacement with a code block,
what is unaffected, the README pointer>

## Testing

<types, lint, suite results; one-line manual smoke summary>

## Decisions

<one intro line>

<details>
<summary>Full decision log</summary>

<decisions-<issue>.md, verbatim and whole>

</details>

<details>
<summary>Manual testing</summary>

<manual-testing-<issue>.md, verbatim and whole>

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

The footer is the only disclosure on a PR description. The blank line after each `<summary>` is what makes the markdown inside render.
