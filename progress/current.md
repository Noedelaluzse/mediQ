# Estado actual (2026-10-06)

`features.json` está completo: F000–F018 hechas y fusionadas en `main`. Lo que queda son verificaciones del usuario, decisiones y mejoras.

## Verificación del usuario en el iPhone (app instalada: mediQ 1.20.15, compilación 37)
- Iniciar sesión de nuevo con Google (la reinstalación borra la sesión).
- Ver el icono nuevo y la pantalla de carga; ver el login con el logo nuevo (cerrando sesión desde Perfil).
- Probar la **cámara** («Tomar foto» en la receta) y el flujo «sin permiso» (Ajustes → mediQ → Cámara); el simulador no tiene cámara.
- Probar medicamentos de la receta y el borrador automático (SQLite) en el teléfono real (en el simulador no se pudo teclear, docs/solucion-de-problemas.md §3.18).

## Decisiones del usuario
- Siguiente funcionalidad: búsqueda (RF-17), recordatorios de toma (RF-32), cola de envío sin red (RNF-11; hoy una foto que falla solo se informa) o aviso de próxima cita (RF-40).
- Dónde más mostrar el logo: el Diario hoy muestra solo el texto «MediQ» (docs/15).
- Dudas de F012 sin responder: botón «Eliminar consulta» al final del formulario de edición; no se pueden quitar indicaciones ya creadas; no hay pantalla para recuperar consultas eliminadas.
- Confirmar en la consola de Firebase la alerta de presupuesto de Blaze.

## Mejoras técnicas posibles
- **Publicar las reglas reforzadas** (hechas y probadas el 2026-10-06, sin publicar): solo cuando el usuario lo pida y anotándolo en docs/14. Quedan abiertas a propósito `deletedAt` inverso y exigir consentimiento para escribir consultas (hoy lo exige solo la app).
- Dependencias (revisadas el 2026-10-06): se quitaron `expo-image`, `expo-device`, `expo-status-bar` y `expo-web-browser` (solo las declaraba `mobile`, ningún código ni configuración las usaba; el autolinking nativo solo perdió esos módulos). **Se conservan a propósito**: `expo-symbols`, `expo-glass-effect` y `@expo/ui` (las trae `expo-router` y declararlas aquí asegura que el autolinking de pnpm las encuentre), `expo-linking` y `expo-constants` (peers obligatorios de `expo-router`), y `react-native-reanimated`, `react-native-worklets`, `react-native-gesture-handler`, `react-dom` y `react-native-web` (peers opcionales de `expo-router`; sin tocar sin una prueba completa en dispositivo). Las tres bibliotecas nativas quitadas desaparecen de la app en la próxima recompilación; la app ya instalada sigue funcionando.
- `npx expo-doctor` avisa de 8 paquetes con versión nueva disponible (`expo install --check`): actualizar en una tarea aparte, con prueba en simulador e iPhone.
- Quitar o conservar los `console.warn` de diagnóstico (F012 y F016).
- Proyecto Firebase propio de MediQ (región, plan, datos): docs/14.
- Publicar la app: cuenta de pago de Apple Developer y verificación de Google para usuarios reales.

## Entorno
- El repo vive en un disco externo (`/Volumes/Macbook EHD`). Si se desconecta, la sesión pierde la carpeta: reconectar y revisar con `git status` y `git fsck` (el 2026-10-06 ocurrió y no se perdió nada).
- Compilar iOS: copia sin espacios `~/mediq-build` (docs/solucion-de-problemas.md §1.1, §3.19, §3.22, §3.23); dejar ≥10 GB libres en el disco interno.
- Tras agregar casos de uso o rutas hay que reiniciar la app (el contenedor se crea una vez): §3.17. Metro necesita `--clear` al cambiar `.env.local`.
- Toda publicación fuera del repo se anota en docs/14 y solo cuando el usuario la pide.
