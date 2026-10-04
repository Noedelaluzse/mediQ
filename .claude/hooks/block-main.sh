#!/usr/bin/env bash
# PreToolUse(Bash) guard: forbid committing/merging/pushing to main.
input=$(cat)
cmd=$(printf '%s' "$input" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{console.log(JSON.parse(d).tool_input.command||"")}catch{console.log("")}})')
echo "$cmd" | grep -Eq '(^|[;&|[:space:]])git[[:space:]]' || exit 0

branch=$(git -C "${CLAUDE_PROJECT_DIR:-.}" rev-parse --abbrev-ref HEAD 2>/dev/null)
block() { echo "BLOCKED: $1. Workflow: pull main → run tests → new branch → work → push branch → open PR. Ask the user if unsure." >&2; exit 2; }

echo "$cmd" | grep -Eq 'git[[:space:]]+push.*(--force|[[:space:]]-f([[:space:]]|$))' && block "force-push is forbidden"
echo "$cmd" | grep -Eq -- '--no-verify' && block "--no-verify is forbidden"
echo "$cmd" | grep -Eq 'git[[:space:]]+push[^;&|]*([[:space:]:]|/)(main|master)([[:space:]]|$)' && block "pushing to main is forbidden"
if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
  echo "$cmd" | grep -Eq 'git[[:space:]]+(commit|merge|rebase|cherry-pick|push|revert|am)\b' && block "you are on '$branch'; direct changes to main are forbidden — create a branch first"
fi
exit 0
