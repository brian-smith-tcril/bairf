# Code conventions in Open edX frontend apps

The ecosystem's baseline is [OEP-67, Standard Tools and Technologies](https://docs.openedx.org/projects/openedx-proposals/en/latest/best-practices/oep-0067-bp-tools-and-technology.html): React, React Query for server data with React state and context for client state, Jest with React Testing Library, TypeScript where it adds value, the shared ESLint config, npm with a committed lockfile and caret ranges, Webpack, SCSS with CSS variables for runtime theming. Cite it when a convention question is really an ecosystem question. The lines below are Brian's house rules on top of it.

- New files are TypeScript: `.ts` for logic and data, `.tsx` for components and contexts. A file that is only edited keeps its extension.
- An import added or changed reaches outside its directory through the repo's `@src` alias when one exists (`tsconfig.json` paths), never through a `../../` climb.
- New tests use `userEvent` (`const user = userEvent.setup()`); existing tests touched by a change keep their style and get the smallest fix. Tests are fully linted: restructure (a small recursive helper, `within(section)`) rather than `eslint-disable`.
- Follow `rules-of-hooks` and `exhaustive-deps` even where the eslint config disables them.
- Comments name the endpoint (`course_metadata`) or `openedx-platform`, never "the LMS" as an actor.
