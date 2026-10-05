# History

One line per finished feature: `date · id · summary`.
2026-10-04 · F000 · Monorepo pnpm (apps/mobile, apps/api, packages/contracts), Vitest, ESLint (capas + sin colores fuera del tema), shared/theme verde + shared/ui base, prueba de contraste; verificado en simulador iOS.
2026-10-04 · F001 · Login con Google (adaptadores simulados): rutas (auth)/(tabs), pantalla de login, aviso de privacidad en primer inicio, sesión en SecureStore; 24 pruebas; verificado en simulador.
2026-10-05 · F002 · Cuenta y perfil propio al primer login (prueba con Firebase Auth + Firestore, colección mediq_users); 44 pruebas; login real verificado en simulador.
2026-10-05 · F003 · Consentimiento: se registra qué documentos (aviso y términos) y qué versión acepta el usuario en Firestore (mediq_users/{uid}/consents); si cambia la versión se vuelve a pedir. Incluye restaurar la sesión en silencio al abrir la app (Google signInSilently + Firebase Auth). 69 pruebas; verificado en iPhone 15.
2026-10-05 · F004 · Pestaña Perfil (según el diseño) y Cerrar sesión: cierra Firebase y Google y borra la sesión local del dispositivo. La revocación en el servidor se descartó por ahora (exige plan Blaze); plan B documentado en docs/10. 80 pruebas.
2026-10-05 · F005 · Eliminar cuenta (RF-05): botón rojo en Perfil con confirmación; reautentica, borra el subárbol de Firestore (ARBOL_DE_CUENTA), borra el usuario de Auth, desvincula Google y borra la sesión local. 100 pruebas; verificado en simulador en modo simulado. Fotos de Storage pendientes (RF-30).
2026-10-05 · F006 · Médicos y lugares (RF-20): pestaña Médicos (lista y vacío), formulario nuevo/editar/eliminar (bloquea si tiene consultas), Perfil > Mis lugares (agregar, renombrar sin repetidos, eliminar sin perder consultas). Módulo medicos con repos de Firestore; 10 pruebas contra el emulador con reglas reales; verificado en simulador con Firebase real.
2026-10-05 · F007 · Directorio de médicos (RF-21): la lista muestra número de consultas y última visita; detalle del médico (contadores, lugares, contacto, consultas recientes); contadores reales de Médicos y Consultas en Perfil. Lee `visits` (hoy vacío; se llena con F009). 14 pruebas contra el emulador; verificado en simulador.
2026-10-05 · F008 · Reutilizar médico o lugar (RF-22/HU-08): pantalla Elegir médico (búsqueda, lugares donde atiende), datos para rellenar la consulta, sugerencias de lugares usados antes y puente de selección listo para conectar en F009. 14 pruebas con emulador; verificado en simulador.
2026-10-05 · F009 · Registrar consulta (RF-10, CU-02): formulario Nueva consulta con selector nativo de fecha/hora, médico y lugar que se guardan solos, conexión con Elegir guardado y chips de lugares usados; reglas de Firestore por colección con validación de visits (fecha no futura, próxima cita posterior). 34 pruebas con emulador; verificado en simulador. Requiere recompilar la app (código nativo) y publicar las reglas.

---

## Informe detallado · F009 — Registrar consulta (RF-10, CU-02) · 2026-10-05

**Qué hice**
- Módulo `consultas`: `Consulta` valida que la fecha no sea futura, que tipo de médico y especialidad sean del catálogo y que la próxima cita sea posterior a la consulta. `RegistrarConsulta` primero valida todo (sin efectos) y solo después crea el médico y el lugar si son nuevos (se reutilizan por id o por nombre sin importar acentos o mayúsculas) y guarda la consulta en `visits`.
- Pantalla "Nueva consulta" según el canvas: selector nativo de fecha y hora, tipo de médico, especialidad, lugar con chips "Usados antes", consultorio o piso, datos del médico con "Elegir guardado", motivo, "¿Qué te dijo el médico?" y próxima cita opcional.
- Accesos: botón "Nueva consulta" en el Diario y "Nueva consulta con este médico" en el detalle del médico.
- Reglas de Firestore por colección, con validación de `visits` (fecha no futura con 5 min de tolerancia, próxima cita posterior, campos y tipos). Se enumera cada colección porque las reglas se suman y un comodín general anularía la validación.
- Docs: `docs/11`, `docs/08`, `docs/generado/architecture.md` y `docs/solucion-de-problemas.md`.

**Problemas encontrados**
- Al elegir un médico guardado, el tipo se quedaba en "General" aunque la especialidad fuera Cardiología.
- El título "Datos del médico" quedaba pegado a "Elegir guardado".
- Las pruebas de F006 sembraban consultas incompletas, que las reglas nuevas rechazan.
- Recompilar la app borró la sesión guardada en el simulador.

**Cómo lo solucioné**
- Prueba primero y corrección: el tipo ahora sigue a la especialidad (`formulario.ts`).
- Espacio entre ambos textos.
- Las pruebas siembran consultas válidas.
- Se pidió iniciar sesión otra vez (es lo esperado tras reinstalar).

**Diagrama**
```
Nueva consulta ──► RegistrarConsulta ─► 1) validar (sin efectos)
 (formulario)            │               2) asegurar médico ─► doctors/
                         │               3) asegurar lugar  ─► places/
                         │               4) guardar        ─► visits/ ◄─ reglas (2ª barrera)
                         ▼
Médicos / Detalle / Mis lugares / Perfil leen visits (conteos reales)
```

**Acciones manuales que dejó F009** (ya ejecutadas el 2026-10-05, ver procedimientos abajo)
1. Publicar las reglas de Firestore: la app no las despliega.
2. Recompilar e instalar la app de desarrollo en el simulador y en el iPhone: el selector de fecha es código nativo.

**Para confirmar por el usuario**
- Próxima cita con fecha **y hora** (el canvas de "Nueva consulta" solo muestra fecha, pero el Diario muestra la hora).
- Tipo inicial "General / Medicina general" (el canvas empieza en "Especialista").

### Procedimiento: publicar las reglas de Firestore
```bash
npx --yes firebase-tools@13 login:list                      # debe mostrar la cuenta del usuario
npx --yes firebase-tools@13 deploy --only firestore:rules --project nuvia-dev-5ddce
```
- No hay `firebase` instalado globalmente: se usa `npx firebase-tools@13` (el mismo que usan las pruebas del emulador).
- Publicar **reemplaza todo el conjunto de reglas** del proyecto. El proyecto de desarrollo es compartido con otra app (Nuvia) pero está vacío; antes de publicar en un proyecto con otras reglas hay que comprobar la consola de Firebase.
- Comprobar después con una escritura real desde la app (por ejemplo guardar una consulta).
2026-10-05 · versión automática · Perfil muestra `versión 1.<features>.<resto> (hash)` calculada con el historial de git (feat suma al medio, lo demás al último; `Fnnn` cuenta una vez); `app.config.ts` la publica como EXPO_PUBLIC_APP_VERSION/COMMIT; script `version:generate` para la copia sin .git. 16 pruebas; verificado en simulador (1.10.13, 0047eab). Los prefijos de commit ahora definen la versión (AGENTS.md).
2026-10-05 · F010 · Borrador automático (RF-14, HU-04): Nueva consulta guarda lo escrito en SQLite local (un borrador por usuario, 800 ms después de teclear), lo recupera al reabrir (también tras cerrar la app), muestra "Borrador guardado · Descartar", lo borra al guardar la consulta y al eliminar la cuenta. Cerrar sesión lo conserva. Requiere recompilar (expo-sqlite). Sin cola de reenvío sin red (RNF-11 pendiente). Verificado en simulador.
2026-10-05 · F011 · Indicaciones como lista marcable (RF-15): Nueva consulta tiene la sección Indicaciones (agregar/quitar) que se guarda con la consulta en visits/{id}/instructions (sortOrder, body, doneAt) y en el borrador; casos de uso listar/agregar/marcar/quitar y reglas validadas, 43 pruebas con emulador. Refactor: el texto libre pasó a `notasDelMedico` en el código. Marcar como hechas se verá en el Detalle (F015).
2026-10-05 · F013 · Diario por meses (RF-12, HU-07): la pestaña Diario lista las consultas de la más reciente a la más antigua, agrupadas por mes, con tarjetas (día, especialidad, médico/motivo, resumen), paginado de 20 y recarga al enfocar; sin búsqueda, próxima cita (F014) ni abrir detalle (F015). 46 pruebas con emulador; verificado en simulador.
2026-10-05 · F015 · Detalle de la consulta (RF-13, CU-05): las tarjetas del Diario abren el detalle (fecha larga, título, chips, médico con llamada, motivo, lo que me dijo, próxima cita) y la lista de indicaciones ya se puede marcar y agregar. Receta (F016/F017) y Editar (F012) pendientes. 50 pruebas con emulador; verificado en simulador.
