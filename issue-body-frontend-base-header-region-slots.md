> [!NOTE]
> This issue was written by Claude (Claude Code) and reviewed before posting.

**Goal:** replacing the header at its top-level seam should not take the course navigation bar and the masquerade bar with it.

**Why:** `org.openedx.frontend.slot.header.main.v1` has one default widget, `org.openedx.frontend.widget.header.main.v1`, the shell's [`Header`](https://github.com/openedx/frontend-base/blob/main/shell/header/Header.tsx) component (registered in [`shell/app.ts`](https://github.com/openedx/frontend-base/blob/main/shell/app.ts)). `Header` renders the `<header>` element with the desktop and mobile slots inside it, and then two more slots below it:

```tsx
<header className="border-bottom">
  <nav>
    <SkipLink />
    <Slot id="org.openedx.frontend.slot.header.desktop.v1" />
    <Slot id="org.openedx.frontend.slot.header.mobile.v1" />
  </nav>
</header>
<Slot id="org.openedx.frontend.slot.header.masqueradeBar.v1" />
<Slot id="org.openedx.frontend.slot.header.courseNavigationBar.v1" />
```

A site that replaces the header with a `WidgetOperationTypes.REPLACE` against `org.openedx.frontend.widget.header.main.v1` therefore also removes `org.openedx.frontend.slot.header.masqueradeBar.v1` and, more importantly, `org.openedx.frontend.slot.header.courseNavigationBar.v1`: the course tabs disappear from every course page unless the replacement header renders those two slots itself. The alternative is to replace `org.openedx.frontend.widget.header.desktopLayout.v1` and `org.openedx.frontend.widget.header.mobileLayout.v1` separately, which is what [ADR 0016](https://github.com/openedx/frontend-base/blob/main/docs/decisions/0016-shell-layout-replacement-seams.rst) describes as replacing the header. Having to know that the one obvious seam is the wrong one, and to target two lower widgets instead, is less than ideal, and the course bar is not part of what someone means by "the header" when they bring their own.

ADR 0016 already states the rule this runs against: "A shell region that callers might want to replace wholesale belongs in its own top-level slot, with the default composition in a layout widget." The course navigation bar and the masquerade bar are regions in their own right (they appear only on routes an app opts into via `provides`), but they live inside the header's layout widget rather than beside it.

<details>
<summary> Claude Plan </summary>

Move the two slots out of `Header` and up to [`DefaultLayout`](https://github.com/openedx/frontend-base/blob/main/shell/DefaultLayout.tsx), as siblings of `org.openedx.frontend.slot.header.main.v1`, rendered between it and `org.openedx.frontend.slot.content.main.v1`:

```tsx
<div className="flex-grow-0 flex-shrink-0">
  <Slot id="org.openedx.frontend.slot.header.main.v1" />
  <Slot id="org.openedx.frontend.slot.header.masqueradeBar.v1" />
  <Slot id="org.openedx.frontend.slot.header.courseNavigationBar.v1" />
</div>
```

`Header` keeps the `<header>` element, the skip link and the desktop and mobile slots. The slot ids and their default widget ids do not change, so existing operations against `courseNavigationBar.v1`, `courseNavigationBar.extraContent.v1` and `masqueradeBar.v1` keep working, and the default DOM order is unchanged.

Consequences to check:

- A `REPLACE` of `org.openedx.frontend.widget.header.main.v1` now leaves the masquerade bar and the course tabs in place. A site that wants them gone too removes `org.openedx.frontend.widget.header.courseNavigationBar.v1` and `org.openedx.frontend.widget.header.masqueradeBar.v1` by id, or hides them through their widget conditions.
- `isChromeVisible` gates only the `Header` and `Footer` widgets today. The two bar widgets are gated by their own route-role conditions (`isCourseBarRoute`, `isCourseBarMasqueradeRoute`), so a chromeless route still shows no bars; worth a test.
- The `.header.` segment in the slot ids stays accurate as a module name (ADR 0009 reads `header.main.v1` as "in the header module", not "inside the header widget"), so no rename is needed.
- ADR 0016 gets a line noting the two bars as top-level regions, or a short ADR of its own if the change is judged to need one.

Versioning. This is not a new slot version. [ADR 0009](https://github.com/openedx/frontend-base/blob/main/docs/decisions/0009-slot-naming-and-lifecycle.rst) defines a slot's contract as its props (excluding children), where it renders and the general type of content it wraps, and says "the presence, absence, shape, or implementation of child widgets" is "explicitly not part of the slot's contract, and may change at any time". `org.openedx.frontend.slot.header.main.v1` keeps all three; what changes is what its default widget renders. The one customization that notices is a site that replaces `org.openedx.frontend.widget.header.main.v1` and re-renders the two bar slots inside its replacement: after the move it would render the bars twice, and drops that re-render. A site whose replacement does not render them gets its course tabs back. The change ships as a `feat!:` commit whose breaking-change note names that case. No ADR placed the two slots inside `Header`: ADR 0016 describes `Header.tsx` as "a thin shell containing only top-level slots" and names only the desktop and mobile layouts as default widgets, and [ADR 0013](https://github.com/openedx/frontend-base/blob/main/docs/decisions/0013-app-provides-for-inter-app-configuration.rst) speaks of the course bar as part of the header app, which the unchanged `.header.` ids keep true.

If reviewers read "the general type of content it wraps" as including the course bar, the fallback is a versioned move: `org.openedx.frontend.slot.header.main.v2` with the bar-only `Header` as its default widget, `v1`'s default widget becoming a compatibility component that renders the `v2` slot and the two bar slots, `v1` deprecated through the Open edX deprecation process and kept for at least one release alongside `v2`, as ADR 0009's deprecation section requires. Not a slot alias: an alias would route a whole-region `v1` replacement onto the bar-only `v2`, which changes what that operation does.

</details>
