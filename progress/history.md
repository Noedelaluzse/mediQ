# History

One line per finished feature: `date · id · summary`.
2026-10-04 · F000 · Monorepo pnpm (apps/mobile, apps/api, packages/contracts), Vitest, ESLint (capas + sin colores fuera del tema), shared/theme verde + shared/ui base, prueba de contraste; verificado en simulador iOS.
2026-10-04 · F001 · Login con Google (adaptadores simulados): rutas (auth)/(tabs), pantalla de login, aviso de privacidad en primer inicio, sesión en SecureStore; 24 pruebas; verificado en simulador.
2026-10-05 · F002 · Cuenta y perfil propio al primer login (prueba con Firebase Auth + Firestore, colección mediq_users); 44 pruebas; login real verificado en simulador.
2026-10-05 · F003 · Consentimiento: se registra qué documentos (aviso y términos) y qué versión acepta el usuario en Firestore (mediq_users/{uid}/consents); si cambia la versión se vuelve a pedir. Incluye restaurar la sesión en silencio al abrir la app (Google signInSilently + Firebase Auth). 69 pruebas; verificado en iPhone 15.
