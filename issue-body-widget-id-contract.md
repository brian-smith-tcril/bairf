> [!NOTE]
> This issue was written by Claude (Claude Code) and reviewed before posting.

**Goal:** decide whether an app changing its default widgets (renaming or removing an id, or reordering them) counts as a breaking API change, given that it breaks plugins targeting those widgets by `relatedId`. If it does not count, document that, along with what the app publishes when it makes such a change and what a site operator is expected to do about it.

**Why:** "default content is not part of the slot contract" is more complicated than it sounds once operations take a `relatedId`.

[ADR 0009](https://github.com/openedx/frontend-base/blob/main/docs/decisions/0009-slot-naming-and-lifecycle.rst), section 2, excludes default content from a slot's contract: "a given slot's content, default or otherwise, is explicitly *not* part of the slot's contract, and may change at any time". That sentence carries over a reading of "default content" from frontend-plugin-framework, where it was cheap. There a slot's default content was its `children`, one block, exposed to plugins under the library's fixed id `default_contents` at priority 50 ([README](https://github.com/openedx/frontend-plugin-framework/blob/master/README.rst), "Default Content"). An app could replace what it rendered inside that block and nothing a plugin had named changed: `Wrap`, `Hide` and `Modify` on `default_contents` still matched, placement was by priority rather than relative to any widget, and the way to influence the default was `pluginProps`, which were part of the slot's contract. Excluding default content from the contract cost plugins nothing because the app controlled none of the names a plugin could use.

In frontend-base the default content of a slot is a list of widgets, each with an id the app chooses, and placement is relative to those ids. Five of the seven `WidgetOperationTypes` take a `relatedId` (`INSERT_AFTER`, `INSERT_BEFORE`, `REPLACE`, `REMOVE`, `OPTIONS`), and the only widgets a plugin can name are the ones in the slot, which in practice means the app's defaults. So under the same words, the app now controls every name a plugin depends on, and when it changes them the plugin breaks:

- A renamed or removed id: `findRelatedWidgetIndex` returns `null` and the operation is a silent no-op. The operator's override, removal or options stop applying with nothing to see.
- A reorder: every id still matches, so the operation still applies, but it no longer puts the widget where the operator meant. Take defaults Courses, Discover New and an operator who wants a link between them. They write `INSERT_AFTER` Courses or `INSERT_BEFORE` Discover New; either works. The app reorders to Discover New, Courses. The first operation now puts the link at the end, the second at the beginning. (`PREPEND` and `APPEND` are not the answer here: they place at the edges, in `siteConfig.apps` order. The relative operations exist for placing next to a specific default, and that is the intent a reorder changes.)

This is not hypothetical. frontend-app-learner-dashboard inserts its order-history link with `INSERT_BEFORE` on `org.openedx.frontend.widget.header.desktopAuthenticatedMenuLogout.v1`, a shell default from `shell/header/app.tsx`, and ships its own default header link ids that operators target the same way. [ADR 0016](https://github.com/openedx/frontend-base/blob/main/docs/decisions/0016-shell-layout-replacement-seams.rst), for the shell's header and footer, went out of its way to keep "all existing inner slot ids and default widget ids" so that "plugins that target [them] continue to work without modification", which is frontend-base treating its own defaults as something plugins may depend on, without saying that in general.

Concrete case: openedx/frontend-app-learner-dashboard#878 renames the dashboard header links from Courses and Discover New to My Learning and Explore, and moves Explore from last to first. The widget ids should follow the new names (`headerLinkCourses.v1` under a link labelled My Learning is the wrong name), and openedx/frontend-base#334 (widget id aliases) exists so the app can do that and keep the old ids answering for back-compat. The reorder is where that back-compat comes apart: a site config that wrote `INSERT_AFTER` on `headerLinkCourses.v1` or `INSERT_BEFORE` on `headerLinkDiscover.v1` to sit between the two links still matches through the alias, and now sits at the end or at the beginning. The alias keeps the operation applying; it cannot keep it meaning what it meant. Whether that counts as compatible is question 1 applied to order, and it decides whether #878 ships as a `feat` or a `feat!` and what its release notes owe operators.

<details>
<summary> Claude Plan </summary>

Written 2026-10-31 against `ae5ec93` on `main`. Three questions; the second and third only matter if the first is answered no.

### 1. Does it count as a breaking API change?

No: default widgets may change between app versions, and a plugin that names one accepts that. The slot's version is unaffected, ADR 0009 stands as written, and the cost lands on operators at upgrade time.

Yes: an app's default widget ids, and possibly their order, are part of that app's public surface, versioned by the app's package. A rename, removal or reorder is a breaking change of the app. Ids and order can be decided separately: keeping ids while allowing reorders makes `REPLACE`, `REMOVE` and `OPTIONS` stable and leaves `INSERT_AFTER` and `INSERT_BEFORE` placing against a target that may have moved.

### 2. If not, what does a site operator do when it happens?

They need to find out, then fix their site config. Finding out is the hard part because the failure is silent. Options, not exclusive: a console warning from `findRelatedWidgetIndex` on a miss (today it returns `null` quietly); a documented expectation that operators re-check targeted ids on every app upgrade; aliases (#334) so an id rename keeps working for a release while the operator migrates.

### 3. If not, what does an app publish so the operator can find out?

Where the change is announced, and in what form, so that an operator upgrading an app knows which `relatedId`s to re-check. Candidates: the conventional-commits footer (`BREAKING CHANGE:` naming old and new ids and order), which lands in the generated release notes; a changelog section per release listing default widget ids added, removed, renamed and reordered; a per-app list of default widget ids and their order in the app's docs, so the diff is visible. The expectation should also say whether a reorder counts, since a reorder touches no id.

### Where the answer is written

The ADR 0009 clause stays true for its purpose (what bumps a slot's version) and is amended to say what it does not cover, with the answers to 1 to 3 beside it; or a short new ADR that ADR 0009 and ADR 0016 both reference. Either way the TSDoc on the relative operations in `runtime/slots/widget/types.ts` states the rule, since that comment is where a plugin author reads what the operation promises.

</details>
