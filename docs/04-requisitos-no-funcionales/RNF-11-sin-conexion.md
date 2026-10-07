# RNF-11 — Sin conexión

- **Categoría:** Sin conexión

## Requisito

El diario ya cargado se lee sin red; una consulta capturada sin red se guarda como borrador y se envía al reconectar

## Estado de la implementación (2026-10-06, F030)

- **Guardar sin internet:** una consulta **nueva** capturada sin conexión se guarda en una cola del teléfono (no solo como borrador) y se envía sola al volver la conexión, sin duplicarse. Si el servidor la rechaza, queda marcada con su motivo y se puede descartar.
- **Leer sin internet:** el Diario ya visto (su primera página), la lista de médicos y el resumen por médico se leen desde una copia local.
- **Fuera de alcance por ahora:** editar o eliminar consultas, médicos, lugares, recetas, fotos, Mi salud y «Ya la tomé» sin internet; el detalle de una consulta y la tarjeta «Hoy» sin internet.
- **Privacidad:** la copia y la cola se borran al cerrar sesión o eliminar la cuenta.

Detalle de diseño: `docs/generado/architecture.md`.
