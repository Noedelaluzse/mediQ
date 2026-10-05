# 14. Publicar en Firebase y montar el proyecto propio de MediQ

Este capítulo tiene tres partes: **cómo se publica** lo que vive fuera del repo, el **registro de cada publicación** que se ha hecho, y la **lista de pasos para replicarlo** cuando se cree el proyecto de Firebase propio de MediQ.

> **Regla del proyecto:** todo lo que se publique fuera del repo (reglas de Firestore hoy; Storage, índices o funciones mañana) se anota en el [registro](#2-registro-de-publicaciones) en el mismo momento. Lo que no está anotado no se puede replicar.

## 1. Qué se publica y cómo

Hoy MediQ solo publica **las reglas de Firestore** (`firebase/firestore.rules`). La app en sí se instala desde el repo (Metro y compilaciones nativas); no hay Cloud Functions ni Storage (requieren el plan Blaze y se descartaron por ahora; Storage llegará con las fotos de recetas, RF-30).

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
- Si falla con `Your project … must be on the Blaze plan`, se está intentando publicar algo que no son reglas (funciones o Storage).

### Qué NO se publica con este comando
Nada de la app móvil. Cambiar código solo exige reiniciar Metro; agregar un paquete nativo exige recompilar la app (ver `docs/solucion-de-problemas.md` §1 y §3.14).

## 2. Registro de publicaciones

Cada fila es una publicación real. Añade una nueva al final cada vez.

| Fecha | Proyecto | Qué se publicó | Motivo | Cómo se comprobó |
| --- | --- | --- | --- | --- |
| 2026-10-04 · F002–F003 | `nuvia-dev-5ddce` | Reglas amplias: el dueño (`request.auth.uid == uid`) lee y escribe bajo `mediq_users/{uid}/{document=**}` | Guardar cuenta, perfil propio y consentimientos | Login real y escritura en Firestore |
| 2026-10-05 · F009 (PR #19) | `nuvia-dev-5ddce` | Reglas **por colección** (`patients`, `consents`, `places`, `doctors`, `visits`) y validación de `visits` (campos y tipos, fecha no futura con 5 min de tolerancia, próxima cita posterior) | Guardar consultas con una segunda barrera de validación | `deploy` compiló; en el simulador una consulta válida se guardó (Consultas 1 → 2) |
| 2026-10-05 · F011 (PR #23) | `nuvia-dev-5ddce` | Validación de `visits/{id}/instructions/{id}` (`sortOrder` entero, `body` 1–300, `doneAt` nulo o fecha, sin campos extra); `prescriptions` sigue con acceso del dueño | Lista marcable de indicaciones | `deploy` compiló; 43 pruebas del emulador; consulta con indicaciones guardada desde el simulador (publicada desde la rama del PR, archivo idéntico) |

## 3. Replicar todo en el proyecto propio de MediQ

Hoy MediQ vive en el proyecto de pruebas `nuvia-dev-5ddce`, compartido con otra app. Antes de tener usuarios reales hay que crear el proyecto propio. **Los datos y las cuentas no se migran solos**: es un proyecto nuevo y vacío.

### 3.1 Decisiones previas (no se pueden deshacer)
- **Región de Firestore** (y de Storage): **no se puede cambiar después de crearlos.** Decidirla con el asesor legal (capítulo 12).
- **Plan Blaze:** necesario para Storage (fotos de recetas, RF-30) y para cualquier Cloud Function. Activarlo con alertas de presupuesto antes de tener usuarios reales.
- **Nombre e id del proyecto:** el id es permanente.

### 3.2 Crear el proyecto (consola de Firebase)
1. Crear el proyecto (sin Google Analytics, salvo decisión contraria).
2. **Authentication → Método de acceso → Google:** activarlo y poner el correo de soporte.
3. **Firestore Database → Crear base de datos** en **modo nativo**, con la región decidida (arranca con reglas de bloqueo total; se publican las propias en el paso 3.5).
4. **Configuración del proyecto → Tus apps → iOS:** registrar la app con el bundle id **`com.michysoft.mediq`** (ídem Android: paquete `com.michysoft.mediq` cuando se haga). Descargar `GoogleService-Info.plist` **solo para copiar valores; no se sube al repo**.

### 3.3 Variables de entorno (`apps/mobile/.env.local`, ignorado por git)
Plantilla en `apps/mobile/.env.example`. De dónde sale cada valor:

| Variable | De dónde |
| --- | --- |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | `API_KEY` del `GoogleService-Info.plist` |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | `PROJECT_ID` (id del proyecto) |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | `GOOGLE_APP_ID` |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | `CLIENT_ID` del plist (termina en `.apps.googleusercontent.com`) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Authentication → Google → configuración del SDK web → *ID de cliente web* (o en Google Cloud → Credenciales, "Web client (auto created by Google Service)") |

**Nunca** subir claves secretas, el plist ni cuentas de servicio al repo. Los ids de cliente de Google no son secretos, pero tampoco se versionan.

### 3.4 Google Cloud (pantalla de consentimiento)
- Mientras la pantalla de consentimiento de OAuth esté en modo **Testing**, solo entran los correos agregados como *usuarios de prueba* (si no: "Acceso bloqueado / app no verificada"). Para usuarios reales hay que **publicarla** (y pasar la verificación de Google si se piden permisos sensibles).
- El esquema de URL para volver de Google a la app se genera del `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` en `app.config.ts`: **cambiar de proyecto implica recompilar la app nativa** (no basta reiniciar Metro).

### 3.5 Publicar las reglas y comprobar
1. Iniciar sesión de la CLI con la cuenta dueña del proyecto nuevo (`npx --yes firebase-tools@13 login`).
2. `pnpm --filter mobile test:emulator` (todas verdes).
3. `npx --yes firebase-tools@13 deploy --only firestore:rules --project <id-nuevo>` (ver la parte 1) y **anotar la fila en el registro**.
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
