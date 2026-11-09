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

</details>
