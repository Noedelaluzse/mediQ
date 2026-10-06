# 15. Identidad visual: logos, iconos y pantalla de carga

Los originales de la identidad (entregados por diseño) viven en `docs/mediq-identidad/` y **no se tocan**: de ahí se copian los archivos a la app. Colores de marca: verde `#0B6654`, menta `#E2F1EC`, blanco y negro. El símbolo es el monograma **MQ**; el logo horizontal es el monograma con la palabra «MediQ» (letras trazadas: no requiere instalar fuentes).

## Dónde se usa cada archivo

| Original (`docs/mediq-identidad/…`) | Destino en la app (`apps/mobile/…`) | Para qué | Cómo se obtuvo |
| --- | --- | --- | --- |
| `ios/AppIcon-1024.png` | `assets/images/icon.png` | Icono de iOS (`expo.icon`); sin esquinas, el sistema aplica su máscara | Copia **sin canal alfa** (la App Store rechaza iconos con transparencia). El original ya era opaco; solo se guardó como RGB |
| `android/android-foreground.png` | `assets/images/android-icon-foreground.png` | Capa frontal del icono adaptable de Android | Copia (432 px) |
| `android/android-background.png` | `assets/images/android-icon-background.png` | Capa de fondo | Copia |
| `android/android-monochrome.png` | `assets/images/android-icon-monochrome.png` | Icono temático (Android 13+) | Copia |
| `png/mediq-simbolo-blanco.png` | `assets/images/splash-icon.png` | Pantalla de carga: símbolo blanco sobre verde | Reducido a 600 px de ancho (`sips --resampleWidth 600`) |
| `android/mediq-icono-48.png` | `assets/images/favicon.png` | Favicon web | Copia |
| `png/mediq-logo-horizontal-verde.png` | `assets/images/logo-horizontal.png` | Logo dentro de la app (pantalla de inicio de sesión) | Reducido a 720 px de ancho (cabe a 160 pt en pantallas 4×) |

`app.json`: `ios.icon` ya no apunta a la plantilla de Expo (se borró `assets/expo.icon`); `android.adaptiveIcon.backgroundColor` y el fondo de `expo-splash-screen` son `#0B6654`; la imagen de carga mide 160 pt de ancho. Una prueba (`config/identidad.test.ts`) vigila que los archivos existan, el icono de iOS sea 1024×1024 RGB y los colores no se desvíen.

## Cómo cambiar un logo en el futuro
1. Dejar el original nuevo en `docs/mediq-identidad/`.
2. Copiarlo al destino de la tabla (con `sips` para reducir) y correr `pnpm --filter mobile exec vitest run config/identidad`.
3. **Recompilar la app nativa**: el icono y la pantalla de carga se incrustan al compilar, no con Metro. En la copia sin espacios (`docs/solucion-de-problemas.md` §1.1) hay que borrar `~/mediq-build/apps/mobile/ios` antes de `expo run:ios`, para que se regenere con el icono nuevo. Mientras no se recompile, el teléfono sigue mostrando el icono viejo (iOS además cachea iconos: si no cambia, reinstalar).

## Reglas
- Verde sobre fondos claros y blanco sobre verde. No deformar el símbolo; dejar de margen libre al menos el ancho de uno de sus trazos.
- El logo vive como imagen (PNG), no como colores en el código: la regla de lint contra colores literales fuera del tema no se toca.
- El tema no tiene modo oscuro hoy; si se agrega, usar `mediq-logo-horizontal-blanco.png` sobre fondos oscuros.
- Pendiente de decisión: dónde más mostrar el logo (encabezado del Diario, Perfil).
