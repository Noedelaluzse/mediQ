# 7. Stack técnico

Un monorepo pnpm con la app en React Native (Expo) y **Firebase como backend completo**: autenticación, base de datos y archivos. No hay API propia ni servidor que mantener. Como el acceso a datos va detrás de puertos (repositorios), cambiar de backend más adelante no toca el dominio ni las pantallas.

| Pieza | Elección | Por qué |
| --- | --- | --- |
| Monorepo | pnpm workspaces | Un repo con `apps/mobile`; si algún día hace falta lógica de servidor se agrega `functions/` |
| Lenguaje | TypeScript `strict` | Un solo lenguaje y tipos en toda la app |
| App | React Native con Expo (development build) | Cámara, galería, almacén seguro y builds sin mantener proyectos nativos a mano |
| Navegación | Expo Router | Rutas por archivo y enlaces profundos |
| Lectura de datos | SDK de Firestore detrás de repositorios | Consultas con cursor y escuchas en vivo sin servidor propio |
| Formularios | React Hook Form + Zod | Validación en el cliente; los mismos esquemas validan los documentos que se leen de Firestore |
| Login | `@react-native-google-signin/google-signin` + Firebase Auth | Flujo nativo de Google que entrega `idToken`; Firebase Auth lo verifica y emite la sesión |
| Almacén seguro | `expo-secure-store` | Keychain / Keystore para la sesión |
| Borradores locales | `expo-sqlite` | Borradores y cola de envío sin red |
| Inyección en la app | Composition root manual, expuesto por contexto de React | Sin decoradores ni `reflect-metadata`, que complican Babel y Hermes |
| Backend | Firebase: Auth, Firestore y Storage (Cloud Functions solo si hace falta) | Sin servidor propio; reglas de seguridad declarativas |
| SDK | `firebase` (JavaScript, v12 o superior) | Solo JS: no añade módulos nativos ni obliga a recompilar |
| Datos | Firestore (modo nativo) | Modelo descrito en el capítulo 11 |
| Archivos | Firebase Storage | Fotos de recetas bajo la ruta del usuario, con reglas por dueño |
| Seguridad de datos | Reglas de Firestore y de Storage, versionadas en `firebase/` | Son la **única** capa de autorización: se prueban con el emulador |
| Sesión | Firebase Auth (ID token de 1 h con renovación) | No se emiten ni verifican tokens propios |
| Pruebas | Vitest, React Native Testing Library, Maestro, emulador de Firebase para las reglas | Unitarias en dominio, componentes, flujo completo y seguridad |
| CI/CD | GitHub Actions + EAS Build | Lint, pruebas y builds de tienda |

**pnpm con React Native.** Metro resuelve mal los enlaces simbólicos de pnpm en algunas versiones. Pon `node-linker=hoisted` en `.npmrc` y confirma la recomendación vigente en la documentación de Expo para monorepos antes de fijar versiones.

**Por qué Firebase y no una API propia.** Se llega antes y sin operar servidores, y Firestore ofrece escuchas en vivo y caché. A cambio:

- Las **reglas de seguridad son la única barrera**: un error en ellas expone datos de salud, así que se escriben y se prueban con el emulador antes de publicarlas.
- Las consultas son más limitadas que en SQL (sin búsqueda de texto completo ni uniones); ver RF-17 en el capítulo 11.
- Hay dependencia del proveedor. Los repositorios como puertos reducen el costo de salir, pero no lo eliminan.
- **Firebase Storage exige el plan de pago (Blaze)**, y el costo de Firestore depende de lecturas y escrituras.
- En React Native, el SDK de JavaScript de Firebase guarda la sesión de Auth solo en memoria (para persistirla hace falta AsyncStorage, que es un módulo nativo) y Firestore no mantiene caché en disco entre arranques; ver el capítulo 10 y RNF-11.
