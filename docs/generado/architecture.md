# Architecture (digest — source of truth: `docs/08-arquitectura.md`)

- Monorepo pnpm: `apps/mobile` (Expo + RN), `apps/api` (Fastify), `packages/contracts` (Zod/DTOs). Stack: `docs/07-stack-tecnico.md`.
- Four modules: auth, consultas, recetas, medicos. Each with 4 layers: `domain/` → `application/` → `infrastructure/` · `presentation/`.
- Dependency rules (enforced by `eslint-plugin-boundaries`):
  - `domain/` imports only `domain/` and `shared/kernel`.
  - `application/` imports only `domain/`.
  - `presentation/` imports `application/` and `shared/`, never `infrastructure/`.
  - Only `app/container.ts` (composition root) imports `infrastructure/`.
  - A module imports another only via its `index.ts`.
- Aggregates reference each other by id. Use `Result<T, DomainError>`, no exceptions for domain errors.
- Routes (Expo Router) live in `apps/mobile/src/app/routes` (`root` option in `app.json`); keep them thin. `app/container.ts` is the sibling composition root.
- Never edit `ios/` or `android/` (generated).
- Theme: `docs/09-tema-y-colores-intercambiables.md`. Auth: `docs/10-autenticacion-con-google.md`. DB: `docs/11-esquema-de-base-de-datos-postgresql.md`.
- Current state (F000 done): monorepo in place; `apps/api` and `packages/contracts` are stubs. Routes live in `apps/mobile/src/app/routes`. Template files with color literals are exempted in `eslint.config.mjs` (`LEGACY_COLOR_FILES`) until replaced.
