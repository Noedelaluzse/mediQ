# Auditoría BOLA (autorización a nivel de objeto) — 2026-10-07

Alcance: `firebase/firestore.rules`, `firebase/storage.rules`, `apps/mobile/src/app/container.ts`, repositorios Firestore/Storage y rutas con parámetros.
Método: lectura de código; no se ejecutaron los tests del emulador ni se probó contra el proyecto real.

## Veredicto

Hoy **no hay un BOLA explotable**: todo cuelga de `mediq_users/{uid}` y cada regla exige `request.auth.uid == uid` (`esDueno`); no hay comodines ni `collectionGroup`; Storage usa el mismo patrón y las fotos se bajan con la sesión (sin URL pública); los IDs de ruta (`id`, `consultaId`, `medicoId`) nunca se usan como `uid`; los `*.emulator.test.ts` ya incluyen casos de «otro usuario».
Lo pendiente es defensa en profundidad y la preparación de la fase 3 (perfiles de familiares), donde el riesgo BOLA sí aparece.

## Hallazgos y su feature de seguimiento

| # | Sev. | Hallazgo | Feature | Estado |
|---|---|---|---|---|
| 1 | Media | `patientId`, `doctorId`, `placeId`, `visitId` solo se validan como texto ≤ 64: no se comprueba que apunten a un documento propio que exista | F041 | hecha 2026-10-07 (PR pendiente de fusionar); reglas de Firestore sin publicar |
| 2 | Media | `storagePath` lo manda el cliente; la regla de `attachments` no obliga a que sea `mediq_users/{uid}/...` y `obtener()` lo usa en `getBytes` | F038 | hecha 2026-10-07 (PR #69); reglas de Firestore publicadas |
| 3 | Media | El `uid` sale de la sesión guardada en el dispositivo (`container.ts` `usuarioId()`), no de `auth.currentUser` | F039 | hecha 2026-10-07 (PR #70); solo código, sin reglas |
| 4 | Baja | Storage acepta cualquier subruta bajo el `uid` y cualquier `image/*` (incluye SVG) | F037 | hecha 2026-10-07 (PR #66); reglas de Storage publicadas |
| 5 | Baja | `googleSub` y `email` los escribe el cliente sin compararse con el token | F042 | hecha 2026-10-07 (PR pendiente de fusionar); reglas de Firestore sin publicar |
| 6 | Baja | Sin App Check: la API key pública deja que cualquier cliente con token llame a Firestore/Storage | F040 | pendiente (requiere decisión del usuario) |
| 7 | Baja | `eliminarTodo(usuarioId)` recibe el `uid` como parámetro y corre en el cliente (protegido por reglas) | F043 | pendiente (cambio chico, sin decisiones); lo de familiares pasó a docs/16 y F044–F046 |

## Reglas para todo cambio futuro

- Cada colección nueva se lista en `firestore.rules` bajo `mediq_users/{uid}` con `esDueno(uid)`; nunca un comodín `{document=**}`.
- Todo campo que sea referencia a otro documento se valida con `exists()` dentro del mismo `uid`.
- Cada regla nueva trae su test emulador «otro usuario no puede leer, crear, editar ni borrar».
- Publicar reglas solo cuando el usuario lo pida y registrarlo en `docs/14-publicacion-y-proyecto-firebase.md`.

## Familiares y compartir entre cuentas

Diseño completo en `docs/16-perfiles-familiares-y-compartir-datos.md` (el usuario pidió el 2026-10-07 soportar ambos modos). La checklist BOLA específica del modo B está en su §4.2; el trabajo se sigue en F044 (perfiles administrados), F045 (compartir en solo lectura) y F046 (compartir con edición). Las decisiones abiertas están en su §9.
