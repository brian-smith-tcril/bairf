## Summary

`alerts/access-expiration-alert/hooks.js` and `index.js` become TypeScript, with both hooks' parameters typed and the `useModel(tab, courseId)` read annotated with `CourseHomeAccessExpiration`, so that #1999 — which replaces that read with reads of the outline and progress queries — lands as a two-line swap on a typed file. That made `hooks.ts` the first TypeScript caller of `useAlert`, whose destructured options parameter TypeScript inferred from the JavaScript as six required fields, so `generic/user-messages/hooks.js` and `UserMessagesContext.js` become TypeScript too: a `UserMessage` type for what a caller registers, a `UserMessagesContextValue` for what the provider already exposes, and a `null` context default with `useAlert` throwing a named error outside the provider, the shape of `ToastContext`, `SidebarContext` and `CoursewareSearchContext`. **No runtime change** for any render under `UserMessagesProvider`, which is every app and test render path; no data-layer change; the `.jsx` components, the provider and `AlertList` stay as they are. Part of the Redux → React Query migration (#1946, Stage 1); a peel below #1999, stacked above #2150. Closes #2151.

## What changed

- **`alerts/access-expiration-alert/hooks.ts`** (decisions 3–4): `useAccessExpirationMasqueradeBanner(courseId: string, tab: string)`; the `useModel` destructure annotated `{ accessExpiration?: CourseHomeAccessExpiration | null }`, so `isVisible` and `expirationDate` are checked against the declared shape. `useAccessExpirationAlert` typed on its six parameters and otherwise untouched. Lazy imports, memoised payloads, alert codes and topics unchanged.
- **`alerts/access-expiration-alert/index.ts`**: content unchanged; `@src/alerts/access-expiration-alert` keeps resolving for `InstructorToolbar` and for downstream toolbar overrides that import the banner hook from it.
- **`generic/user-messages/UserMessagesContext.ts`** (decisions 1–2): `UserMessage` (`code: string`; `text`, `topic`, `type`, `payload`, `dismissible` optional) and `UserMessagesContextValue` (`add`, `addFlash`, `remove`, `clear`, `messages`, the `value` object `UserMessagesProvider.jsx` already builds); `createContext<UserMessagesContextValue | null>(null)`.
- **`generic/user-messages/hooks.ts`** (decisions 1–2, 4): `useAlert(isVisible: boolean | null | undefined, options: UserMessage)`; throws `useAlert must be used within a UserMessagesProvider` when the context is `null`, as `useToast` does. The TNL-7400 memoisation comment and the effect are as they were.
- **Tests for the two patch lines no suite reached** (decision 5): `user-messages/hooks.test.tsx` for the guard, in the shape of the sibling context suites; `access-expiration-alert/hooks.test.tsx` for the learner-facing hook, registering under `UserMessagesProvider` and reading its `messages`, uncovered in the JavaScript too but patch lines once the file moved.

## Testing

`npm run types` and `npm run lint` clean; full suite 122 suites, 1193 passed, 0 skipped; both converted hook files at 100% lines. The banner's existing positive tests run through the renamed files unchanged: `OutlineTab.test.jsx` › *Access Expiration Alert* and `ProgressTab.test.jsx` › *Access expiration masquerade banner*. The render-path check behind the context default: `src/index.jsx` wraps the app in `UserMessagesProvider`, `setupTest.js`'s `render` wraps every test in it, and the ten test files that build their own `AppProvider` tree without it render search, tab-nav, breadcrumb and sidebar components, none of which call `useAlert`. No manual test: renames and types only.

## Decisions

<details>
<summary>Full decision log</summary>

# Decisions — convert the access-expiration alert hooks and `useAlert` to TypeScript (#2151)

Peel below #1999 (layer E of #1977), the #2125 shape: renames and types, no
runtime change for any render under `UserMessagesProvider`. Layer of the
running stack #2141 above #2150. Settled with the user 2026-10-02.

1. **`useAlert` and its context convert too, in this layer.** Typing the
   access-expiration hooks made `hooks.ts` the first TypeScript caller of
   `useAlert`, and TypeScript infers that JavaScript hook's destructured
   options parameter as six required `any` fields, so both calls failed on
   `text`, `type` and `dismissible` being absent. Of the three ways out, a
   JSDoc `@param` on the JavaScript file (the `generic/hooks.js` precedent),
   passing the three keys as `undefined` at the call site, or converting
   `user-messages/hooks.js` and `UserMessagesContext.js` to TypeScript, the
   user chose the conversion: 41 lines in two files, one `UserMessage` type
   for what a caller registers and one `UserMessagesContextValue` for what
   the provider already exposes (`add`, `addFlash`, `remove`, `clear`,
   `messages`). `UserMessagesProvider.jsx`, `AlertList.jsx` and `Alert.jsx`
   stay JavaScript; the eleven JavaScript `useAlert` callers are unaffected.
   #2151's title and body widen accordingly.

2. **The context default is `null` and `useAlert` throws outside the
   provider.** `createContext({})` typed honestly would make `add` and
   `remove` optional at every read. The repo's typed contexts
   (`ToastContext`, `SidebarContext`, `CoursewareSearchContext`) all use
   `createContext<Value | null>(null)` with the consumer hook throwing a named
   error, so `UserMessagesContext` matches. The only behaviour this changes is
   a render with no `UserMessagesProvider`, which used to fail later with an
   undefined `add` and now fails at the hook with its own message. Checked
   before adopting it: `src/index.jsx` wraps the app in the provider,
   `setupTest.js`'s `render` wraps every test in it, and the ten test files
   that build their own `AppProvider` tree without it render search, tab-nav,
   breadcrumb and sidebar components, none of which call `useAlert`.

3. **The `useModel` read stays a destructure, annotated.** The property-access
   form (`useModel(tab, courseId).accessExpiration`) was tried first and
   eslint's `prefer-destructuring` rewrote it back, so the read is
   `const { accessExpiration }: { accessExpiration?: CourseHomeAccessExpiration | null } = useModel(tab, courseId)`.
   #1999 replaces the line either way.

4. **`isVisible` is `boolean | null | undefined`.** Every caller computes it
   as `x && y` over an object or boolean and a boolean, which is that union;
   `useAlert` only tests it for truthiness. The learner-facing
   `useAccessExpirationAlert` is typed on its six parameters and otherwise
   untouched, per #1999's decision 4.

5. **Two cases for codecov's patch check.** It flagged one line in each
   converted hook file: the new `throw` in `user-messages/hooks.ts`, which no
   render reaches because every render is under the provider, and the body
   of the learner-facing `useAccessExpirationAlert`, unreachable from the
   app since 2021 and uncovered in the JavaScript too, counted as patch
   lines once the file moved (the situation #2130's decision 15 met).
   `user-messages/hooks.test.tsx` covers the guard the way the five sibling
   context suites cover theirs (`renderHook` outside the provider,
   `toThrow` the message). `access-expiration-alert/hooks.test.tsx` renders
   the learner alert hook under `UserMessagesProvider` and reads the
   provider's `messages`: one registered alert with the hook's `code`,
   `topic` and payload when the learner has an expiration and is not
   masquerading, none when `masqueradingExpiredCourse` is set. Leaving the
   misses and noting them in the PR was the alternative; the user chose the
   tests, matching #2130.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
