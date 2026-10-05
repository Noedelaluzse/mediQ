# Architecture (digest — source of truth: `docs/08-arquitectura.md`)

- Monorepo pnpm with `apps/mobile` (Expo + RN). **Backend = Firebase** (Auth, Firestore, Storage); there is no own API/PostgreSQL. Stack: `docs/07-stack-tecnico.md`.
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
- Theme: `docs/09-tema-y-colores-intercambiables.md`. Auth: `docs/10-autenticacion-con-google.md`. Data model + security rules: `docs/11-modelo-de-datos-firestore.md`.
- Auth (F001): `modules/auth` has domain/application/infrastructure/presentation. Google and the API are SIMULATED adapters in `infrastructure/Simulated*` wired in `app/container.ts`; swap them for the real adapters (and add `POST /auth/google`) without touching domain or UI. Session lives in expo-secure-store.
- Current state: monorepo with only `apps/mobile`. Data access goes through ports (repositories); Firebase adapters live in `infrastructure/`. Security rules are the ONLY authorization layer: write and test them with the Firebase emulator (`firebase/`). Routes live in `apps/mobile/src/app/routes`. Template files with color literals are exempted in `eslint.config.mjs` (`LEGACY_COLOR_FILES`) until replaced.
- Médicos (F006–F008): `modules/medicos`. Lee `visits` solo por el puerto `ConsultasDeMedicosRepository` (el módulo de consultas, F009, será quien las escriba). **Selector de médico:** la pantalla `/medicos-elegir` guarda lo elegido en `presentation/seleccionDeMedico.ts` (tienda de un solo uso) y vuelve atrás; el formulario de consulta lo recibe con `useMedicoElegido(alElegir)`. Los chips "Usados antes" salen de `ListarLugaresUsadosAntes`. Los hooks que importan `expo-router` van en archivos aparte de la lógica pura para poder probarla en Vitest.
