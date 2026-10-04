# Architecture

- Expo SDK 57, React Native 0.86, Expo Router (file-based routes in `src/app/`).
- Layering: `src/app` (screens, thin) → `src/components` (UI) → `src/hooks` / `src/constants` (logic, theme).
- Path alias `@/*` → `src/*`.
- Platform variants use `.web.tsx` suffix (see `app-tabs.web.tsx`).
- Never edit `ios/` or `android/` (generated); configure via `app.json` / config plugins.
