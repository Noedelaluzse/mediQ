# Conventions (digest — sources: `docs/04-requisitos-no-funcionales/`, `docs/07`, `docs/09`)

- TypeScript `strict`, no `any` (RNF-13). Coverage target 80 % in domain + application.
- No color literals outside `shared/theme`; components use semantic tokens via `useTema()` (RNF-15, docs/09).
- UI follows the prototype `docs/MediQ — prototipo móvil.html`; if text and prototype differ visually, the prototype wins.
- Texts externalized, initial locale es-MX (RNF-17). Touch targets ≥ 44 px, contrast ≥ 4.5:1 (RNF-16).
- Security/privacy: tokens only in `expo-secure-store`; every SQL filters by token's `user_id`; no clinical data in logs/analytics/error reports (RNF-02, 04, 06).
- Forms: React Hook Form + Zod (also to validate documents read from Firestore). Data access: Firestore SDK behind repositories; never call Firebase from `domain/`, `application/` or `presentation/`.
- Packages: pnpm. Expo packages with `pnpm --filter mobile exec expo install <pkg>` (SDK-compatible versions).
- Before using any Expo/RN API, check the versioned docs for the installed SDK (see top of AGENTS.md).
- Decisions worth remembering → add an ADR under `docs/adr/`.
