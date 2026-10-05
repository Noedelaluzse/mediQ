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
- **Versión automática (Perfil → "versión 1.10.14 (a1b2c3d)"):** se calcula sola con el historial de git, `1.<features>.<resto>`. Cada commit `feat(...)` sube el número del medio (los viejos `Fnnn:` o un `feat` con id `Fnnn` cuentan **una vez por id**); `fix:`, `docs:`, `chore:`, `refactor:`, `test:` y los mensajes sin prefijo suben el último. Los `Merge ...` no cuentan. El hash es el commit instalado. Código: `apps/mobile/config/version.js`; `app.config.ts` lo usa para `version`, `ios.buildNumber` (total de commits), `android.versionCode` y `extra.commit`, y además publica `EXPO_PUBLIC_APP_VERSION` y `EXPO_PUBLIC_APP_COMMIT`, que Metro incrusta en el JavaScript: **Perfil lee esas variables**, no `Constants.expoConfig` (en la app de desarrollo este trae la configuración con que se compiló lo nativo, p. ej. 1.0.0). **Por eso hay que respetar el prefijo en cada commit.**
  - Se calcula cuando arranca Metro o se compila: tras hacer commits hay que **reiniciar Metro** para que Perfil muestre la versión nueva.
  - La copia de compilación `~/mediq-build` no tiene `.git`: antes del `rsync` correr `pnpm --filter mobile version:generate` (escribe `config/version.generated.json`, ignorado por git) y la copia lo lee.
  - El número nativo de iOS (Info.plist) solo cambia al recompilar; lo que se ve en Perfil cambia al reiniciar Metro (con `--clear` si no se actualiza).

