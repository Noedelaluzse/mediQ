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
| `patients/{id}` | `fullName`, `birthDate?` (`AAAA-MM-DD`), `sex?`, `bloodType?`, `allergies?`, `noKnownAllergies?`, `drugAllergies?`, `noKnownDrugAllergies?`, `isSelf`, timestamps, `deletedAt?` | El perfil propio tiene id fijo `self`: a lo más uno. Los familiares (fase 3) usan ids generados. **Datos de salud (F028):** `sex` = `female`/`male`/`other`/`undisclosed`; `bloodType` = `A+`…`O-` o `unknown` («No lo sé»); `allergies` y `drugAllergies` son listas de hasta 30 textos (hasta 60 caracteres, lo valida el dominio) y `noKnownAllergies`/`noKnownDrugAllergies` distinguen «ninguna conocida» de «aún no lo llenó» (no pueden ser verdaderos con una lista no vacía). **La edad no se guarda: se calcula** de `birthDate`. Todo es opcional y se llena con el tiempo |
| `places/{id}` | `name`, `nameKey`, timestamps | Nombre libre. El id es aleatorio; `nameKey` (nombre sin mayúsculas, acentos ni espacios de más) sirve para rechazar repetidos. Se borra de verdad: las consultas que lo usaban quedan con `placeId` y `placeName` en `null` |
| `doctors/{id}` | `fullName`, `specialty` (slug), `phone?`, `licenseNumber?`, `notes?`, timestamps, `deletedAt` (`null` = vigente) | Es del usuario, no un catálogo público. **No guarda lugar ni consultorio**: un médico atiende en varios sitios, así que eso va en cada consulta. No se puede eliminar si tiene consultas vigentes |
| `visits/{id}` | `patientId` (`self`), `placeId?`, `office?` (consultorio o piso), `doctorId?`, `specialty`, `visitType`, `visitMode`, `visitedAt` (fecha y hora), `reason?`, `doctorNotes?` (lo que dijo el médico, texto libre; en el código `notasDelMedico`), `nextAppointmentAt?`, `hasPrescription?` (bool), `createdAt`, `updatedAt`, `deletedAt` (`null` = vigente) | Además guarda `doctorName` y `placeName` copiados, para pintar el diario sin lecturas extra; se actualizan al renombrar. **`hasPrescription` (F048)** dice si la consulta tiene su documento `prescriptions/receta`: se escribe en el mismo lote que guarda o quita la receta y sirve para contar recetas en el Perfil sin abrir cada una. Si falta (consultas anteriores a F048), el Perfil lee esa receta una vez y escribe la marca |
| `instructions/{id}` | `sortOrder` (entero, define el orden), `body` (texto de 1 a 300 caracteres), `doneAt` (`null` = pendiente; fecha = hecha), `createdAt`, `updatedAt` | La lista marcable de la consulta (RF-15, F011). Máximo 30 por consulta. Se crean junto con la consulta en un solo lote (o se guarda todo o nada); marcar/desmarcar solo cambia `doneAt`. Quitar borra el documento |
| `prescriptions/receta` | `issuedOn?`, `notes?`, `items[]`, timestamps | Una por consulta (F017; el id es fijo `receta`). Cada ítem: `name` (1–80), `dose?`/`frequency?`/`duration?`/`route?` (hasta 60), `instructions?` (hasta 300), `remind` (`true` si tiene aviso de toma, F024), `firstDose` (`HH:mm`) y `remindFrom` (cuándo se activó) cuando `remind` es verdadero. Lo ausente se guarda como `null`. Máximo 20 ítems. Guardar reemplaza la lista completa; guardar una lista vacía borra el documento |
| `medicationSchedules/{consultaId}_{idDelMedicamento}` (F024; F062) | `visitId`, `itemIndex` (0–19), `medicationName`, `dose?`, `frequency`, `firstDoseTime` (`HH:mm`), `startsAt`, `endsAt`, `createdAt`, `updatedAt` | **Colección plana bajo el usuario** (no dentro de la consulta) para que la app lea todos los recordatorios con una sola consulta y programe los avisos. El id es determinista: reescribir reemplaza. Se escribe junto con la receta y se borra al quitar el aviso, el medicamento, la receta o la consulta. Las reglas validan la forma (hora `HH:mm`, índice, `endsAt > startsAt`) **Identidad (AUD-01, F062):** el id del documento lleva el id propio del medicamento, no su posición; `itemIndex` solo ordena. Cada ítem de la receta guarda su `id` (las reglas no validan las claves de los ítems). Cambiar el nombre de un medicamento = medicamento nuevo (otro id); cambiar dosis, frecuencia o duración conserva el id y el inicio. |
| `doseLogs/{tomaId}` (F027) | `visitId`, `itemIndex` (0–19), `medicationName`, `dose?`, `scheduledFor`, `takenAt`, `createdAt` | **Colección plana bajo el usuario.** Una dosis que el usuario marcó con «Ya la tomé» en el aviso. El id es el del aviso de la toma (`toma-{consultaId}-{indice}-{aaaammddhhmm}`), así tocar el botón dos veces reescribe en vez de duplicar. La app lee las de las últimas 24 h (`takenAt`) para no volver a avisar de una dosis ya tomada, y las de las últimas 36 h para la tarjeta «Hoy» (F029). **«Deshacer» en la tarjeta borra el documento** (el dueño ya podía borrar). **No se borran al eliminar la consulta** (son historial); sí al eliminar la cuenta. Las reglas validan la forma (índice, textos, fechas) **F062:** `tomaId` = `toma-{consulta}-{idDelMedicamento}-{aaaammddhhmm}` (antes llevaba la posición, y un medicamento nuevo en la misma fila y hora heredaba las marcas del anterior). |
| `attachments/foto` | `storagePath`, `mimeType`, `sizeBytes`, `width?`, `height?`, `createdAt`, `updatedAt` (F051) | Una foto por receta (F016, decidido con el usuario; reemplazar es sobrescribir). La foto vive en Storage en `mediq_users/{uid}/visits/{consultaId}/receta.jpg`; el documento guarda solo la ruta, nunca una URL pública. La app la baja con la sesión (`getBytes`), no con un enlace con token. **Caché en el teléfono (F051):** la primera vez se guarda como archivo en la caché del teléfono (`Library/Caches/mediq-fotos`, nombre `{uid}_{consulta}_{tamaño}-{updatedAt}-{ancho}x{alto}.jpg`; las dimensiones van en el nombre porque sin internet no se puede leer este documento); `updatedAt` se escribe en cada alta o reemplazo y es lo que invalida la copia. Se borra al reemplazar o quitar la foto, al cerrar sesión y al eliminar la cuenta |

Valores de `visitType`: `general`, `especialista`, `dentista`, `urgencias`, `otro`. **Desde el 2026-10-06 no se pregunta al usuario: se deduce de `specialty`** (`medicina-general`→`general`, `odontologia`→`dentista`, `urgencias`→`urgencias`, `otra`→`otro`, el resto→`especialista`); las consultas anteriores conservan el valor que se guardó. Valores de `visitMode`: `presencial` (por defecto) y los que se definan después.

## Integridad

- **Pertenencia por ruta.** Lo que en SQL eran llaves compuestas `(id, user_id)` ahora es la jerarquía: un paciente, médico o lugar solo existe dentro del subárbol de su dueño, y una consulta solo puede apuntar a ids de su mismo subárbol. Un usuario no puede ligar sus datos a los de otro.
- **Validaciones en las reglas.** Cuando se escriban las reglas de `visits`: `visitedAt` no puede ser futura (`<= request.time`) y `nextAppointmentAt`, si existe, debe ser posterior a `visitedAt`. El dominio valida lo mismo; las reglas son la segunda barrera.
- **Sin llaves foráneas.** Firestore no las comprueba: el código de los casos de uso verifica que el médico, lugar o paciente existan antes de guardar una consulta.
- **Referencias cruzadas validadas en las reglas (F041, 2026-10-07).** Segunda barrera además del código: `visits.patientId` → `patients/{id}`, `visits.placeId` → `places/{id}`, `visits.doctorId` → `doctors/{id}` y `visitId` de `medicationSchedules` y `doseLogs` → `visits/{id}` deben **existir en la misma cuenta** (`exists()` con el uid de la ruta, nunca del cuerpo; el id no puede llevar «/»). Un campo ausente o `null` es válido. Detalles: (1) un médico dado de baja (`deletedAt`) **sigue existiendo**, así que una consulta puede seguir apuntándole; (2) al eliminar un lugar la app pone `placeId: null` en sus consultas, así que no quedan referencias colgadas; (3) **al editar solo se revisa lo que cambia** (una consulta anterior a la regla no se bloquea y se ahorran lecturas); (4) cada comprobación cuenta como una lectura facturable: crear una consulta con médico y lugar hace hasta 5 lecturas de regla (2 recibos de consentimiento + perfil + médico + lugar), lejos del tope de 10 por escritura y de 20 por lote; (5) el médico y el lugar se crean **antes** que la consulta (`prepararConsulta`), porque `exists()` ve el estado previo al lote; (6) una cuenta sin `patients/self` no puede crear consultas (el registro de la cuenta lo crea).
- **Borrado lógico** (`deletedAt`) en lo que el usuario puede querer recuperar. Hoy eliminar una consulta (F012) o un médico lo usa; todavía no hay pantalla para recuperarlas. Eliminar la cuenta es borrado físico de todo el subárbol, de los archivos de Storage y del usuario de Auth (ver RNF-07). Se hace desde la app (F005): reautentica en silencio, borra los documentos y subcolecciones, borra el usuario de Auth y desvincula Google. El SDK de cliente **no puede listar subcolecciones**, así que el árbol de colecciones está declarado en `ARBOL_DE_CUENTA` (`apps/mobile/src/modules/auth/infrastructure/eliminarSubarbol.ts`): **al agregar una colección nueva hay que agregarla ahí**, o sus datos sobrevivirían a la baja; una prueba actúa de alarma. Las fotos de Storage se borran también (F016): `FirestoreEliminadorDeDatos` lista y borra todo `mediq_users/{uid}` en Storage antes de borrar los documentos.

## Índices y consultas

| Consulta | Índice compuesto |
| --- | --- |
| Diario: consultas vigentes, de la más reciente a la más antigua, con cursor de 20 (F013) | `visits`: `visitedAt` desc (**índice simple, automático**). Las borradas (`deletedAt`) se descartan en el cliente y se piden más documentos hasta juntar la página, así no hace falta el índice compuesto `deletedAt` + `visitedAt`; si algún día el diario tiene muchas borradas, se puede pasar al índice compuesto (`firestore.indexes.json` + publicarlo) |
| Próxima cita: la primera con `nextAppointmentAt` futuro (F014) | `visits`: `nextAppointmentAt` > ahora, ascendente, `limit(10)` (filtro y orden sobre el mismo campo: **índice simple automático**). Las borradas se descartan en el cliente (por eso se piden 10 y no 1), así no hace falta el índice compuesto con `deletedAt` |
| Consultas de un médico o lugar | `visits`: `doctorId` asc, `visitedAt` desc (y lo mismo con `placeId`) |
| Directorio de médicos por nombre | `doctors`: `deletedAt` asc, `fullName` asc |
| Consultas por médico (directorio, detalle, selector "Elegir médico", contadores de Perfil) | `visits` completo o `doctorId` asc; el cliente filtra `deletedAt` y agrupa (también los lugares donde atiende cada médico, por frecuencia, con `placeName`), para no exigir índices compuestos con el volumen de un diario personal |

La paginación usa cursores (`startAfter`), no desplazamientos.

**Búsqueda por texto (RF-17, F020).** Firestore no ofrece búsqueda de subcadenas. **Decidido (2026-10-06): filtrar en el dispositivo.** Se leen todas las consultas vigentes con la misma consulta del diario (`visitedAt` desc, índice simple, páginas de 20, tope de 2 000) y se filtra en memoria por médico, especialidad y lugar. Costo: una lectura de todo el diario cada vez que se abre la búsqueda (con cientos de consultas son unas pocas decenas de lecturas por página). Las alternativas descartadas por ahora: indexar prefijos en un campo normalizado (obliga a rellenar consultas existentes y a cambiar reglas) y un servicio externo (los datos de salud saldrían de Firebase). Si el diario llegara a miles de consultas, revisar.

## Reglas de seguridad

Las reglas viven en `firebase/firestore.rules` y se prueban con el emulador (`pnpm --filter mobile test:emulator`). **Se publican a mano** (procedimiento y registro de cada publicación en el capítulo 14) (no hay despliegue automático): `firebase deploy --only firestore:rules --project <proyecto>`. Hasta publicarlas, Firestore sigue con las reglas anteriores aunque el código nuevo ya esté en la app.

**Regla general:** solo el dueño (`request.auth.uid == uid`) lee y escribe bajo `mediq_users/{uid}`.

**Por qué se enumera cada colección.** En Firestore las reglas se **suman** (si una permite, se permite): un comodín general `match /mediq_users/{uid}/{document=**}` anularía cualquier validación más estricta de `visits`. Por eso hay un bloque por colección (`patients`, `consents`, `places`, `doctors`, `visits`), y todas validan lo que se escribe, no solo quién lo escribe. **Al agregar una colección nueva hay que listarla en las reglas** (igual que en `ARBOL_DE_CUENTA`, ver arriba) o quedará sin acceso.

**Validación de `visits` (F009, segunda barrera; el dominio valida lo mismo):**

| Regla | Detalle |
| --- | --- |
| Campos | Solo los del modelo (`hasOnly`); obligatorios `patientId`, `specialty`, `visitType`, `visitMode`, `visitedAt` |
| Tipos | `visitType` ∈ general, especialista, dentista, urgencias, otro; `visitMode` = `presencial`; textos con largo máximo (`reason` 2 000, `doctorNotes` 100 000, `placeName`/`office` 80, `doctorName` 200) |
| Fecha | `visitedAt` es una marca de tiempo y **no puede ser futura**. Se toleran **5 minutos** de adelanto por si el reloj del teléfono va adelantado |
| Próxima cita | Si existe, debe ser posterior a `visitedAt` |
| Actualizar | Se valida el documento **resultante**; por eso renombrar un lugar o desvincularlo (F006) y el borrado lógico (`deletedAt`) siguen pasando, pero no se puede poner una fecha futura |
| Borrar | El dueño puede borrar de verdad (baja de cuenta, F005) |
| Documento del usuario `mediq_users/{uid}` | Solo `googleSub`, `email`, `displayName`, `avatarUrl?`, `createdAt`, `updatedAt?`, `deletedAt?`; obligatorios los tres primeros, `displayName` puede ser vacío (cuentas de Google sin nombre) |
| `patients/{id}` | Solo `fullName` (1–200), `birthDate?` (formato `AAAA-MM-DD`), `sex?`, `bloodType?`, `allergies?`, `noKnownAllergies?`, `drugAllergies?`, `noKnownDrugAllergies?` (F028: valores de catálogo, listas de hasta 30, «ninguna conocida» excluye alergias escritas), `isSelf`, fechas; `isSelf` es verdadero **si y solo si** el id es `self`, así que no se puede cambiar `isSelf` después |
| `consents/{id}` | **Recibo inmutable**: solo `documento` (`aviso_privacidad` o `terminos`), `version` (`AAAA-MM-DD`) y `acceptedAt`; el id debe ser `documento_versión` y `acceptedAt` debe ser la hora del servidor (una fecha escrita por el cliente se rechaza). Se puede crear, leer y borrar (baja de cuenta), **no actualizar**: una versión ya aceptada no se reescribe. La app solo registra los documentos pendientes, así que nunca lo intenta |
| `places/{id}` | Solo `name` (1–80), `nameKey` (1–80) y fechas |
| `doctors/{id}` | Solo `fullName` (1–300), `specialty` (1–40), `phone?` y `licenseNumber?` (hasta 40), `notes?` (hasta 20 000), fechas y `deletedAt` (nulo o fecha) |
| `instructions` (F011) | Subcolección de la consulta, validada: solo `sortOrder` (entero), `body` (1–300 caracteres), `doneAt` (nulo o fecha), `createdAt`, `updatedAt`; el dueño puede leer, crear, actualizar y borrar |
| `prescriptions` (F017) | Una receta por consulta, con id fijo `receta`: solo `items` (lista, **máximo 20**; obligatoria), `issuedOn`, `notes`, `createdAt`, `updatedAt`. La forma la asegura la regla; cada medicamento lo valida el dominio (las reglas no recorren listas). El dueño puede leer, crear, actualizar y borrar |
| `attachments/foto` (F016) | Un solo documento (id fijo `foto`) bajo la receta: solo `storagePath`, `mimeType` (`image/jpeg`), `sizeBytes` (entero, 1 a 5 MB), `width`, `height`, `createdAt`, `updatedAt`; obligatorios los tres primeros. El dueño puede leer, crear, actualizar y borrar |

Endurecido el 2026-10-06 (pruebas en `ReglasDeColecciones.emulator.test.ts` y `FirestoreCuentaYConsentimiento.emulator.test.ts`): `isSelf`, recibos de `consents` y validación de forma de las demás colecciones. **`deletedAt` inverso** (impedir que un borrado lógico se deshaga): el usuario decidió el 2026-10-06 **dejarlo abierto a propósito** para no cerrar la puerta a una futura función «Recuperar consulta eliminada». **Consentimiento obligatorio (F031, 2026-10-06):** crear o editar una consulta (`visits`) y escribir sus indicaciones, receta y foto exige que existan los recibos `consents/aviso_privacidad_2026-10-06` y `consents/terminos_2026-10-06` de la cuenta (la versión de los textos redactados en F033) (las reglas no pueden listar recibos, así que piden la versión **base**; la app puede pedir una más nueva sin romper nada porque los recibos viejos se conservan). Borrar no lo exige (eliminar la cuenta debe poder borrarlo todo). Una prueba (`consentimientoExigido.test.ts`) vigila que la regla nunca exija una versión más nueva que `VERSIONES_VIGENTES`; si la versión mínima debe subir, se cambian los dos ids de la regla. Los límites de texto de `doctors` son generosos porque el dominio aún no los limita; si se agregan límites al dominio, igualar las reglas. El catálogo `mediq_specialties` se abriría solo en lectura para usuarios autenticados y se sembraría con un script de administración. **Storage (F016, `firebase/storage.rules`):** misma idea, solo el dueño lee y borra bajo `mediq_users/{uid}/…`; crear o actualizar exige además que sea una imagen (`image/*`) de entre 1 byte y 5 MB. Sin sesión no se lee ni se escribe, y nada fuera de `mediq_users` es escribible. Se prueba con el emulador de Storage (`pnpm --filter mobile test:emulator`) y se publica con `firebase deploy --only storage`.

## Colecciones de las fases 2 y 3

No se crean hasta que su fase las use; se listan para comprobar que el modelo no necesita cambiar.

| Requisito | Fase | Dónde vive |
| --- | --- | --- |
| RF-17 Búsqueda | 2 | Ver arriba; posible campo normalizado en `visits` |
| RF-32 Recordatorios de toma | 2 → **hecho (F024)** | `medicationSchedules/{id}` bajo el usuario (ver abajo); `doseLogs/{tomaId}` (registro de tomas) **hecho (F027)**. Los avisos son notificaciones locales del dispositivo (capítulo 12) |
| RF-40 Aviso de próxima cita | 2 | `visits.nextAppointmentAt`; aviso local o `devices/{id}` con token de FCM si se manda desde un servidor |
| RF-50 Exportar a PDF | 2 | Lectura de las colecciones del MVP |
| RF-51 Bloqueo biométrico | 2 | No usa la base; vive en el dispositivo |
| Rol de soporte | 2 | Claim personalizado de Auth y `mediq_audit_log` escrito solo desde Cloud Functions, sin contenido clínico |
| RF-60 Perfiles familiares | 3 | `patients` con `isSelf = false`; `visits.patientId` ya existe |
| RF-61 Lectura automática de recetas | 3 | `attachments/{id}/scans/{id}` con estado, motor, texto y resultado propuesto |
| Plan premium | 3 | `subscriptions/{id}` bajo el usuario, validada desde un servidor |

Dos cosas quedan fuera a propósito:

- **Cifrado a nivel de aplicación** de `doctorNotes` y `reason`. Firebase cifra en reposo por defecto; el cifrado propio anularía cualquier búsqueda y es una decisión pendiente, no una colección.
- **Compartir un perfil entre dos cuentas** (por ejemplo, dos hermanos que cuidan al mismo padre). RF-60 solo pide perfiles dentro de una cuenta; compartir pide un modelo de permisos por perfil. **Ya está diseñado (sin implementar) en el capítulo 16** (`shares/{invitado}_{perfil}` en el árbol del dueño, RF-62 a RF-65); se pidió el 2026-10-07 soportar ambos modos.

Decisiones del modelo:

- **`patients` desde el día uno.** En v1 cada usuario tiene un solo perfil con `isSelf = true`. Los perfiles familiares de la fase 3 no requieren migrar `visits`.
- **Dosis, frecuencia y duración como texto.** Las recetas no siguen un formato; estructurarlas antes de tener datos reales es adivinar. Los horarios de toma van aparte.
- **Medicamentos como lista dentro de la receta**, porque siempre se leen juntos y una receta no tiene cientos de ítems (el límite de un documento es 1 MiB).
- **Borradores fuera de Firestore (F010).** Viven en SQLite en el dispositivo (`mediq.db`, tabla `borradores`: `usuario_id` clave primaria, `contenido` = el formulario en JSON con las fechas en texto ISO, `actualizado_en`). Hay **un borrador por usuario**; se guarda solo mientras se escribe (unos 800 ms después de dejar de teclear), se restaura al abrir "Nueva consulta" y se borra al guardar la consulta, al descartarlo o al eliminar la cuenta. **Cerrar sesión lo conserva** (va por usuario). No es un respaldo: si se borra la app, se pierde. No hay cola de envío sin red todavía (RNF-11, pendiente).
- **Id generado en el cliente.** Aceptar el id del cliente hace idempotente el reenvío de un borrador.
