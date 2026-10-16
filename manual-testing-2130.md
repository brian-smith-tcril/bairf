# Manual testing — #2130 (types only)

No behaviour or request change; a smoke pass that the pages whose data this
layer types still render. Tutor local, 2026-10-01, by the user.

- [x] **Outline tab** loads; nothing looked broken.
- [x] **Courseware** loads; nothing looked broken.
- [x] **Progress tab** loads; nothing looked broken.
- [x] **Dates tab** loads; nothing looked broken.
- [ ] **Live tab** — not run.
- [ ] **Proctoring panel on a course without proctoring** — not run; the 404
      branch is hard to produce on tutor local (the LMS proctoring endpoints
      there answer 200 with an empty body) and is pinned by the hook suite.
