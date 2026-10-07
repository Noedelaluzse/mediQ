# 10. Autenticación con Google

Google solo identifica al usuario; **Firebase Auth** verifica esa identidad y emite la sesión. Así el dominio no depende de Google ni de Firebase: agregar otro proveedor es un adaptador más.

1. La app abre el flujo nativo de Google y recibe un `idToken`.
2. La app lo entrega a Firebase Auth con `signInWithCredential(GoogleAuthProvider.credential(idToken))`.
3. Firebase verifica firma, emisor, audiencia y vigencia, y devuelve el usuario (`uid`) con un token de acceso (ID token de 1 hora) y un token de refresco.
4. El caso de uso `RegistrarCuenta` busca `mediq_users/{uid}` en Firestore; si no existe, crea la cuenta junto con su perfil propio (`patients/self`, `isSelf = true`).
5. La app guarda la sesión en `expo-secure-store`.
6. Las reglas de Firestore y de Storage autorizan con `request.auth.uid`: el cliente nunca elige de quién son los datos.
7. Al cerrar sesión (pestaña Perfil), la app cierra la sesión de Firebase (`signOut`) y de Google en el dispositivo y borra la sesión del almacén seguro. Vuelve al login.

Detalles que importan:

- En el primer inicio de sesión, la app muestra el aviso de privacidad y registra el consentimiento (`mediq_users/{uid}/consents/{documento}_{versión}`) antes de permitir guardar datos. Si cambia la versión del aviso, se vuelve a pedir.
- En el dominio, `ProveedorDeIdentidad` y `AuthRepository` son puertos; `GoogleProveedorDeIdentidad` y `FirebaseAuthRepository` son sus adaptadores.
- Pantalla de login (diseño `Login`, en el canvas de diseño): logotipo, frase de valor, tres beneficios, el botón "Continuar con Google" y los enlaces al aviso de privacidad y términos.
- Firebase y Google se configuran con variables de entorno (`EXPO_PUBLIC_*`) en `apps/mobile/.env.local`; nunca se versionan.

**Revocar la sesión: qué se hace y qué no.** Cerrar sesión borra los tokens **de este dispositivo**: el teléfono ya no tiene con qué entrar. Lo que **no** hace es invalidar en el servidor el token de acceso que ya se emitió, que caduca solo en aproximadamente una hora. Invalidarlo de inmediato exigiría una Cloud Function con Firebase Admin (`revokeRefreshTokens`), que requiere el plan Blaze y se descartó por ahora. Alternativa gratuita para más adelante, junto con afinar las reglas (capítulo 11): registrar cada inicio de sesión como una sesión activa en Firestore (`mediq_users/{uid}/sessions/{auth_time}`) y hacer que las reglas rechacen cualquier token cuya sesión esté revocada; así un token copiado deja de poder leer datos al instante, solo en el dispositivo que cerró sesión.

**Restaurar la sesión al reabrir la app (resuelto en F003).** Firebase Auth guarda su sesión solo en memoria, así que tras reiniciar la app no reconoce al usuario aunque el almacén seguro sí. Para que las lecturas de Firestore no fallen con `permission-denied`, `ObtenerSesionActual` pide un `idToken` nuevo en silencio con `GoogleSignin.signInSilently()` y repite `signInWithCredential`. Si Google ya no recuerda al usuario, la app vuelve al login. Alternativa descartada por ahora: persistir la sesión de Firebase con AsyncStorage (agrega un módulo nativo y obliga a recompilar).

**iOS.** Las reglas de App Store piden ofrecer una alternativa de inicio de sesión equivalente cuando una app usa login de terceros; lo habitual es añadir "Iniciar sesión con Apple". Revisa la pauta 4.8 vigente antes de enviar a revisión. Con los puertos anteriores, es un adaptador más (Firebase Auth también lo soporta).

**Proyecto de Firebase.** Durante el desarrollo se usa un proyecto de pruebas compartido con otra app; MediQ solo escribe bajo `mediq_users`. Antes de tener usuarios reales hay que crear el proyecto propio de MediQ y cambiar las variables de entorno (ver el capítulo 12 y la lista de pasos del capítulo 14).

**Textos legales (F033, 2026-10-06):** el aviso de privacidad y los términos están completos dentro de la app (`DocumentosLegales.ts`, versión 2026-10-06). La pantalla de aceptación los deja leer enteros y pide dos casillas independientes (la del aviso es el consentimiento expreso para datos sensibles de salud); el login y el Perfil tienen enlaces a ambos. Con la sesión iniciada y una versión nueva por aceptar, la app abre la aceptación (no el login). Detalle y revisión pendiente: `docs/legal/README.md`.

**De dónde sale el `uid` de los datos (F039, 2026-10-07).** Firebase Auth en la app **no guarda sesión** entre aperturas (`initializeAuth` sin persistencia, `firebase.ts`): la sesión vive en SecureStore y, al abrir la app, `ObtenerSesionActual` re-autentica en silencio con Google. Por eso hay dos identidades: la **sesión guardada** (SecureStore) y el **usuario de Firebase Auth** (`auth.currentUser`), que es la que ven las reglas del servidor. Todas las rutas `mediq_users/{uid}/...` se construyen con `usuarioActivoId` (`modules/auth/domain/UsuarioActivo.ts`, cableada en `usuarioId()` de `app/container.ts`):
- Si Auth y la sesión guardada tienen **el mismo** uid, se usa ese.
- Si **difieren**, se lanza `SesionDesfasadaError` y no se consulta nada (nunca se consulta con un uid distinto del de Auth).
- Si Auth **no tiene usuario** (modo simulado, o aún no se restauró al abrir), se usa el de la sesión guardada: así lo local (borradores, copia de lectura, cola de envío) sigue funcionando; Firestore igual rechaza lo no autenticado. No abre un hueco BOLA.

**`googleSub` atado al token (F042, 2026-10-07).** El documento de la cuenta (`mediq_users/{uid}`) guarda `googleSub`, el ID de Google. Las reglas exigen que sea **igual al primer elemento de `request.auth.token.firebase.identities['google.com']`**, así un cliente no puede guardar un `googleSub` ajeno (y por tanto no se puede suplantar si algún día se enlaza por ese dato). Se verificó con una sesión real en el iPhone (2026-10-07): el token trae `firebase.sign_in_provider = google.com` y `identities` con las claves `google.com` y `email`, y `identities['google.com'][0]` coincide con `user.providerData` (el `googleSub` que guarda la app). El **correo no se compara** (es informativo, no un identificador; docs/11). En las pruebas del emulador la sesión se arma con `contextoConGoogle` (`shared/testing/identidadGoogle.ts`). Si el inicio de sesión fallara tras publicar estas reglas, ver `docs/solucion-de-problemas.md` §3.33.

