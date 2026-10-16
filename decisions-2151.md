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
