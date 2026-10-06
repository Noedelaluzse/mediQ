import type { Paleta } from './palettes/verde';

export const crearTema = (p: Paleta) => ({
  color: {
    fondo: p.ground,
    superficie: p.surface,
    borde: p.line,
    bordeCampo: p.fieldLine,
    bordeVacio: p.emptyLine,
    esqueleto: p.skeleton,
    velo: p.scrim,
    texto: p.ink,
    textoSecundario: p.muted,
    primario: p.brand,
    sobrePrimario: '#FFFFFF',
    primarioSuave: p.brandSoft,
    acentoReceta: p.warm,
    acentoRecetaSuave: p.warmSoft,
    peligro: p.danger,
  },
  radio: { sm: 8, md: 12, lg: 16, pill: 999 },
  espacio: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 },
  fuente: {
    titulo: 'BricolageGrotesque-Bold',
    cuerpo: 'Figtree-Regular',
    cuerpoMedio: 'Figtree-Medium',
    cuerpoSemi: 'Figtree-SemiBold',
    cuerpoBold: 'Figtree-Bold',
  },
});

export type Tema = ReturnType<typeof crearTema>;
