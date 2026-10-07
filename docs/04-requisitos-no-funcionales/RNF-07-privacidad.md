# RNF-07 — Privacidad

- **Categoría:** Privacidad

## Requisito

Eliminar cuenta borra datos (todo el subárbol de Firestore), fotos (Storage) y el usuario de Auth en un máximo de 30 días, respaldos incluidos (retención de respaldos de 30 días o menos)

## Datos de salud guardados en el teléfono

- La **foto de la receta** se guarda como archivo en la caché del teléfono la primera vez que se ve (F051), para no bajarla de nuevo cada vez. Es una copia desechable: el sistema puede borrarla, y la app la **borra al cerrar sesión, al eliminar la cuenta, y al reemplazar o quitar la foto**. Cada archivo lleva el id de la cuenta en su nombre. Sigue sin verse la foto sin internet (RNF-11).
