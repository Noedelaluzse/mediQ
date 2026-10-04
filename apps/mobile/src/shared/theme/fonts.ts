/** Nombres de las fuentes del diseño (Bricolage Grotesque para títulos, Figtree para cuerpo). */
export const NOMBRES_DE_FUENTE = [
  'BricolageGrotesque-Bold',
  'Figtree-Regular',
  'Figtree-Medium',
  'Figtree-SemiBold',
  'Figtree-Bold',
] as const;

export type NombreDeFuente = (typeof NOMBRES_DE_FUENTE)[number];
