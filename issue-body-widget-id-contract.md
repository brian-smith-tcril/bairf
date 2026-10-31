> [!NOTE]
> This issue was written by Claude (Claude Code) and reviewed before posting.

**Goal:** decide whether an app changing its default widgets (renaming or removing an id, or reordering them) is a breaking change of that app, given that it breaks site configs that target those widgets by `relatedId`.

**Why:** [ADR 0009](https://github.com/openedx/frontend-base/blob/main/docs/decisions/0009-slot-naming-and-lifecycle.rst), section 2, excludes default content from a slot's contract: "a given slot's content, default or otherwise, is explicitly *not* part of the slot's contract, and may change at any time". But five of the seven `WidgetOperationTypes` take a `relatedId` (`INSERT_AFTER`, `INSERT_BEFORE`, `REPLACE`, `REMOVE`, `OPTIONS`), and the only widgets an operator can name are the ones in the slot, which in practice means the app's defaults. When the app changes them, the operator's site config breaks, and nothing says whether that is allowed:

- A renamed or removed id: `findRelatedWidgetIndex` returns `null` and the operation is a silent no-op. The operator's override, removal or options stop applying with nothing to see.
- A reorder: every id still matches, so the operation still applies, but it no longer puts the widget where the operator meant.

Concrete case: openedx/frontend-app-learner-dashboard#878 renames the dashboard's header links from Courses and Discover New to My Learning and Explore, and moves Explore from last to first. openedx/frontend-base#334 (widget id aliases) covers the rename: the ids follow the new names and the old ids keep answering. The reorder is where that comes apart. An operator who wrote a relative operation to sit a link between the two still matches through the alias, and now lands at an end:

| Operation | Before #878: Courses, Discover New | After #878: Explore, My Learning |
|---|---|---|
| `INSERT_AFTER` Courses (now My Learning) | between the two | at the end |
| `INSERT_BEFORE` Discover New (now Explore) | between the two | at the beginning |

The alias keeps the operation applying; it cannot keep it meaning what it meant. Whether that counts as compatible decides whether #878 ships as a `feat` or a `feat!`, and what its release notes owe operators.

<details>
<summary> Claude Plan </summary>

Written 2026-10-31 against `ae5ec93` on `main`.

### Background

The ADR 0009 clause carries over a reading of "default content" from frontend-plugin-framework, where excluding it cost nothing. There a slot's default content was one block, its `children`, exposed under the library's fixed id `default_contents` at priority 50 ([README](https://github.com/openedx/frontend-plugin-framework/blob/master/README.rst), "Default Content"). An app could change what it rendered inside that block and nothing an operator had named changed: `Wrap`, `Hide` and `Modify` on `default_contents` still matched, placement was by priority rather than relative to any widget, and the way to influence the default was `pluginProps`, which were part of the slot's contract. The app controlled none of the names an operator could use. In frontend-base the default content is a list of widgets with ids the app chooses, and placement is relative to those ids, so under the same words the app now controls every name an operator depends on.

[ADR 0016](https://github.com/openedx/frontend-base/blob/main/docs/decisions/0016-shell-layout-replacement-seams.rst), for the shell's header and footer, kept "all existing inner slot ids and default widget ids" so that "plugins that target [them] continue to work without modification": frontend-base treating its own defaults as something site configs may depend on, without saying so in general. frontend-app-learner-dashboard depends on one of them today: it inserts its order-history link with `INSERT_BEFORE` on `org.openedx.frontend.widget.header.desktopAuthenticatedMenuLogout.v1`, a shell default from `shell/header/app.tsx`.

### 1. Is it a breaking change of the app?

No: default widgets may change between app versions, and a site config that names one accepts that. The slot's version is unaffected, ADR 0009 stands as written, and the cost lands on operators at upgrade time.

Yes: an app's default widget ids, and possibly their order, are part of that app's public surface, versioned by the app's package. A rename, removal or reorder is a breaking change of the app.

Ids and order are separate axes, and a reorder touches no id, so the answer has to say whether order counts. Keeping ids while allowing reorders makes `REPLACE`, `REMOVE` and `OPTIONS` stable and leaves `INSERT_AFTER` and `INSERT_BEFORE` placing against a target that may have moved.

### 2. If not, how does an operator find out at runtime?

The failure is silent, so finding out is the hard part. Options, not exclusive: a console warning from `findRelatedWidgetIndex` on a miss (today it returns `null` quietly); aliases (#334) so an id rename keeps working for a release while the operator migrates. Neither reaches a reorder, where nothing misses.

### 3. What does the app publish when it changes them?

Where the change is announced, and in what form, so that an operator upgrading an app knows which `relatedId`s to re-check. If the answer to 1 is yes, the conventional-commits footer (`BREAKING CHANGE:` naming old and new ids and order) is the convention and lands in the generated release notes. If no, something else has to carry it: a changelog section per release listing default widget ids added, removed, renamed and reordered; a per-app list of default widget ids and their order in the app's docs, so the diff is visible; a documented expectation that operators re-check targeted ids on every app upgrade.

### Where the answer is written

The ADR 0009 clause stays true for its purpose (what bumps a slot's version) and is amended to say what it does not cover, with the answers to 1 to 3 beside it; or a short new ADR that ADR 0009 and ADR 0016 both reference. Either way the TSDoc on the five operations that take a `relatedId`, in `runtime/slots/widget/types.ts`, states the rule, since that comment is where a site config author reads what the operation promises.

</details>
