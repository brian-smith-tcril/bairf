Decide where a "documenting a slot" doc lives

> [!NOTE]
> This issue was written by Claude (Claude Code) and reviewed before posting.

**Goal:** find a home for a document that says how a slot is documented: the README in the slot's folder, one README per slot version, what the previous version's README is named, and the deprecation note at its top.

**Why:** nothing says any of this today. Every slot in a frontend-base app has a `README.md` next to its component, and a slot with two versions has a `README.v1.md` beside it (frontend-app-authoring's [`CourseAuthoringUnitSidebarSlot`](https://github.com/openedx/frontend-app-authoring/tree/master/src/plugin-slots/CourseAuthoringUnitSidebarSlot) has both, and the [site operators' slot reference](https://github.com/openedx/docs.openedx.org/blob/main/source/site_ops/references/frontend-plugin-slots.rst) on docs.openedx.org links straight to the `README.v1.md`). That is a convention everyone follows and nobody wrote down.

#344 adds a how-to for versioning and renaming slots. Its examples show the README names (`README.v1.md` for a previous version; `README.songList.v1.md` for a renamed slot, the old README being named for the old slot minus what its id shares with the current one), but a how-to is the wrong place to state the rule, so the rule is shown by example and explained nowhere.

`docs/` in this repo has two kinds of document: `how_tos/` and `decisions/`. Neither fits. [ADR 0009](https://github.com/openedx/frontend-base/blob/main/docs/decisions/0009-slot-naming-and-lifecycle.rst) is the slot naming and lifecycle record and says nothing about documentation; a file-naming convention is not a behaviour decision, so it does not belong in that ADR or in a new one. The sibling repos have the same two kinds (frontend-plugin-framework, frontend-platform and frontend-app-authoring have `decisions/` and `how_tos/`; frontend-app-learning and paragon have `decisions/` only), so there is no precedent in the ecosystem's frontend repos for a third kind.

**My lean:** a reference document in this repo, as a third kind of document beside how-tos and ADRs (docs.openedx.org already separates how-tos from references). The #344 how-to would then link to it from its README steps.

<details>
<summary> Claude Plan </summary>

Open questions, in the order they would need answering:

1. Where it lives: a new `docs/references/` (or similar) in this repo; a developer-facing page on docs.openedx.org; or a section of an existing how-to such as the migration how-to's "Refactor slots".
2. What it covers: the slot folder and its `README.md`; one README per slot version and per renamed slot, with the naming rule for the previous one; the deprecation note at the top of a previous README; the link from the current README to the previous one; whether an app's own slot index (such as `src/plugin-slots/README.md`) is part of the convention.
3. Whether the site operators' slot reference on docs.openedx.org should point to it, so the README it links to is explained somewhere.

What this issue does not propose: changing ADR 0009, or what the #344 how-to shows.

</details>
