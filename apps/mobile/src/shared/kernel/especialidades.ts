/** Catálogo de especialidades compartido por los módulos de médicos y consultas. */
export const ESPECIALIDADES = [
  { slug: 'cardiologia', nombre: 'Cardiología' },
  { slug: 'dermatologia', nombre: 'Dermatología' },
  { slug: 'ginecologia', nombre: 'Ginecología' },
  { slug: 'medicina-general', nombre: 'Medicina general' },
  { slug: 'medicina-interna', nombre: 'Medicina interna' },
  { slug: 'odontologia', nombre: 'Odontología' },
  { slug: 'oftalmologia', nombre: 'Oftalmología' },
  { slug: 'pediatria', nombre: 'Pediatría' },
  { slug: 'traumatologia', nombre: 'Traumatología' },
  { slug: 'urgencias', nombre: 'Urgencias' },
  { slug: 'otra', nombre: 'Otra' },
] as const;

export const ESPECIALIDAD_POR_DEFECTO = 'medicina-general';

export const nombreDeEspecialidad = (slug: string): string =>
  ESPECIALIDADES.find((e) => e.slug === slug)?.nombre ?? 'Otra';
