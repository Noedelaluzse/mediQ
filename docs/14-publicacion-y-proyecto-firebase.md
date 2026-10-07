# 14. Publicar en Firebase y montar el proyecto propio de MediQ

Este capítulo tiene tres partes: **cómo se publica** lo que vive fuera del repo, el **registro de cada publicación** que se ha hecho, y la **lista de pasos para replicarlo** cuando se cree el proyecto de Firebase propio de MediQ.

> **Regla del proyecto:** todo lo que se publique fuera del repo (reglas de Firestore hoy; Storage, índices o funciones mañana) se anota en el [registro](#2-registro-de-publicaciones) en el mismo momento. Lo que no está anotado no se puede replicar.

## 1. Qué se publica y cómo

MediQ publica **las reglas de Firestore** (`firebase/firestore.rules`) y, desde F016, **las reglas de Storage** (`firebase/storage.rules`). La app en sí se instala desde el repo (Metro y compilaciones nativas); no hay Cloud Functions. Storage exige el plan **Blaze** (activado para las fotos de recetas, RF-30).

### Publicar las reglas de Firestore

Qué hace: **reemplaza todo el conjunto de reglas** del proyecto por el contenido de `firebase/firestore.rules`. Hasta publicarlas, Firestore sigue con las reglas anteriores aunque el código nuevo ya esté en la app.

```bash
# 1) Comprobar que la CLI está con la cuenta correcta (no hay `firebase` instalado: se usa npx, la misma versión que las pruebas)
npx --yes firebase-tools@13 login:list
npx --yes firebase-tools@13 projects:list

# 2) Probar las reglas con el emulador ANTES de publicar (deben pasar todas)
pnpm --filter mobile test:emulator

# 3) Publicar (el proyecto se pasa con --project; no hay .firebaserc)
npx --yes firebase-tools@13 deploy --only firestore:rules --project <id-del-proyecto>
```

Resultado esperado: `rules file firebase/firestore.rules compiled successfully` y `released rules … to cloud.firestore`. La CLI valida la sintaxis antes de subir.

Precauciones:
- **Es del proyecto completo, no solo de MediQ.** En el proyecto de pruebas compartido con otra app (Nuvia) está vacío de datos de Nuvia, por eso fue seguro. Antes de publicar en un proyecto que tenga otras reglas, revisarlas en la consola de Firebase (Firestore → Reglas) y fusionarlas.
- **Publicar desde `main`** (o desde la rama del PR si el archivo ya está probado y es idéntico). Si cambia antes de fusionar, volver a publicar.
- **Comprobar con una escritura real** desde la app (guardar una consulta) y mirar que no salga `permission-denied`.
- Si se agrega una colección nueva al modelo, **hay que listarla en las reglas** (las reglas se suman: un comodín general anularía las validaciones) y en `ARBOL_DE_CUENTA` (`modules/auth/infrastructure/eliminarSubarbol.ts`). Ver capítulo 11.
- Si falla con `Your project … must be on the Blaze plan`, falta activar Blaze (Storage y funciones lo exigen; las reglas de Firestore no).

### Publicar las reglas de Storage (F016)

```bash
pnpm --filter mobile test:emulator     # incluye el emulador de Storage
npx --yes firebase-tools@13 deploy --only storage --project <id-del-proyecto>
```

Resultado esperado: `firebase.storage: rules file firebase/storage.rules compiled successfully` y `released rules … to firebase.storage`. Requisitos previos (se hacen **a mano en la consola**, una vez): plan Blaze con alerta de presupuesto, y *Storage → Comenzar* en modo producción con la **región decidida** (no se puede cambiar). Mientras no se publiquen, un bucket nuevo bloquea todo y la app no puede subir fotos. Comprobar con una foto real desde la app y mirar que no salga `storage/unauthorized`. Las reglas de Storage no se mezclan con las de Firestore: cada servicio tiene las suyas.

### Qué NO se publica con este comando
Nada de la app móvil. Cambiar código solo exige reiniciar Metro; agregar un paquete nativo exige recompilar la app (ver `docs/solucion-de-problemas.md` §1 y §3.14).

## 2. Registro de publicaciones

Cada fila es una publicación real. Añade una nueva al final cada vez.

| Fecha | Proyecto | Qué se publicó | Motivo | Cómo se comprobó |
| --- | --- | --- | --- | --- |
| 2026-10-04 · F002–F003 | `nuvia-dev-5ddce` | Reglas amplias: el dueño (`request.auth.uid == uid`) lee y escribe bajo `mediq_users/{uid}/{document=**}` | Guardar cuenta, perfil propio y consentimientos | Login real y escritura en Firestore |
| 2026-10-05 · F009 (PR #19) | `nuvia-dev-5ddce` | Reglas **por colección** (`patients`, `consents`, `places`, `doctors`, `visits`) y validación de `visits` (campos y tipos, fecha no futura con 5 min de tolerancia, próxima cita posterior) | Guardar consultas con una segunda barrera de validación | `deploy` compiló; en el simulador una consulta válida se guardó (Consultas 1 → 2) |
| 2026-10-05 · F011 (PR #23) | `nuvia-dev-5ddce` | Validación de `visits/{id}/instructions/{id}` (`sortOrder` entero, `body` 1–300, `doneAt` nulo o fecha, sin campos extra); `prescriptions` sigue con acceso del dueño | Lista marcable de indicaciones | `deploy` compiló; 43 pruebas del emulador; consulta con indicaciones guardada desde el simulador (publicada desde la rama del PR, archivo idéntico) |
| 2026-10-05 · F017 + F016 | `nuvia-dev-5ddce` | **Storage (primera vez):** `storage.rules` (dueño lee/borra bajo `mediq_users/{uid}`; crear exige `image/*` de 1 byte a 5 MB). **Firestore:** `prescriptions/{id}` con forma validada (`items` lista de máx. 20) y `attachments/{id}` validado (`storagePath`, `mimeType` = `image/jpeg`, `sizeBytes` ≤ 5 MB, sin campos extra) | Receta con medicamentos (F017) y foto de la receta (F016). Antes de publicar, un bucket recién creado bloquea todo: la subida falló con `storage/unauthorized` | `deploy --only firestore:rules,storage` compiló y publicó ambas; 77 pruebas del emulador (Firestore + Storage); foto subida desde el simulador (ver el informe de F016) |
| 2026-10-06 · reglas reforzadas (PR #33) | `nuvia-dev-5ddce` | **Firestore:** validación de forma en el documento del usuario, `patients` (`isSelf` atado al id `self`), `consents` (recibo inmutable: solo crear, id `documento_versión`, `acceptedAt` = hora del servidor), `places` y `doctors` | Cerrar los huecos que `docs/11` marcaba como pendientes: esas colecciones aceptaban cualquier cosa del dueño | `deploy --only firestore:rules` compiló y publicó; 101 pruebas del emulador (con los repositorios reales de cuenta y consentimiento); en el simulador con Firebase real la app carga cuenta, diario y médicos con las reglas nuevas (las escrituras de cuenta, médico y lugar quedan por probar en el teléfono: no se pudo teclear en el simulador). Reversa: reglas anteriores = `git show 4a9ba73^:firebase/firestore.rules` |
| 2026-10-06 · F024 (PR #42) | `nuvia-dev-5ddce` | **Firestore:** colección nueva `medicationSchedules/{consultaId}_{indice}` (recordatorios de toma) con validación de forma: solo `visitId`, `itemIndex` (0–19), `medicationName`, `dose?`, `frequency`, `firstDoseTime` (`HH:mm`), `startsAt`, `endsAt` (> `startsAt`), fechas; el dueño lee y borra | Recordatorios de toma (RF-32): sin estas reglas, guardar una receta con aviso fallaba con `Missing or insufficient permissions` | `deploy --only firestore:rules` compiló y publicó; 113 pruebas del emulador (incluido el flujo completo receta → recordatorio → avisos); en el simulador con Firebase real el Diario dejó de registrar el error de permisos al sincronizar. Reversa: `git show 327a4e1^1:firebase/firestore.rules` |
| 2026-10-06 · F027 (PR #46) | `nuvia-dev-5ddce` | **Firestore:** colección nueva `doseLogs/{tomaId}` (dosis marcada como tomada) con validación de forma: solo `visitId`, `itemIndex` (0–19), `medicationName`, `dose?`, `scheduledFor`, `takenAt`, `createdAt`; el dueño lee, escribe y borra | Botón «Ya la tomé» del aviso de toma (RF-32): sin estas reglas, guardar la dosis fallaba con `Missing or insufficient permissions` | `deploy --only firestore:rules` compiló y publicó (`released rules … to cloud.firestore`) desde `main` (archivo idéntico al probado); 122 pruebas del emulador (7 de doseLogs: forma, otro usuario, doble registro). Falta la prueba real con el botón en el iPhone. Reversa: `git show e1b9e94:firebase/firestore.rules` |
| 2026-10-06 · F028 (PR #48) | `nuvia-dev-5ddce` | **Firestore:** reglas de `patients` ampliadas con los datos de salud: `birthDate` (formato `AAAA-MM-DD`), `sex` (`female`/`male`/`other`/`undisclosed`), `bloodType` (`A+`…`O-` o `unknown`), `allergies` y `drugAllergies` (listas de hasta 30), `noKnownAllergies` y `noKnownDrugAllergies` (booleanos; «ninguna conocida» no puede convivir con una lista no vacía) | «Mi salud» del Perfil (RF-02): sin estas reglas, guardar fallaba con `Missing or insufficient permissions` | `deploy --only firestore:rules` compiló y publicó (`released rules … to cloud.firestore`) desde `main` (archivo idéntico al probado); 132 pruebas del emulador (10 de datos de salud: guardar y leer, quitar un dato, formato, catálogos, máximo de 30, ninguna-conocida, otro usuario). Falta la prueba real de «Guardar» en el iPhone. Reversa: `git show 20722eb:firebase/firestore.rules` |
| 2026-10-06 · consola (sin PR) | `nuvia-dev-5ddce` | **Consola de Firebase / Google Cloud:** alerta de presupuesto del plan Blaze configurada y confirmada por el usuario | Storage (fotos de recetas, F016) exige Blaze; la alerta evita una factura inesperada (riesgo del capítulo 12) | Confirmado por el usuario en la consola. **Los montos y umbrales no se anotaron en el repo**: al replicar en el proyecto propio hay que definirlos de nuevo (sección 3.1) |
| 2026-10-06 · F031 + F033 (PR #54 y #57) | `nuvia-dev-5ddce` | **Firestore:** regla `consentimientoAceptado`: crear o editar consultas (`visits`) y sus indicaciones, receta y foto exige que existan los recibos `consents/aviso_privacidad_2026-10-06` y `consents/terminos_2026-10-06` de la cuenta; borrar no lo exige | Consentimiento obligatorio también en el servidor (antes solo lo exigía la app); los textos legales ya estaban redactados (F033) y la cuenta del usuario los aceptó | `deploy --only firestore:rules` compiló y publicó (`released rules … to cloud.firestore`) desde `main` (archivo idéntico al probado); 143 pruebas del emulador (10 de la regla: sin consentimiento, con uno solo, de otra cuenta, versión más nueva, editar, lote de 30 indicaciones, indicaciones y receta, borrar); antes de publicar, el simulador abrió el Diario sin «Antes de empezar», señal de que la cuenta tiene los recibos de la versión actual. **Falta la prueba real: guardar una consulta nueva desde la app.** Reversa: `git show bf09f4b:firebase/firestore.rules` |
| 2026-10-07 · F037 (PR #66) | `nuvia-dev-5ddce` | **Storage:** crear o editar archivos solo si son `image/jpeg` de 1 byte a 5 MB y están en la ruta exacta `mediq_users/{uid}/visits/{consultaId}/receta.jpg` (antes: cualquier `image/*` en cualquier subruta del usuario); leer y borrar siguen siendo del dueño en toda su carpeta | Cerrar el hallazgo #4 de la auditoría BOLA (`docs/generado/seguridad-bola.md`): PNG y SVG y rutas ajenas a la receta | `deploy --only storage` compiló y liberó las reglas (`released rules … to firebase.storage`); 146 pruebas del emulador en verde, 3 nuevas de F037. Publicada desde la rama del PR (archivo idéntico). En el iPhone (2026-10-07) se tomó una foto con la cámara y se subió bien; falta confirmar «quitar» la foto |
| 2026-10-07 · F038 (PR #69) | `nuvia-dev-5ddce` | **Firestore:** regla de `visits/{id}/prescriptions/{id}/attachments/{id}`: `storagePath` debe ser exactamente `mediq_users/{uid}/visits/{consultaId}/receta.jpg` (antes: cualquier texto de hasta 300 caracteres) | Cerrar el hallazgo #2 de la auditoría BOLA (`docs/generado/seguridad-bola.md`): un documento no puede apuntar al archivo de otra persona ni de otra consulta | Publicada por el usuario con `deploy --only firestore:rules` desde la rama del PR (archivo idéntico): compiló y liberó las reglas. 148 pruebas del emulador en verde, 2 nuevas de F038. **Pendiente:** poner, ver y quitar la foto de una receta en el iPhone |
| 2026-10-07 · F041 (PR #71) | `nuvia-dev-5ddce` | **Firestore:** las referencias cruzadas deben existir en la misma cuenta: `visits.patientId` → `patients`, `visits.placeId` → `places`, `visits.doctorId` → `doctors`, y `visitId` de `medicationSchedules` y `doseLogs` → `visits` (`exists()` con el uid de la ruta; id sin «/»; al editar solo se revisa el campo que cambia). Publicada **junto con F042** en un solo `deploy` | Cerrar el hallazgo #1 de la auditoría BOLA (`docs/generado/seguridad-bola.md`) y preparar la fase 3 | Publicada por el usuario con `deploy --only firestore:rules` desde la rama de F042 (incluye ambos cambios): compiló y liberó las reglas. 157 pruebas del emulador en verde (5 nuevas de F041). **Pendiente:** capturar una consulta con médico y lugar nuevos, editarla, eliminar un lugar y marcar «Ya la tomé» en el iPhone |
| 2026-10-07 · F042 (PR #72) | `nuvia-dev-5ddce` | **Firestore:** regla `googleSubDelToken`: el `googleSub` del documento `mediq_users/{uid}` debe ser igual a `request.auth.token.firebase.identities['google.com'][0]` (el correo no se compara) | Cerrar el hallazgo #5 de la auditoría BOLA: que nadie guarde un ID de Google ajeno | Verificado antes con una sesión real en el iPhone (el token trae la identidad y coincide con el `googleSub` que guarda la app); `deploy` compiló y liberó las reglas; 3 pruebas nuevas del emulador. **Pendiente:** cerrar sesión e iniciar con Google en el iPhone (si falla: `docs/solucion-de-problemas.md` §3.33) |

## 3. Replicar todo en el proyecto propio de MediQ

Hoy MediQ vive en el proyecto de pruebas `nuvia-dev-5ddce`, compartido con otra app. Antes de tener usuarios reales hay que crear el proyecto propio. **Los datos y las cuentas no se migran solos**: es un proyecto nuevo y vacío.

### 3.1 Decisiones previas (no se pueden deshacer)
- **Región de Firestore** (y de Storage): **no se puede cambiar después de crearlos.** Decidirla con el asesor legal (capítulo 12).
- **Plan Blaze:** necesario para Storage (fotos de recetas, RF-30) y para cualquier Cloud Function. Activarlo con alertas de presupuesto antes de tener usuarios reales (en el proyecto de pruebas la alerta ya está configurada, 2026-10-06).
- **Nombre e id del proyecto:** el id es permanente.

### 3.2 Crear el proyecto (consola de Firebase)
1. Crear el proyecto (sin Google Analytics, salvo decisión contraria).
2. **Authentication → Método de acceso → Google:** activarlo y poner el correo de soporte.
3. **Firestore Database → Crear base de datos** en **modo nativo**, con la región decidida (arranca con reglas de bloqueo total; se publican las propias en el paso 3.5).
4. **Configuración del proyecto → Tus apps → iOS:** registrar la app con el bundle id **`com.michysoft.mediq`** (ídem Android: paquete `com.michysoft.mediq` cuando se haga). Descargar `GoogleService-Info.plist` **solo para copiar valores; no se sube al repo**.

5. **Plan Blaze y Storage (F016):** *Uso y facturación* → plan Blaze con **presupuesto y alertas**; después *Storage → Comenzar* en **modo producción** y con la **misma región que Firestore** (no se puede cambiar). El bucket queda como `<id>.firebasestorage.app`.

### 3.3 Variables de entorno (`apps/mobile/.env.local`, ignorado por git)
Plantilla en `apps/mobile/.env.example`. De dónde sale cada valor:

| Variable | De dónde |
| --- | --- |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | `API_KEY` del `GoogleService-Info.plist` |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | `PROJECT_ID` (id del proyecto) |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | `GOOGLE_APP_ID` |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | `STORAGE_BUCKET` del plist, o `firebase apps:sdkconfig IOS <appId> --project <id>`; con Storage activado termina en `.firebasestorage.app`. Sin él las fotos no se guardan en la nube |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | `CLIENT_ID` del plist (termina en `.apps.googleusercontent.com`) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Authentication → Google → configuración del SDK web → *ID de cliente web* (o en Google Cloud → Credenciales, "Web client (auto created by Google Service)") |

**Nunca** subir claves secretas, el plist ni cuentas de servicio al repo. Los ids de cliente de Google no son secretos, pero tampoco se versionan.

### 3.4 Google Cloud (pantalla de consentimiento)
- Mientras la pantalla de consentimiento de OAuth esté en modo **Testing**, solo entran los correos agregados como *usuarios de prueba* (si no: "Acceso bloqueado / app no verificada"). Para usuarios reales hay que **publicarla** (y pasar la verificación de Google si se piden permisos sensibles).
- El esquema de URL para volver de Google a la app se genera del `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` en `app.config.ts`: **cambiar de proyecto implica recompilar la app nativa** (no basta reiniciar Metro).

### 3.5 Publicar las reglas y comprobar
1. Iniciar sesión de la CLI con la cuenta dueña del proyecto nuevo (`npx --yes firebase-tools@13 login`).
2. `pnpm --filter mobile test:emulator` (todas verdes).
3. `npx --yes firebase-tools@13 deploy --only firestore:rules,storage --project <id-nuevo>` (ver la parte 1) y **anotar una fila por cada publicación en el registro**.
4. Recompilar e instalar la app (`docs/solucion-de-problemas.md` §1.1; antes del `rsync` correr `pnpm --filter mobile version:generate`), iniciar sesión y guardar una consulta de prueba.

### 3.6 Después
- Quitar del repo las menciones al proyecto de pruebas (`.env.example` dice "Hoy apuntan al proyecto Firebase nuvia-dev") y marcar la tarea de `docs/13-roadmap.md`.
- Sembrar `mediq_specialties` solo si se decide pasar el catálogo de especialidades a Firestore (hoy está en `shared/kernel/especialidades.ts`).
- Alertas de presupuesto y cuotas; respaldos con retención corta (RNF-07, capítulo 12).
- Revisar el plan B de revocación de sesiones (capítulo 10).

### Resumen en una pantalla
```
Decidir región y plan ─► Crear proyecto ─► Auth Google + Firestore (nativo)
        ─► Registrar app iOS (com.michysoft.mediq) ─► copiar valores a .env.local
        ─► Consent screen ─► emulador (verde) ─► deploy de reglas ─► anotar en el registro
        ─► recompilar app ─► probar con una consulta real
```
