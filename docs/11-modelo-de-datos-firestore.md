# 11. Modelo de datos (Firestore)

Todo dato del usuario cuelga de un único documento raíz, `mediq_users/{uid}`, donde `uid` es el identificador de Firebase Auth. Autorizar es siempre una sola regla: *solo el dueño del `uid` lee y escribe su subárbol*. No lo he ejecutado contra un proyecto real; escribe y prueba las reglas con el emulador de Firebase antes de darlas por buenas.

El prefijo `mediq_` existe porque durante el desarrollo el proyecto de Firebase se comparte con otra app. En un proyecto propio de MediQ se puede mantener o simplificar a `users`, pero conviene decidirlo antes de tener datos reales.

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
| `places/{id}` | `name`, `address?`, `phone?`, timestamps, `deletedAt?` | Nombre libre. El id sale del nombre normalizado para que no se duplique, sin distinguir mayúsculas |
| `doctors/{id}` | `fullName`, `specialty` (slug), `placeId?`, `office?`, `phone?`, `licenseNumber?`, `notes?`, timestamps, `deletedAt?` | Es del usuario, no un catálogo público |
| `visits/{id}` | `patientId`, `placeId?`, `doctorId?`, `specialty`, `visitType`, `visitMode`, `visitedAt`, `reason?`, `doctorNotes?`, `nextAppointmentAt?`, timestamps, `deletedAt?` | Además guarda `doctorName` y `placeName` copiados, para pintar el diario sin lecturas extra; se actualizan al renombrar |
| `instructions/{id}` | `sortOrder`, `body`, `doneAt?` | |
| `prescriptions/{id}` | `issuedOn?`, `notes?`, `items[]`, timestamps | Cada ítem: `name`, `dose?`, `frequency?`, `duration?`, `route?`, `instructions?`, `remind` |
| `attachments/{id}` | `storagePath`, `mimeType`, `sizeBytes`, `width?`, `height?`, `createdAt` | La foto vive en Storage; nunca una URL pública |

Valores de `visitType`: `general`, `especialista`, `dentista`, `urgencias`, `otro`. Valores de `visitMode`: `presencial` (por defecto) y los que se definan después.

## Integridad

- **Pertenencia por ruta.** Lo que en SQL eran llaves compuestas `(id, user_id)` ahora es la jerarquía: un paciente, médico o lugar solo existe dentro del subárbol de su dueño, y una consulta solo puede apuntar a ids de su mismo subárbol. Un usuario no puede ligar sus datos a los de otro.
- **Validaciones en las reglas.** Cuando se escriban las reglas de `visits`: `visitedAt` no puede ser futura (`<= request.time`) y `nextAppointmentAt`, si existe, debe ser posterior a `visitedAt`. El dominio valida lo mismo; las reglas son la segunda barrera.
- **Sin llaves foráneas.** Firestore no las comprueba: el código de los casos de uso verifica que el médico, lugar o paciente existan antes de guardar una consulta.
- **Borrado lógico** (`deletedAt`) en lo que el usuario puede querer recuperar. Eliminar la cuenta es borrado físico de todo el subárbol, de los archivos de Storage y del usuario de Auth (ver RNF-07).

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
