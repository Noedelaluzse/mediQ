# CU-04 — Capturar receta

- **Actor:** Paciente
- **Precondición:** Consulta existente o en borrador
- **Resultado:** Receta con foto y medicamentos ligada a la consulta

## Flujo principal

1. El paciente toca "Agregar receta" dentro de la consulta.
2. Toma la foto o la elige de la galería.
3. El sistema comprime la foto y la sube al almacenamiento privado.
4. El paciente captura cada medicamento: nombre, dosis, frecuencia, duración, vía, indicaciones.
5. El paciente guarda; el sistema liga la receta a la consulta.

## Flujos alternos

- Permiso de cámara denegado: el sistema ofrece la galería y explica cómo dar el permiso.
- Falla la subida: la foto queda en cola local y se reintenta; los medicamentos se guardan igual.
- Receta sin foto: se permite capturar solo los medicamentos.
