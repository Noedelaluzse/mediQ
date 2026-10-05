# RNF-04 — Seguridad

- **Categoría:** Seguridad

## Requisito

Las reglas de Firestore y Storage solo permiten acceder a `mediq_users/{uid}` con `uid == request.auth.uid`; el cliente nunca elige el `uid`; las reglas se prueban con el emulador de Firebase
