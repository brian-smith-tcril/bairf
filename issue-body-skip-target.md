**What:** the shell's skip link targets `#main-content`, not `<main>`. The id is on a `<div>` the shell renders; the `<main>` is rendered by the app. Whether the app or the shell should own `<main>`, and whether the skip link should target it, is undecided.

**Where it comes from** (2.0.0-alpha.16): the header's skip link is `<a class="sr-only sr-only-focusable" href="#main-content">` in `shell/header/Header.tsx`, and the element with that id is the shell's own `<div id="main-content" class="flex-grow-1">` in `shell/DefaultLayout.tsx`, the wrapper around the content slot (`org.openedx.frontend.slot.content.main.v1`). The shell renders no `<main>`. The apps do, each where it likes: the template's `Main.tsx` renders `<main>` around its outlet, profile and account render `<main id="main">` in theirs, catalog `<main>` in its, learner dashboard `<main>` in its dashboard container, and frontend-app-learning's tab page renders `<main>` around a tab's content (checked in each repo's default branch on 2026-10-26). So activating the skip link moves focus to a div above the app's content, the landmark a screen reader's rotor lists as "main" is somewhere below it, and an app cannot put the id on its landmark without duplicating the shell's.

**How this surfaced:** openedx/frontend-app-learning#2026 (open) fixes landmark structure on the legacy build by putting `<main id="main-content">` on the element that holds the primary content only, with the course outline sidebar as a `<nav>` sibling outside it, so the skip link lands on the semantic `<main>`. The landmark half ports to frontend-base as is. The skip-link half cannot: under the shell the id is the shell's, so the port drops it and the skip link keeps landing on the shell's div. Until this is settled, the PR's accessibility claim about the skip target holds only on the legacy build, and the Learning port has nothing to aim at.

**The guidance:** the ARIA Authoring Practices Guide, [Landmark Regions, `main`](https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/examples/main.html): "Each page should have one main landmark." and "The main landmark should be a top-level landmark." A skip link exists to bypass the repeated header and reach that content; today the target and the landmark are different elements.

**To discover**

- Who owns the `main` landmark on a frontend-base page: the shell, with its content wrapper as the landmark, or the app, which knows what its primary content is (for Learning, the tab's content and not the alerts above it, which is #2026's point).
- What the skip link should target, and how that target is found: a shell-owned element, an id apps are told to put on their landmark, or the landmark itself.
- What the converted apps and the template do today against each answer: every one renders its own `<main>`, so any answer that moves the landmark to the shell changes all of them, and any answer that keeps it in the app needs a stated convention they do not follow yet.
- What a screen reader user gets today on a frontend-base site after activating the skip link, measured rather than reasoned (where focus lands, what is announced), so the decision has a baseline.
- What #2026 should look like once this is decided, so Learning's port can carry it rather than drop half of it.

> [!NOTE]
> This issue body was drafted by Claude (Claude Code) and reviewed before posting.
