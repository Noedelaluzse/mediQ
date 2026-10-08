import type { Paleta } from './verde';

// Modo oscuro: mismos tokens que `verde`. El primario se aclara para leerse sobre fondos oscuros, y por eso el texto sobre él (`onBrand`) pasa a ser oscuro.
export const verdeOscuro = {
  brand: '#4DBFA0',
  onBrand: '#06241D',
  brandSoft: '#17362D',
  ink: '#E6EDE9',
  muted: '#A2B1AB',
  ground: '#0D1411',
  surface: '#17201C',
  line: '#27332E',
  fieldLine: '#3A4944',
  emptyLine: '#6B7B75',
  skeleton: '#222D28',
  scrim: 'rgba(0,0,0,0.6)',
  warm: '#F0A468',
  warmSoft: '#34251A',
  danger: '#F28B82',
  dangerSoft: '#3A1F1D',
} as const satisfies Paleta;
