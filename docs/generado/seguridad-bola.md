# Auditoría BOLA (autorización a nivel de objeto) — 2026-10-07

Alcance: `firebase/firestore.rules`, `firebase/storage.rules`, `apps/mobile/src/app/container.ts`, repositorios Firestore/Storage y rutas con parámetros.
Método: lectura de código; no se ejecutaron los tests del emulador ni se probó contra el proyecto real.

## Veredicto

Hoy **no hay un BOLA explotable**: todo cuelga de `mediq_users/{uid}` y cada regla exige `request.auth.uid == uid` (`esDueno`); no hay comodines ni `collectionGroup`; Storage usa el mismo patrón y las fotos se bajan con la sesión (sin URL pública); los IDs de ruta (`id`, `consultaId`, `medicoId`) nunca se usan como `uid`; los `*.emulator.test.ts` ya incluyen casos de «otro usuario».
Lo pendiente es defensa en profundidad y la preparación de la fase 3 (perfiles de familiares), donde el riesgo BOLA sí aparece.

## Hallazgos y su feature de seguimiento

| # | Sev. | Hallazgo | Feature |
|---|---|---|---|
| 1 | Media | `patientId`, `doctorId`, `placeId`, `visitId` solo se validan como texto ≤ 64: no se comprueba que apunten a un documento propio que exista | F041 |
| 2 | Media | `storagePath` lo manda el cliente; la regla de `attachments` no obliga a que sea `mediq_users/{uid}/...` y `obtener()` lo usa en `getBytes` | F038 |
| 3 | Media | El `uid` sale de la sesión guardada en el dispositivo (`container.ts` `usuarioId()`), no de `auth.currentUser` | F039 |
| 4 | Baja | Storage acepta cualquier subruta bajo el `uid` y cualquier `image/*` (incluye SVG) | F037 |
| 5 | Baja | `googleSub` y `email` los escribe el cliente sin compararse con el token | F042 |
| 6 | Baja | Sin App Check: la API key pública deja que cualquier cliente con token llame a Firestore/Storage | F040 |
| 7 | Baja | `eliminarTodo(usuarioId)` recibe el `uid` como parámetro y corre en el cliente (protegido por reglas) | F043 |

## Reglas para todo cambio futuro

- Cada colección nueva se lista en `firestore.rules` bajo `mediq_users/{uid}` con `esDueno(uid)`; nunca un comodín `{document=**}`.
- Todo campo que sea referencia a otro documento se valida con `exists()` dentro del mismo `uid`.
- Cada regla nueva trae su test emulador «otro usuario no puede leer, crear, editar ni borrar».
- Publicar reglas solo cuando el usuario lo pida y registrarlo en `docs/14-publicacion-y-proyecto-firebase.md`.
