# Tutor dev

- Hosts under `*.local.openedx.io` resolve through a public wildcard DNS record to 127.0.0.1 (`local.openedx.io:8000` LMS, `apps.local.openedx.io:200x` frontend apps, `studio.local.openedx.io:8001`). An unreachable service is a bring-up problem, never DNS; `/etc/hosts` stays untouched.
- `tutor dev exec|logs|restart|do init --limit <svc>` over raw `docker`; `tutor` lives in Brian's `tutorenv` virtualenv, so Brian runs tutor commands or pastes output.
