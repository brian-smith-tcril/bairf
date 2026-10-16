# Manual testing — `useSidebar()` everywhere, `SidebarContext` private, sidebar suites on the real provider (#2112)

In-browser verification against a live backend (tutor dev).

What changed: every sidebar consumer reads the context through `useSidebar()`;
the context object is private to `SidebarContext.tsx`; `SidebarProvider` takes
the widget list from `Course.jsx` instead of importing it; two dead guards are
gone. No data flow, request or storage change.

**The bugs this layer could introduce.** (1) A consumer renders outside the
provider — now a thrown "useSidebar must be used within a SidebarProvider"
instead of an empty render; in the app every consumer is under `Course`, so
this would show as a crash on the courseware page. (2) The widget list reaches
the provider wrong — no triggers, or an operator's `SIDEBAR_WIDGETS` widget
missing — since `Course.jsx` now passes `getEnabledWidgets()`. (3) The dropped
guards mattered — a panel or the trigger strip failing where it used to render
quietly.

## Setup

A course with the **Open edX** discussions provider and a verified mode, a
unit with in-context discussions on. The `env.config.jsx` probe widget from
#2111's testing can stay for the operator-widget check (remove it afterwards). Browser devtools
open on the Console.

## Checks

### Nothing renders outside the provider (bug 1)

- [x] **Courseware page loads with no console error** naming `useSidebar` on a unit with discussions on: the discussions trigger is in the sidebar strip and the course outline tray is on the left.
- [ ] **The paywall and the sequence navigation render** on a gated unit as an audit learner, beside an open panel.

### The widget list reaches the provider (bug 2)

- [x] **Open, close, switch:** click the discussions trigger — the panel opens; click again — it closes; open the outline from its trigger, then discussions — the right panel opens.
- [ ] **Operator widget still registers:** with the probe widget in `env.config.jsx`, its trigger is in the strip and its panel opens.

### The dropped guards did not matter (bug 3)

- [x] **Navigation keeps the sidebar state:** with discussions open, go to the next unit in the sequence and to another sequence via the outline — the panel stays open where the unit has discussions and closes where it does not, as on `master`.
- [x] **Refresh restores:** open discussions, refresh — open; close it, refresh — closed.
- [x] **Mobile (below 1200px):** the strip and the full-screen panel behave as on `master`, and (the #2113 fix) an open panel survives a refresh.

## Results

Run 2026-09-25 on tutor dev. 5 of 7 checks run, all passing; 2 not run.

**Run**

- **Courseware page, unit with discussions on:** no console error naming `useSidebar`; the discussions trigger in the strip, the outline tray on the left.
- **Open, close, switch:** discussions opened from its trigger and closed on a second click; opening the outline and then discussions opened the right panel.
- **Navigation:** with discussions open, the next unit and another sequence via the outline behaved as on `master` — open where the unit has discussions, closed where it does not.
- **Refresh:** open discussions, refresh — open; closed, refresh — closed.
- **Mobile (below 1200px):** strip and full-screen panel as on `master`; an open panel survived a refresh (the #2113 fix).

**Not run**

- **Paywall and sequence navigation on a gated unit as an audit learner:** no gated unit set up. Covered by `LockPaywall.test.jsx`, `SequenceNavigation.test.jsx` and `SequenceNavigationTabs.test.jsx`, which render those consumers under the real provider.
- **Operator widget from `env.config.jsx`:** the probe widget from #2111's testing had already been removed. Covered by the *external widget integration* cases in `SidebarTriggers.test.jsx`, which register a widget through `mergeConfig({ SIDEBAR_WIDGETS })` and render `getEnabledWidgets()` under the provider.
