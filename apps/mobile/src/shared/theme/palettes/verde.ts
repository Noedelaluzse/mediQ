// Paleta actual de "MediQ — prototipo móvil.html" (diseño de referencia).
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
  danger: '#9B2C2C',
} as const;

export type Paleta = Record<keyof typeof verde, string>;
