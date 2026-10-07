# RNF-02 — Seguridad

- **Categoría:** Seguridad

## Requisito

Tokens guardados en el almacén seguro del dispositivo (Keychain / Keystore), nunca en AsyncStorage

**Candado con Face ID o huella (F036, 2026-10-06).** Capa opcional encima de la sesión guardada en el Keychain: no es un inicio de sesión (la sesión de Google sigue guardada), solo pide verificar a la persona. Al abrir la app de cero siempre pide Face ID (o el código del teléfono, que iOS ofrece si falla la cara); al volver de segundo plano solo si pasaron más de 60 s. La preferencia (`activado`, `ofrecido`) vive en el Keychain (`mediq.candado`) y se borra al cerrar sesión. La app nunca ve la cara ni la huella: las maneja iOS. Límites: no cifra los datos guardados en el teléfono; si no se puede leer la preferencia, no se bloquea (para no dejar fuera al usuario). Diseño y decisiones en `docs/generado/architecture.md`.
