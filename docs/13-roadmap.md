# 13. Roadmap

Cuatro fases sin fechas todavía: dependen de las horas semanales que le dediques.

&#91;embedded content: roadmap · 4 fases, 2 puertas\]

La fase 2 no empieza hasta que personas reales usen el MVP sin ayuda. La decisión de pasar a nativo se toma con datos de retención de la fase 3, no antes.

Primeros pasos de la fase 0:

- [x] Crear el monorepo pnpm con `apps/mobile` (sin API propia: el backend es Firebase).
- [x] Configurar ESLint con las reglas de capas y la prohibición de colores fuera del tema.
- [x] Montar `shared/theme` y los componentes base del prototipo (`MediQ — prototipo móvil.html`): botón, tarjeta, chip, campo de texto.
- [ ] Identificadores OAuth de Google: iOS hecho (vía Firebase); faltan Android y web.
- [ ] Crear el proyecto de Firebase de MediQ (región, plan Blaze), publicar reglas probadas con el emulador y sembrar `mediq_specialties`. Pasos y registro de publicaciones: `14-publicacion-y-proyecto-firebase.md`.
- [x] Login con Google y Firebase Auth de punta a punta, con la cuenta y el perfil propio en Firestore (probado en simulador e iPhone).
