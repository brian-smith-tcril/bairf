# Decisions — port the courseware container and redirects (#2195)

The effort's working log for #2195: what was settled and done, in order.
Each layer's own decisions are in its `decisions-<pr>.md`, embedded in
its PR.

1. **Planning (2026-11-12), not yet settled or posted.** `plan-2195.md`
   is a draft; #2195's body is still the 2026-10-20 text. Settled with
   Brian so far:
   - **Three layers on the running stack**, above `bsmith/outline-tab`:
     the courseware data module, the two wrappers, the container with
     its redirects ("3 layers sound good"; "build on the existing
     stack, nothing wrong with having more open layers").
   - **`DecodePageRoute` decodes every path segment and reads no route
     list; its trailing-slash redirect is let go** ("no list, let the
     trailing slash redirect go"). Three candidates were put to Brian
     as code. He ruled out a ported `DECODE_ROUTES` first: two
     definitions of the course routes was enough ("the plain list
     option's con of two sources of truth is enough for me to rule it
     out"). Patterns derived in `routes.tsx` and passed as a prop was
     my recommendation until he asked why it beat no list; it kept
     `master`'s algorithm and bought nothing a learner sees. The
     reasoning, the two differences from `master` and the
     react-router reading are in the plan under "What changes".
   - On the way Brian asked where the links come from. Neither
     wrapper's PR names a producer (#693, #1090), and the address is
     the same before and after the conversion (decision 21); `master`'s
     router strips `/learning` as its basename and the shell's does
     not, which is all the prefix in the port stands for (plan,
     Baseline).
   - Still open: how layer 3's tests reach the three handlers the
     container passes to the course component (plan, Open questions).
