Part of #1946 — Redux → React Query migration (Stage 1). Follow-up from #2088's `units` layer, where converting this file was attempted and backed out.

**Goal:** convert `courseware/course/sequence/sequence-navigation/UnitIcon.jsx` to TypeScript, once the FontAwesome type mismatch below is resolved.

**Context.** `UnitIcon` is a 40-line component: a `switch` on `type` (`video`, `other`, `vertical`, `problem`, `lock`, with a `default:` branch) that renders a `FontAwesomeIcon`. The `units` layer of #2088 made its `type` prop optional (the `default:` branch already handled an absent type; the `propTypes` `.isRequired` was stricter than the component) and, as with the four components #2125 converted, the natural move was to convert the file rather than edit its `propTypes`. The conversion type-checks everything except the one line that matters:

```
UnitIcon.tsx(33,44): error TS2322: Type 'IconDefinition' is not assignable to type 'IconProp'.
```

**The mismatch.** The icons come from `@fortawesome/free-solid-svg-icons` **5.15.4** (`package.json`), whose types are `@fortawesome/fontawesome-common-types` **0.2.x**, nested under it. `@fortawesome/react-fontawesome` (`^0.1.4`, peer `fontawesome-svg-core ~1 || ~6`) resolves `fontawesome-svg-core` **6.7.2**, with `fontawesome-common-types` **6.7.2** hoisted. Two majors of the same type package: the 5.x `IconDefinition` and the 6.x `IconProp` have different `IconName` unions, so no 5.x icon satisfies the 6.x prop. No `.tsx` file in the repo passes an icon to `FontAwesomeIcon` yet (`git grep FontAwesomeIcon -- 'src/**/*.tsx'` is empty), which is why nothing has tripped on it before. The sidebar's own `UnitIcon.tsx` uses Paragon icons and is unaffected.

**Tasks**
- Align the FontAwesome majors: bump `@fortawesome/free-solid-svg-icons` (and the `free-regular` / `free-brands` siblings, all `5.15.4`) to the 6.x line that matches the hoisted `fontawesome-svg-core` 6.7.2, or pin `fontawesome-svg-core` to 1.x to match the 5.x icons. The 6.x bump is the forward direction; check the icon names the repo uses (`git grep "from '@fortawesome/free-"`) survive the rename set between 5 and 6.
- Convert `UnitIcon.jsx` → `.tsx`: a `Props` interface with `type?: string` (the shape the sidebar's `UnitIcon.tsx` uses), `let icon: typeof faBook`, no `propTypes` / `defaultProps`.
- `UnitIcon.test.jsx` passes the string `'undefined'` as a type to reach the default branch and spies on `console.error` to suppress the `oneOf` warning; with the `propTypes` gone the spy has nothing to suppress and goes.

**Verify:** `npm run types`, `npm run lint` and the full suite green; the unit navigation tabs show the same icons per type, and the book icon for a unit whose type is not in the list.

> [!NOTE]
> This issue was authored by Claude (Claude Code) and reviewed before posting.
