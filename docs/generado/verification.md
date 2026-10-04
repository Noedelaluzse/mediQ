# Verification

An agent must *prove* a feature is done:

1. `bash scripts/init.sh` passes (typecheck, lint when configured, backlog valid).
2. Each `acceptance` item in `features.json` is checked explicitly and reported with evidence.
3. UI changes: run the app (iOS simulator tool, or `npx expo start --web` + built-in browser), take a screenshot, and look at it.
4. Reviewer agent approves before the status becomes `done`.
