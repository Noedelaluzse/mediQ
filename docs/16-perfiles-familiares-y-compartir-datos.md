# 16. Perfiles familiares y compartir datos entre cuentas

> **Estado: diseño, nada de esto está implementado** (2026-10-07). Sirve para decidir antes de escribir código y para que las reglas de seguridad se diseñen con el modelo completo en la cabeza. Las decisiones que faltan están en la sección 9; **no se empieza a construir sin que el usuario las tome.** Origen: petición del usuario el 2026-10-07 de soportar **los dos modos** a la vez (ver sección 1).

## 1. Qué se quiere

El usuario pidió dos formas de llevar los datos médicos de otras personas, y que **convivan**:

| Modo | Quién tiene cuenta | Ejemplo | Requisito |
| --- | --- | --- | --- |
| **A. Perfil administrado** | Solo quien administra | «No quiero que mis papás tengan cuenta, pero sí llevar sus registros». El diario de mamá vive en **mi** cuenta | RF-60 (ya existía) |
| **B. Perfil compartido** | Las dos personas | «Mi pareja y yo tenemos la app y queremos ver (o editar) los datos médicos del otro» | RF-62 a RF-65 (nuevos) |

Pueden combinarse: yo administro el perfil de mi papá (modo A) **y además** se lo comparto a mi hermana, que tiene su propia cuenta (modo B). Eso es lo que el docs/11 dejaba fuera a propósito («compartir un perfil entre dos cuentas pediría un modelo de permisos por perfil»); este capítulo es ese modelo.

## 2. Vocabulario

- **Dueño de la cuenta:** el `uid` bajo el que viven los datos (`mediq_users/{uid}/...`). Es la autoridad de todo lo que contiene.
- **Perfil:** una persona dentro de una cuenta (`patients/{id}`). El propio es `self`; los demás tienen un id generado e `isSelf = false`.
- **Perfil administrado:** un perfil `isSelf = false` cuya persona no tiene cuenta.
- **Invitado:** otra cuenta de MediQ a la que el dueño le dio acceso a un perfil.
- **Acceso (grant):** el permiso del dueño, hecho de forma explícita, para un perfil concreto y un nivel (ver o editar).

## 3. Modo A: perfiles administrados (RF-60)

Todo vive en el árbol del dueño, como hoy. Solo cambia que existen más perfiles.

```
mediq_users/{uid}
 ├─ patients/self           mi perfil
 ├─ patients/{idMama}       isSelf = false
 ├─ visits/{id}             patientId = self | idMama   (ya existe el campo)
 ├─ doctors / places        ¿de la cuenta o del perfil? (decisión 3)
 └─ medicationSchedules / doseLogs   cuelgan de la consulta (visitId), así que heredan el perfil
```

**Lo que ya está listo:** `visits.patientId` existe desde F009, `patients` admite `isSelf = false` y las reglas ya validan que `patientId` exista en la cuenta (F041). Las reglas de seguridad de este modo **casi no cambian**: sigue siendo «solo el dueño».

**Lo que falta (aplicación):**
- Selector de **perfil activo**; el Diario, los médicos, los recordatorios y las notificaciones filtran por él (las consultas necesitan un índice por `patientId` y fecha).
- Crear, renombrar y **eliminar un perfil**: eliminar un perfil borra en cascada sus consultas, recetas, fotos, recordatorios y tomas (hoy la baja en cascada solo existe para la cuenta entera, `ARBOL_DE_CUENTA`).
- Los **avisos** (próxima cita, tomas) deben decir de **quién** son.
- Los datos de salud de F028 (nacimiento, sexo, sangre, alergias) ya viven en `patients`, así que cada perfil tiene los suyos.
- **Privacidad:** la cuenta guarda datos de salud (sensibles) de **un tercero que no aceptó nada**. El aviso de privacidad y los términos necesitan una cláusula (la persona que administra responde por contar con la autorización de la persona o de su representante). **Pregunta para el asesor legal** (capítulo 12), sobre todo con menores y adultos mayores; no se resuelve en código.
- Es una función **premium** según `docs/01` («Perfiles familiares»): límite de perfiles por plan, por decidir.

## 4. Modo B: perfiles compartidos entre cuentas (RF-62 a RF-65)

### 4.1 Principio de diseño: los datos NO se copian ni se mueven

Los datos del perfil compartido siguen viviendo **en el árbol del dueño**. El invitado los lee (y, si se le permite, escribe) **ahí**, no en una copia. Así hay una sola verdad, revocar es borrar un documento, y no se duplican datos de salud.

```
                    mediq_users/{ownerUid}                        mediq_users/{guestUid}
                    ├─ patients/{id}                              ├─ sharedWithMe/{ownerUid}_{id}   (solo un ÍNDICE: «tengo acceso a…»)
                    ├─ visits/…  (patientId = id)                 └─ (mis propios datos)
                    └─ shares/{guestUid}_{id}    ← EL PERMISO
                         { patientId, guestUid, level: view|edit, createdAt, expiresAt? }
```

### 4.2 La regla de oro contra BOLA

> **La autoridad vive únicamente en el árbol del dueño.** El documento `shares/...` lo crea y lo borra **solo el dueño**. El índice `sharedWithMe` que tiene el invitado es solo una comodidad para listarlo; **falsificarlo no da acceso a nada**, porque las reglas deciden mirando el `shares` del dueño.

Reglas que se deben cumplir (checklist para el diseño y para las pruebas del emulador):

1. El invitado **nunca** puede crear, editar ni borrar su propio acceso ni el de otros (no se auto-escala de `view` a `edit`).
2. Cada lectura o escritura de un invitado se autoriza por **un perfil concreto**: «¿existe `shares/{miUid}_{patientId}` con el nivel suficiente?». Tener acceso a un perfil **no** da acceso a otro del mismo dueño ni a lo que no tiene `patientId` (médicos, lugares, consentimientos, cuenta).
3. El `uid` del dueño sale **siempre de la ruta**, el del invitado de `request.auth.uid`; nunca del cuerpo del documento.
4. Las subcolecciones (`instructions`, `prescriptions`, `attachments`) no tienen `patientId` propio: heredan del `visit` padre, y la regla debe leerlo (`get()` del padre; cada lectura de regla es facturable, ver costos).
5. **Storage** (fotos de receta) vive bajo el `uid` del dueño; las reglas de Storage deben consultar el acceso en Firestore (`firestore.exists/get`), y hay que probarlo en el emulador.
6. Una consulta de Firestore solo se permite si **la propia consulta** garantiza el permiso (las reglas no filtran): el invitado debe consultar con `where patientId == X`, y la regla debe poder deducirlo.
7. **Revocar** es inmediato en el servidor; pero lo que el invitado ya vio o exportó (PDF, copia local, capturas) **no se puede retirar**: se avisa al dueño en la pantalla de compartir.
8. Si el dueño elimina su cuenta o el perfil, se borran sus `shares` (y el invitado ya no los ve); si el invitado elimina la suya, se limpian sus índices.
9. Registro de actividad mínimo («Ana vio / editó»): sin contenido clínico (como el `mediq_audit_log` de docs/11). Por decidir si entra en B1.
10. Cada colección × cada rol tiene su prueba del emulador: dueño, invitado `view`, invitado `edit`, sin acceso, acceso a **otro** perfil, acceso **revocado**, acceso **vencido**.

### 4.3 Invitaciones (cómo se crea un acceso)

El invitado no puede escribir en el árbol del dueño, y el dueño no puede escribir en el del invitado. Hay dos formas de unirlos; **es la decisión técnica más grande** (decisión 5):

| | Opción 1: solo reglas (sin servidor) | Opción 2: Cloud Function «aceptar invitación» (recomendada) |
| --- | --- | --- |
| Cómo | El dueño crea una invitación con un código largo e impredecible (≥ 128 bits) y vencimiento; el invitado la «canjea» y las reglas validan que el código exista | Una función del lado del servidor canjea el código, comprueba vencimiento y uso único y escribe el `shares` y el índice en una sola operación |
| A favor | No hay código de servidor; se queda como hoy | Atómica; el código nunca se lee desde el cliente; se puede registrar auditoría; limita intentos; es el sitio natural para el límite del plan premium |
| En contra | El código viaja por el cliente; difícil limitar intentos; reglas más complicadas | **Es el primer código de servidor del proyecto** (hoy no hay Cloud Functions; ya está el plan Blaze). Más piezas que desplegar y probar |

Flujo común: el dueño elige el perfil y el nivel → se genera un código o enlace de **un solo uso y con vencimiento corto** → el invitado lo introduce → el dueño ve «Ana tiene acceso a Mamá (solo ver)» y puede quitarlo cuando quiera.

### 4.4 Niveles y alcance

- **Ver:** consultas, recetas, fotos, indicaciones, datos de salud del perfil y recordatorios/tomas.
- **Editar:** además crea y modifica consultas, recetas e indicaciones y marca tomas.
- **Nunca por compartir:** la cuenta, los consentimientos, el acceso a **otros** perfiles, la lista de accesos del dueño ni la eliminación del perfil o la cuenta.
- Alcance **por perfil completo** (todo o nada dentro de ese perfil). Compartir por categoría (solo alergias, solo recetas) queda fuera de la primera versión (decisión 6).

### 4.5 Qué cambia en la aplicación (el costo real)

- **Contexto de datos.** Hoy todos los repositorios reciben `usuarioId()`, el `uid` de **quien está usando la app** (F039). Con perfiles compartidos hay que distinguir el **espacio de datos** (`ownerUid`) del **usuario autenticado**. Cada repositorio de Firestore pasa a recibir un «espacio activo» `{ ownerUid, patientId }`. Es una refactorización transversal; por eso va antes que la UI.
- **Consentimiento.** La regla `consentimientoAceptado(uid)` mira los recibos del dueño de la ruta; para un invitado que edita hay que decidir **de quién** exigirlos (decisión 7).
- **Médicos y lugares** viven en el árbol del dueño y las consultas se validan contra ellos (F041). Un invitado con `edit` solo puede elegir **los del dueño** o crear ahí; en la primera versión de B2 se propone que sean los del dueño (decisión 3).
- **Copia local y cola sin red (F030).** Hoy están por `usuarioId`. Deben pasar a ser por `{ownerUid, patientId}`, y **al perder el acceso se debe borrar la copia local** de ese perfil del teléfono del invitado.
- **Avisos** (próxima cita, tomas): al terminar el acceso se cancelan en el teléfono del invitado.
- **Autoría.** Cada documento creado por un invitado guarda `createdBy` / `updatedBy` (uid) para que el dueño sepa quién cambió qué.
- Pantallas: selector de perfil y de «cuenta de quién», pantalla de accesos (quién ve qué, quitar), pantalla de aceptar invitación.

## 5. Costos y límites a vigilar

- Cada `exists()`/`get()` de una regla es **una lectura facturable**, y hay tope de **10 por solicitud (20 por lote)**. Hoy crear una consulta usa hasta 5 (ver docs/11); añadir «¿es dueño o tiene acceso?» (1–2 más) obliga a **medir** antes de publicar. Puede hacer falta guardar el nivel de acceso dentro del propio `visit` para ahorrar lecturas.
- La lista de «compartidos conmigo» necesita su propia consulta/índice.

## 6. Dividir en etapas (cada una se puede publicar sola)

| Etapa | Qué entrega | Riesgo BOLA | Depende de |
| --- | --- | --- | --- |
| **F044** | **Modo A:** perfiles administrados dentro de la cuenta (RF-60) | Bajo | Decisiones 1–4 |
| **F045** | **B1:** compartir un perfil en **solo lectura** (RF-62, RF-64, RF-65): invitaciones, accesos, contexto de datos y limpieza de copia local | Alto, pero acotado a lectura | F043, F044, decisiones 5–7 |
| **F046** | **B2:** compartir con **edición** (RF-63): escrituras del invitado, autoría, consentimiento | El más alto | F045 |

Todo F045 y F046 se construye con las reglas **y las pruebas de «otro usuario» escritas primero**, y se publican **solo cuando el usuario lo pida**, como el resto.

## 7. Ideas para después (no se diseñan ahora)

- **Reclamar un perfil:** mamá decide crear su cuenta y «recibe» el perfil que yo administraba (traspaso de propiedad con datos incluidos).
- Acceso temporal (una cita, un viaje), acceso de emergencia, compartir por categoría, exportar con marca de «solo para…».

## 8. Relación con la auditoría de seguridad

Este capítulo es el pendiente «familiares» de F043 (`docs/generado/seguridad-bola.md`). Las correcciones que ya están hechas (F037–F042) sirven de base: las rutas por `uid`, `exists()` de referencias (F041) y el `uid` desde Firebase Auth (F039). Lo que el modo B **agrega** es la primera vez que alguien distinto del dueño toca el árbol de otro: ahí es donde un error se vuelve BOLA real.

## 9. Decisiones abiertas (las toma el usuario)

| # | Pregunta | Mi recomendación |
| --- | --- | --- |
| 1 | ¿Se construye primero A y luego B, o ambos al mismo tiempo? | Primero A (F044), luego B1 y B2 |
| 2 | ¿Cuántos perfiles incluye el plan gratis y cuántos el premium? | Por definir con el modelo de negocio (docs/01) |
| 3 | ¿Médicos y lugares son **de la cuenta** (los ven todos los perfiles) o **de cada perfil**? Con acceso compartido, ¿el invitado usa los del dueño? | De la cuenta, y el invitado usa los del dueño |
| 4 | Al eliminar un perfil, ¿se borra todo en cascada o se ofrece exportar antes? | Cascada con confirmación fuerte (y exportar PDF cuando exista RF-50) |
| 5 | Invitaciones: ¿solo reglas o Cloud Function? | Cloud Function (primer código de servidor, con plan Blaze ya activo) |
| 6 | ¿Compartir todo el perfil o por categorías? | Perfil completo en la primera versión |
| 7 | Si el invitado edita, ¿qué consentimiento se exige y de quién? ¿Debe el dueño aceptar un texto específico al compartir? | Ambos aceptan una cláusula nueva; revisar con el asesor legal |
| 8 | ¿Los accesos vencen solos (p. ej. a los 90 días) o duran hasta que el dueño los quite? | Duran hasta quitarlos, con recordatorio periódico |
| 9 | ¿Hay registro de actividad («quién vio qué») en B1? | Sí, mínimo y sin contenido clínico |
| 10 | ¿Compartir es premium? | Por definir |
