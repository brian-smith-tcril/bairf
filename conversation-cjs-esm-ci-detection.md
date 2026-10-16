# Catching CJS/ESM dual-bundling in CI

Conversation from 2026-10-16, after the `@edx/frontend-lib-special-exams` 5.0.0
outage (openedx/frontend-lib-special-exams#178, fixed in #179). Questions are
Brian Smith's; answers are Claude Code's, verbatim.

---

**User:**

would it be possible to get unit tests to catch something like this? not something we need to fix on the learning side right now, but maybe with the frontend-base conversion we could catch these? trying to figure out if CJS/ESM issues are something we'd be able to catch in CI

**Claude:**

Short answer: not with unit tests, but yes in CI at two other layers, and the cheap one could ship with frontend-base's build tooling.

**Why unit tests can't see it.** The two copies exist only after a bundler applies `exports` conditions per call site. Jest resolves everything through `require`, and babel-jest rewrites the lib to CommonJS anyway, so the test runner always has one React Query. Any test that passes under Jest says nothing about this class of bug, in either repo.

**What does see it, from most to least reliable:**

- **Rendering the built bundle.** This is what the nightly E2E did. A PR-level version is `npm run build`, serve `dist/`, and have a headless browser load one route against a stubbed config endpoint. It catches everything that only exists post-bundling: duplicated singletons, bad `exports` conditions, side-effect tree-shaking. Cost is a browser in CI. Neither learning's `validate` nor frontend-base's `ci.yml` does anything after `build` today.
- **A bundle-shape check on webpack stats.** After the build, group modules by package and fail when one package is reached through two formats. Deterministic and cheap, and it is exactly the evidence Ty used. The catch is that it is heuristic by file layout. TanStack's `index.js` beside `index.cjs` is easy. Packages that split into `esm/` and `cjs/` directories need the rule widened to "same package, two distinct entry files". The off-the-shelf `duplicate-package-checker-webpack-plugin` does not help: it keys on version, so one version bundled twice is invisible to it.
- **Package-shape linters on the lib side.** I ran both on the real tarballs. `publint` reports 5.0.0 as clean, so it would not have stopped the release. `arethetypeswrong` flags 5.0.0 with "node16 from CJS: resolution failed" because the exports map has no `require` condition. That is adjacent to the bug and would have made someone look at the map, but it is not the duplication itself.

**One caveat the linters surfaced about the fix.** The ESM dist is `import` syntax in `.js` files with no `"type": "module"`, which is how the header and footer libs ship too. Webpack and babel-jest handle it, and attw rates it green for bundlers, but Node itself cannot load it. If lib CI ever adopts a packaging check, the lib will need `"type": "module"` at the same time. Not for now.

**For the frontend-base conversion.** Since site config is the bundle, every lib an app pulls in goes through the same resolution and this stays the same class of risk. The stats-based check belongs in the shared build step so every app inherits it, and a render smoke on the built output is the thing that actually proves a page loads. I would put the first in frontend-base's tooling and treat the second as the real fix for the gap.

---

**User:**

rendering the built bundle would be hard without a backend and mocking that for the render would get real messy real fast

**Claude:**

Agreed. A render smoke needs the config endpoint, auth, and whatever the first route fetches, and every stub drifts from the real backend. Drop it.

The stats check can be made precise rather than heuristic, which makes it the right fit on its own. Webpack stats record, for every module, the `reasons` that pulled it in, and each reason carries the raw request string. The lib's `@tanstack/react-query` request resolved to `index.cjs` while the app's identical request resolved to `index.js`. So the rule is "one bare package request string resolving to more than one file", grouped across the whole module list. That needs no knowledge of file layouts, no backend, and no browser. It also catches the classic version-duplication case, since two nested copies of a package resolve the same request to two paths.

What it would look like in practice:

- Build with `--json` so webpack writes `stats.json` next to `dist/`.
- A short script walks `modules[].reasons[]`, keeps requests that start with a package name rather than `./` or `../`, maps request to the set of resolved `resource` paths, and fails when any set has more than one entry.
- An allowlist for the few packages that legitimately resolve differently per issuer, if any turn up.

In frontend-base the build step is shared, so the script lives once in the tooling and every app and site inherits it. That matches the "site config is the bundle" model, because the duplication only ever exists inside a bundle.

I can prototype the script against learning's current build to see how noisy it is. The lib tarball installed right now is the fixed one, so a positive check needs `npm ci` first to put the registry 5.0.0 back, then two builds with stats. Say so if you want that run.

---

**User:**

this feels like this can't be a problem unique to us, wondering what prior art for solving this exists

**Claude:**

Plenty of prior art, and it clarifies where the gap is. Node's docs call this the "dual package hazard": a package loaded once via `require` and once via `import` yields two instances, which breaks anything stateful like a context. Three kinds of answer exist.

**The designed-in fix is an export condition, owned by the package author.** Webpack, Rollup and wmr honour a `module` condition that means "this file is ESM, use it for both `import` and `require`". Webpack's package-exports guide says it outright: without it, "bundlers would include the package source code twice otherwise". Node 22.10 added the equivalent `module-sync` condition for `require(esm)`. publint even has a rule, `EXPORTS_MODULE_SHOULD_BE_ESM`, whose description is that the condition exists "to prevent the dual package hazard in bundlers". React Query 5.104.2 declares `import`, `require` and its own `@tanstack/custom-condition`, but no `module`, so webpack had no permission to dedupe. If TanStack added one line to its exports map, our CJS dist would have worked. That is an upstream ask worth making regardless of our fix.

**Library-side discipline is the usual mitigation.** The TanStack issue thread on this exact error lands on: peer-depend on React Query, don't mix build formats across a shared lib and its host, and if all else fails pin the bundler to one file. Our fix is the "don't mix formats" row. The lint tools stop short of catching it: publint has no rule for an `import` condition pointing at a CommonJS file, and attw's nearest signal is the missing `require` condition.

**Consumer-side detection exists but keys on the wrong thing.** Statoscope's `@statoscope/webpack/no-packages-dups` is the standard CI rule, and it fails when a package "has more than one instance (directory with a package within node_modules)". `duplicate-package-checker-webpack-plugin` keys on version. Both are blind to one directory bundled through two entry files, which is our case. The request-string-to-resolved-file check I sketched is not something I found off the shelf. Consumer-side prevention is the alias or dedupe pin: Vite has `resolve.dedupe`, Metro and webpack get an explicit path alias. Those are the known hack, not a detector.

So: the ecosystem solved this at the package level with the `module` condition, the popular bundle validators were built for the nested-version flavour and would pass our bundle, and the honest CI answer is still a small custom stats rule, ideally alongside asking TanStack for a `module` condition.

Sources:
- [webpack: Package exports guide](https://webpack.js.org/guides/package-exports/)
- [publint rules](https://publint.dev/rules)
- [Node.js: Modules: Packages](https://nodejs.org/api/packages.html)
- [Node.js 22.10.0 release notes (module-sync)](https://nodejs.org/en/blog/release/v22.10.0)
- [Statoscope no-packages-dups rule](https://github.com/statoscope/statoscope/blob/master/packages/stats-validator-plugin-webpack/docs/rules/no-packages-dups.md)
- [TanStack/query#7965](https://github.com/TanStack/query/issues/7965)
- [TanStack/query#3707](https://github.com/TanStack/query/issues/3707)
