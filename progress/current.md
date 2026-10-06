# Estado actual (2026-10-05)

F000–F015 y F017 hechas. F017 está en su PR (a la espera de fusión).

## Por hacer / decidir con el usuario
- **Publicar las reglas de F017** (`prescriptions` validadas) en `nuvia-dev-5ddce` cuando el usuario lo pida; anotar la fila en docs/14. Hasta entonces la app funciona con las reglas anteriores.
- Probar a mano en la app: Agregar receta → teclear un medicamento → Guardar → verlo en el detalle (en el simulador no se pudo pegar texto).
- F016 (foto de receta): necesita Firebase Storage → plan Blaze (decisión del usuario pendiente).
- iPhone: recompilar para `expo-sqlite` (F010) y `datetimepicker`; requiere `version:generate`, rsync y ≥10 GB libres; hay que volver a iniciar sesión.
- Otros: búsqueda (RF-17), cola de envío sin red (RNF-11), proyecto Firebase propio (docs/14).

## Recordatorios
- Tras agregar casos de uso o rutas hay que reiniciar la app (el contenedor se crea una vez): docs/solucion-de-problemas.md §3.17.
- Toda publicación fuera del repo se anota en docs/14 y solo cuando el usuario la pide.
