# 12. Recomendaciones y riesgos

Lo más importante que falta en tu lista es el marco legal de datos de salud; lo demás son decisiones que abaratan el futuro.

**Legal y privacidad.** En México, los datos de salud son datos personales sensibles bajo la LFPDPPP y piden consentimiento expreso y un aviso de privacidad. No soy abogado: valida el aviso, el consentimiento y el país donde se alojan los datos con uno antes de publicar. Las tiendas también exigen declarar qué datos de salud recoges.

**Producto.**

- Aviso visible de que la app no da diagnósticos ni sustituye al médico.
- Lectura automática de recetas hasta la fase 3. Muchas recetas son manuscritas y un medicamento o dosis mal leídos es un riesgo real; cuando llegue, el usuario siempre confirma antes de guardar.
- Exportar a PDF pronto: llevar el historial a un médico nuevo es el momento en que la app demuestra su valor.
- Recordatorios de toma como notificaciones locales del dispositivo; no necesitan servidor.
- Bloqueo con biometría al abrir la app (`expo-local-authentication`).

**Técnicas.**

- Contrato OpenAPI generado desde los esquemas Zod. Es lo que hace barato el paso a nativo: Kotlin y Swift generan su cliente del mismo contrato.
- Si migras a nativo, evalúa Kotlin Multiplatform para compartir dominio y casos de uso entre Android e iOS. La división por capas de este documento se traslada casi igual.
- Reportes de errores (Sentry) con filtro que elimine notas, motivos y nombres de medicamentos antes de enviar.
- Respaldos diarios y una prueba de restauración real antes del lanzamiento.
- Cifrado a nivel de aplicación para `doctor_notes` y `reason` como mejora posterior. Rompe la búsqueda por texto en servidor, así que hay que decidirlo junto con RF-17.
- Límite de peticiones en `/auth/*` y en la subida de fotos.
- Un registro de decisiones de arquitectura (ADR) en el repo desde el primer día.

**Riesgos.**

| Riesgo | Consecuencia | Mitigación |
| --- | --- | --- |
| Poca frecuencia de uso: la gente va al médico pocas veces al año | Baja retención | Recordatorios de toma y de cita dan motivos para volver entre consultas |
| Captura larga después de la consulta | Abandono del formulario | Solo fecha y tipo obligatorios; borrador automático; dictado |
| Fuga de datos de salud | Daño al usuario y responsabilidad legal | RNF-01 a RNF-07; llaves compuestas en la base; revisión de seguridad antes de publicar |
| Sobrecarga de arquitectura para un MVP | Entrega lenta | Cuatro módulos, sin eventos de dominio ni CQRS hasta que hagan falta |

**Preguntas abiertas.**

- [ ] Nombre decidido: MediQ. Falta verificar dominio, tiendas de apps y registro de marca en el IMPI.
- [ ] ¿iOS desde la primera versión o Android primero?
- [ ] Precio del plan premium.
- [ ] Proveedor y región de alojamiento.
