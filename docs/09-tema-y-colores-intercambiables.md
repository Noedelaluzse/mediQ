# 9. Tema y colores intercambiables

Cambiar la paleta será crear un archivo y cambiar una línea. Los componentes nunca escriben un color: piden un token con significado (`primario`, `superficie`) y el tema decide qué valor tiene.

Dos niveles:

1. **Paleta**: los valores crudos. Hoy, los del prototipo (`MediQ — prototipo móvil.html`), que es el diseño de referencia.
2. **Tokens semánticos**: el papel de cada color en la interfaz. Es lo único que usan los componentes.

```ts
// shared/theme/palettes/verde.ts  (paleta actual de "MediQ — prototipo móvil.html")
export const verde = {
  brand: '#0B6654',
  brandSoft: '#E2F1EC',
  ink: '#14211D',
  muted: '#55635E',
  ground: '#F3F5F2',
  surface: '#FFFFFF',
  line: '#DDE3DF',
  warm: '#8A3D08',
  warmSoft: '#FBEFE3',
} as const;
export type Paleta = Record<keyof typeof verde, string>;

// shared/theme/tokens.ts
export const crearTema = (p: Paleta) => ({
  color: {
    fondo: p.ground,
    superficie: p.surface,
    borde: p.line,
    texto: p.ink,
    textoSecundario: p.muted,
    primario: p.brand,
    sobrePrimario: '#FFFFFF',
    primarioSuave: p.brandSoft,
    acentoReceta: p.warm,
    acentoRecetaSuave: p.warmSoft,
  },
  radio: { sm: 8, md: 12, lg: 16, pill: 999 },
  espacio: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 },
  fuente: { titulo: 'BricolageGrotesque-Bold', cuerpo: 'Figtree-Regular' },
});
export type Tema = ReturnType<typeof crearTema>;

// shared/theme/index.ts  (la única línea que cambia)
export const tema = crearTema(verde);

// uso en un componente
const { color, radio } = useTema();
<View style={{ backgroundColor: color.superficie, borderRadius: radio.lg }} />
```

Para probar otros colores: copia `verde.ts` a `azul.ts`, cambia los valores y pon `crearTema(azul)`.

Tres protecciones para que esto se mantenga:

- Una regla de ESLint prohíbe literales de color fuera de `shared/theme`.
- Una prueba unitaria calcula el contraste de `texto` sobre `fondo` y de `sobrePrimario` sobre `primario`, y falla por debajo de 4.5:1. Una paleta ilegible no pasa CI.
- El `ThemeProvider` recibe el tema por props, así que el modo oscuro o un selector de tema dentro de la app son una paleta más, sin tocar pantallas.

## Modo oscuro (F054)

Implementado como lo previsto arriba: una paleta más, `shared/theme/palettes/verdeOscuro.ts`, con las mismas claves que `verde`. Lo único que cambió en los tokens es que el texto sobre el color primario sale de la paleta (`onBrand` → `sobrePrimario`): en oscuro el primario es claro y necesita texto oscuro.

- **Elección:** `Automático` (por defecto, sigue el modo del teléfono), `Claro` u `Oscuro`, en Perfil → «Aspecto». Se guarda en el teléfono (Keychain, llave `mediq.tema`) y **no** se borra al cerrar sesión: es del aparato, no de la cuenta.
- **Dónde vive:** `shared/theme/preferencia.ts` (reglas puras: `leerPreferenciaDeTema`, `temaEfectivo`, `esquemaNativo`), `ThemeProvider` en `shared/theme/index.tsx` (elige la paleta; `useEleccionDeTema()` expone `preferencia` y `cambiar`). `shared/theme/temas.ts` exporta los temas sin importar React Native, para poder probarlos.
- **Sistema:** al elegir Claro u Oscuro se llama a `Appearance.setColorScheme` para que teclado, alertas, interruptores y barra de estado combinen; en Automático se suelta (`'unspecified'`).
- **Contraste:** `temaOscuro.test.ts` exige ≥ 4.5:1 en todas las parejas de uso (RNF-16), igual que el tema claro.
- **Para pantallas nuevas:** nunca escribir colores ni usar el `tema` estático; usar `useTema()`. Así el modo oscuro funciona solo.
