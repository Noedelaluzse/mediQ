import { claveDeNombre } from './ordenarPorNombre';
import { nombreDeEspecialidad, type Medico } from './Medico';

/** Busca por nombre o especialidad; con varias palabras deben aparecer todas. */
export function coincideConBusqueda(medico: Medico, texto: string): boolean {
  const palabras = claveDeNombre(texto).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return true;
  const campo = claveDeNombre(`${medico.nombreCompleto} ${nombreDeEspecialidad(medico.especialidad)}`);
  return palabras.every((p) => campo.includes(p));
}
