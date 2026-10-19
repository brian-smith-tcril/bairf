**Question:** the legacy header's user menu had an Order History item; the frontend-base shell header's menu does not, and six apps lost it on conversion without a DEPR or a mention in their conversion issues. Was that intentional? If so, it needs a DEPR. If not, the shell header needs the item back, once, for every app.

Found while planning openedx/frontend-app-learning#1905 (see openedx/frontend-app-learning#2193).

> [!NOTE]
> The findings below were gathered by Claude (Claude Code) and reviewed before posting.

## What was there

- `@edx/frontend-component-header`'s [`AuthenticatedUserDropdown`](https://github.com/openedx/frontend-component-header/blob/v8.3.0/src/learning-header/AuthenticatedUserDropdown.jsx) (8.3.0) renders Dashboard, Profile, Account, Order History when `ORDER_HISTORY_URL` is configured, and Sign out.
- frontend-platform reads `ORDER_HISTORY_URL` from the environment by default ([`src/config.ts`](https://github.com/openedx/frontend-platform/blob/master/src/config.ts)), so any app with the variable set showed the item.

## What happened on conversion

- Six apps set `ORDER_HISTORY_URL` in their pre-conversion `.env.development` (each on its `legacy-mfe` branch): profile, account, catalog, gradebook, authn, admin console.
- None of their converted trees references `ORDER_HISTORY` today, and none of their conversion issues mentions the item (checked: profile #1246 and #1405, account #1316 and #1466, catalog #123, gradebook #497, authn #1498, admin console #149 and #211).
- The shell header's authenticated menu is Profile, Account and Logout, each by role ([`shell/header/app.tsx`](https://github.com/openedx/frontend-base/blob/main/shell/header/app.tsx)); no Order History.
- Learner dashboard, which never set the variable, carries the item in its own header widget as [`OrderHistoryLinkMenuItem`](https://github.com/openedx/frontend-app-learner-dashboard/blob/master/src/widgets/LearnerDashboardHeader/OrderHistoryLinkMenuItem.jsx), reading app config. Instructor dashboard never had it.

## Options

1. **Intentional.** File the DEPR for the Order History menu item and the `ORDER_HISTORY_URL` configuration, so operators relying on the ecommerce order history page get the notice.
2. **Unintentional.** Add an Order History item to the shell header's authenticated menu, shown when a role resolves (an `externalRoutes` entry for the ecommerce order history page, or an installed app's route), in the same shape as the Profile and Account items. Every app gets it back without per-app work, and learner dashboard's own item becomes redundant.

Learning's conversion treats the item as a possible breaking change until this is answered.
