export const TIPOS_DE_MEDICO = [
  { valor: 'general', etiqueta: 'General' },
  { valor: 'especialista', etiqueta: 'Especialista' },
  { valor: 'dentista', etiqueta: 'Dentista' },
  { valor: 'urgencias', etiqueta: 'Urgencias' },
  { valor: 'otro', etiqueta: 'Otro' },
] as const;

export type TipoDeMedico = (typeof TIPOS_DE_MEDICO)[number]['valor'];
