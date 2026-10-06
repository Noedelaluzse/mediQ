# Estado actual (2026-10-05)

F018 (logos) en su PR. Falta decidir dónde más mostrar el logo (encabezado del Diario, Perfil) y ver el login con el logo nuevo (cerrar sesión o probar en el iPhone).

F000–F017 hechas; F016 está en su PR (a la espera de fusión). **El backlog de `features.json` está completo.**

## Por hacer / decidir con el usuario
- Probar la **cámara** en el iPhone real (el simulador no tiene) y el flujo «sin permiso» (iOS: Ajustes → mediQ → Cámara).
- iPhone: recompilar para `expo-sqlite` (F010), `datetimepicker`, `expo-image-picker`, `expo-image-manipulator` y los **iconos nuevos (F018, borrar `~/mediq-build/apps/mobile/ios` antes: docs/solucion-de-problemas.md §3.22)**; requiere `version:generate`, rsync y ≥10 GB libres; hay que volver a iniciar sesión.
- Siguientes ideas de fase 2: búsqueda (RF-17), cola de envío sin red (RNF-11; hoy una foto que falla solo se informa), recordatorios de toma (RF-32), aviso de próxima cita (RF-40), proyecto Firebase propio (docs/14).
- Presupuesto/alertas de Blaze: confirmar que quedaron configuradas en la consola.

## Recordatorios
- Tras agregar casos de uso o rutas hay que reiniciar la app (el contenedor se crea una vez): docs/solucion-de-problemas.md §3.17.
- Toda publicación fuera del repo se anota en docs/14 y solo cuando el usuario la pide.
- Metro necesita reiniciarse con `--clear` al cambiar `.env.local` (agregué `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`; en `.env.example` ya está).
