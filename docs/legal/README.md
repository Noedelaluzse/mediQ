# Textos legales de MediQ

> **Borrador, no asesoría legal.** Los redactó un asistente de IA a partir de lo que la app realmente hace. **Debe revisarlos un abogado** antes de tener usuarios reales (ver `docs/12-recomendaciones-y-riesgos.md`).

## Dónde viven
- **El texto vive en el código**, en `apps/mobile/src/modules/auth/domain/DocumentosLegales.ts`: de ahí salen las pantallas de la app (Aviso de privacidad y Términos y condiciones), así que lo que se lee en la app y lo que se acepta no pueden diferir. No hay copias en Markdown que se desactualicen.
- **La versión** de cada documento es `VERSIONES_VIGENTES` en `apps/mobile/src/modules/auth/domain/Consentimiento.ts` (una fecha `AAAA-MM-DD`). Es la que queda en el recibo de consentimiento (`consents/{documento}_{versión}`).

## Cómo cambiar un texto
1. Editar `DocumentosLegales.ts` (los datos del responsable están en `RESPONSABLE`).
2. **Subir la versión** del documento en `Consentimiento.ts` con la fecha de hoy: la app volverá a pedir la aceptación a todas las cuentas.
3. Una prueba (`DocumentosLegales.test.ts`) vigila que cada texto cubra los temas obligatorios, que no queden marcas de «pendiente» y que la versión del texto coincida con la vigente.
4. La regla de Firestore `consentimientoAceptado` (`firebase/firestore.rules`) exige los recibos de una versión **base**. No hace falta tocarla al subir la versión, pero si se quiere que la regla exija la nueva, se cambian sus dos ids y la constante de las pruebas (`shared/testing/consentimientos.ts`), y se publica (docs/14). Una prueba impide que exija una versión más nueva que la de la app.

## Datos del responsable (los dio el usuario el 2026-10-06)
Noe De la Luz · Cancún, Quintana Roo, México · noedelaluz06@gmail.com. La app es para otras personas, no solo para uso personal.

## Lo que un abogado debe revisar (puntos que el borrador deja a su criterio)
- Si basta con «Cancún, Quintana Roo, México» como domicilio del responsable o la ley pide el domicilio completo.
- La región de los servidores de Google (el borrador dice «pueden estar fuera de México»; conviene confirmar la región real de Firestore y Storage y si hay transferencia internacional que requiera algo más).
- El plazo de respuesta a solicitudes ARCO (el borrador dice 20 días hábiles) y qué autoridad nombrar tras los cambios a la ley.
- La edad mínima (18 años, con permiso de tutor para menores) y la cláusula de límite de responsabilidad frente a la ley de protección al consumidor.
- Si hace falta un aviso simplificado aparte o textos adicionales para las tiendas de aplicaciones (Apple y Google piden declarar qué datos de salud se recogen).
