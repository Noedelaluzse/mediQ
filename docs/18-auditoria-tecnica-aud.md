# 18. Auditoría técnica AUD-01…AUD-18 (2026-10-08) y su plan de corrección

> **Este documento es el punto de partida para retomar el trabajo de la auditoría en otra sesión.** Cada hallazgo tiene su ficha (§4), su feature en `features.json` (campo `auditoria`) y su orden sugerido (§3).

- **Origen:** auditoría técnica entregada por el usuario el 2026-10-08 (documento «MediQ — Auditoría técnica y guía de corrección para otra IA»), hecha sobre `main` en el commit `d4a3fe9`. Su texto íntegro NO está en el repo: esta página conserva lo necesario para actuar (ficha por hallazgo, archivos y símbolos, pruebas, aceptación, decisiones).
- **Contraste con el código:** el 2026-10-08, sobre `main` en `137a075` (después de F054–F059), se comprobó cada hallazgo leyendo el código y ejecutando `pnpm audit`. **No se volvieron a correr las reproducciones en memoria** de la auditoría original (AUD-01 y AUD-02): cada feature debe reproducirlas con una prueba que falle antes de corregir.
- **Los IDs `AUD-xx` son de esta auditoría. No son IDs `Fnnn`.** Mapeo en §2. AUD-05 ya existía como **F040**.
- Los números de línea cambian: busca los símbolos indicados, no las líneas.

## 1. Reglas para quien implemente (de la auditoría y de AGENTS.md)

1. Flujo de `AGENTS.md`: `main` al día → `bash scripts/init.sh` → rama → **pruebas primero (rojo) → código (verde)** → verificar (simulador/iPhone si hay UI) → PR contra `main`. Un hallazgo por PR (combinar solo piezas inseparables).
2. Antes de investigar cualquier error: `docs/solucion-de-problemas.md`. Errores nuevos resueltos se agregan allí.
3. **No desplegar reglas, índices ni cambiar la consola de Firebase** sin que el usuario lo pida; registrar cualquier publicación en `docs/14-publicacion-y-proyecto-firebase.md`.
4. **No probar borrado de cuenta ni migraciones destructivas con la cuenta real.** Datos sintéticos y proyecto `demo-*` en emuladores (`pnpm --filter mobile test:emulator`).
5. Para APIs de Expo/React Native, comprobar la versión instalada (hoy Expo ~57) y su documentación versionada antes de tocar código.
6. Respetar las capas (dominio, aplicación, infraestructura); las rutas viven en `apps/mobile/src/app/routes/`.
7. Un hallazgo no está resuelto porque compile: aceptación demostrada, pruebas, limitaciones pendientes e informe en español (`progress/history.md`).
8. **Decisiones de producto: no inventarlas** (§5). Mientras se espera una, se pueden preparar reproducciones, pruebas y mediciones que no dependan de ella.
9. Conservar siempre (§6): aislamiento por usuario, funcionamiento sin conexión, consentimiento, borrado lógico, y no reducir autorizaciones por ahorrar lecturas.

### Clasificación de la evidencia

| Etiqueta | Significado |
|---|---|
| Reproducido en memoria | Lógica real del proyecto con datos sintéticos y dependencias en memoria; no es una prueba contra Firebase desplegado. |
| Confirmado por código | Verificable por lectura; frecuencia e impacto reales no medidos. |
| Riesgo de diseño | Falta una defensa o hay una política por decidir; no implica un ataque demostrado. |
| Pendiente de medir/verificar | Requiere teléfono, emuladores, inspección del bundle o acceso a consola. |

**No verificado en la auditoría:** igualdad entre reglas locales y desplegadas, IAM, App Check enforcement, claves, cuotas, índices y respaldos del proyecto activo; facturación real; rendimiento en dispositivo; explotabilidad de los avisos de dependencias; las 176 pruebas de emuladores. No se encontró una vía evidente de acceso entre cuentas en las reglas revisadas: es un resultado limitado, **no una certificación de seguridad**.

## 2. Mapeo AUD ↔ feature y estado

| Orden | Hallazgo | Feature | Prioridad | Depende de | Estado hoy (2026-10-08) |
|---|---|---|---|---|---|
| — | AUD-05 App Check | **F040** (ya existía) | P2 | — | VIGENTE, pendiente de decisión |
| 1 | AUD-13 Inicializar `hasPrescription` al crear una consulta | **F060** | P2 | — | VIGENTE (2026-10-08, main 137a075) |
| 2 | AUD-14 Virtualizar la lista de Lugares (último tramo de P-03) | **F061** | P2 | — | PARCIAL |
| 3 | AUD-01 Identidad estable de medicamentos y tomas (no depender de la posición) | **F062** | P1 | — | **RESUELTO (F062, 2026-10-08)** |
| 4 | AUD-02 Borrado de cuenta que alcance descendientes con padre inexistente | **F063** | P1 | — | VIGENTE |
| 5 | AUD-03 Guardar receta y recordatorios como una sola unidad | **F064** | P1 | F062 | VIGENTE |
| 6 | AUD-07 Política y limpieza de datos locales (borradores, caché, cifrado) | **F065** | P2 | — | VIGENTE |
| 7 | AUD-15 Consistencia de la foto de receta entre Storage, Firestore y caché | **F066** | P2 | F063 | VIGENTE (F055/F056 solo agregaron avisos de quitar y subir). `guardar` sube a Storage y después escribe Firestore; `quitar` borra Firestore y después Storage. Además, si la nube confirma que ya no hay foto (`deLaNube` devuelve null) la copia del teléfono no se invalida |
| 8 | AUD-12 Filtrar consultas vigentes en el servidor y corregir la próxima cita | **F067** | P2 | F060 | VIGENTE |
| 9 | AUD-08 Contadores y resúmenes sin descargar todo el historial | **F068** | P1 (costo) | F060, F067 | VIGENTE |
| 10 | AUD-09 Caché de lectura con vigencia (resto de P-06): no consultar la nube primero | **F069** | P1 (costo) | — | PARCIAL |
| 11 | AUD-10 Recordatorios: lecturas compartidas, sin tratamientos terminados y cálculo acotado | **F070** | P1 (costo) | F062 | VIGENTE |
| 12 | AUD-11 Búsqueda del Diario sin descargar todo el historial cada vez | **F071** | P2 | F069 | VIGENTE |
| 13 | AUD-04 Candado: un fallo al inicializarlo no debe dejar la app abierta | **F072** | P2 | — | VIGENTE |
| 14 | AUD-06 Storage: exigir la consulta propia y acotar el volumen por cuenta | **F073** | P2 | F040 | VIGENTE |
| 15 | AUD-16 Horizonte real de las notificaciones de toma y mensajes honestos | **F074** | P2 | — | VIGENTE |
| 16 | AUD-17 Avisos de seguridad en dependencias: inventario y alcance real | **F075** | P2 (bajó: solo 1 de 6 corre en la app) | — | VIGENTE |
| 17 | AUD-18 Medición de costos, índices versionados y controles operativos de Firebase | **F076** | P2/P3 | — | VIGENTE |

Todas las features nuevas nacen en estado `pending`. Al empezar una, pásala a `in_progress` (solo puede haber una) y, al cerrarla, a `done` con su entrada en `progress/history.md`.

## 3. Orden de trabajo acordado con el usuario (2026-10-08)

| Paquete | Hallazgos | Notas |
|---|---|---|
| A. Rápidas y acotadas | AUD-13 → AUD-14 (Lugares) | Marca inicial y último tramo de listas; riesgo bajo. |
| B. Integridad de tratamientos | AUD-01 → AUD-02 → AUD-03 | Definir ids y migración antes de optimizar sincronizaciones; AUD-03 depende de AUD-01. |
| C. Consistencia y limpieza | AUD-07, AUD-15 | AUD-15 comparte modelo de padre/adjunto con AUD-02. |
| D. Costo de lecturas | AUD-12 → AUD-08, AUD-09, AUD-10 → AUD-11 | Vigencia/índices y marca inicial antes de agregaciones; preservar aislamiento por uid. |
| E. Decisiones de producto o despliegue | AUD-04, AUD-05 (F040), AUD-06, AUD-16, AUD-18 | No se inventan: cada una pide una decisión del usuario o un despliegue autorizado. |
| F. Dependencias | AUD-17 | Adelantar si la revisión de exposición cambia (hoy solo 1 de 6 corre en la app). |

Se empezó por **F060 (AUD-13)**. Las decisiones de producto (§5) no bloquean los paquetes A y D salvo donde se indica.

## 4. Fichas

### AUD-05 — Firebase App Check

- **Feature:** F040 (ya existía) · **Prioridad:** P2 · **Evidencia:** Riesgo de diseño; consola no inspeccionada
- **Estado hoy:** VIGENTE: no hay ninguna integración de App Check en el cliente (ya era F040).

**Archivos y símbolos** (rutas desde `apps/mobile/src/modules/` salvo que se indique otra):

- auth/infrastructure/firebase.ts
- apps/mobile/package.json
- docs/generado/seguridad-bola.md

**Problema:** Un cliente externo con credenciales válidas puede intentar consumir los servicios fuera de la app legítima. La API key de Firebase es configuración pública: su presencia no es una fuga ni concede acceso a otra cuenta.

**Propuesta:** Estudiar una integración compatible con Expo SDK instalado, Firebase JS SDK, iOS y Android (no trasladar sin verificar un ejemplo web con reCAPTCHA a React Native). Build de desarrollo, credenciales de depuración fuera de Git, estrategia de renovación y sin conexión. Observar métricas antes de exigir tokens; separar el cambio de código de la habilitación en consola; documentar la reversa y pedir el despliegue al usuario.

**Pruebas a escribir primero:** cliente legítimo permitido; llamada sin atestación rechazada al exigirla; reglas de uid intactas; sin interrupciones no previstas.

**Decisiones que NO debe inventar la IA:** Cuándo activar el enforcement y qué hacer con clientes antiguos; Configuración en la consola de Firebase

### AUD-13 — Inicializar `hasPrescription` al crear una consulta

- **Feature:** F060 · **Prioridad:** P2 · **Evidencia:** Confirmado por código
- **Estado hoy:** VIGENTE (2026-10-08, main 137a075): solo `FirestoreRecetaRepository` escribe `hasPrescription` (true al guardar receta, false al quitarla); el documento de una consulta nueva no la trae.

**Archivos y símbolos** (rutas desde `apps/mobile/src/modules/` salvo que se indique otra):

- consultas/infrastructure/documentoDeConsulta.ts
- consultas/infrastructure/FirestoreConsultasRepository.ts
- consultas/infrastructure/FirestoreRecetaRepository.ts (guardar/quitar: lote receta + marca)
- medicos/infrastructure/FirestoreConsultasDeMedicosRepository.ts (`totales()` rellena la marca a las consultas sin ella)

**Problema:** La consulta nueva no lleva `hasPrescription`; `totales()` la trata como antigua, lee su receta y escribe la marca. Ocurre con consultas nuevas, no solo con las anteriores a F048.

**Propuesta:** Marcar `hasPrescription: false` en consultas genuinamente nuevas. No sobrescribir un `true` al reintentar la creación de una consulta que ya existe. Revisar la carrera entre el relleno antiguo y el guardado de receta: un resultado leído antes no debe pisar una marca más reciente. Conservar el lote atómico receta + marca.

**Pruebas a escribir primero:** consulta nueva; Perfil tras crear; añadir/quitar receta; migración de registros anteriores sin marca; relleno que falla; reenvío de una consulta ya creada; modificación concurrente (emulador).

**Aceptación:**

- Una consulta nueva se guarda con `hasPrescription: false` y el Perfil no lee ni escribe nada de relleno por ella (pruebas, vistas en rojo primero).
- Reintentar crear una consulta que ya tenía receta no baja la marca `true` a `false`.
- Los registros anteriores sin marca siguen siendo compatibles y se rellenan una sola vez, sin pisar una marca más reciente.
- Pruebas contra el emulador de Firestore (`pnpm --filter mobile test:emulator`) para creación, receta y relleno.

**Decisiones que NO debe inventar la IA:** ninguna.

### AUD-14 — Virtualizar la lista de Lugares (último tramo de P-03)

- **Feature:** F061 · **Prioridad:** P2 · **Evidencia:** Confirmado por código; impacto sin medir
- **Estado hoy:** PARCIAL: F057 (P-03) convirtió Médicos y Elegir médico a `FlatList`. FALTA `LugaresScreen.tsx` (sigue con `ScrollView` + `lugares?.map()`).

**Archivos y símbolos** (rutas desde `apps/mobile/src/modules/` salvo que se indique otra):

- medicos/presentation/LugaresScreen.tsx
- medicos/presentation/listasVirtualizadas.test.ts (prueba que lee el código; ampliarla a Lugares)

**Problema:** Lugares dibuja todas sus filas a la vez dentro de un `ScrollView` que además contiene el formulario de agregar y otros bloques.

**Propuesta:** `FlatList` con `ListHeaderComponent` (formulario/explicación) y claves estables. Evitar listas virtualizadas anidadas en un `ScrollView` del mismo eje. No añadir memorización masiva sin medir (React Compiler está habilitado).

**Pruebas a escribir primero:** muchos lugares sintéticos; agregar/renombrar/eliminar; teclado abierto; accesibilidad; modo oscuro; volver conservando la posición.

**Aceptación:**

- `LugaresScreen` usa `FlatList` con `keyExtractor` estable y no `ScrollView` + `.map()` (prueba que lee el código, en rojo primero).
- Agregar, renombrar y eliminar un lugar, el teclado y el botón de volver funcionan igual que antes (verificado por el usuario en el iPhone).

**Decisiones que NO debe inventar la IA:** ninguna.

### AUD-01 — Identidad estable de medicamentos y tomas (no depender de la posición)

> **Resuelto en F062 (2026-10-08).** Cada medicamento lleva un `id` propio; el id de la toma es `toma-{consulta}-{idMedicamento}-{hora}` y el del recordatorio `{consulta}_{idMedicamento}` (sin cambiar reglas). Decisiones del usuario: cambiar el nombre con dosis ya marcadas = medicamento nuevo; corregirlo sin dosis marcadas, o cambiar dosis/frecuencia/duración = el mismo; las marcas de un medicamento que sale de la receta se borran; sin compatibilidad con datos antiguos. Pendiente aparte: al eliminar una consulta completa sus marcas siguen sin borrarse.

- **Feature:** F062 · **Prioridad:** P1 · **Evidencia:** Reproducido en memoria (auditoría); verificado por lectura de código el 2026-10-08
- **Estado hoy:** **RESUELTO en F062 (2026-10-08, ver abajo).** Estado original: `idDeToma` = `toma-{consultaId}-{indice}-{aaaammddhhmm}`; el medicamento no tiene id propio; `conservaInicio` compara posición y nombre; `idDeRecordatorio` = `{consultaId}_{indice}`.

**Archivos y símbolos** (rutas desde `apps/mobile/src/modules/` salvo que se indique otra):

- consultas/domain/Toma.ts (`idDeToma`, `RecordatorioDeToma`, `avisosDeTomaConInsistencia`)
- consultas/domain/TomasDelDia.ts (`tomasDelDia` busca marcas solo por `tomaId`)
- consultas/domain/Receta.ts (el medicamento no tiene id)
- consultas/application/GuardarReceta.ts (`conservaInicio`)
- consultas/infrastructure/documentoDeRecordatorio.ts (`idDeRecordatorio`)
- consultas/infrastructure/FirestoreRegistroDeTomasRepository.ts
- firebase/firestore.rules (`recetaValida`, `recordatorioValido`, `tomaValida`)

**Problema:** Una dosis de un medicamento nuevo puede aparecer como tomada por reutilizar la marca de otro que ocupaba la misma posición y hora. Quitar una fila puede reiniciar la fecha de inicio de las siguientes.

**Propuesta:** Dar identidad estable a cada elemento de receta (y, si procede, al episodio de tratamiento); el orden visual no puede formar parte de la identidad. No basta con añadir el nombre al id (cambian y se repiten). Diseñar la lectura de recetas antiguas sin ids y la cancelación de avisos con el formato anterior. No reasignar dosis antiguas por coincidencia de índice.

**Pruebas a escribir primero:** sustitución A→B en misma fila y hora (el caso reproducido: B no debe salir tomado); quitar la primera de tres filas; reordenar; dos medicamentos con igual nombre; guardar sin cambios; cancelar/posponer con ids nuevos; lectura de datos anteriores; reglas y repositorios (emulador).

**Aceptación:**

- Ninguna marca de toma de A se aplica a B aunque ocupe la misma posición y hora (prueba de dominio escrita primero).
- Mover o quitar otra fila no reinicia la fecha de inicio del tratamiento de un medicamento que sigue siendo el mismo.
- Las recetas y tomas anteriores se interpretan de forma explícita (migración o compatibilidad documentada) y los avisos antiguos no reaparecen.
- Cubierto en dominio, repositorios y reglas (emulador) y verificado en el iPhone.

**Decisiones que NO debe inventar la IA:** Qué cambios crean un tratamiento nuevo (cambiar dosis, frecuencia o duración) frente a editar el mismo; Cómo tratar el historial de tomas ya registrado con el formato antiguo

### AUD-02 — Borrado de cuenta que alcance descendientes con padre inexistente

- **Feature:** F063 · **Prioridad:** P1 · **Evidencia:** Reproducido en memoria (auditoría) + semántica documentada de Firestore; la lectura de código del 2026-10-08 lo respalda
- **Estado hoy:** VIGENTE: `eliminarSubarbol` recorre `ARBOL_DE_CUENTA` listando solo documentos existentes (`getDocs`); `.../prescriptions/receta` puede no existir mientras `.../attachments/foto` sí.

**Archivos y símbolos** (rutas desde `apps/mobile/src/modules/` salvo que se indique otra):

- auth/infrastructure/eliminarSubarbol.ts (`vaciarColecciones`, `ARBOL_DE_CUENTA`)
- auth/infrastructure/FirestoreEliminadorDeDatos.ts (`listarIds` con `getDocs`)
- consultas/infrastructure/FirestoreFotoDeRecetaRepository.ts (guarda el adjunto sin crear necesariamente la receta padre)
- consultas/infrastructure/FirestoreRecetaRepository.ts (`quitar` borra la receta y conserva sus subcolecciones)
- Prueba a ampliar: el fixture del emulador crea la receta padre y por eso no detecta esta variante

**Problema:** Puede confirmarse la eliminación de la cuenta dejando metadatos del adjunto en Firestore (la imagen de Storage se borra con un recorrido independiente; no se demostró que sobreviva). Firestore no lista descendientes de un documento que no existe y borrar un padre no borra sus descendientes.

**Propuesta:** Con el modelo de ids fijos, recorrer explícitamente los adjuntos de `receta` aunque ese documento no exista. Evaluar también el caso de visita inexistente (las reglas actuales permiten ciertos descendientes sin comprobar el padre). Un borrado general robusto puede requerir un inventario explícito o un proceso servidor. Endurecer reglas previene casos nuevos pero no limpia los anteriores.

**Pruebas a escribir primero:** foto sin medicamentos; foto tras quitar todos los medicamentos; jerarquía normal; operación interrumpida y reintentada; otra cuenta intacta; usuario ajeno bloqueado; visita ausente con hijos preexistentes si ese estado sigue siendo admisible.

**Aceptación:**

- Una regresión de emulador con foto bajo una receta inexistente falla antes del cambio y pasa después.
- Tras el borrado se comprueban directamente las rutas hoja: no queda ningún documento ni archivo del fixture, y otra cuenta queda intacta.
- La baja mantiene su reautenticación y su comprobación de uid. Probar solo con datos sintéticos y un proyecto `demo-*`, NUNCA con la cuenta real.

**Decisiones que NO debe inventar la IA:** Si se endurecen las reglas para exigir el padre (afecta compatibilidad); Si se acepta un inventario explícito del árbol o hace falta un proceso servidor

### AUD-03 — Guardar receta y recordatorios como una sola unidad

- **Feature:** F064 · **Prioridad:** P1 · **Evidencia:** Confirmado por código
- **Depende de:** F062
- **Estado hoy:** VIGENTE: `GuardarReceta` guarda/quita la receta (lote con la marca) y DESPUÉS llama a `recordatorios.reemplazarDe(...)`; un fallo en el segundo paso deja el primero hecho.

**Archivos y símbolos** (rutas desde `apps/mobile/src/modules/` salvo que se indique otra):

- consultas/application/GuardarReceta.ts
- consultas/infrastructure/FirestoreRecetaRepository.ts
- consultas/infrastructure/FirestoreRecordatoriosDeTomaRepository.ts (`reemplazarDe`)
- consultas/application/EliminarConsulta.ts (también son pasos sucesivos)

**Problema:** Receta y recordatorios pueden quedar de versiones distintas. En eliminar consulta también hay pasos sucesivos; no confundir la protección parcial existente con atomicidad total.

**Propuesta:** Un puerto de aplicación que persista receta, marca y recordatorios como unidad con una operación atómica adecuada. Si se leen documentos para calcular diferencias, evaluar concurrencia y transacción: un batch no elimina todas las carreras. Las notificaciones del sistema se actualizan después del commit y necesitan reconciliación si falla ese paso.

**Pruebas a escribir primero:** fallo antes del commit; commit rechazado; actualización concurrente; operación vacía; máximo de medicamentos; app cerrada tras persistir y antes de programar avisos; reintento idempotente; quitar la receta.

**Aceptación:**

- Si falla cualquier parte, receta y recordatorios remotos siguen siendo de la misma versión (prueba con fallo inyectado entre pasos, vista en rojo primero).
- No se anuncia éxito parcial y reprogramar los avisos es idempotente.
- Un fallo nativo posterior al commit se informa o se recupera sin deshacer datos correctos.
- Confirmar los límites vigentes de operaciones y de accesos documentales de reglas.

**Decisiones que NO debe inventar la IA:** ninguna.

### AUD-07 — Política y limpieza de datos locales (borradores, caché, cifrado)

- **Feature:** F065 · **Prioridad:** P2 · **Evidencia:** Confirmado por código; política pendiente
- **Estado hoy:** VIGENTE: al cerrar sesión se limpia `copiaLocal`, cola, preferencia del candado y caché de fotos, pero NO el repositorio de borradores; la baja de cuenta sí borra el borrador (`EliminadorConBorradores`). SQLite sin cifrado adicional.

**Archivos y símbolos** (rutas desde `apps/mobile/src/modules/` salvo que se indique otra):

- app/container.ts (lista de limpieza de `SesionQueCancelaAvisos`; `EliminadorConBorradores`)
- consultas/infrastructure/SesionQueCancelaAvisos.ts, EliminadorConBorradores.ts
- consultas/infrastructure/SqliteBorradorRepository.ts, SqliteColaDeEnvioRepository.ts, SqliteCopiaLocal.ts, baseSqliteNativa.ts
- consultas/infrastructure/CacheDeFotosEnDisco.ts

**Problema:** Un borrador de salud no enviado puede sobrevivir a un cierre de sesión (y verlo otra cuenta en el mismo teléfono). SQLite guarda JSON/texto de salud sin cifrado adicional; las fotos en caché son JPEG. El sandbox del sistema operativo sigue protegiendo: no afirmar que otra app pueda leerlos. Los fallos de limpieza se registran y no impiden salir.

**Propuesta:** Definir retención al cerrar sesión, al cambiar de cuenta y al eliminarla. Si se exige protección adicional, evaluar SQLCipher o cifrado por registro con claves en SecureStore y migración de bases existentes; SQLCipher no cifra los JPEG externos. No añadir dependencia ni recompilar hasta que la política lo requiera. No prometer borrado forense por ejecutar un `DELETE`.

**Pruebas a escribir primero:** A cierra y B inicia; A vuelve; borrador no enviado; limpieza que falla; proceso que termina durante la limpieza; operaciones en vuelo que repueblan la caché tras limpiar; base cifrada antigua/nueva si se adopta.

**Aceptación:**

- La política de retención queda documentada y probada; ningún dato de la cuenta A es visible para B (pruebas de limpieza escritas primero).
- Si hay borrador sin enviar al cerrar sesión, el usuario recibe la advertencia o el tratamiento decidido.
- Todos los depósitos locales se limpian de forma coherente y una limpieza que falla no deja datos a medias sin avisar.

**Decisiones que NO debe inventar la IA:** Retener o borrar borradores al cerrar sesión; Si se exige cifrado local adicional, con qué mecanismo y cómo se recuperan las claves

### AUD-15 — Consistencia de la foto de receta entre Storage, Firestore y caché

- **Feature:** F066 · **Prioridad:** P2 · **Evidencia:** Confirmado por código
- **Depende de:** F063
- **Estado hoy:** VIGENTE (F055/F056 solo agregaron avisos de quitar y subir). `guardar` sube a Storage y después escribe Firestore; `quitar` borra Firestore y después Storage. Además, si la nube confirma que ya no hay foto (`deLaNube` devuelve null) la copia del teléfono no se invalida: sin internet podría reaparecer una foto ya quitada desde otro aparato.

**Archivos y símbolos** (rutas desde `apps/mobile/src/modules/` salvo que se indique otra):

- consultas/infrastructure/FirestoreFotoDeRecetaRepository.ts (`guardar`, `quitar`, `obtener`, `deLaNube`, `deLaCopia`, `olvidarCopia`)
- consultas/infrastructure/CacheDeFotosEnDisco.ts, documentoDeFoto.ts
- consultas/presentation/FotoDeRecetaSeccion.tsx
- firebase/storage.rules (hoy solo `receta.jpg`)

**Problema:** Firestore y Storage no comparten un commit atómico. Un fallo a medias deja un archivo nuevo sin metadatos, o un objeto huérfano si falla el borrado de Storage tras borrar el documento, o una versión de caché que aparenta seguir vigente.

**Propuesta:** Protocolo explícito con estados/versiones, operaciones idempotentes y reconciliación de archivos pendientes. Cambiar solo el orden invierte el tipo de inconsistencia. Si se suben rutas temporales o versionadas hay que cambiar y probar también las reglas de Storage. Política de limpieza de huérfanos. Invalidar la copia local cuando la lectura remota confirma que ya no hay foto.

**Pruebas a escribir primero:** fallo de Storage; fallo de Firestore tras la subida; error de caché; reemplazo desde dos dispositivos; interrupción y reintento; quitar y abrir sin internet; metadatos ausentes con objeto existente.

**Aceptación:**

- Un éxito visible implica un estado coherente; los fallos parciales son recuperables y observables (pruebas con fallos inyectados, en rojo primero).
- No hay crecimiento silencioso de archivos huérfanos y no se muestra una foto ya eliminada por una copia antigua.
- Mantener los avisos de F055/F056 (no resuelven por sí solos la consistencia remota).

**Decisiones que NO debe inventar la IA:** Si se aceptan rutas versionadas en Storage (cambia reglas y exige publicarlas); Política de limpieza de huérfanos

### AUD-12 — Filtrar consultas vigentes en el servidor y corregir la próxima cita

- **Feature:** F067 · **Prioridad:** P2 · **Evidencia:** Confirmado por código
- **Depende de:** F060
- **Estado hoy:** VIGENTE: los borrados lógicos (`deletedAt`) se descartan en el cliente para no necesitar índice compuesto; `FirestoreProximaCitaRepository` lee solo unos pocos documentos (`limit(CUANTAS)`) y no sigue buscando tras descartarlos.

**Archivos y símbolos** (rutas desde `apps/mobile/src/modules/` salvo que se indique otra):

- consultas/infrastructure/FirestoreDiarioRepository.ts (descarta borrados en el cliente; puede pedir varias páginas)
- consultas/infrastructure/FirestoreProximaCitaRepository.ts (`posterioresA`)
- medicos/infrastructure/FirestoreConsultasDeMedicosRepository.ts, FirestoreLugaresRepository.ts

**Problema:** Se descargan borradas y se descartan. La próxima cita puede ocultarse: con diez consultas eliminadas con citas futuras tempranas y una vigente posterior, devuelve cero.

**Propuesta:** Filtro de vigencia en Firestore con orden correcto e índices versionados (ver F076/AUD-18). Antes de usar `deletedAt == null`, revisar documentos antiguos sin el campo: la igualdad no normaliza los anteriores. Alternativa transitoria: paginar hasta encontrar vigentes con un límite de trabajo explícito, sin decir falsamente «no hay cita» si no se completó la búsqueda.

**Pruebas a escribir primero:** fixture de 10 borradas + 1 vigente; páginas mixtas; todas borradas; registros heredados sin campo; fechas empatadas; paginación sin duplicados ni omisiones.

**Aceptación:**

- En el fixture 10 borradas + 1 vigente, la próxima cita aparece y se programa (prueba que falla antes).
- Se reducen las lecturas de borrados; los índices quedan versionados y su despliegue se pide aparte y se registra en docs/14.

**Decisiones que NO debe inventar la IA:** Despliegue de índices (lo pide el usuario)

### AUD-08 — Contadores y resúmenes sin descargar todo el historial

- **Feature:** F068 · **Prioridad:** P1 (costo) · **Evidencia:** Confirmado por código
- **Depende de:** F060, F067
- **Estado hoy:** VIGENTE: `totales()`, `resumenPorMedico` y `consultasPorLugar` hacen `getDocs` de toda la colección `visits` (Perfil, Médicos y Lugares). F048 quitó la lectura de receta por consulta, no el recorrido.

**Archivos y símbolos** (rutas desde `apps/mobile/src/modules/` salvo que se indique otra):

- medicos/infrastructure/FirestoreConsultasDeMedicosRepository.ts (`resumenPorMedico`, `totales`)
- medicos/infrastructure/FirestoreLugaresRepository.ts (`consultasPorLugar`)
- medicos/application/ResumenDePerfil.ts, ListarDirectorio.ts

**Problema:** Con 500 consultas, abrir Perfil, Médicos y Lugares descarga unos 500 documentos cada vez para calcular números.

**Propuesta:** Por etapas: (1) totales simples de Perfil con agregaciones `count()` y filtros de vigencia y receta; (2) resúmenes con última visita y lugares: caché compartida y/o documentos de resumen por entidad; (3) si hay contadores materializados, definir inicialización, idempotencia, concurrencia, corrección al editar/borrar y reparación de desajustes (nunca confiar en contadores que mande un cliente); (4) conservar la copia coherente sin conexión y mostrar «desconocido», no cero, si faltan datos.

**Pruebas a escribir primero:** cero y cientos de consultas; borrados lógicos; quitar receta; mover médico o lugar; reintento sin conexión; dos dispositivos; datos anteriores sin marca; medir documentos descargados, no solo llamadas.

**Aceptación:**

- Con 500 consultas sintéticas, abrir Perfil no descarga los 500 documentos para mostrar sus contadores y los números coinciden con el conjunto real.
- Los números cambian correctamente al guardar, quitar y mover; se declara el costo de lectura y escritura de la solución elegida.

**Decisiones que NO debe inventar la IA:** Agregaciones `count()` frente a documentos de resumen materializados

### AUD-09 — Caché de lectura con vigencia (resto de P-06): no consultar la nube primero

- **Feature:** F069 · **Prioridad:** P1 (costo) · **Evidencia:** Confirmado por código
- **Estado hoy:** PARCIAL: F058 (P-06) evita recargar al volver a una pantalla si nada cambió y no pasó 1 minuto. FALTA que `leerConCopia` con internet siga consultando primero la nube en cada lectura (la copia solo se usa sin red o si falla).

**Archivos y símbolos** (rutas desde `apps/mobile/src/modules/` salvo que se indique otra):

- shared/kernel/leerConCopia.ts
- decoradores `*ConCopiaLocal.ts` (diario, médicos, lugares, detalle, receta, totales, salud)
- app/useRecargaAlEnfocar.ts, shared/kernel/frescura.ts, shared/kernel/versionDeDatos.ts (de F058)

**Problema:** Con conexión, cada lectura vuelve a ir a Firestore aunque la copia sea reciente. El Diario descarta lo cargado para la búsqueda al recargar.

**Propuesta:** Caché por uid y consulta con política de vigencia, invalidación tras escrituras (reutilizar `versionDeDatos`) y actualización manual. Separar «mostrar copia», «necesita actualizarse» y «consulta en curso». Compartir promesas de lecturas idénticas cuando sea correcto, nunca entre usuarios. Elegir la vigencia según el riesgo de mostrar datos viejos, sobre todo en medicamentos.

**Pruebas a escribir primero:** navegar sin cambios no repite solicitudes dentro de la ventana; editar invalida lo afectado; cambio de cuenta aísla resultados; expiración refresca; un error de permisos no se oculta con una copia; una respuesta tardía no pisa una edición más nueva; conservar scroll y páginas.

**Aceptación:**

- Un recorrido idéntico antes/después documenta el número de llamadas; sin cambios dentro de la ventana no se repiten lecturas.
- Ninguna mejora hace invisibles cambios propios ni presenta medicamentos antiguos como actuales sin señalización.

**Decisiones que NO debe inventar la IA:** Duración tolerable de datos en caché por tipo de dato (medicamentos vs. listas)

### AUD-10 — Recordatorios: lecturas compartidas, sin tratamientos terminados y cálculo acotado

- **Feature:** F070 · **Prioridad:** P1 (costo) · **Evidencia:** Confirmado por código; gasto y CPU sin medir
- **Depende de:** F062
- **Estado hoy:** VIGENTE: `FirestoreRecordatoriosDeTomaRepository.listar()` trae toda `medicationSchedules` (también tratamientos terminados); `ObtenerTomasDeHoy` y `SincronizarAvisosDeTomas` la leen por separado, con ventanas de registro de 36 y 24 horas; `SincronizarAvisosDeCitas` y `ObtenerProximaCita` leen citas por separado.

**Archivos y símbolos** (rutas desde `apps/mobile/src/modules/` salvo que se indique otra):

- consultas/presentation/DiarioScreen.tsx, useTomasDeHoy.ts, useSincronizarAvisos.ts
- consultas/application/ObtenerTomasDeHoy.ts, SincronizarAvisosDeTomas.ts, SincronizarAvisosDeCitas.ts
- consultas/infrastructure/FirestoreRecordatoriosDeTomaRepository.ts
- consultas/domain/Toma.ts (genera dosis del tratamiento completo y luego filtra)

**Problema:** Lecturas duplicadas de la misma instantánea, descarga de tratamientos vencidos y cálculo de dosis de todo el tratamiento. La cola serializa ejecuciones pero no elimina las redundantes.

**Propuesta:** Instantánea compartida por usuario y ciclo, filtro de tratamientos relevantes por fecha y una ventana común de registros. Generar solo las fechas necesarias. Agrupar eventos simultáneos sin perder un cambio que llega durante una sincronización (versión/invalidación pendiente y segunda ejecución si hubo una escritura nueva). Una promesa compartida de un resultado anterior no incluye una toma recién guardada.

**Pruebas a escribir primero:** cien tratamientos vencidos y dos vigentes; volver de segundo plano y enfocar casi a la vez; marcar durante una sincronización; cruzar medianoche; cambio de zona horaria; retirar receta; permisos denegados.

**Aceptación:**

- Los tratamientos vencidos no se vuelven a descargar innecesariamente y no se duplican lecturas de la misma instantánea.
- Los avisos reflejan la última escritura; se verifica también el costo de los índices elegidos y se mide antes/después.

**Decisiones que NO debe inventar la IA:** ninguna.

### AUD-11 — Búsqueda del Diario sin descargar todo el historial cada vez

- **Feature:** F071 · **Prioridad:** P2 · **Evidencia:** Confirmado por código
- **Depende de:** F069
- **Estado hoy:** VIGENTE: `CargarTodoElDiario` recorre por páginas hasta `MAXIMO_DE_CONSULTAS_A_BUSCAR = 2000` consultas válidas; el Diario invalida la lista al recargar.

**Archivos y símbolos** (rutas desde `apps/mobile/src/modules/` salvo que se indique otra):

- consultas/application/CargarTodoElDiario.ts
- consultas/presentation/DiarioScreen.tsx (`cargarTodas`)
- consultas/infrastructure/DiarioConCopiaLocal.ts (la copia offline guarda solo la primera página)

**Problema:** Cada búsqueda tras una recarga vuelve a descargar hasta 2,000 consultas (el límite cuenta válidas; el repositorio puede leer borradas adicionales).

**Propuesta:** Índice local de los campos de búsqueda con sincronización incremental. Conservar el alcance acordado: médico, especialidad y lugar; no extender a motivo/notas clínicas sin nueva decisión. Considerar `updatedAt`, denormalizaciones, tombstones y eliminaciones físicas; NO basar el algoritmo incremental en el `updatedAt` del documento padre sin corregir y probar esa invariancia (hoy no todas las operaciones lo cambian).

**Pruebas a escribir primero:** búsqueda repetida; regreso del detalle; cambio de médico/lugar; edición y borrado; más de 2,000 elementos; pérdida de conexión; copia parcial.

**Aceptación:**

- Repetir búsquedas con datos sin cambios no descarga otra vez el historial; los resultados reflejan modificaciones y señalan cualquier límite real.
- Si los datos disponibles son parciales, la pantalla lo comunica.

**Decisiones que NO debe inventar la IA:** Si se amplía el alcance de búsqueda más allá de médico, especialidad y lugar

### AUD-04 — Candado: un fallo al inicializarlo no debe dejar la app abierta

- **Feature:** F072 · **Prioridad:** P2 · **Evidencia:** Confirmado por código (es una decisión de diseño explícita, no un descuido)
- **Estado hoy:** VIGENTE: en `CandadoProvider`, si `obtenerEstado.ejecutar()` rechaza, se hace `setBloqueada(false)` con el comentario «Sin poder leer el candado no se deja a la persona fuera de su app». Una preferencia dañada también se interpreta como apagada.

**Archivos y símbolos** (rutas desde `apps/mobile/src/modules/` salvo que se indique otra):

- auth/presentation/CandadoProvider.tsx
- auth/application/ObtenerEstadoDelCandado.ts (`Promise.all` de preferencia + disponibilidad)
- auth/infrastructure/preferenciaDelCandado.ts, SecurePreferenciaDelCandado.ts

**Problema:** Exposición local del contenido de una sesión guardada cuando falla un componente de protección. No se demostró un bypass remoto ni acceso entre cuentas.

**Propuesta:** Distinguir «candado apagado de forma expresa», «primera configuración» y «no se pudo comprobar». En el último caso mantener una pantalla segura con reintento y cierre de sesión. No tratar falta de hardware y fallo transitorio como lo mismo. Definir si las acciones de notificaciones deben esperar al desbloqueo (hoy los hooks de avisos se montan con sesión activa). Cuidado: no crear una pantalla irrecuperable para quien nunca activó el candado.

**Pruebas a escribir primero:** fallo de SecureStore; fallo de disponibilidad; preferencia corrupta; usuario nuevo; candado apagado; Face ID cancelado; código del dispositivo si está permitido; transición background/active.

**Aceptación:**

- Un error de inicialización no muestra información médica y existe una recuperación comprensible (reintentar o cerrar sesión).
- Quien nunca activó el candado no se queda fuera. Validado en el iPhone (no solo con funciones puras).

**Decisiones que NO debe inventar la IA:** Cambiar la política actual (abrir ante un error) a cerrar ante un error: es un compromiso entre seguridad y no dejar a nadie fuera; Si las acciones de notificaciones esperan al desbloqueo

### AUD-06 — Storage: exigir la consulta propia y acotar el volumen por cuenta

- **Feature:** F073 · **Prioridad:** P2 · **Evidencia:** Confirmado en reglas locales
- **Depende de:** F040
- **Estado hoy:** VIGENTE: `firebase/storage.rules` valida dueño, `image/jpeg` y 5 MB solo en `mediq_users/{uid}/visits/{consultaId}/receta.jpg`; no exige que la consulta exista y no hay cuota acumulada propia.

**Archivos y símbolos** (rutas desde `apps/mobile/src/modules/` salvo que se indique otra):

- firebase/storage.rules
- firebase/firestore.rules (referencias a consultas)
- consultas/infrastructure/FirestoreFotoDeRecetaRepository.ts

**Problema:** Un cliente autenticado podría subir muchos archivos con `consultaId` arbitrarios. Las cuotas y configuraciones externas no se comprobaron.

**Propuesta:** Exigir referencia válida a la consulta propia donde sea viable (verificar la API vigente de consultas cruzadas en reglas de Storage y su costo de lecturas) y definir el volumen admisible por usuario. La validación en la interfaz no es un control antiabuso. App Check y la existencia del padre tampoco limitan por sí solos un número ilimitado de consultas válidas.

**Pruebas a escribir primero:** visita inexistente; visita ajena; archivo válido; tamaño excesivo; tipo inválido; reemplazo; baja completa; si hay cuota: concurrencia y reservas fallidas.

**Aceptación:**

- No se puede usar Storage como depósito arbitrario y el límite elegido se aplica en una capa confiable (pruebas de reglas con emulador).
- Se cuantifican las lecturas adicionales de validación y el borrado autorizado sigue funcionando. Publicar reglas SOLO si el usuario lo pide y se registra en docs/14.

**Decisiones que NO debe inventar la IA:** Cuota por cuenta y qué pasa al alcanzarla; Mecanismo confiable para hacerla cumplir sin que el cliente manipule el contador

### AUD-16 — Horizonte real de las notificaciones de toma y mensajes honestos

- **Feature:** F074 · **Prioridad:** P2 · **Evidencia:** Límite conocido del diseño
- **Estado hoy:** VIGENTE: `PRESUPUESTO_DE_TOMAS = 40` (≈ 20 dosis con sus insistencias); se programan las próximas y se rellenan al abrir o volver a la app; las citas usan otro presupuesto.

**Archivos y símbolos** (rutas desde `apps/mobile/src/modules/` salvo que se indique otra):

- consultas/domain/Toma.ts (`PRESUPUESTO_DE_TOMAS`, `avisosDeToma`)
- consultas/application/SincronizarAvisosDeTomas.ts
- consultas/infrastructure/ProgramadorDeAvisosExpo.ts
- consultas/presentation/useSincronizarAvisos.ts

**Problema:** Un medicamento cada ocho horas puede consumir unas veinte dosis en menos de siete días; varios tratamientos acortan el horizonte. No se puede prometer avisos indefinidos si el usuario no reabre la app. Los límites del sistema operativo deben verificarse en la documentación y el dispositivo actuales.

**Propuesta:** Mostrar la cobertura y la necesidad de reabrir; reconsiderar el presupuesto de insistencias; evaluar programación repetitiva con finalización correcta; estudiar un servicio remoto si el producto exige mayor garantía. Una tarea en segundo plano no debe presentarse como ejecución garantizada por iOS.

**Pruebas a escribir primero:** máximo de citas y medicamentos; tratamientos largos; pospuestos; dosis tomadas antes de tiempo; reinicio; permisos revocados; varios días sin abrir; cambio de zona horaria.

**Aceptación:**

- La cobertura real es medible, los mensajes son honestos y ninguna promesa excede las garantías del diseño. Requiere decisión de producto además de código.

**Decisiones que NO debe inventar la IA:** Qué garantía de avisos ofrece el producto sin reabrir la app; Si se justifica un servicio remoto

### AUD-17 — Avisos de seguridad en dependencias: inventario y alcance real

- **Feature:** F075 · **Prioridad:** P2 (bajó: solo 1 de 6 corre en la app) · **Evidencia:** `pnpm audit --prod --json` (reproducido el 2026-10-08) + `pnpm why`
- **Estado hoy:** VIGENTE: 6 avisos (3 altos, 2 moderados, 1 bajo). Alcance por cadena de dependencias: node-forge ← @expo/cli (herramienta de desarrollo); braces ← micromatch ← metro (desarrollo); uuid 7.0.3 ← xcode ← @expo/config-plugins (compilación); @grpc/grpc-js 1.9.16 ← @firebase/firestore (la entrada de React Native es `index.rn.js`; NO confirmado que no entre al bundle); decode-uri-component 0.2.2 ← query-string ← expo-router (SÍ corre en la app; moderado).

**Archivos y símbolos** (rutas desde `apps/mobile/src/modules/` salvo que se indique otra):

- pnpm-lock.yaml
- apps/mobile/package.json
- package.json (raíz; overrides si hicieran falta)

**Problema:** Seis advisories transitivos: uuid GHSA-w5hq-g745-h8pq (moderada, >=11.1.1), decode-uri-component GHSA-vcc3-ghjq-m6fr (moderada, >=0.5.0), @grpc/grpc-js GHSA-m9gg-hp2v-232j (alta) y GHSA-f596-whhp-79r4 (baja) (>=1.13.6), node-forge GHSA-86w9-cpqp-85rv (alta, sin parche indicado), braces GHSA-vfj7-8cjw-p6xm (alta, sin parche indicado).

**Propuesta:** Inventario con estado por aviso: «corregido», «no alcanzable en este contexto, con evidencia» o «pendiente con mitigación». Confirmar con el bundle si grpc-js entra al app. Actualizar primero el padre o SDK compatible antes de imponer overrides; no saltar versiones mayores a ciegas ni usar reparaciones forzadas. Si no hay parche, documentar mitigación y seguimiento sin afirmar que se corrigió.

**Pruebas a escribir primero:** `pnpm audit --prod` antes y después; `pnpm why` por paquete; login, Firebase, navegación, fotos y compilación no regresan.

**Aceptación:**

- Cada uno de los 6 avisos tiene su estado y su evidencia (inventario en docs/18 o en docs/17).
- Lockfile coherente; login, Firebase, navegación, fotos y la compilación no regresan. Quitar un aviso del reporte no sustituye la validación funcional.

**Decisiones que NO debe inventar la IA:** ninguna.

### AUD-18 — Medición de costos, índices versionados y controles operativos de Firebase

- **Feature:** F076 · **Prioridad:** P2/P3 · **Evidencia:** Consola y métricas pendientes; sin `firestore.indexes.json` en el repo
- **Estado hoy:** VIGENTE: `firebase.json` solo declara reglas y emuladores; no hay índices versionados. El proyecto de pruebas es compartido con otra app (docs/14).

**Archivos y símbolos** (rutas desde `apps/mobile/src/modules/` salvo que se indique otra):

- firebase.json
- firebase/firestore.rules
- docs/14-publicacion-y-proyecto-firebase.md
- docs/17-auditoria-de-performance.md

**Problema:** No hay línea base de lecturas por pantalla ni índices en el repo; no se comprobó la consola ni la facturación real. No inventar un costo mensual sin región, usuarios y métricas.

**Propuesta:** Medir por pantalla/operación (consultas, documentos, escrituras, fallos, tiempos, bytes de fotos) sin registrar contenido clínico, correos ni tokens. Separar tráfico de desarrollo y producción. Versionar índices compuestos y exenciones. Contabilizar las lecturas de `exists()/get()` de las reglas. Las alertas de presupuesto no frenan el gasto. No desactivar facturación de un proyecto compartido como reacción automática. Documentar región, cuotas, retención, respaldos y reglas desplegadas cuando haya acceso autorizado.

**Pruebas a escribir primero:** línea base antes/después reproducible (fixtures de 0, 20, 500 y 2,500 consultas).

**Aceptación:**

- Línea base y comparación reproducibles, fuentes de costo identificadas y configuración operativa verificable. Ninguna publicación sin solicitud del usuario y registro en docs/14.

**Decisiones que NO debe inventar la IA:** Cuándo migrar al proyecto Firebase propio de MediQ (las cuentas y datos no se trasladan cambiando una variable)

## 5. Decisiones de producto pendientes (consolidado)

| Decisión | Hallazgo |
|---|---|
| Cuándo activar el enforcement y qué hacer con clientes antiguos | AUD-05 (F040) |
| Configuración en la consola de Firebase | AUD-05 (F040) |
| Qué cambios crean un tratamiento nuevo (cambiar dosis, frecuencia o duración) frente a editar el mismo | AUD-01 (F062) |
| Cómo tratar el historial de tomas ya registrado con el formato antiguo | AUD-01 (F062) |
| Si se endurecen las reglas para exigir el padre (afecta compatibilidad) | AUD-02 (F063) |
| Si se acepta un inventario explícito del árbol o hace falta un proceso servidor | AUD-02 (F063) |
| Retener o borrar borradores al cerrar sesión | AUD-07 (F065) |
| Si se exige cifrado local adicional, con qué mecanismo y cómo se recuperan las claves | AUD-07 (F065) |
| Si se aceptan rutas versionadas en Storage (cambia reglas y exige publicarlas) | AUD-15 (F066) |
| Política de limpieza de huérfanos | AUD-15 (F066) |
| Despliegue de índices (lo pide el usuario) | AUD-12 (F067) |
| Agregaciones `count()` frente a documentos de resumen materializados | AUD-08 (F068) |
| Duración tolerable de datos en caché por tipo de dato (medicamentos vs. listas) | AUD-09 (F069) |
| Si se amplía el alcance de búsqueda más allá de médico, especialidad y lugar | AUD-11 (F071) |
| Cambiar la política actual (abrir ante un error) a cerrar ante un error: es un compromiso entre seguridad y no dejar a nadie fuera | AUD-04 (F072) |
| Si las acciones de notificaciones esperan al desbloqueo | AUD-04 (F072) |
| Cuota por cuenta y qué pasa al alcanzarla | AUD-06 (F073) |
| Mecanismo confiable para hacerla cumplir sin que el cliente manipule el contador | AUD-06 (F073) |
| Qué garantía de avisos ofrece el producto sin reabrir la app | AUD-16 (F074) |
| Si se justifica un servicio remoto | AUD-16 (F074) |
| Cuándo migrar al proyecto Firebase propio de MediQ (las cuentas y datos no se trasladan cambiando una variable) | AUD-18 (F076) |

Además: **borrado lógico → físico** y retención definitiva de datos no se cambian sin autorización del usuario.

## 6. Protecciones y mejoras existentes que deben conservarse

- Datos bajo `mediq_users/{uid}` con comprobación del dueño; sin comodines permisivos.
- Comparación del uid de sesión con Firebase Auth y reautenticación al eliminar la cuenta.
- Comprobación de referencias y consentimiento en las reglas.
- Foto JPEG con límite de tamaño, compresión a 1,600 px y descarga autenticada; la ruta la calcula la app. Caché de fotos versionada y separada por usuario (F051): no volver a bajar/codificar la imagen en cada apertura.
- Marca `hasPrescription` actualizada junto con la receta (F048): corregir sus bordes sin deshacerla.
- Paginación por cursores (no offsets). Copias offline y cola con ids reservados e idempotencia real.
- Accesibilidad, tema intercambiable y oscuro (F054), avisos de foto (F055/F056), listas virtualizadas (F057), recarga solo si cambió algo (F058) y tope del parpadeo (F059).
- No reabrir hipótesis ya descartadas en `docs/17-auditoria-de-performance.md` (imports, bundle, long polling) sin evidencia nueva.

## 7. Matriz mínima de pruebas por PR y medición

1. **Dominio:** ids estables, fechas, conservación de tratamiento, resultados deterministas.
2. **Aplicación:** fallos entre pasos, reintentos, doble envío y concurrencia (no solo el camino feliz).
3. **Persistencia:** crear, editar, borrar, datos anteriores y aislamiento entre cuentas A/B.
4. **Reglas en emulador:** propio, otro usuario, sin autenticar, campos inválidos, referencias inexistentes, consentimiento, tipos/tamaños.
5. **Sin conexión:** app abierta y arranque en frío; paso a online; caché ausente, vieja o dañada.
6. **Interfaz en dispositivo:** navegación, teclado, permisos, biometría, notificaciones y avisos de fotos cuando se afecten.
7. **Costos:** aserciones de documentos/operaciones cuando sean una garantía real + medición antes/después.
8. **Compatibilidad:** lectura de documentos anteriores, app vieja si cambian reglas, reversa de migración/despliegue.

Condición de cierre de un hallazgo: regresión vista en rojo → verde; aceptación específica cumplida; `bash scripts/init.sh` en verde; pruebas de emulador si hay persistencia o reglas (omitirlas no es aprobarlas); migración, compatibilidad, costo y fallos parciales considerados; limitaciones listadas sin marcar falsamente «hecho»; informe en español y PR contra `main`.

**Fixtures de medición** (AUD-08 a AUD-12): 0, 20, 500 y 2,500 consultas sintéticas, con borradas, recetas sin marca, fotos sin padre y tratamientos vencidos; separar frío/caliente, Debug/Release, emulador/dispositivo y conexión estable/lenta. Una llamada que devuelve 500 documentos no es una lectura facturable: contar documentos, y también lecturas de índices y de reglas. No se observó `onSnapshot` en los flujos revisados; no culpar a listeners de un costo que viene de lecturas explícitas.

Apertura del Diario (ilustrativo, sin medir): hasta siete operaciones lógicas por foco (página del diario, próximas citas ×2, recordatorios ×2 y dosis ×2) antes de F058; F058 las evita cuando nada cambió.

## 8. Referencias

- Expo SDK 57: https://docs.expo.dev/versions/v57.0.0/ · índice https://docs.expo.dev/llms.txt · SQLite https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/
- Firestore: precios https://firebase.google.com/docs/firestore/pricing · borrado https://firebase.google.com/docs/firestore/manage-data/delete-data · buenas prácticas https://firebase.google.com/docs/firestore/best-practices
- App Check https://firebase.google.com/docs/app-check · control de facturación https://firebase.google.com/docs/projects/billing/avoid-surprise-bills
- Advisories (AUD-17): GHSA-w5hq-g745-h8pq, GHSA-vcc3-ghjq-m6fr, GHSA-m9gg-hp2v-232j, GHSA-f596-whhp-79r4, GHSA-86w9-cpqp-85rv, GHSA-vfj7-8cjw-p6xm (https://github.com/advisories/<id>).
- Internas: `AGENTS.md`, `docs/README.md`, `docs/11-modelo-de-datos-firestore.md`, `docs/14-publicacion-y-proyecto-firebase.md`, `docs/17-auditoria-de-performance.md`, `docs/generado/seguridad-bola.md`, `docs/solucion-de-problemas.md`, `features.json`, `progress/`.
- Verifica de nuevo precios, APIs y avisos antes de implementar: cambian.

## 9. Registro

- 2026-10-08: documento creado a partir de la auditoría del usuario; comparación con `main` (137a075) y alta de F060–F076 y de la referencia en F040. Gate del repo al crearlo: `bash scripts/init.sh` en verde.
