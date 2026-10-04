#!/usr/bin/env bash
# Harness gate: decides whether the repo is healthy enough for an agent to work.
set -u
cd "$(dirname "$0")/.."
fail=0
ok()  { echo "  ✔ $1"; }
bad() { echo "  ✘ $1"; fail=1; }

echo "== mediQ init =="

command -v node >/dev/null && ok "node $(node -v)" || bad "node not installed"
[ -d node_modules ] && ok "node_modules present" || bad "node_modules missing (run: npx expo install)"

for f in AGENTS.md features.json progress/current.md progress/history.md; do
  [ -f "$f" ] && ok "$f exists" || bad "$f missing"
done

if [ -f features.json ] && command -v node >/dev/null; then
  node -e '
    const f = JSON.parse(require("fs").readFileSync("features.json","utf8")).features;
    const okStatus = ["pending","in_progress","done"];
    const badOne = f.find(x => !x.id || !x.title || !Array.isArray(x.acceptance) || !okStatus.includes(x.status));
    if (badOne) { console.error("invalid feature:", JSON.stringify(badOne)); process.exit(1); }
    const noSpec = f.find(x => !Array.isArray(x.spec) || x.spec.some(p => !require("fs").existsSync(p)));
    if (noSpec) { console.error("feature without valid spec files:", noSpec.id); process.exit(1); }
    if (f.filter(x => x.status === "in_progress").length > 1) { console.error("more than one in_progress"); process.exit(1); }
  ' && ok "features.json valid" || bad "features.json invalid"
fi

if [ -f pnpm-workspace.yaml ]; then PM=pnpm; RUN="pnpm exec"; else PM=npm; RUN="npx --no-install"; fi
if [ -d node_modules ]; then
  if $RUN tsc --noEmit >/tmp/mediq-tsc.log 2>&1; then ok "typecheck passes"
  else bad "typecheck fails (see /tmp/mediq-tsc.log)"; tail -20 /tmp/mediq-tsc.log; fi

  if [ -f eslint.config.js ] || [ -f .eslintrc.js ] || [ -f .eslintrc.json ]; then
    if $RUN expo lint >/tmp/mediq-lint.log 2>&1; then ok "lint passes"
    else bad "lint fails (see /tmp/mediq-lint.log)"; tail -20 /tmp/mediq-lint.log; fi
  else
    echo "  - lint skipped (no eslint config yet — F000 adds it)"
  fi

  if grep -q '"test"' package.json; then
    if $PM test >/tmp/mediq-test.log 2>&1; then ok "unit tests pass"
    else bad "unit tests fail (see /tmp/mediq-test.log)"; tail -20 /tmp/mediq-test.log; fi
  else
    echo "  - unit tests skipped (no test script yet — F000 adds Vitest)"
  fi
fi

[ $fail -eq 0 ] && echo "Environment READY — you can work." || echo "Environment NOT READY — do not start new work."
exit $fail
