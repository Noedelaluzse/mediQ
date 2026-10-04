# CU-02 — Registrar consulta

- **Actor:** Paciente
- **Precondición:** Sesión activa
- **Resultado:** Consulta en el diario; médico guardado en el directorio

## Flujo principal

1. El paciente toca "Nueva consulta".
2. El sistema abre el formulario con la fecha y hora actuales y restaura el borrador si existe.
3. El paciente elige tipo de médico y especialidad.
4. El paciente escribe el lugar de atención o elige uno usado antes; si conoce al médico, lo elige o escribe sus datos.
5. El paciente escribe el motivo y lo que le dijo el médico.
6. Opcional: agrega receta (CU-04) y próxima cita.
7. El paciente guarda.
8. El sistema valida, persiste la consulta, guarda al médico si es nuevo y vuelve al diario.

## Flujos alternos

- Fecha en el futuro: el sistema rechaza y pide corregir.
- Sin red al guardar: queda como borrador local y se envía al reconectar.
- El paciente cancela: el borrador se conserva.
