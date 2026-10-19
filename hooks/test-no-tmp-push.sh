#!/usr/bin/env bash
# Exercises hooks/no-tmp-push.sh with representative commands and cwds. Run: hooks/test-no-tmp-push.sh
set -u
here=$(cd "$(dirname "$0")" && pwd)
hook="$here/no-tmp-push.sh"
tmp=$(mktemp -d)
home=/home/bsmith/code/project-x/frontend-app-learning
scratch=/tmp/claude-1000/project-x/session/scratchpad/ref/frontend-base
fail=0
case_() { # name expected cwd command
  local name=$1 want=$2 cwd=$3 cmd=$4 got
  printf '%s' "$cmd" | jq -Rs --arg cwd "$cwd" '{cwd:$cwd, tool_input:{command:.}}' | "$hook" >/dev/null 2>"$tmp/err"
  got=$?
  if [ "$got" = "$want" ]; then printf 'ok   %-44s exit %s\n' "$name" "$got"
  else printf 'FAIL %-44s exit %s, want %s\n' "$name" "$got" "$want"; sed 's/^/     /' "$tmp/err"; fail=1; fi
}
case_ "read in scratch clone"          0 "$scratch" "git log -S foo --oneline | head"
case_ "fetch in scratch clone"         0 "$scratch" "git fetch origin && git checkout release/teak"
case_ "push from project clone"        0 "$home"    "git push -u origin my-branch"
case_ "pr create from project clone"   0 "$home"    "gh pr create --title t --body-file b.md"
case_ "push, cwd under /tmp"           2 "$scratch" "git push origin HEAD"
case_ "pr create, cwd under /tmp"      2 "$scratch" "gh pr create --fill"
case_ "stack submit, cwd under /tmp"   2 "$scratch" "gh stack submit --auto"
case_ "git -C tmp push"                2 "$home"    "git -C $scratch push origin HEAD"
case_ "cd tmp then push"               2 "$home"    "cd $scratch && git push"
case_ "cd project then push, cwd tmp"  2 "$scratch" "cd $home && git push"
case_ "mktemp path, no push"           0 "$home"    "cd /tmp/x && git status"
case_ "push to a tmp remote path"      0 "$home"    "git push /tmp/bare.git main"
rm -rf "$tmp"
exit $fail
