# 17. Auditoría de performance

Fecha: 2026-10-07 · Alcance: app móvil (`apps/mobile`) · Estado: hallazgos estáticos y mediciones en simulador hechos; faltan las de la §5.5 (iPhone real, datos y Firestore).

Una auditoría de performance evalúa qué tan rápida, eficiente y estable es la app bajo distintas condiciones, para encontrar cuellos de botella que afecten la experiencia y el consumo del dispositivo. Se organiza en seis categorías; cada hallazgo de este capítulo indica a cuál pertenece.

## 1. Categorías y metas

| # | Categoría | Qué se revisa | Meta |
|---|---|---|---|
| 1 | Arranque y respuesta | Inicio en frío, cálido y caliente; fps y *jank*; congelamientos (*hangs* en iOS); latencia al tocar | Frío ≤ 2 s; 60 fps; sin *hangs* |
| 2 | Memoria | RAM base y picos; fugas; uso de caché | Sin crecimiento sostenido al repetir una acción |
| 3 | Batería y hardware | CPU/GPU en segundo plano; sensores; *wake locks* | Sin trabajo en segundo plano innecesario |
| 4 | Red y API | Tamaño de las respuestas; offline y redes lentas; multimedia; llamadas duplicadas | Lecturas mínimas; la app sigue usable sin red |
| 5 | Tamaño de la app | Descarga e instalación; código muerto y SDK sin usar | Bundle y binario justificados |
| 6 | Estabilidad | Tasa de *crash*; manejo de fallos de servidor y pérdida de conexión | 99.9 % de sesiones sin cierres |

Requisitos del producto que ya fijan metas: RNF-08 (el Diario abre en menos de 1.5 s con 200 consultas; paginación por cursor de 20) y RNF-09 (foto de 1.5 MB o menos antes de subir). Ver `docs/04-requisitos-no-funcionales/`.

## 2. Lo que ya está bien

- **Diario con `SectionList`** y paginación por cursor de 20 en 20 (`FirestoreDiarioRepository.ts`).
- **Offline (RNF-11):** copia local en SQLite (`DiarioConCopiaLocal`), cola de envío sin internet y límite de 15 s por envío (`LIMITE_DE_ENVIO_MS`).
- **Fotos:** se reducen a 1 600 px y se comprimen a JPEG antes de subir (`SelectorDeFotoExpo.ts`).
- **Arranque:** el *splash* solo espera a la sesión y a las fuentes (`_layout.tsx`); son 5 archivos de fuente.
- **Plataforma:** React Compiler activado (`app.json` → `experiments.reactCompiler`) y pestañas nativas (`NativeTabs`).
- **Sin listeners en vivo:** no hay `onSnapshot`; todas las lecturas son puntuales (`getDoc`/`getDocs`), así que no hay conexiones abiertas gastando batería en segundo plano.
- **Assets livianos:** 148 KB en `apps/mobile/assets`.

## 3. Hallazgos (auditoría estática)

Riesgo: **Alto** = se nota con uso normal; **Medio** = se nota con mucho contenido o redes lentas; **Bajo** = a vigilar. Cada uno es una hipótesis hasta que la §5 lo confirme.

| ID | Categoría | Hallazgo | Dónde | Riesgo |
|---|---|---|---|---|
| P-01 | Red | **Resuelto en F048 (reglas publicadas el 2026-10-07):** marca `hasPrescription` en la consulta; el Perfil pasa de 2N a N lecturas. *Descripción original:* **Lectura N+1.** `contarConReceta` lee todas las consultas y luego hace un `getDoc` por cada una para ver si tiene receta. Con 200 consultas son más de 200 lecturas. | `modules/medicos/infrastructure/FirestoreConsultasDeMedicosRepository.ts` | ~~Alto~~ Resuelto |
| P-02 | Red | **Lecturas repetidas.** El Perfil recorría toda la colección `visits` dos veces (`contarTodas` y `contarConReceta`); la pestaña Médicos, una (`resumenPorMedico`). *(Corrección: la versión inicial decía «tres lecturas en una pantalla»; son dos en el Perfil.)* **Resuelto en F047:** una sola operación `totales()`, el Perfil pasa de 3N a 2N lecturas. | mismo archivo | ~~Alto~~ Resuelto |
| P-03 | Fluidez | **`ScrollView` + `.map()` en listas** (médicos y elegir médico): renderiza todos los elementos de golpe, sin virtualizar. | `MedicosScreen.tsx:88`, `MedicosElegirScreen.tsx:102` | Medio |
| P-04 | Memoria / CPU | **Foto de receta como `data:` base64 en RAM.** `getBytes` baja el archivo completo y `bytesABase64` lo codifica a mano en JavaScript; el *string* resultante pesa ~33 % más que el JPEG y se usa como `uri`. | `FirestoreFotoDeRecetaRepository.ts:28`, `shared/kernel/base64.ts` | Medio |
| P-05 | Red / Memoria | **Sin caché de imagen.** Se usa `Image` de React Native, no `expo-image`: cada vez que se abre el detalle se vuelve a bajar y a codificar la foto. | `FotoDeRecetaSeccion.tsx:118`, `VisorDeImagen.tsx:33` | Medio |
| P-06 | Red / UX | **Recarga en cada foco.** `useFocusEffect` relanza la carga al volver a cada pantalla; en el Diario además vuelve a la página 1 (se pierde el scroll) y dispara sincronización de avisos, próxima cita y tomas. | `DiarioScreen.tsx:152` y las demás pantallas con `useFocusEffect` | Medio |
| P-07 | Fluidez | **`renderItem`/`renderSectionHeader` en línea** con objetos de estilo nuevos en cada render. El React Compiler lo mitiga; falta confirmarlo con el *profiler*. | `DiarioScreen.tsx:251` | Bajo–Medio |
| P-08 | Fluidez | **`onScroll` con `setState` y `LayoutAnimation`** (barra de búsqueda), a `scrollEventThrottle={32}`: puede re-renderizar la lista al mostrar u ocultar la barra. | `DiarioScreen.tsx:251` | Bajo–Medio |
| P-09 | Arranque | ~~`container.ts` importa unas 70 clases de golpe.~~ **Descartado en la §5.3:** crear el contenedor tarda 36–63 ms en el simulador. | `app/container.ts` | — |
| P-10 | Red / Batería | **Firestore sin caché persistente** y con `experimentalAutoDetectLongPolling`: el *long polling* gasta más batería y datos que WebChannel. | `modules/auth/infrastructure/firebase.ts:29` | Bajo–Medio |
| P-11 | Tamaño | ~~Dependencias a revisar: `react-native-web`, `react-dom`, `@expo/ui`.~~ **Descartado en la §5.2: no entran al bundle nativo.** | `apps/mobile/package.json` | — |
| P-13 | Arranque | **Descartado como problema real (§5.6).** En el simulador el arranque en frío tardaba 3–6 s, pero ≈ 2 s eran el registro de módulos nativos de Expo, que es lento **solo en el simulador**: en el iPhone real tarda **4 ms**. La hipótesis anterior («evaluación de módulos de JavaScript») también era falsa: tarda 0.05 s. | — | ~~Alto~~ Descartado |
| P-14 | Arranque / Red | **El *splash* espera una lectura de red** (`consultarConsentimientosPendientes`) antes de ocultarse en modo Firebase; con red lenta se alarga. Hipótesis sin medir. | `SesionProvider.tsx:46` | Medio |
| P-15 | Batería | **Trabajo constante del hilo principal (≈ 12 % de CPU) en el iPhone** por una animación nativa en bucle durante los 12 s medidos; la única candidata es el parpadeo de los esqueletos. Hipótesis sin confirmar. | `shared/ui/Esqueleto.tsx` | Medio |
| P-12 | Estabilidad | **Búsqueda con tope de 2 000 consultas** cargadas en memoria. Acotado y aceptable. | `CargarTodoElDiario.ts` | Bajo |

```
Pestaña Médicos / Perfil
   ├─ contarTodas ──────────► getDocs(visits)   ┐
   ├─ resumenPorMedico ─────► getDocs(visits)   ├─ 3 lecturas de la misma colección
   └─ contarConReceta ──────► getDocs(visits)   ┘
                              └─► N × getDoc(receta)   ← N+1
```

## 4. Plan de medición

| Métrica | Cómo | Meta |
|---|---|---|
| Cold start | Compilación *Release*; cronometrar desde abrir hasta la primera pantalla (simulador y, si se puede, iPhone con Instruments → App Launch) | ≤ 2 s |
| Diario con 200 consultas | Sembrar 200 consultas y cronometrar la apertura | < 1.5 s (RNF-08) |
| Fps y *jank* | Scroll del Diario con Instruments → Animation Hitches o Perf Monitor | 60 fps |
| Memoria | Abrir la foto de 10 recetas seguidas con el *Memory Graph* de Xcode | Sin crecimiento sostenido |
| Lecturas a Firestore | Contar lecturas al abrir cada pestaña (emulador o consola de Firebase) | Mínimas |
| Tamaño | `expo export` y revisar los `.hbc`; tamaño del `.app` | — |
| Red lenta | *Network Link Conditioner* (3G) | Sin pantallas colgadas |

Límites del simulador: no representa la CPU, la memoria ni la batería de un iPhone real; sirve para comparar antes y después y para detectar problemas gruesos. Sin iniciar sesión con Google (la contraseña la escribe el usuario) la app corre en modo simulado, con repositorios en memoria: se mide la interfaz, no la red real.

## 5. Mediciones

### 5.1 Entorno de medición

- Simulador **iPhone 17 Pro (iOS 26.5)**, compilación **Release** (Hermes, sin Metro), **modo simulado** (sin `.env.local`: repositorios en memoria, sin Firebase real). Se compiló desde la copia `~/mediq-build` (docs/solucion-de-problemas.md §1.1).
- Es el simulador de un Mac, no un iPhone: los tiempos absolutos son más optimistas que en un teléfono real; sirven para comparar antes y después y para detectar esperas anormales.
- Marcas de tiempo por captura de pantalla con `xcrun simctl io` (resolución ≈ 0.6 s).

### 5.2 Tamaño (categoría 5)

| Medida | Resultado |
|---|---|
| Bundle de Hermes (iOS, `expo export`) | **4.2 MB** (`.hbc`) |
| Mayores aportes de código fuente | `react-native` 2.0 MB · `expo-router` 1.2 MB · `@firebase/firestore` 1.2 MB · app propia 0.56 MB · `@firebase/auth` 0.37 MB · `react-native-svg` 0.25 MB |
| `react-native-web`, `react-dom`, `@expo/ui` | **No entran** al bundle nativo → **P-11 descartado** |
| `re2js` (246 KB) | Viene dentro de `@firebase/firestore`; no se puede quitar |
| Assets | 148 KB |

### 5.3 Arranque en frío (categoría 1)

Cinco arranques en frío (cerrar la app y lanzarla), medidos hasta que aparece la primera pantalla (el consentimiento):

| Corrida | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| Segundos | 11.7 | 10.1 | 7.2 | 5.8 | 7.8 |

Las cinco corridas se midieron con una captura cada ≈ 0.6 s y con el simulador ocupado por esas capturas, así que el valor exacto varía; lo que importa es el orden de magnitud. **Meta: ≤ 2 s. No se cumple en el simulador; en el iPhone real no se midió el tiempo total, pero sí se descartó la causa (§5.6).**

**Dónde se va el tiempo.** Se instrumentó una copia de `_layout.tsx` (solo en `~/mediq-build`, el repo no se tocó) con marcas de tiempo enviadas a un servidor local. Cuatro arranques en frío, en milisegundos desde que JavaScript termina de evaluar los módulos de `_layout.tsx`:

| Paso | Corrida 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| `crearContainer()` | 63 | 46 | 50 | 36 |
| Fuentes listas (`useFonts`) | 175 | 123 | 121 | 75 |
| Sesión y consentimientos listos → se oculta el *splash* | 633 | 606 | 643 | 570 |
| **Desde `simctl launch` hasta que JS llega a ese punto** | **7 070** | **4 360** | **5 990** | **4 370** |

Lectura:

1. **La lógica propia de la app (contenedor, fuentes y sesión) suma ≈ 0.6 s** y es razonable. El paso más lento es la sesión (SecureStore + consulta de consentimientos, ≈ 0.4–0.5 s).
2. **Casi todo el arranque (4.4–7 s en el simulador) ocurre antes de que corra esa lógica**: lanzar el proceso, cargar el bundle de 4.2 MB y evaluar los módulos que importa `_layout.tsx` (`container.ts` con ~70 clases, Firebase, `expo-router`…). Con esta instrumentación **no se puede separar** el arranque nativo de la evaluación de módulos: queda para Instruments (App Launch) en un iPhone real (en la §5.6 se vio que ese tramo es un efecto del simulador).
3. En modo Firebase, el paso «sesión» incluye además una lectura de red (`consultarConsentimientosPendientes`) **antes de ocultar el *splash***; no se midió porque el modo simulado no toca la red (P-14).

### 5.4 Memoria (categoría 2)

| Medida | Resultado |
|---|---|
| Huella física en reposo (`footprint`, pantalla de consentimiento) | **57–59 MB** (pico 59 MB) |
| RSS | 37–64 MB según el momento |

Es un valor bajo y sano. **No se midió** el crecimiento al abrir varias fotos de receta (P-04/P-05): requiere sesión con datos reales y foto.

### 5.5 Lo que no se pudo medir y por qué

| Medida | Motivo | Qué hace falta |
|---|---|---|
| Diario con 200 consultas (RNF-08) | El modo simulado trae pocas consultas y sembrar 200 exige cambiar código | Una semilla de 200 consultas en los repositorios en memoria, o usar el emulador de Firestore |
| Fps / *jank* al hacer scroll | Mismo motivo, y el simulador no representa la GPU de un iPhone | Instruments → Animation Hitches en el iPhone |
| Lecturas a Firestore (P-01, P-02) | El modo simulado no toca Firebase | Emulador de Firestore (`pnpm --filter mobile test:emulator`) con contador de lecturas, o la consola de Firebase |
| Crecimiento de memoria con fotos | Necesita Storage real | Sesión real en el iPhone y *Memory Graph* de Xcode |
| Batería y red lenta (categorías 3 y 4) | No se pueden medir en el simulador | iPhone real y *Network Link Conditioner* |
| Pantallas tras el candado | El simulador pidió el código del iPhone (F036); no se escriben códigos en diálogos del sistema | Simular Face ID con `notifyutil` (nota de F036 y docs/solucion-de-problemas.md §3.28) |

### 5.6 Arranque en el iPhone real (F049): el problema del simulador no existe en el teléfono

Con el perfilador de Xcode (Time Profiler, muestras de 1 ms) se grabó el arranque en el simulador y en el **iPhone 15 real**, ambos en compilación Release:

| Medida (hilo de JavaScript) | Simulador | iPhone 15 |
|---|---|---|
| Registro de módulos nativos de Expo (`AppContext.registerNativeModules`) | 1 160–2 380 ms (varía mucho) | **4 ms** |
| JavaScript total en 12 s | ≈ 1 400–2 800 ms | **≈ 350 ms** |

Hallazgos:

1. **Los 2 s de «arranque» eran código Swift de Expo** construyendo las definiciones de cada módulo nativo en el hilo de JavaScript, y no la app: apenas 125 ms eran Hermes. Ese trabajo es lento solo en el simulador.
2. **`@expo/ui` no se usa** (ningún archivo lo importa y no entra al bundle). `expo-router` lo trae como dependencia propia y lo usa solo en Android, así que el autolinking de iOS lo enlazaba igual. En el simulador su registro era ≈ 850 ms en una grabación, pero en las siguientes los demás módulos se volvieron más lentos y **el total no bajó de forma medible**: no se puede atribuir una mejora a quitarlo. Se excluyó del autolinking de iOS como limpieza de código nativo sin uso (`expo.autolinking.ios.exclude` en `apps/mobile/package.json`; Android lo conserva) y una prueba (`config/arranque.test.ts`) vigila que no vuelva.
3. **En el iPhone el hilo principal queda con ≈ 12 % de CPU constante** durante toda la grabación (12 s) por una animación nativa (`RCTNativeAnimatedNodesManager`). La única animación en bucle de la app es el parpadeo de los esqueletos de carga (`Esqueleto.tsx`), que sí se detiene al desmontarse. Queda **sin explicar qué pantalla estaba mostrando «cargando» tanto tiempo** (puede ser la espera del Face ID, que esta medición no distingue). Pendiente: observar esa pantalla (hipótesis, P-15).

Lección: **medir en el simulador sirve para comparar, pero no para juzgar el arranque**; los números absolutos de CPU y de arranque se confirman en el teléfono. Se llegó a atribuir la causa a la evaluación de módulos (hipótesis falsa) antes de perfilar.

## 6. Plan de correcciones (propuesto, sin implementar)

Cada corrección sería su propia feature en `features.json`, con pruebas primero y su PR hacia `main`.

1. **P-02: hecho (F047).** **P-01: hecho (F048).** Marca `hasPrescription` en la consulta; las consultas antiguas se rellenan solas al contarlas. Cambió `firebase/firestore.rules` (solo amplía) y se publicaron el 2026-10-07 (anotado en `docs/14`); falta probarlo en el iPhone.
2. **P-04 + P-05:** pasar a `expo-image` con caché en disco y bajar la foto a un archivo en lugar de a base64.
3. **P-03 + P-06:** pasar a `FlatList` y cachear con invalidación en lugar de recargar en cada foco.
4. **P-13: descartado** (§5.6). **P-14** (el *splash* espera una lectura de red): sin evidencia en el teléfono; medir antes de tocar. **P-15** (animación constante): identificar la pantalla y comprobar que el esqueleto se desmonta.
5. **P-07 a P-10:** solo si la medición los confirma.
