# Verification

A feature is `done` only with evidence:

1. `bash scripts/init.sh` passes (typecheck, lint, unit tests when configured, backlog valid).
2. Every item in the feature's `acceptance` list in `features.json` is checked and reported with evidence. Read the files in its `spec` list first — they define the behaviour (RF, HU, CU).
3. Tests were written BEFORE the code (TDD: red → green). Domain/application code has unit tests (Vitest); in-memory repositories are used for application tests.
4. Applicable RNFs in `docs/04-requisitos-no-funcionales/` are respected (security/privacy first).
5. UI work: run the app (iOS simulator tool, or `expo start --web` + built-in browser), compare against `docs/MediQ — prototipo móvil.html`, take a screenshot and look at it.
6. The reviewer agent approves before the status becomes `done`.

## Native (development) build
- Login with real Google needs a development build, not Expo Go: `pnpm --filter mobile exec expo run:ios --no-bundler`.
- **The project path must not contain spaces** (this repo lives in `/Volumes/Macbook EHD/...`): CocoaPods script phases break on it. Build from a space-free copy instead:
  `rsync -a --delete --exclude .git --exclude apps/mobile/ios --exclude apps/mobile/android --exclude apps/mobile/.expo ./ ~/mediq-build/` then run `expo run:ios` from `~/mediq-build/apps/mobile`, with Metro running from the real repo.
- Google IDs come from `apps/mobile/.env.local` (git-ignored; template in `.env.example`). Without them, or in Expo Go, the app falls back to the simulated identity provider.

## Firebase / Firestore (prueba de F002)
- Firebase Auth + Firestore hacen el papel de la API hasta que exista `apps/api`. Solo se activan con Google real y las variables `EXPO_PUBLIC_FIREBASE_*` en `apps/mobile/.env.local`.
- Datos: `mediq_users/{uid}` (googleSub, email, displayName, createdAt) y `mediq_users/{uid}/patients/self` (fullName, isSelf: true).
- Reglas de Firestore a publicar en la consola (todo lo demás queda cerrado):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /mediq_users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```
- Firebase avisa que Auth usa persistencia en memoria: es intencional (la sesión vive en SecureStore).
