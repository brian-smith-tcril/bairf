#!/usr/bin/env bash
# PreToolUse hook (Bash). Blocks a push that would leave a clone under /tmp (scratchpad
# clones are read-only). Exit 2 = blocked; stderr is the reason.
# "Pushes": git push, gh pr create, gh stack submit. "Under /tmp": the shell's cwd, or any
# `cd <dir>` / `git -C <dir>` in the command, starts with /tmp.
set -u
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')
[ -n "$cmd" ] || exit 0

seg='(^|[;&|][[:space:]]*)'
printf '%s\n' "$cmd" | grep -Eq "${seg}git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+push\b|${seg}gh[[:space:]]+pr[[:space:]]+create\b|${seg}gh[[:space:]]+stack[[:space:]]+submit\b" || exit 0

cwd=$(printf '%s' "$input" | jq -r '.cwd // empty')
dirs=$(printf '%s\n' "$cmd" | grep -oE '(^|[;&|[:space:]])(cd|-C)[[:space:]]+[^[:space:];&|]+' | awk '{print $NF}' | tr -d '"'"'")
hits=$(printf '%s\n%s\n' "$cwd" "$dirs" | grep -E '^/tmp(/|$)' | sort -u)
[ -z "$hits" ] && exit 0
{
  echo "Blocked: this command pushes from a clone under /tmp. Scratchpad clones are read-only;"
  echo "work that grows out of one starts from a fork clone in the project directory."
  echo "$hits"
} >&2
exit 2
