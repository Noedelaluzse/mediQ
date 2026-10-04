# 7. Stack técnico

Un monorepo pnpm con la app en React Native (Expo), una API propia en Node.js y PostgreSQL. La API propia es lo que permite cambiar el cliente a nativo después sin tocar datos ni reglas.

| Pieza | Elección | Por qué |
| --- | --- | --- |
| Monorepo | pnpm workspaces + Turborepo | Un repo para `apps/mobile`, `apps/api` y `packages/contracts` |
| Lenguaje | TypeScript `strict` en todo | Un solo lenguaje y tipos compartidos entre app y API |
| App | React Native con Expo (development build) | Cámara, galería, almacén seguro y builds sin mantener proyectos nativos a mano |
| Navegación | Expo Router | Rutas por archivo y enlaces profundos |
| Estado de servidor | TanStack Query | Caché, reintentos y lectura sin red |
| Formularios | React Hook Form + Zod | Validación con los mismos esquemas que la API |
| Login | `@react-native-google-signin/google-signin` | Flujo nativo de Google que entrega `idToken` |
| Almacén seguro | `expo-secure-store` | Keychain / Keystore para tokens |
| Borradores locales | `expo-sqlite` | Borradores y cola de envío sin red |
| Inyección en la app | Composition root manual, expuesto por contexto de React | Sin decoradores ni `reflect-metadata`, que complican Babel y Hermes |
| API | Node.js LTS + Fastify | Ligero, con validación por esquema y OpenAPI generado |
| Inyección en la API | Awilix | Contenedor sin decoradores, con alcance por petición |
| Acceso a datos | Drizzle ORM + migraciones SQL | Tipado sobre SQL explícito |
| Base de datos | PostgreSQL 16 o superior | Requisito del proyecto |
| Archivos | S3 con URLs firmadas | Bucket privado; la base solo guarda la llave |
| Tokens | `jose` (JWT) + `google-auth-library` | Verificar el `idToken` de Google y emitir tokens propios |
| Pruebas | Vitest, React Native Testing Library, Maestro | Unitarias en dominio, componentes y flujo completo |
| CI/CD | GitHub Actions + EAS Build | Lint, pruebas y builds de tienda |

**pnpm con React Native.** Metro resuelve mal los enlaces simbólicos de pnpm en algunas versiones. Pon `node-linker=hoisted` en `.npmrc` y confirma la recomendación vigente en la documentación de Expo para monorepos antes de fijar versiones.

**Alternativa más rápida.** Supabase reemplaza API, login y archivos con el mismo PostgreSQL. Llegas antes, pero las reglas viven en políticas RLS y no en tu dominio. Como los repositorios son puertos, se puede empezar ahí y migrar.
