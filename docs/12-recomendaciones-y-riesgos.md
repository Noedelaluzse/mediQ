# 12. Recomendaciones y riesgos

Lo más importante que falta en tu lista es el marco legal de datos de salud; lo demás son decisiones que abaratan el futuro.

**Legal y privacidad.** En México, los datos de salud son datos personales sensibles bajo la LFPDPPP y piden consentimiento expreso y un aviso de privacidad. **Estado (F033, 2026-10-06): el aviso de privacidad y los términos ya están redactados en la app (`docs/legal/README.md`), pero son un borrador de IA y falta la revisión de un abogado.** No soy abogado: valida el aviso, el consentimiento y el país donde se alojan los datos con uno antes de publicar. Las tiendas también exigen declarar qué datos de salud recoges.

**Producto.**

- Aviso visible de que la app no da diagnósticos ni sustituye al médico.
- Lectura automática de recetas hasta la fase 3. Muchas recetas son manuscritas y un medicamento o dosis mal leídos es un riesgo real; cuando llegue, el usuario siempre confirma antes de guardar.
- Exportar a PDF pronto: llevar el historial a un médico nuevo es el momento en que la app demuestra su valor.
- Sin conexión (RNF-11, F030): las consultas nuevas capturadas sin internet se guardan en una cola del teléfono y se envían solas; el Diario ya visto se lee desde una copia local. Esos datos de salud viven en el teléfono (SQLite) y se borran al cerrar sesión o eliminar la cuenta. Firestore sin conexión no rechaza una escritura: se queda esperando; por eso hay tiempos límite.
- Recordatorios de toma como notificaciones locales del dispositivo; no necesitan servidor. Traen botones «Ya la tomé» y «Recordar en 5 min», más una insistencia a los 5 minutos (F027): una notificación local no sabe si se vio, así que la insistencia se programa por adelantado y se cancela al responder; cada toma ocupa 2 de los 64 avisos que iOS admite (caben 20 tomas por tanda). La tarjeta «Hoy» del Diario (F029) muestra las tomas del día y permite marcarlas o deshacerlas sin depender del aviso; los demás horarios no se recorren al tomar fuera de hora.
- Bloqueo con biometría al abrir la app (`expo-local-authentication`).

**Técnicas.**

- Reglas de seguridad de Firestore y de Storage escritas y **probadas con el emulador** (`@firebase/rules-unit-testing`): son la única barrera de autorización. Un cambio en ellas sin pruebas puede exponer datos de salud.
- Acceso a datos solo detrás de repositorios (puertos). Hace barato un paso a nativo: Kotlin y Swift pueden usar los SDK nativos de Firebase con el mismo modelo de datos y las mismas reglas.
- Firebase App Check para que solo la app legítima llegue al backend.
- Si migras a nativo, evalúa Kotlin Multiplatform para compartir dominio y casos de uso entre Android e iOS. La división por capas de este documento se traslada casi igual.
- Reportes de errores (Sentry) con filtro que elimine notas, motivos y nombres de medicamentos antes de enviar.
- Respaldos programados de Firestore (con retención de 30 días o menos, por RNF-07) y una prueba de restauración real antes del lanzamiento.
- Cifrado a nivel de aplicación para `doctorNotes` y `reason` como mejora posterior. Rompe cualquier búsqueda por texto, así que hay que decidirlo junto con RF-17.
- Alertas de presupuesto y cuotas en Firebase, y tamaño máximo de fotos en las reglas de Storage.
- Un registro de decisiones de arquitectura (ADR) en el repo desde el primer día.

**Riesgos.**

| Riesgo | Consecuencia | Mitigación |
| --- | --- | --- |
| Poca frecuencia de uso: la gente va al médico pocas veces al año | Baja retención | Recordatorios de toma y de cita dan motivos para volver entre consultas |
| Captura larga después de la consulta | Abandono del formulario | Solo fecha y tipo obligatorios; borrador automático; dictado |
| Fuga de datos de salud | Daño al usuario y responsabilidad legal | RNF-01 a RNF-07; reglas de seguridad por usuario probadas con el emulador; revisión de seguridad antes de publicar |
| Reglas de seguridad mal escritas (son la única barrera) | Datos de un usuario visibles a otro | Escribirlas y probarlas con el emulador antes de publicar; revisarlas en cada cambio de modelo |
| Dependencia de un solo proveedor (Firebase) | Costo y esfuerzo de salir | Acceso a datos solo detrás de repositorios; modelo de datos documentado en el capítulo 11 |
| Sesión y caché en memoria al reabrir la app (React Native) | Lecturas rechazadas tras reiniciar | Mitigado en F003: la app restaura la sesión con inicio de sesión silencioso de Google (capítulo 10). Sin conexión al abrir, se pide iniciar sesión de nuevo |
| El token ya emitido sigue siendo válido ~1 hora tras cerrar sesión | Un token copiado podría leer datos ese tiempo | Cerrar sesión borra los tokens del dispositivo. Revocación inmediata con sesiones controladas por reglas de Firestore, junto con afinar las reglas (capítulos 10 y 11) |
| Borrar una cuenta no se propaga solo en Firestore | Datos que sobreviven a la baja (RNF-07) | F005 borra el subárbol desde la app con `ARBOL_DE_CUENTA` (una prueba avisa si falta una colección). Pendiente: archivos de Storage (RF-30) y los respaldos de Firestore, con retención de 30 días o menos |
| Costo variable y Storage solo en plan de pago | Facturas inesperadas | Plan Blaze con alertas de presupuesto; fotos comprimidas (RNF-09) |
| Sobrecarga de arquitectura para un MVP | Entrega lenta | Cuatro módulos, sin eventos de dominio ni CQRS hasta que hagan falta |

**Preguntas abiertas.**

- [ ] Nombre decidido: MediQ. Falta verificar dominio, tiendas de apps y registro de marca en el IMPI.
- [ ] ¿iOS desde la primera versión o Android primero?
- [ ] Precio del plan premium.
- [ ] Región de Firestore y de Storage: **no se puede cambiar después de crearlos**. Decidirla con el asesor legal antes de crear el proyecto real.
- [ ] Crear el proyecto de Firebase propio de MediQ y activar el plan Blaze antes de tener usuarios reales (hoy se usa un proyecto de pruebas compartido). Pasos: capítulo 14.
- [ ] Cómo buscar por texto (RF-17) sobre Firestore: filtro local, prefijos o servicio externo.
