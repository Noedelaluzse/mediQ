# History

One line per finished feature: `date · id · summary`.
2026-10-04 · F000 · Monorepo pnpm (apps/mobile, apps/api, packages/contracts), Vitest, ESLint (capas + sin colores fuera del tema), shared/theme verde + shared/ui base, prueba de contraste; verificado en simulador iOS.
2026-10-04 · F001 · Login con Google (adaptadores simulados): rutas (auth)/(tabs), pantalla de login, aviso de privacidad en primer inicio, sesión en SecureStore; 24 pruebas; verificado en simulador.
2026-10-05 · F002 · Cuenta y perfil propio al primer login (prueba con Firebase Auth + Firestore, colección mediq_users); 44 pruebas; login real verificado en simulador.
2026-10-05 · F003 · Consentimiento: se registra qué documentos (aviso y términos) y qué versión acepta el usuario en Firestore (mediq_users/{uid}/consents); si cambia la versión se vuelve a pedir. Incluye restaurar la sesión en silencio al abrir la app (Google signInSilently + Firebase Auth). 69 pruebas; verificado en iPhone 15.
2026-10-05 · F004 · Pestaña Perfil (según el diseño) y Cerrar sesión: cierra Firebase y Google y borra la sesión local del dispositivo. La revocación en el servidor se descartó por ahora (exige plan Blaze); plan B documentado en docs/10. 80 pruebas.
2026-10-05 · F005 · Eliminar cuenta (RF-05): botón rojo en Perfil con confirmación; reautentica, borra el subárbol de Firestore (ARBOL_DE_CUENTA), borra el usuario de Auth, desvincula Google y borra la sesión local. 100 pruebas; verificado en simulador en modo simulado. Fotos de Storage pendientes (RF-30).
2026-10-05 · F006 · Médicos y lugares (RF-20): pestaña Médicos (lista y vacío), formulario nuevo/editar/eliminar (bloquea si tiene consultas), Perfil > Mis lugares (agregar, renombrar sin repetidos, eliminar sin perder consultas). Módulo medicos con repos de Firestore; 10 pruebas contra el emulador con reglas reales; verificado en simulador con Firebase real.
