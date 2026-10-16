Part of #1946 — Redux → React Query migration (Stage 1). Peeled out of #1999 (layer E of the model-store dissolution, #1977), the way #2125 was peeled out of #2088: a small layer below, so the conversion layer's change to this hook lands as a two-line read swap on a typed file rather than a rename-plus-rewrite.

**Goal:** convert `src/alerts/access-expiration-alert/hooks.js` and `index.js` to TypeScript with no runtime change, so that #1999 — which replaces the hook's `useModel(tab, courseId)` read with reads of the outline and progress queries — shows only that change. Because that makes `hooks.ts` the first TypeScript caller of `useAlert`, the `generic/user-messages` hook and its context convert here too.

**Context.** The folder holds two hooks and two lazily loaded components:

| File | Contents | Callers |
|---|---|---|
| `hooks.js` | `useAccessExpirationMasqueradeBanner(courseId, tab)` (named export) and `useAccessExpirationAlert(accessExpiration, courseId, org, userTimezone, topic, analyticsPageName)` (default export) | the banner hook: `instructor-toolbar/InstructorToolbar.jsx`, and downstream toolbar overrides that import it from `@src/alerts/access-expiration-alert`; the default export: none in this repo |
| `index.js` | re-exports both | as above |
| `AccessExpirationMasqueradeBanner.jsx`, `AccessExpirationAlert.jsx` | the components the hooks hand to `AlertList` | the hooks, via `React.lazy` |

The banner hook reads `userTimezone` from `useCourseHomeMeta(courseId, { enabled: false }).data` (typed, #2109) and `accessExpiration` by destructuring `useModel(tab, courseId)` (untyped, returns `{}` for a missing model). Both hooks register through `useAlert` from `generic/user-messages/hooks.js`, which destructures its options parameter:

```js
export function useAlert(isVisible, {
  code, text, topic, type, payload, dismissible,
}) {
```

Under `allowJs`, TypeScript infers that parameter as six **required** `any` fields, so a TypeScript caller passing `code`, `payload` and `topic` fails on the other three. Eleven JavaScript callers never noticed. `UserMessagesContext.js` is `createContext({})`, so `useContext` of it is typed `{}` with no `add` / `remove`.

**Tasks**
- **`alerts/access-expiration-alert/hooks.js` → `hooks.ts`**: type the parameters of both hooks (`courseId: string`, `tab: string`; the learner alert's `accessExpiration: CourseHomeAccessExpiration | null | undefined`, `org`, `topic`, `analyticsPageName` as `string`, `userTimezone` as `string | undefined`). Annotate the `useModel` destructure as `{ accessExpiration?: CourseHomeAccessExpiration | null }` so the `isVisible` / `expirationDate` reads are checked against the declared shape (`CourseHomeAccessExpiration` is in `course-home/data/courseHomeOutline.ts`). Keep the `React.lazy` imports of the two `.jsx` components, the `useMemo` payloads, the alert `code`s and `topic`s as they are.
- **`alerts/access-expiration-alert/index.js` → `index.ts`**: same two exports, so `@src/alerts/access-expiration-alert` keeps resolving for the toolbar and for downstream overrides.
- **`generic/user-messages/UserMessagesContext.js` → `.ts`**: a `UserMessage` interface for what a caller registers (`code: string`; `text`, `topic`, `type`, `payload`, `dismissible` optional) and a `UserMessagesContextValue` interface for what `UserMessagesProvider.jsx` already exposes (`add`, `addFlash`, `remove`, `clear`, `messages`). `createContext<UserMessagesContextValue | null>(null)`, the shape of `ToastContext`, `SidebarContext` and `CoursewareSearchContext`.
- **`generic/user-messages/hooks.js` → `hooks.ts`**: `useAlert(isVisible: boolean | null | undefined, options: UserMessage)`; throws a named error when rendered outside `UserMessagesProvider`, as `useToast` does. Every app and test render path is under the provider (`src/index.jsx`; `setupTest.js`'s `render`; the tests that build their own tree without it render no `useAlert` consumer).
- `UserMessagesProvider.jsx`, `AlertList.jsx`, `Alert.jsx` and the two `.jsx` alert components stay as they are. No behaviour change, no data-layer change, no deletion, no new files beyond the renames.

**Not in scope:** the `useModel(tab, courseId)` read and the three tab-data `meta` bridge entries it depends on (#1999); converting the `.jsx` components or the provider; the learner-facing `useAccessExpirationAlert`'s future, which is a standalone question outside this migration.

**Verify:** `npm run types`, `npm run lint` and the full suite green; the masquerade banner renders on the outline and progress tabs exactly as before (`OutlineTab.test.jsx` › *Access Expiration Alert*, `ProgressTab.test.jsx` › *Access expiration masquerade banner*).

> [!NOTE]
> This issue was authored by Claude (Claude Code) and reviewed before posting.
