**Problem:** under frontend-platform, setting `ORDER_HISTORY_URL` put an Order History item in every app's header user menu. After conversion to frontend-base, one app shows it and six do not, and nothing decided that: no DEPR, no mention in any conversion issue. Whatever the answer is, it should be the same for every app.

Found while planning openedx/frontend-app-learning#1905 (see openedx/frontend-app-learning#2193).

> [!NOTE]
> The findings below were gathered by Claude (Claude Code) and reviewed before posting.

## Before conversion

- `@edx/frontend-component-header`'s [`AuthenticatedUserDropdown`](https://github.com/openedx/frontend-component-header/blob/v8.3.0/src/learning-header/AuthenticatedUserDropdown.jsx) (8.3.0) renders Order History whenever `ORDER_HISTORY_URL` is configured.
- frontend-platform reads `ORDER_HISTORY_URL` from the environment by default ([`src/config.ts`](https://github.com/openedx/frontend-platform/blob/master/src/config.ts)), so the behavior was the same in every app built on it.
- Six of the since-converted apps set it in their pre-conversion `.env.development` (each on its `legacy-mfe` branch): profile, account, catalog, gradebook, authn, admin console.

## After conversion

- None of those six trees references `ORDER_HISTORY` today, and none of their conversion issues mentions the item. Checked:
  - openedx/frontend-app-profile#1246, openedx/frontend-app-profile#1405
  - openedx/frontend-app-account#1316, openedx/frontend-app-account#1466
  - openedx/frontend-app-catalog#123
  - openedx/frontend-app-gradebook#497
  - openedx/frontend-app-authn#1498
  - openedx/frontend-app-admin-console#149, openedx/frontend-app-admin-console#211
- The shell header's authenticated menu is Profile, Account and Logout, each by role ([`shell/header/app.tsx`](https://github.com/openedx/frontend-base/blob/main/shell/header/app.tsx)).
- Learner dashboard carries the item in its own header widget as [`OrderHistoryLinkMenuItem`](https://github.com/openedx/frontend-app-learner-dashboard/blob/master/src/widgets/LearnerDashboardHeader/OrderHistoryLinkMenuItem.jsx), reading `ORDER_HISTORY_URL` from app config.
- Instructor dashboard went from the LMS's Django-rendered page straight to frontend-base; whether the platform header it had before showed an Order History item was not checked here.

## Ask

Decide whether the item is deprecated or kept, and make the converted apps agree with that decision. Learning's conversion treats the item as a possible breaking change until this is answered.
