This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `apps/mobile/src/app/routes/` (set via the `root` option of the `expo-router` plugin in `app.json`) — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside it. `src/app/container.ts` (composition root) sits next to `routes/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

---

# Agent harness protocol

This repo is the harness: every agent (lead, implementer, reviewer, explorer) follows these rules. Keep this file short; details live in `docs/generado/`; the product spec is in `docs/README.md`.

## Git workflow (mandatory, no exceptions)

Every new implementation follows this exact flow:

1. `git checkout main && git pull origin main` — get the latest changes first.
2. Run the existing unit tests (`npm test` if a `test` script exists; if none exists, say so) plus `bash scripts/init.sh`. If anything fails on a clean `main`, stop and ask the user.
3. `git checkout -b <type>/<short-description>` (e.g. `feat/login-screen`). All work happens on that branch.
4. **Tests first (TDD):** write the tests for the feature BEFORE any feature code, run them and see them fail, then write the code until they pass. Then verify the feature is correct (see `docs/generado/verification.md`).
   **Emulator:** for any feature with UI, open the iOS simulator panel (`attach`) BEFORE building so the user can watch the design live, run the app there, and check it against `docs/MediQ — prototipo móvil.html`. If no simulator is booted, boot one (`xcrun simctl boot <iPhone>`).
5. Only after verification: push the branch and open a PR against `main` (`gh pr create`).

Hard rules:
- **Never commit, merge, rebase or push directly to `main`.** This is forbidden; `.claude/hooks/block-main.sh` enforces it. Never bypass or edit the hook to get around it.
- **Never write feature code before its tests exist.** Order is always: tests → run (red) → code → run (green). If something can't be unit-tested, say why and ask the user.
- No force-push, no `--no-verify`.
- **Never assume.** If requirements, scope, naming, or any decision is unclear, stop and ask the user, then continue based on their answer.

## Communication with the user (mandatory, never skip)

For **every** feature, always, with no exceptions:

1. **Before starting** — tell the user which feature you are about to implement (id + title + what it will do), in simple language.
2. **After finishing** — give a short report in plain, easy-to-understand language (no jargon; explain terms if needed) with these sections:
   - **Qué hice** — what was implemented.
   - **Problemas encontrados** — what went wrong or was tricky.
   - **Cómo lo solucioné** — how each problem was solved.
   - **Diagrama** — at least one ASCII diagram showing the flow, structure, or before/after (e.g. `Pantalla → Hook → Datos`).
3. Write this report in the user's language (Spanish), keep it brief, and also save it in `progress/history.md`.
4. A feature is not finished until this report has been delivered. The lead agent is responsible for delivering it; subagents must put the raw material (problems, solutions) in `progress/current.md`.

## Start of every session

0. Follow the Git workflow above before touching any code.
1. Run `bash scripts/init.sh`. If it fails, **stop and report** — do not start new work on a broken baseline.
2. Read `progress/current.md` (unfinished work from a previous session) and `progress/history.md` (tail only).
3. If `progress/current.md` is empty, pick the first `pending` item in `features.json` (they are ordered by dependency; F000 comes first) and set it to `in_progress`. Read every file in its `spec` list, then write the plan in `progress/current.md`. If the spec is ambiguous or contradicts another doc, ask the user.

## Repo map (read only what you need)

- Product spec (source of truth for WHAT to build): `docs/README.md` → vision, actors, RF, RNF, use cases (CU), user stories (HU), stack, architecture, theme, auth, DB schema, risks, roadmap. UI reference: `docs/MediQ — prototipo móvil.html`.
- Target layout: pnpm monorepo `apps/mobile`, `apps/api`, `packages/contracts` (see `docs/08-arquitectura.md`). The monorepo exists (F000): the Expo app is in `apps/mobile`, `apps/api` and `packages/contracts` are stubs. Routes live in `apps/mobile/src/app/routes`.
- `docs/generado/architecture.md`, `conventions.md`, `verification.md` are short digests that link back to the spec
- `features.json` task backlog · `progress/` shared memory between agents

## Rules

- Never mark a feature `done` unless `bash scripts/init.sh` passes and every `acceptance` criterion is demonstrably met.
- Keep tools simple: use grep/cat/ls style exploration, don't build special wrappers.
- Subagents must write their findings to `progress/` files (not only in their reply) so no context is lost between agents.
- Keep context small: don't read the whole repo; follow the map above.
- Before ending: `progress/history.md` gets a one-line entry per finished feature, and `progress/current.md` is cleared (or describes exactly where you stopped).
- If an agent definition in `.claude/agents/` or a doc here caused a mistake, fix it in the same change — the harness is part of the project.

## Package manager

The repo uses **pnpm** (monorepo). Never use npm/yarn. Root scripts: `pnpm lint`, `pnpm typecheck`, `pnpm test`. Expo commands from the Expo section run as `pnpm --filter mobile exec expo ...` (e.g. `pnpm --filter mobile exec expo install <pkg>`, `pnpm --filter mobile ios`).
