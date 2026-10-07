# 17. Auditoría de performance

Fecha: 2026-10-07 · Alcance: app móvil (`apps/mobile`) · Estado: hallazgos estáticos hechos; mediciones en ejecución en la §5.

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
| P-01 | Red | **Lectura N+1.** `contarConReceta` lee todas las consultas y luego hace un `getDoc` por cada una para ver si tiene receta. Con 200 consultas son más de 200 lecturas. | `modules/medicos/infrastructure/FirestoreConsultasDeMedicosRepository.ts` | Alto |
| P-02 | Red | **Lecturas repetidas.** `resumenPorMedico`, `contarTodas` y `contarConReceta` leen cada una la colección completa `visits`; el Perfil y la pestaña Médicos pueden disparar las tres. | mismo archivo | Alto |
| P-03 | Fluidez | **`ScrollView` + `.map()` en listas** (médicos y elegir médico): renderiza todos los elementos de golpe, sin virtualizar. | `MedicosScreen.tsx:88`, `MedicosElegirScreen.tsx:102` | Medio |
| P-04 | Memoria / CPU | **Foto de receta como `data:` base64 en RAM.** `getBytes` baja el archivo completo y `bytesABase64` lo codifica a mano en JavaScript; el *string* resultante pesa ~33 % más que el JPEG y se usa como `uri`. | `FirestoreFotoDeRecetaRepository.ts:28`, `shared/kernel/base64.ts` | Medio |
| P-05 | Red / Memoria | **Sin caché de imagen.** Se usa `Image` de React Native, no `expo-image`: cada vez que se abre el detalle se vuelve a bajar y a codificar la foto. | `FotoDeRecetaSeccion.tsx:118`, `VisorDeImagen.tsx:33` | Medio |
| P-06 | Red / UX | **Recarga en cada foco.** `useFocusEffect` relanza la carga al volver a cada pantalla; en el Diario además vuelve a la página 1 (se pierde el scroll) y dispara sincronización de avisos, próxima cita y tomas. | `DiarioScreen.tsx:152` y las demás pantallas con `useFocusEffect` | Medio |
| P-07 | Fluidez | **`renderItem`/`renderSectionHeader` en línea** con objetos de estilo nuevos en cada render. El React Compiler lo mitiga; falta confirmarlo con el *profiler*. | `DiarioScreen.tsx:251` | Bajo–Medio |
| P-08 | Fluidez | **`onScroll` con `setState` y `LayoutAnimation`** (barra de búsqueda), a `scrollEventThrottle={32}`: puede re-renderizar la lista al mostrar u ocultar la barra. | `DiarioScreen.tsx:251` | Bajo–Medio |
| P-09 | Arranque | **`container.ts` (278 líneas)** importa unas 70 clases de golpe y abre SQLite al arrancar; cuesta tiempo de parseo en el arranque en frío. | `app/container.ts` | Bajo–Medio |
| P-10 | Red / Batería | **Firestore sin caché persistente** y con `experimentalAutoDetectLongPolling`: el *long polling* gasta más batería y datos que WebChannel. | `modules/auth/infrastructure/firebase.ts:29` | Bajo–Medio |
| P-11 | Tamaño | **Dependencias a revisar:** `react-native-web`, `react-dom` y `@expo/ui`; confirmar que no entran al bundle nativo sin usarse. | `apps/mobile/package.json` | Bajo |
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

*(Se completa en la sección siguiente de este mismo capítulo conforme se mide.)*

## 6. Plan de correcciones (propuesto, sin implementar)

Cada corrección sería su propia feature en `features.json`, con pruebas primero y su PR hacia `main`.

1. **P-01 + P-02:** un solo `getDocs` por pantalla y, si hace falta, un campo `hasPrescription` en la consulta (obliga a cambiar las reglas de Firestore y a anotarlo en `docs/14`).
2. **P-04 + P-05:** pasar a `expo-image` con caché en disco y bajar la foto a un archivo en lugar de a base64.
3. **P-03 + P-06:** pasar a `FlatList` y cachear con invalidación en lugar de recargar en cada foco.
4. **P-07 a P-10:** solo si la medición los confirma.
