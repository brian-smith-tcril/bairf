#!/usr/bin/env bash
# Exercises hooks/no-scratch-refs.sh with representative commands. Run: hooks/test-no-scratch-refs.sh
set -u
here=$(cd "$(dirname "$0")" && pwd)
hook="$here/no-scratch-refs.sh"
tmp=$(mktemp -d)
printf 'Settled in `plan-2018.md` and the baseline.\n' > "$tmp/bad.md"
printf 'Clean body with #2018 and openedx/frontend-lib-special-exams#175.\n' > "$tmp/good.md"
fail=0
case_() { # name expected command
  local name=$1 want=$2 cmd=$3 got
  printf '%s' "$cmd" | jq -Rs '{tool_input:{command:.}}' | "$hook" >/dev/null 2>"$tmp/err"
  got=$?
  if [ "$got" = "$want" ]; then printf 'ok   %-50s exit %s\n' "$name" "$got"
  else printf 'FAIL %-50s exit %s, want %s\n' "$name" "$got" "$want"; sed 's/^/     /' "$tmp/err"; fail=1; fi
}
case_ "read-only gh"                     0 "gh pr view 1 --json body"
case_ "non-gh naming a scratch file"      0 "ls decisions-2135.md"
case_ "doc edit mentioning gh in prose"   0 "python3 - <<'PY'
s = s.replace('- Submit as drafts: \`gh stack submit --auto\`', 'x'); root='/home/bsmith/code/claude/bairf'
PY"
case_ "cd local path, good body-file"     0 "cd /home/bsmith/code/claude/frontend-app-learning && gh issue create --title t --body-file $tmp/good.md"
case_ "bad body-file"                     2 "gh issue create --title t --body-file $tmp/bad.md"
case_ "inline body, bairf url"            2 "gh pr comment 1 --body 'see https://github.com/brian-smith-tcril/bairf/blob/main/x.md'"
case_ "inline body, local path"           2 "gh issue comment 1 --body 'file at /home/bsmith/code/x'"
case_ "heredoc inline body, scratch name" 2 "gh issue comment 1 --body \"\$(cat <<'EOF'
settled in plan-2018.md
EOF
)\""
case_ "jq rawfile PATCH, bad"             2 "jq -n --rawfile body $tmp/bad.md '{body:\$body}' | gh api --method PATCH repos/o/r/issues/1 --input -"
case_ "jq rawfile PATCH, good"            0 "jq -n --rawfile body $tmp/good.md '{body:\$body}' | gh api --method PATCH repos/o/r/issues/1 --input -"
case_ "sub-issue POST, no body"           0 "gh api --method POST repos/o/r/issues/1/sub_issues -F sub_issue_id=123"
rm -rf "$tmp"
exit $fail
