# Verification

A feature is `done` only with evidence:

1. `bash scripts/init.sh` passes (typecheck, lint, unit tests when configured, backlog valid).
2. Every item in the feature's `acceptance` list in `features.json` is checked and reported with evidence. Read the files in its `spec` list first — they define the behaviour (RF, HU, CU).
3. Domain/application code has unit tests (Vitest); in-memory repositories are used for application tests.
4. Applicable RNFs in `docs/04-requisitos-no-funcionales/` are respected (security/privacy first).
5. UI work: run the app (iOS simulator tool, or `expo start --web` + built-in browser), compare against `docs/MediQ — prototipo móvil.html`, take a screenshot and look at it.
6. The reviewer agent approves before the status becomes `done`.
