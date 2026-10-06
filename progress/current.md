# Estado actual (2026-10-05)

F000–F015 hechas. F012 en el PR #27 (a la espera de fusión).

## Decisiones de F012 por confirmar con el usuario
- Eliminar consulta: botón rojo al final del formulario de edición + confirmación (el canvas no trae diseño; se siguió el patrón del formulario de médico).
- Las indicaciones no se editan en el formulario: se agregan y marcan en el detalle. Hoy no hay forma de quitar una indicación ya creada.
- No hay pantalla para recuperar consultas eliminadas (el documento se conserva con `deletedAt`).

## Pendiente
- F017 (medicamentos de la receta): no necesita Storage; propuesto como siguiente.
- F016 (foto de receta): necesita Firebase Storage → plan Blaze (decisión del usuario pendiente; si se activa, anotar en docs/14).
- iPhone: recompilar para `expo-sqlite` (F010) y `datetimepicker`; requiere `version:generate`, rsync y ≥10 GB libres; el usuario debe volver a iniciar sesión.
- Otros: búsqueda (RF-17), cola de envío sin red (RNF-11), proyecto Firebase propio (docs/14).

## Recordatorios
- Tras cambios de casos de uso hay que reiniciar la app (el contenedor se crea una vez): docs/solucion-de-problemas.md §3.17.
- Toda publicación fuera del repo se anota en docs/14 y solo cuando el usuario la pide.
