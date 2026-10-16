#!/usr/bin/env bash
# Install or check this bairf checkout as the machine's Claude Code setup.
#   ./setup.sh --check   report each item's state, change nothing
#   ./setup.sh --apply   bring each item to the expected state
set -euo pipefail
mode=${1:---check}
root=$(cd "$(dirname "$0")" && git rev-parse --show-toplevel)
claude_dir="$HOME/.claude"
pointer="$claude_dir/bairf-root"
status=0

say() { printf '%-22s %s\n' "$1" "$2"; }
apply() { [ "$mode" = --apply ]; }

# 1. pointer: this checkout is the installed one
if [ -f "$pointer" ] && [ "$(cat "$pointer")" != "$root" ]; then
  say "bairf-root" "points at $(cat "$pointer"); this checkout is $root. Re-point by hand if intended."
  exit 1
elif [ -f "$pointer" ]; then say "bairf-root" "ok ($root)"
else apply && { mkdir -p "$claude_dir"; printf '%s\n' "$root" > "$pointer"; say "bairf-root" "written"; } || { say "bairf-root" "missing"; status=1; }
fi

# 2. ~/.claude/CLAUDE.md is the import stub
stub="@$root/claude/CLAUDE.md"
if [ -f "$claude_dir/CLAUDE.md" ]; then
  if [ "$(cat "$claude_dir/CLAUDE.md")" = "$stub" ]; then say "CLAUDE.md stub" "ok"
  else say "CLAUDE.md stub" "exists with other content; merge by hand:"; sed 's/^/    /' "$claude_dir/CLAUDE.md"; status=1; fi
else apply && { printf '%s\n' "$stub" > "$claude_dir/CLAUDE.md"; say "CLAUDE.md stub" "written"; } || { say "CLAUDE.md stub" "missing"; status=1; }
fi

# 3. global git ignore
ignore=$(git config --global core.excludesFile || echo "$HOME/.config/git/ignore")
ignore=${ignore/#\~/$HOME}
for line in 'CLAUDE.local.md' '**/.claude/settings.local.json'; do
  if [ -f "$ignore" ] && grep -qxF "$line" "$ignore"; then say "git ignore" "ok: $line"
  else apply && { mkdir -p "$(dirname "$ignore")"; printf '%s\n' "$line" >> "$ignore"; say "git ignore" "added: $line"; } || { say "git ignore" "missing: $line"; status=1; }
  fi
done

# 4. settings.json: merge the fragment (plugins; hooks added when their command is absent)
settings="$claude_dir/settings.json"; fragment="$root/claude/settings.fragment.json"
[ -f "$settings" ] || echo '{}' > "$settings"
merged=$(jq -s '
  def merge_hooks($cur; $frag):
    reduce ($frag | keys[]) as $k ($cur;
      .[$k] = ((.[$k] // []) + [ $frag[$k][] | . as $g | select((($cur[$k] // []) | any(.hooks == $g.hooks)) | not) ]));
  .[0] as $cur | .[1] as $frag
  | $cur
  | .enabledPlugins = (($cur.enabledPlugins // {}) + $frag.enabledPlugins)
  | .hooks = merge_hooks(($cur.hooks // {}); $frag.hooks)
' "$settings" "$fragment")
if [ "$(jq -S . "$settings")" = "$(printf '%s' "$merged" | jq -S .)" ]; then say "settings.json" "ok"
else apply && { printf '%s\n' "$merged" | jq . > "$settings"; say "settings.json" "merged"; } || { say "settings.json" "needs merge (plugins/hooks)"; status=1; }
fi

# 5. skills: copies in ~/.claude/skills, refreshed from this checkout
for d in "$root"/skills/*/; do
  n=$(basename "$d"); dest="$claude_dir/skills/$n"
  if [ -d "$dest" ] && diff -rq "$d" "$dest" >/dev/null; then say "skill $n" "ok"
  else apply && { mkdir -p "$dest"; rsync -a --delete "$d" "$dest/"; say "skill $n" "copied"; } || { say "skill $n" "stale or missing"; status=1; }
  fi
done

# 6. plugins and tools
if claude plugin list 2>/dev/null | grep -q mattpocock-skills; then say "plugin mattpocock" "ok"
else apply && { claude plugin install mattpocock-skills@claude-plugins-official; say "plugin mattpocock" "installed"; } || { say "plugin mattpocock" "missing"; status=1; }
fi
gh extension list 2>/dev/null | grep -q 'github/gh-stack' && say "gh-stack ext" "ok" || { say "gh-stack ext" "missing: gh extension install github/gh-stack"; status=1; }
if [ -f "$claude_dir/skills/gh-stack/SKILL.md" ]; then say "gh-stack skill" "ok (official, github/gh-stack)"
else apply && { gh skill install github/gh-stack; say "gh-stack skill" "installed"; } || { say "gh-stack skill" "missing: gh skill install github/gh-stack"; status=1; }
fi
if v=$(bash -c '. "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 && nvm --version' 2>/dev/null); then say "nvm" "ok ($v)"
else say "nvm" "missing or broken: install nvm, then re-check"; status=1; fi

exit $status
