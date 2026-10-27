**What:** react-bootstrap 1.x components that Paragon wraps or re-exports emit React 18.3 deprecation warnings that Paragon's own code doesn't cause and can't fix in place. They need tracking separately from Paragon's own warnings (#3043). Paragon no longer depending on react-bootstrap 1.x (Bootstrap 4) removes them at the source. What consumers do with them until then is open.

**An instance** (Paragon 23.23.1, react-bootstrap 1.6.8, React 18.3.1): rendering Paragon's `OverlayTrigger` logs

```
Warning: OverlayTrigger: Support for defaultProps will be removed from function components in a future major release. Use JavaScript default parameters instead.
      at OverlayTrigger (node_modules/react-bootstrap/cjs/OverlayTrigger.js:78:22)
      at defaultShow (node_modules/@openedx/paragon/src/Overlay/index.tsx:119:3)
```

and a second warning for `Overlay` (`react-bootstrap/cjs/Overlay.js:52:22`). Paragon's `src/Overlay/index.tsx` already takes its defaults as parameters (`defaultShow = false`, `popperConfig = {}`, `trigger = ['hover', 'focus']`). Both warnings come from the `defaultProps` that react-bootstrap's own `Overlay` and `OverlayTrigger` set (`OverlayTrigger.defaultProps = defaultProps` in `cjs/OverlayTrigger.js`). Paragon 23.23.1's `src` imports from 57 react-bootstrap modules (across `Alert`, `Badge`, `Button`, `Card`, `Carousel`, `Dropdown`, `Form`, `Nav`, `Navbar`, `Overlay`, `Popover`, `Tabs`, `Toast`, `Tooltip` and others). Many of those modules set `defaultProps` in react-bootstrap 1.6.8, so this isn't limited to the overlay.

**Why it is not fixed upstream:** react-bootstrap 1.6.8, published 2023-12-22, is the last 1.x release. React 18.3, which added the warning, came out in April 2024.

**Related:** #3043 and #3744 track `defaultProps` in Paragon's own components. #3425 tracks a different React 18 deprecation (`findDOMNode`) that comes from react-bootstrap's `OverlayTrigger`. #2484 (closed by #3318) moved `Card` off react-bootstrap's `Card`, and #2485 (open) proposes the same for `Form`.

**How this surfaced:** openedx/frontend-app-learning#2189 ports the Dates tab to frontend-base, where tests fail on any console output. The timeline's day tooltip renders Paragon's `OverlayTrigger`, so a test that renders the Dates tab fails on these two warnings. The port silences a third-party warning only under an upstream issue that tracks it, and none tracked this one.

**The guidance:** the [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide):
- [React 18.3 has also been published](https://react.dev/blog/2024/04/25/react-19-upgrade-guide#react-18-3): "we've published a react@18.3 release that is identical to 18.2 but adds warnings for deprecated APIs and other changes that are needed for React 19."
- [Removed: `propTypes` and `defaultProps` for functions](https://react.dev/blog/2024/04/25/react-19-upgrade-guide#removed-proptypes-and-defaultprops): "We're also removing `defaultProps` from function components in place of ES6 default parameters. Class components will continue to support `defaultProps` since there is no ES6 alternative."

**To discover**

- Which Paragon components surface react-bootstrap warnings under React 18.3, and which ones under React 19, where these `defaultProps` stop being applied instead of warning.
- What a consumer should do with these warnings until Paragon no longer depends on react-bootstrap 1.x: in test suites that fail on console output, and in the development console, where they bury the app's own warnings.
- Whether that short-term answer belongs in Paragon or in each consumer.

> [!NOTE]
> This issue body was drafted by Claude (Claude Code) and reviewed before posting.
