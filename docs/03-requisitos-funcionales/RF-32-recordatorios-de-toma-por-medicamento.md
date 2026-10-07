# RF-32 — Recordatorios de toma por medicamento

- **Módulo:** Recetas
- **Fase:** Fase 2

## Requisito

Recordatorios de toma por medicamento

## Estado de la implementación (2026-10-06)

- **F024:** el medicamento de la receta puede avisar a la hora de cada toma (hora de la primera toma; el resto se calcula con la frecuencia).
- **F027:** el aviso trae «Ya la tomé» y «Recordar en 5 min», más una insistencia a los 5 minutos; «Ya la tomé» guarda la dosis en `doseLogs`.
- **F029:** tarjeta «Hoy» en el Diario con las tomas del día (tomada, atrasada, pendiente): se marcan o deshacen desde ahí, también antes de la hora. Los demás horarios del día **no** se recorren al tomar una dosis fuera de hora (decidido con el usuario).
- **Pendiente:** historial de días anteriores y «omitida a propósito».

Detalle de diseño: `docs/generado/architecture.md`; modelo y reglas: `docs/11-modelo-de-datos-firestore.md`.
