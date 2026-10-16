#!/usr/bin/env bash
# PreToolUse hook (Bash). Blocks a GitHub write whose body names a scratch file,
# the bairf repo, a bairf worktree, or a local path. Exit 2 = blocked; stderr is the reason.
# Only the body is scanned: inline --body text and the files a body is read from.
set -u
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')
[ -n "$cmd" ] || exit 0

# A gh write at the start of a command segment (line start, or after ; && || |).
seg='(^|[;&|][[:space:]]*)'
printf '%s\n' "$cmd" | grep -Eq "${seg}gh[[:space:]]+(pr|issue)[[:space:]]+(create|edit|comment|review)\b|${seg}gh[[:space:]]+api\b.*(--method[[:space:]]+(POST|PATCH|PUT)|-X[[:space:]]*(POST|PATCH|PUT))" || exit 0

root=$(cat "$HOME/.claude/bairf-root" 2>/dev/null || true)
patterns='(decisions|plan|issue-body|pr-body|manual-testing|review-log|conversation)-[A-Za-z0-9._-]*\.md|github\.com/[A-Za-z0-9_-]+/bairf|/home/[a-z0-9_-]+/|UPSTREAM\.md|wayfinder/[a-z0-9-]+/(map|issues)'
esc() { printf '%s' "$1" | sed 's/[.[\*^$/]/\\&/g'; }
if [ -n "$root" ]; then
  patterns="$patterns|$(esc "$root")"
  while IFS= read -r wt; do [ -n "$wt" ] && patterns="$patterns|$(esc "$wt")"; done \
    < <(git -C "$root" worktree list --porcelain 2>/dev/null | sed -n 's/^worktree //p')
fi

# Body sources: files named after --body-file / -F / --input / --rawfile NAME, and inline --body / -b text.
body=""
for f in $(printf '%s\n' "$cmd" | grep -oE '(--body-file|-F|--input|--rawfile[[:space:]]+[A-Za-z_]+)[[:space:]]+[^[:space:]"'"'"']+' | awk '{print $NF}'); do
  [ "$f" = "-" ] && continue
  [ -f "$f" ] && [ -r "$f" ] && body="$body"$'\n'"$(cat "$f")"
done
# Inline body: everything from --body / -b to the end of the command (heredocs span lines).
stripped=$(printf '%s\n' "$cmd" | sed -E 's/--body-file[[:space:]]+[^[:space:]"'"'"']+//g')
case "$stripped" in
  *--body*) body="$body"$'\n'"${stripped#*--body}" ;;
  *' -b '*) body="$body"$'\n'"${stripped#* -b }" ;;
esac
[ -n "$body" ] || exit 0

hits=$(printf '%s' "$body" | grep -nE "$patterns" | head -20)
[ -z "$hits" ] && exit 0
{
  echo "Blocked: this GitHub write's body names a scratch file, the bairf repo or worktree, or a local path."
  echo "A project-repo body is the complete public record; embed the content and drop the reference."
  echo "$hits"
} >&2
exit 2
