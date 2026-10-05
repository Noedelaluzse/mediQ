# 11. Modelo de datos (Firestore)

Todo dato del usuario cuelga de un único documento raíz, `mediq_users/{uid}`, donde `uid` es el identificador de Firebase Auth. Autorizar es siempre una sola regla: *solo el dueño del `uid` lee y escribe su subárbol*. No lo he ejecutado contra un proyecto real; escribe y prueba las reglas con el emulador de Firebase antes de darlas por buenas.

El prefijo `mediq_` existe porque durante el desarrollo el proyecto de Firebase se comparte con otra app. En un proyecto propio de MediQ se puede mantener o simplificar a `users`, pero conviene decidirlo antes de tener datos reales.

## Guía rápida: cómo está organizado

Firestore se parece a un **archivero**:

```text
 📁 colección     un cajón: contiene muchas tarjetas
 🗂️ documento     una tarjeta: tiene datos (nombre, correo…)
 📁 subcolección  un cajoncito dentro de una tarjeta
```

Hay **un cajón principal**, `mediq_users`, y dentro una tarjeta por cada persona que entra a la app. El nombre de cada tarjeta es el `uid`: un código único que Firebase le da a cada cuenta. **Todo lo de una persona vive dentro de su propia tarjeta.**

### Lo que existe hoy (F002 y F003)

```text
📁 mediq_users
 └─ 🗂️ k9X2…  (el uid de una persona)
      │   email, displayName, googleSub, createdAt
      │
      ├─ 📁 patients                      sus perfiles
      │    └─ 🗂️ self                     su perfil propio (isSelf: true, fullName)
      │
      └─ 📁 consents                      los recibos de lo que aceptó
           ├─ 🗂️ aviso_privacidad_2026-10-05
           └─ 🗂️ terminos_2026-10-05
```

Son solo tres cosas guardadas: la cuenta, el perfil propio y los consentimientos.

### Por qué todo cuelga del `uid`

Por seguridad. Como los datos de cada persona están dentro de su tarjeta, la regla de Firestore es una sola frase: *solo la persona dueña de ese `uid` puede leer y escribir lo que hay dentro*. Nadie puede ver los datos de otro porque están en tarjetas distintas, y el cliente nunca elige de quién son los datos: lo decide Firebase Auth.

### Lo que vendrá (todavía no existe)

Cuando se construyan las demás pantallas, se agregarán más cajoncitos **dentro de la misma tarjeta**: `places` (lugares), `doctors` (médicos) y `visits` (consultas) con sus `instructions`, `prescriptions` y `attachments`. El detalle está en las secciones siguientes.

### Para qué sirve `consents`

MediQ guarda datos de salud, que la ley mexicana (LFPDPPP, ver el capítulo 12) trata como datos personales sensibles. Hace falta un consentimiento expreso y poder demostrarlo. Cada documento de `consents` es un **recibo** que responde tres preguntas:

| Pregunta | Dónde está |
| --- | --- |
| ¿Quién aceptó? | El `uid` de la tarjeta donde vive el recibo |
| ¿Qué aceptó? | `documento` (`aviso_privacidad` o `terminos`) y `version` |
| ¿Cuándo? | `acceptedAt`, con la hora del servidor (no la del teléfono, que el usuario podría cambiar) |

Sirve para:

1. **Demostrar el consentimiento** ante el usuario, una autoridad o una tienda de apps.
2. **Pedirlo de nuevo cuando el texto cambia.** Al subir la versión vigente (`VERSIONES_VIGENTES`), la app detecta que ese usuario solo aceptó la anterior y vuelve a mostrar el aviso.
3. **No olvidarlo al reinstalar o cambiar de teléfono**, porque vive en la nube ligado a la cuenta.
4. **Cumplir la regla del capítulo 10:** sin consentimiento no se avanza ni se guardan datos.

El id del recibo (`aviso_privacidad_2026-10-05`) es determinista: aceptar dos veces la misma versión no crea un segundo recibo.

Dos límites honestos: hoy es un **registro**, y la app no deja avanzar sin él, pero las reglas de Firestore aún no impiden escribir consultas sin consentimiento (es un buen endurecimiento antes de guardar datos clínicos); y el registro **no sustituye la revisión de un abogado** sobre el texto del aviso.

## Colecciones

```text
mediq_specialties/{slug}                 catálogo global, solo lectura
mediq_users/{uid}                        cuenta
 ├─ consents/{documento}_{versión}       aceptación del aviso y términos
 ├─ patients/{patientId}                 perfiles; el propio es "self"
 ├─ places/{placeId}                     lugares de atención
 ├─ doctors/{doctorId}                   directorio de médicos
 └─ visits/{visitId}                     consultas del diario
     ├─ instructions/{id}                indicaciones marcables
     └─ prescriptions/{id}               recetas (medicamentos como lista)
         └─ attachments/{id}             fotos de la receta (solo la ruta en Storage)
```

| Documento | Campos | Notas |
| --- | --- | --- |
| `mediq_users/{uid}` | `googleSub`, `email`, `displayName`, `avatarUrl?`, `createdAt`, `updatedAt`, `deletedAt?` | Un usuario por cuenta de Google. El correo no se usa como identificador |
| `consents/{documento}_{versión}` | `documento` (`aviso_privacidad`, `terminos`), `version`, `acceptedAt` | El id determinístico impide aceptar dos veces la misma versión |
| `patients/{id}` | `fullName`, `birthDate?`, `isSelf`, timestamps, `deletedAt?` | El perfil propio tiene id fijo `self`: a lo más uno. Los familiares (fase 3) usan ids generados |
| `places/{id}` | `name`, `nameKey`, timestamps | Nombre libre. El id es aleatorio; `nameKey` (nombre sin mayúsculas, acentos ni espacios de más) sirve para rechazar repetidos. Se borra de verdad: las consultas que lo usaban quedan con `placeId` y `placeName` en `null` |
| `doctors/{id}` | `fullName`, `specialty` (slug), `phone?`, `licenseNumber?`, `notes?`, timestamps, `deletedAt` (`null` = vigente) | Es del usuario, no un catálogo público. **No guarda lugar ni consultorio**: un médico atiende en varios sitios, así que eso va en cada consulta. No se puede eliminar si tiene consultas vigentes |
| `visits/{id}` | `patientId`, `placeId?`, `office?` (consultorio o piso), `doctorId?`, `specialty`, `visitType`, `visitMode`, `visitedAt`, `reason?`, `doctorNotes?`, `nextAppointmentAt?`, timestamps, `deletedAt?` | Además guarda `doctorName` y `placeName` copiados, para pintar el diario sin lecturas extra; se actualizan al renombrar |
| `instructions/{id}` | `sortOrder`, `body`, `doneAt?` | |
| `prescriptions/{id}` | `issuedOn?`, `notes?`, `items[]`, timestamps | Cada ítem: `name`, `dose?`, `frequency?`, `duration?`, `route?`, `instructions?`, `remind` |
| `attachments/{id}` | `storagePath`, `mimeType`, `sizeBytes`, `width?`, `height?`, `createdAt` | La foto vive en Storage; nunca una URL pública |

Valores de `visitType`: `general`, `especialista`, `dentista`, `urgencias`, `otro`. Valores de `visitMode`: `presencial` (por defecto) y los que se definan después.

## Integridad

- **Pertenencia por ruta.** Lo que en SQL eran llaves compuestas `(id, user_id)` ahora es la jerarquía: un paciente, médico o lugar solo existe dentro del subárbol de su dueño, y una consulta solo puede apuntar a ids de su mismo subárbol. Un usuario no puede ligar sus datos a los de otro.
- **Validaciones en las reglas.** Cuando se escriban las reglas de `visits`: `visitedAt` no puede ser futura (`<= request.time`) y `nextAppointmentAt`, si existe, debe ser posterior a `visitedAt`. El dominio valida lo mismo; las reglas son la segunda barrera.
- **Sin llaves foráneas.** Firestore no las comprueba: el código de los casos de uso verifica que el médico, lugar o paciente existan antes de guardar una consulta.
- **Borrado lógico** (`deletedAt`) en lo que el usuario puede querer recuperar. Eliminar la cuenta es borrado físico de todo el subárbol, de los archivos de Storage y del usuario de Auth (ver RNF-07). Se hace desde la app (F005): reautentica en silencio, borra los documentos y subcolecciones, borra el usuario de Auth y desvincula Google. El SDK de cliente **no puede listar subcolecciones**, así que el árbol de colecciones está declarado en `ARBOL_DE_CUENTA` (`apps/mobile/src/modules/auth/infrastructure/eliminarSubarbol.ts`): **al agregar una colección nueva hay que agregarla ahí**, o sus datos sobrevivirían a la baja; una prueba actúa de alarma. Las fotos de Storage se agregarán con RF-30.

## Índices y consultas

| Consulta | Índice compuesto |
| --- | --- |
| Diario: consultas vigentes, de la más reciente a la más antigua, con cursor de 20 | `visits`: `deletedAt` asc, `visitedAt` desc |
| Próxima cita: la primera con `nextAppointmentAt` futuro | `visits`: `deletedAt` asc, `nextAppointmentAt` asc |
| Consultas de un médico o lugar | `visits`: `doctorId` asc, `visitedAt` desc (y lo mismo con `placeId`) |
| Directorio de médicos por nombre | `doctors`: `deletedAt` asc, `fullName` asc |

La paginación usa cursores (`startAfter`), no desplazamientos.

**Búsqueda por texto (RF-17).** Firestore no ofrece búsqueda de subcadenas. Opciones, a decidir en la fase 2: filtrar en el dispositivo sobre el diario ya cargado (suficiente con pocos cientos de consultas), indexar prefijos en un campo normalizado, o usar un servicio de búsqueda externo. Cualquiera se prueba con datos reales antes de elegir.

## Reglas de seguridad

Reglas actuales (publicadas, cubren cuenta, perfil y consentimientos):

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /mediq_users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Estas reglas son amplias a propósito mientras solo se guardan la cuenta y el consentimiento. Antes de guardar datos clínicos hay que **afinarlas por colección** (validar campos y tipos, impedir cambiar `isSelf`, impedir escribir en `consents` una versión ya aceptada, impedir `deletedAt` inverso), y ponerlas bajo prueba con el emulador. El catálogo `mediq_specialties` se abre solo en lectura para usuarios autenticados y se siembra con un script de administración. Storage usa la misma idea: solo el dueño lee y escribe bajo `mediq_users/{uid}/…`.

## Colecciones de las fases 2 y 3

No se crean hasta que su fase las use; se listan para comprobar que el modelo no necesita cambiar.

| Requisito | Fase | Dónde vive |
| --- | --- | --- |
| RF-17 Búsqueda | 2 | Ver arriba; posible campo normalizado en `visits` |
| RF-32 Recordatorios de toma | 2 | `medicationSchedules/{id}` y `doseLogs/{id}` bajo el usuario. Los avisos son notificaciones locales del dispositivo (capítulo 12) |
| RF-40 Aviso de próxima cita | 2 | `visits.nextAppointmentAt`; aviso local o `devices/{id}` con token de FCM si se manda desde un servidor |
| RF-50 Exportar a PDF | 2 | Lectura de las colecciones del MVP |
| RF-51 Bloqueo biométrico | 2 | No usa la base; vive en el dispositivo |
| Rol de soporte | 2 | Claim personalizado de Auth y `mediq_audit_log` escrito solo desde Cloud Functions, sin contenido clínico |
| RF-60 Perfiles familiares | 3 | `patients` con `isSelf = false`; `visits.patientId` ya existe |
| RF-61 Lectura automática de recetas | 3 | `attachments/{id}/scans/{id}` con estado, motor, texto y resultado propuesto |
| Plan premium | 3 | `subscriptions/{id}` bajo el usuario, validada desde un servidor |

Dos cosas quedan fuera a propósito:

- **Cifrado a nivel de aplicación** de `doctorNotes` y `reason`. Firebase cifra en reposo por defecto; el cifrado propio anularía cualquier búsqueda y es una decisión pendiente, no una colección.
- **Compartir un perfil entre dos cuentas** (por ejemplo, dos hermanos que cuidan al mismo padre). RF-60 solo pide perfiles dentro de una cuenta; compartir pediría un modelo de permisos por perfil.

Decisiones del modelo:

- **`patients` desde el día uno.** En v1 cada usuario tiene un solo perfil con `isSelf = true`. Los perfiles familiares de la fase 3 no requieren migrar `visits`.
- **Dosis, frecuencia y duración como texto.** Las recetas no siguen un formato; estructurarlas antes de tener datos reales es adivinar. Los horarios de toma van aparte.
- **Medicamentos como lista dentro de la receta**, porque siempre se leen juntos y una receta no tiene cientos de ítems (el límite de un documento es 1 MiB).
- **Borradores fuera de Firestore.** Viven en SQLite en el dispositivo hasta que se guardan.
- **Id generado en el cliente.** Aceptar el id del cliente hace idempotente el reenvío de un borrador.
