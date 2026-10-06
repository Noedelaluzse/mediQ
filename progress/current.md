# Estado actual (2026-10-06)

`features.json`: F000–F018 y F020 (búsqueda) hechas; solo F019 (versión Release) queda pendiente a propósito. Lo que queda son verificaciones del usuario, decisiones y mejoras.

## Al terminar todo el desarrollo: preparar la versión Release (F019 en features.json, pendiente acordado el 2026-10-06)
La app instalada hoy en el iPhone es de **desarrollo** (Debug): no lleva el código dentro y lo descarga de Metro, así que solo funciona con el Mac encendido, Metro corriendo y la misma red Wi-Fi. Si se cierra del todo mientras Metro no responde, se queda en el logo (le pasó al usuario el 2026-10-06; no es un fallo de la app).
- Compilar una versión **Release** (JavaScript incluido, sin Metro): `expo run:ios --configuration Release --device <UDID>` desde la copia sin espacios (docs/solucion-de-problemas.md §1.1, §3.19, §3.22, §3.23).
- Antes: las variables `EXPO_PUBLIC_*` (`.env.local`) se incrustan al empaquetar, así que deben estar bien en ese momento; revisar los `console.warn` de diagnóstico (F012 y F016); correr `version:generate` para que la versión de Perfil sea la correcta; ≥10 GB libres en el disco interno.
- Con la cuenta gratuita de Apple Developer la app firmada **caduca a los 7 días** (habrá que reinstalarla). Para que no caduque y para publicar en la App Store hace falta la cuenta de pago.
- Hay que volver a iniciar sesión con Google tras instalar, y probar la cámara y las escrituras (cuenta, médico, lugar) en el teléfono real.
- Decisiones por tomar entonces: si se publica en TestFlight/App Store, el proyecto Firebase propio de MediQ (docs/14) y la verificación de Google para usuarios reales.

## Verificación del usuario en el iPhone (app instalada: mediQ 1.20.15, compilación 37)
- Iniciar sesión de nuevo con Google (la reinstalación borra la sesión).
- Ver el icono nuevo y la pantalla de carga; ver el login con el logo nuevo (cerrando sesión desde Perfil).
- Probar la **cámara** («Tomar foto» en la receta) y el flujo «sin permiso» (Ajustes → mediQ → Cámara); el simulador no tiene cámara.
- Probar medicamentos de la receta y el borrador automático (SQLite) en el teléfono real (en el simulador no se pudo teclear, docs/solucion-de-problemas.md §3.18).

## Decisiones del usuario
- Siguiente funcionalidad: recordatorios de toma (RF-32), cola de envío sin red (RNF-11; hoy una foto que falla solo se informa) o aviso de próxima cita (RF-40). La búsqueda (F020) ya está; probarla en el iPhone y decidir si debe incluir también motivo y «lo que me dijo» (hoy no, a petición del usuario).
- Dónde más mostrar el logo: el Diario hoy muestra solo el texto «MediQ» (docs/15).
- Dudas de F012 sin responder: botón «Eliminar consulta» al final del formulario de edición; no se pueden quitar indicaciones ya creadas; no hay pantalla para recuperar consultas eliminadas.
- Confirmar en la consola de Firebase la alerta de presupuesto de Blaze.

## Mejoras técnicas posibles
- Reglas reforzadas **publicadas el 2026-10-06** (docs/14). Falta probar en el teléfono las escrituras de cuenta/médico/lugar; si algo falla, reversa con `git show 4a9ba73^:firebase/firestore.rules`. Quedan abiertas a propósito `deletedAt` inverso y exigir consentimiento para escribir consultas (hoy lo exige solo la app).
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
