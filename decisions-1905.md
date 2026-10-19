# Decisions — convert Learning to frontend-base (#1905)

Settled 2026-10-18, before implementation.

1. **Three sibling epics, not one epic with sub-epics.** The conversion is
   broken into three issues at the same level: #1905 (epic 1: run on
   frontend-base with every slot reduced to a placeholder), a second epic
   (port the slots to the Slot API and merge the `frontend-base` branch to
   `master`), and a third (split the tabs into widgets). Sub-epics were
   rejected because implementation issues sit directly under their epic and
   never two levels down. #1905 is epic 1 because its body already names the
   long-lived `frontend-base` branch as the end state of the converted code.

2. **"Initial conversion" means epics 1 and 2 together.** The 2026-09-24 FWG
   outcome recorded on #1905 defines the initial conversion as "slots
   converted and things render and work". Epic 1 alone does not meet that;
   the split is a work breakdown, not a change of scope. The `frontend-base`
   branch merges to `master` at the end of epic 2, so publishing to NPM,
   inclusion in frontend-template-site and inclusion in tutor-mfe are epic 2
   exit criteria and move off #1905's list.

3. **Epic 1 breaks every slot on purpose.** Each slot module keeps its file
   and name and renders its default content in a bare fragment, with no
   plugin-framework import; a slot with no default content renders nothing.
   This is the pattern openedx/frontend-app-catalog#137 used before its
   per-slot port commits (fragment to `<Slot id>` plus README and site-config
   example). It removes `@openedx/frontend-plugin-framework`, the
   `env.config.jsx` slot configuration and the `setupTest.js` mock in one
   step, and leaves epic 2 a mechanical per-slot replacement. The 45 sites
   that pass plugin props or slot options lose that contract in epic 1; the
   `frontend-base` branch absorbs the break until epic 2 restores each slot.

4. **Header and footer are shell concerns, not ported slots.** The header
   and footer slots and the five direct imports of
   `@edx/frontend-component-header` / `-footer` go in epic 1, since those
   packages leave with frontend-platform and the frontend-base shell
   provides both.

5. **PR targets.** Epic 1 and epic 2 PRs target the `frontend-base` branch
   on openedx/frontend-app-learning. The closing PR of epic 2 merges
   `frontend-base` into `master`. Epic 3 PRs target `master`.

6. **This effort covers epics 1 and 2.** Epic 3 gets its own effort once
   the branch has landed on `master`.
