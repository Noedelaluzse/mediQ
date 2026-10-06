# RF-02 — Crear la cuenta y el perfil propio en el primer inicio de sesión

- **Módulo:** Acceso
- **Fase:** MVP

## Requisito

Crear la cuenta y el perfil propio en el primer inicio de sesión

## Ampliación: datos de salud del perfil propio (F028, 2026-10-06)

A petición del usuario, el perfil propio guarda con el tiempo, desde la pantalla Perfil → «Mi salud»: fecha de nacimiento (la edad se calcula, no se guarda), sexo, tipo de sangre, alergias y alergias a medicamentos. Todo es opcional; la app avisa con un recordatorio (y un puntito en la pestaña Perfil) mientras falte algo. «Ninguna conocida» es una respuesta distinta de «sin llenar». Diseño y decisiones: `docs/generado/architecture.md`; modelo y reglas: `docs/11-modelo-de-datos-firestore.md`.
