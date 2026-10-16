> [!NOTE]
> This comment was authored by Claude (Claude Code) and reviewed before posting.

## Note for the `courseware/course/celebration` item, from #2086

#2086 (the last `courseHomeMeta` layer of the #1977 model-store dissolution) moves the two celebration writers off the model store and onto the query cache as a literal port: `dispatch(updateModel({ modelType: 'courseHomeMeta', … }))` becomes `queryClient.setQueryData(courseHomeQueryKeys.metadata(courseId), (meta) => ({ ...meta, celebrations: { ...celebrations, <flag> } }))`, with every signature kept (`dispatch` → `queryClient` in the same slot) and `postCelebrationComplete` untouched as a fire-and-forget POST outside React Query. Doing the cache write by hand beside the POST was accepted as the minimal change for #2086 on the understanding that the real shape — a `useMutation` whose callback does the write — is this issue's.

Two things for that conversion to know:

- **The POST and the cache write are not paired one to one.** `recordFirstSectionCelebration` does both. In `shouldCelebrateOnSectionLoad`, the streak-precedence branch posts `first_section: false` without patching (the streak modal shows instead, and the flag is left so the client does not also celebrate), and the clearing branch (moving off the target sequence) patches without posting. `recordWeeklyGoalCelebration` posts only. `recordModalClosing` (streak) patches only — closing the streak modal sends nothing. A mutation whose `onMutate`/`onSuccess` always patched when it posted would change the two `shouldCelebrateOnSectionLoad` branches, so the design has to take the write and the request as separately callable, or accept and state the behaviour change.
- **Signature cleanup deferred here.** The writers still spread the component's render-time `celebrations` (the updater form reading the cache's own `celebrations` would drop that parameter), and `recordModalClosing` carries an unused `org` parameter. Both were left alone in #2086 to keep it a data-source swap.
