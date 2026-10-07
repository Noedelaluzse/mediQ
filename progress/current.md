# Estado actual (2026-10-06)

`features.json`: F000–F018 y F020–F033 hechas (búsqueda, aviso de próxima cita, quitar «Tipo de médico», receta con listas y recordatorios de toma); solo F019 (versión Release) queda pendiente a propósito. Lo que queda son verificaciones del usuario, decisiones y mejoras.

## Cola de envío sin red (F030): hecha, sin reglas que publicar; REQUIERE la app recompilada
- La app del iPhone debe **recompilarse** (módulo nativo `@react-native-community/netinfo`); sin eso falla al arrancar. Procedimiento: docs/solucion-de-problemas.md §1.1 y §3.23.
- Probar en el iPhone (modo avión): capturar una consulta nueva → «Guardada en tu teléfono» y aparece arriba del Diario como «Pendiente de enviar» con la franja «Sin conexión»; quitar el modo avión → se envía sola (franja «Enviando…», luego la tarjeta pasa al diario). Con modo avión también: abrir el Diario ya visto (se lee desde la copia), elegir un médico guardado al capturar. Cerrar sesión con una consulta sin enviar debe advertirlo.
- Límites: solo consultas nuevas (editar, eliminar, médicos, lugares, recetas, fotos, Mi salud y «Ya la tomé» sin internet pueden quedarse esperando); el detalle de una consulta y la tarjeta «Hoy» no tienen copia; una consulta por enviar no se abre ni se edita (solo se descarta).
- Posibles mejoras: mostrar la hora del último guardado en la franja. (Cola para editar, reintento manual y copia del detalle: ver F032 y «Ideas descartadas».)

## Tarjeta «Hoy» del Diario (F029): hecha, sin reglas que publicar
- Probar en el iPhone (con una receta con aviso activo): en el Diario debe aparecer «Hoy» bajo la próxima cita; tocarla despliega las tomas; «Ya la tomé» marca (aun antes de la hora: no debe llegar su aviso ni la insistencia); la palomita deshace; marcar desde el aviso (botón) y volver a la app debe verse en la tarjeta.
- Límites: no se recorren los demás horarios al tomar fuera de hora (decidido); no hay «omitida a propósito» (una toma sin marcar queda «Atrasada» todo el día); solo hoy, sin historial (queda para después).

## Mi salud en el Perfil (F028): hecha, reglas publicadas el 2026-10-06 (docs/14)
- Si «Guardar» falla, la reversa de las reglas es `git show 20722eb:firebase/firestore.rules`.
- Probar en el iPhone: Perfil → ver el aviso y la tarjeta; «Llenar» → elegir fecha (sale la edad), sexo, sangre, agregar alergias (se pueden quitar con la X), marcar «No tengo alergias conocidas» (vacía la lista); Guardar → el aviso baja de «Te faltan 5» y al completar todo desaparece y el puntito de la pestaña Perfil se va.
- Decisiones mías que el usuario no confirmó (propuestas en el chat): alergias como etiquetas libres, puntito en la pestaña. (La nota verde de «completa» el usuario la quiso solo como aviso temporal de ~5 s al completar los datos: ajustado el 2026-10-06.).
- Detalle: al «Elegir fecha» se propone la de hace 30 años para ajustarla con el selector.

## Botones del aviso de toma (F027): hecha, reglas publicadas el 2026-10-06 (docs/14)
- Si «Ya la tomé» falla al guardar, la reversa de las reglas es `git show e1b9e94:firebase/firestore.rules`.
- Probar en el iPhone: activar un aviso de toma a 2–3 minutos; al llegar, mantener presionada la alerta (o deslizarla) y ver los botones. «Ya la tomé»: abre la app, sale «Anotado» y a los 5 minutos NO llega la insistencia. «Recordar en 5 min»: sale «Te avisaremos en 5 minutos» y llega otro aviso. Sin tocar nada: a los 5 minutos llega «¿Ya tomaste tu medicamento?». Tocar el cuerpo de la alerta abre la consulta y quita la insistencia.
- Límites: los botones abren la app un instante a propósito (iOS no garantiza que el código corra con la app cerrada); la categoría con botones solo se ve en iOS con el aviso programado por la app; las dosis tomadas no se ven todavía en ninguna pantalla (queda la vista «Hoy»).

## Recordatorios de toma (F024): hecha, reglas publicadas el 2026-10-06 (docs/14)
- Si algo falla al guardar una receta con aviso, la reversa de las reglas es `git show 327a4e1^1:firebase/firestore.rules`.
- Probar en el iPhone tras recompilar: activar «Avisarme para tomarlo» (se pide el permiso), elegir la hora y guardar; para ver un aviso sin esperar, poner la primera toma dentro de 2 minutos con «Cada 24 horas»; tocarlo abre la consulta; comprobar que al quitar el aviso o eliminar la consulta ya no llega.
- Límite conocido: iOS admite 64 avisos programados; las tomas usan hasta 40 y se rellenan al abrir la app. Si la app no se abre en varios días, los avisos más lejanos no estarán programados todavía.
- Pendiente de decidir: registrar si se tomó cada dosis (`doseLogs`) y una vista «Hoy».

## Receta con listas (F023): hecha
- Probar en el iPhone: abrir una consulta → Agregar receta → escribir el nombre, elegir el resto y guardar; luego Editar receta y comprobar que se ve lo guardado. Con una receta guardada antes de las listas, comprobar que dosis, vía, frecuencia y duración antiguas se ven en modo texto y no se pierden.
- Detalle a revisar: el mensaje de error de un medicamento inválido todavía habla de «60 caracteres», cosa que ya casi no aplica con las listas.

## Al terminar todo el desarrollo: preparar la versión Release (F019 en features.json, pendiente acordado el 2026-10-06)
La app instalada hoy en el iPhone es de **desarrollo** (Debug): no lleva el código dentro y lo descarga de Metro, así que solo funciona con el Mac encendido, Metro corriendo y la misma red Wi-Fi. Si se cierra del todo mientras Metro no responde, se queda en el logo (le pasó al usuario el 2026-10-06; no es un fallo de la app).
- Compilar una versión **Release** (JavaScript incluido, sin Metro): `expo run:ios --configuration Release --device <UDID>` desde la copia sin espacios (docs/solucion-de-problemas.md §1.1, §3.19, §3.22, §3.23).
- Antes: las variables `EXPO_PUBLIC_*` (`.env.local`) se incrustan al empaquetar, así que deben estar bien en ese momento; correr `version:generate` para que la versión de Perfil sea la correcta; ≥10 GB libres en el disco interno.
- Con la cuenta gratuita de Apple Developer la app firmada **caduca a los 7 días** (habrá que reinstalarla). Para que no caduque y para publicar en la App Store hace falta la cuenta de pago.
- Hay que volver a iniciar sesión con Google tras instalar, y probar la cámara y las escrituras (cuenta, médico, lugar) en el teléfono real.
- Decisiones por tomar entonces: si se publica en TestFlight/App Store, el proyecto Firebase propio de MediQ (docs/14) y la verificación de Google para usuarios reales.

## Verificación del usuario en el iPhone (app instalada: mediQ 1.20.15, compilación 37; F021 exige recompilar: lleva `expo-notifications`)
- **Avisos de cita (F021):** guardar una consulta con próxima cita → aceptar el permiso → comprobar que llegan el aviso de la víspera (9:00) y el de 2 horas antes, y que tocarlo abre la consulta; probar también negar el permiso (aviso con «Abrir Ajustes»), y que al quitar la cita o cerrar sesión ya no llega. Para ver uno sin esperar, poner una cita para dentro de ~2 horas y 5 minutos.
- Iniciar sesión de nuevo con Google (la reinstalación borra la sesión).
- Ver el icono nuevo y la pantalla de carga; ver el login con el logo nuevo (cerrando sesión desde Perfil).
- Probar la **cámara** («Tomar foto» en la receta) y el flujo «sin permiso» (Ajustes → mediQ → Cámara); el simulador no tiene cámara.
- Probar medicamentos de la receta y el borrador automático (SQLite) en el teléfono real (en el simulador no se pudo teclear, docs/solucion-de-problemas.md §3.18).

## Decisiones del usuario
- Siguiente funcionalidad: recordatorios de toma (RF-32; reutilizaría `ProgramadorDeAvisos` de F021) o cola de envío sin red (RNF-11; hoy una foto que falla solo se informa). La búsqueda (F020) ya está; probarla en el iPhone. **Buscar también en motivo y «lo que me dijo»: DESCARTADO por el usuario el 2026-10-06** (son campos de texto libre y buscar en ellos sería complicado y poco útil); la búsqueda se queda en médico, especialidad y lugar, que son campos con valores repetibles.
- Dónde más mostrar el logo: el Diario hoy muestra solo el texto «MediQ» (docs/15).
- Dudas de F012 sin responder: botón «Eliminar consulta» al final del formulario de edición; no se pueden quitar indicaciones ya creadas; no hay pantalla para recuperar consultas eliminadas.
- (Hecho el 2026-10-06 por el usuario) Alerta de presupuesto de Blaze configurada y confirmada en la consola; registrada en docs/14.

## Textos legales (F033): redactados, falta REVISIÓN LEGAL y que aceptes los nuevos
- **Un abogado debe revisar** el aviso de privacidad y los términos antes de tener usuarios reales (lista de puntos en `docs/legal/README.md`). Los redactó la IA: no es asesoría legal.
- **Tu cuenta debe aceptar los textos nuevos** (versión 2026-10-06): al abrir la app (iPhone y simulador) saldrá «Antes de empezar»; léelos y marca las dos casillas. Eso lo haces tú: es tu consentimiento.
- **Después** de aceptar y de comprobar en la consola de Firestore que tu cuenta tiene `consents/aviso_privacidad_2026-10-06` y `terminos_2026-10-06`, se puede publicar la regla de consentimiento obligatorio (F031, docs/14).
- Datos del responsable en el texto: Noe De la Luz, Cancún, Quintana Roo, México, noedelaluz06@gmail.com (si cambian, se editan en `DocumentosLegales.ts` y se sube la versión).

## Ver el detalle sin internet y no editar sin conexión (F032): hecha
- Probar en el iPhone en modo avión, tras haber abierto antes una consulta con internet: el detalle se ve (con receta e indicaciones), «Editar», «Agregar» y «Agregar receta» salen apagados con la franja «Sin conexión…»; la foto de la receta dice que no está disponible; la tarjeta «Hoy» dice que no se puede marcar. Una consulta que nunca se abrió con internet no se puede ver sin él.
- Límites: solo hay copia de las consultas que se abrieron antes (crece con las consultas vistas y se borra al cerrar sesión); la foto de la receta no se copia.

## Ideas descartadas por el usuario (no volver a proponerlas)
- **Cola de envío también para editar o eliminar consultas, médicos, lugares, recetas y Mi salud** (2026-10-06): el usuario no quiere que se pueda editar sin internet; mejor desactivar la edición y explicar por qué (F032).
- **Reintento manual de una consulta rechazada por el servidor** (2026-10-06): no le interesa.
- **Buscar en «motivo» y «lo que me dijo»** (2026-10-06): son campos de texto libre; buscar en ellos sería complicado y poco útil. La búsqueda se queda en médico, especialidad y lugar.
- **Mostrar las alergias al armar una receta** (2026-10-06): la receta la captura el paciente *después* de que el médico la dio y el médico ya conoce sus alergias; una ficha rápida para mostrar a otro médico ya existe (la tarjeta «Mi salud» del Perfil), así que sería repetir.
- **Historial de tomas de días anteriores** (2026-10-06): no resuelve algo que le pase de verdad (la tarjeta «Hoy» cubre lo diario) y cuesta una pantalla, lecturas y límites que explicar. Descartado, no aplazado.
- **`deletedAt` inverso en las reglas** (2026-10-06): se deja abierto a propósito para no cerrar la puerta a «Recuperar consulta eliminada».

## Mejoras técnicas posibles
- Reglas reforzadas **publicadas el 2026-10-06** (docs/14). Falta probar en el teléfono las escrituras de cuenta/médico/lugar; si algo falla, reversa con `git show 4a9ba73^:firebase/firestore.rules`. `deletedAt` inverso: **decidido dejarlo abierto** (2026-10-06, para poder recuperar consultas eliminadas). **Consentimiento obligatorio: hecho en el repo (F031) pero SIN PUBLICAR**; antes de publicar comprobar que tu cuenta tiene los dos recibos (docs/14, «Pendiente de publicar»).
- Dependencias (revisadas el 2026-10-06): se quitaron `expo-image`, `expo-device`, `expo-status-bar` y `expo-web-browser` (solo las declaraba `mobile`, ningún código ni configuración las usaba; el autolinking nativo solo perdió esos módulos). **Se conservan a propósito**: `expo-symbols`, `expo-glass-effect` y `@expo/ui` (las trae `expo-router` y declararlas aquí asegura que el autolinking de pnpm las encuentre), `expo-linking` y `expo-constants` (peers obligatorios de `expo-router`), y `react-native-reanimated`, `react-native-worklets`, `react-native-gesture-handler`, `react-dom` y `react-native-web` (peers opcionales de `expo-router`; sin tocar sin una prueba completa en dispositivo). Las tres bibliotecas nativas quitadas desaparecen de la app en la próxima recompilación; la app ya instalada sigue funcionando.
- Paquetes al día (F031, 2026-10-06): los 9 que avisaba `expo install --check` se actualizaron (expo 57.0.27 y compañeros); `expo-doctor` 21/21. Como hay módulos nativos (expo-sqlite, expo-notifications), **la app del iPhone debe recompilarse**.
- `console.warn` de diagnóstico: decidido (F031) que pasan a `shared/kernel/diagnostico.ts`, que solo escribe en desarrollo (nada en la app publicada). Quedó cerrado.
- **Proyecto Firebase propio de MediQ (región, plan, datos): lo hace el usuario en las consolas; los pasos y qué replicar están en docs/14, sección 3.** El agente no puede crear proyectos ni cuentas de pago.
- **Publicar la app: cuenta de pago de Apple Developer (99 USD al año) y verificación de Google para usuarios reales: trámites del usuario.** Con la cuenta de pago se puede hacer F019 (Release que no caduca a los 7 días) y TestFlight.

## Entorno
- El repo vive en un disco externo (`/Volumes/Macbook EHD`). Si se desconecta, la sesión pierde la carpeta: reconectar y revisar con `git status` y `git fsck` (el 2026-10-06 ocurrió y no se perdió nada).
- Compilar iOS: copia sin espacios `~/mediq-build` (docs/solucion-de-problemas.md §1.1, §3.19, §3.22, §3.23); dejar ≥10 GB libres en el disco interno.
- Tras agregar casos de uso o rutas hay que reiniciar la app (el contenedor se crea una vez): §3.17. Metro necesita `--clear` al cambiar `.env.local`.
- Toda publicación fuera del repo se anota en docs/14 y solo cuando el usuario la pide.

## Anotado el 2026-10-06 (F025)
- El simulador perdió la sesión de Google (la renovación silenciosa del acceso falló al abrir la app): para ver Perfil/Diario en el simulador hay que volver a iniciar sesión a mano. No es un fallo de los cambios.
