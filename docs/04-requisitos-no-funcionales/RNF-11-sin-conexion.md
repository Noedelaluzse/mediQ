# RNF-11 — Sin conexión

- **Categoría:** Sin conexión

## Requisito

El diario ya cargado se lee sin red; una consulta capturada sin red se guarda como borrador y se envía al reconectar

## Estado de la implementación (2026-10-06, F030)

- **Guardar sin internet:** una consulta **nueva** capturada sin conexión se guarda en una cola del teléfono (no solo como borrador) y se envía sola al volver la conexión, sin duplicarse. Si el servidor la rechaza, queda marcada con su motivo y se puede descartar.
- **Leer sin internet:** el Diario ya visto (su primera página), la lista de médicos y el resumen por médico se leen desde una copia local. **Perfil (F053):** los totales (consultas, médicos, recetas) y «Mi salud» también tienen copia local; sin copia (p. ej. sin internet la primera vez) los totales muestran un guion «—», no un 0 que parezca un dato. **Lugares (F053):** la pantalla de Lugares y las sugerencias «Usados antes» se leen de una copia local; el conteo de consultas por lugar se lee ahora en una sola lectura (antes era una consulta por lugar). **Detalle de un médico (F053):** sin internet se ve con la copia de la lista de médicos y las consultas de ese médico, que se copian la primera vez que se abre su detalle con internet (un médico cuyo detalle nunca se abrió con internet no tiene copia).
- **Detalle sin internet (F032):** el detalle de una consulta ya abierta antes (con su receta e indicaciones) se lee desde una copia local; **la foto de la receta también (F051)**: se guarda en el teléfono la primera vez que se ve con internet, y sin internet se muestra esa copia con el aviso «puede no ser la más reciente». Si nunca se vio con internet, o el sistema borró la copia por falta de espacio, no está disponible.
- **No se edita sin internet (decisión del usuario, F032):** editar o eliminar consultas, indicaciones, receta, foto, Mi salud, médicos, lugares, la cuenta y marcar tomas se **desactivan** sin conexión, con una franja que explica por qué. No habrá cola para esas acciones. Capturar una consulta nueva sí funciona sin internet (F030).
- **Privacidad:** la copia y la cola se borran al cerrar sesión o eliminar la cuenta.

Detalle de diseño: `docs/generado/architecture.md`.
