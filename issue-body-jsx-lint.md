**What:** `openedx lint` does not lint `.jsx` files. In an app built on `createLintConfig`, a `.jsx` file with any error passes `npm run lint`; the same error in a `.js`, `.ts` or `.tsx` file fails.

**Reproduced on 2026-10-26** in fresh clones of every converted app that has `.jsx` files, by appending `const unusedProbe = 1;` to one `.jsx` and one `.js` file under `src/` and running `npm run lint` (clean baseline before, files restored after):

| app | `.jsx` files | `.jsx` probe | `.js` probe |
|---|---|---|---|
| frontend-app-profile | 44 | not reported (`src/profile/UserCertificateSummary.jsx`) | `@typescript-eslint/no-unused-vars` (`src/utils.js`) |
| frontend-app-account | 89 | not reported (`src/account-settings/SwitchContent.jsx`) | reported (`src/utils.js`) |
| frontend-app-gradebook | 86 | not reported (`src/utils/hoc.jsx`) | reported (`src/utils/keyStore.js`) |
| frontend-app-learner-dashboard | 130 | not reported (`src/setupTest.jsx`) | reported (`src/testUtils.js`) |
| frontend-app-catalog | 4 | not reported (`src/widgets/CatalogHeader/ProgramsLinkMenuItem.jsx`) | reported (`src/setupTest.js`) |

frontend-template-application and frontend-app-instructor-dashboard have no `.jsx` files, which is why nothing has tripped. frontend-base itself has ten (`runtime/react/*.jsx`) under the same base config.

**Why:** ESLint 9 lints `.js`, `.cjs` and `.mjs` by default and other extensions only when a `files` pattern names them. From the [configuration files docs](https://eslint.org/docs/latest/use/configure/configuration-files#specify-files-with-arbitrary-extensions): "To lint files with extensions other than the default `.js`, `.cjs` and `.mjs`, include them in `files` with a pattern in the format of `"**/*.extension"`. Any pattern will work except if it is `*` or if it ends with `/*` or `/**`." `tools/eslint/base.eslint.config.js` extends typescript-eslint's configs, which name `**/*.ts` and `**/*.tsx`, so TypeScript files are linted; nothing names `**/*.jsx`. The `files: ['src/**/*', 'site.config.*']` block the template and the apps carry ends in `/*` and adds no extension.

**It is a regression of the ESLint 9 upgrade, not a decision.** Before f0c0d0db (`feat: Upgrade to ESLint 9`, 2025-04-23, via #39), `tools/cli/openedx.ts` added the extensions itself:

```ts
// If extensions haven't been specified, add them.  Otherwise we don't get jsx/tsx files.
if (process.argv.indexOf('--ext') === -1) {
  process.argv.push('--ext');
  process.argv.push('.js,.jsx,.ts,.tsx');
}
```

ESLint 9 dropped `--ext`, the upgrade deleted the block, and the `files` patterns that replaced it recovered `.tsx` through typescript-eslint and not `.jsx`. No ADR, issue or PR records dropping `.jsx`; the upgrade's commit message only notes that "the repository wasn't linting very consistently before this".

**Fix:** name `**/*.jsx` in the base config's file patterns (or in `createLintConfig`), so every consumer gets it without touching its own `eslint.config.js`.

**What the fix surfaces in the converted apps**, measured the same day with a `files: ['src/**/*.jsx']` block added to each app's `eslint.config.js`:

| app | problems | files | fixable with `--fix` | left after `--fix` |
|---|---|---|---|---|
| profile | 77 (75 errors, 2 warnings) | 12 | 70 | 3 `formatjs/enforce-description`, 1 `@stylistic/indent-binary-ops`, 2 unused directives |
| account | 203 (192 errors, 11 warnings) | 26 | 181 | 5 `no-import-assign`, 2 `@typescript-eslint/prefer-for-of`, 11 unused directives, a few others |
| gradebook | 70 (66 errors, 4 warnings) | 17 | 27 | 28 `react/display-name`, 11 `react/prop-types`, 4 unused directives |
| learner-dashboard | 133 (128 errors, 5 warnings) | 20 | 126 | 4 `react/prop-types`, 5 unused directives, 2 others |
| catalog | 4 | 4 | 0 | 4 `react/prop-types` |

The bulk is `@stylistic/indent`, `brace-style` and `semi` that `npm run lint:fix` clears; the rest is a handful of `react/prop-types` and `react/display-name` findings per app and `eslint-disable` directives for rules the base config does not enable (airbnb-era `react/forbid-prop-types` and the like). Each app's lint goes red the day the fix ships, so the release note should say so and point at `lint:fix`.

> [!NOTE]
> This issue body was drafted by Claude (Claude Code) and reviewed before posting.
