# 10. Autenticación con Google

Google solo identifica al usuario; la sesión la emite tu API con tokens propios. Así la app no depende de Google después del login y agregar otro proveedor no toca el dominio.

1. La app abre el flujo nativo de Google y recibe un `idToken`.
2. La app envía `POST /auth/google` con el `idToken`.
3. La API verifica firma, emisor, audiencia y vigencia con `google-auth-library`.
4. La API busca al usuario por `google_sub`; si no existe, lo crea junto con su perfil propio.
5. La API crea una sesión y responde con un token de acceso (JWT, 15 minutos) y un token de refresco (30 días).
6. La app guarda ambos en `expo-secure-store`.
7. Ante un 401, el cliente HTTP pide `POST /auth/refresh`, recibe un par nuevo y repite la petición.
8. Al cerrar sesión, la API revoca la sesión y la app borra los tokens.

Detalles que importan:

- El token de refresco rota en cada uso y en la base solo se guarda su hash. Si llega uno ya usado, se revoca toda la sesión.
- En el primer inicio de sesión, la app muestra el aviso de privacidad y registra el consentimiento antes de permitir guardar datos.
- En el dominio, `ProveedorDeIdentidad` es un puerto; `GoogleProveedorDeIdentidad` es su adaptador.
- Pantalla de login (según el prototipo `MediQ — prototipo móvil.html`): logotipo, una frase de valor, el botón "Continuar con Google" y los enlaces al aviso de privacidad y términos.

**iOS.** Las reglas de App Store piden ofrecer una alternativa de inicio de sesión equivalente cuando una app usa login de terceros; lo habitual es añadir "Iniciar sesión con Apple". Revisa la pauta 4.8 vigente antes de enviar a revisión. Con el puerto anterior, es un adaptador más.
