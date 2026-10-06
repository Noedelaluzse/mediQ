import type { EntradaDeMedicamento, Medicamento } from '../domain/Receta';

/** Una fila del formulario de la receta: todo texto, los vacíos son cadenas vacías. */
export type FilaDeMedicamento = Required<EntradaDeMedicamento>;
export type CampoDeMedicamento = keyof FilaDeMedicamento;

export const filaVacia = (): FilaDeMedicamento => ({ nombre: '', dosis: '', frecuencia: '', duracion: '', via: '', indicaciones: '' });

export const estadoDesdeReceta = (medicamentos: Medicamento[]): FilaDeMedicamento[] =>
  medicamentos.length === 0
    ? [filaVacia()]
    : medicamentos.map((m) => ({ nombre: m.nombre, dosis: m.dosis ?? '', frecuencia: m.frecuencia ?? '', duracion: m.duracion ?? '', via: m.via ?? '', indicaciones: m.indicaciones ?? '' }));

export const agregarFila = (filas: FilaDeMedicamento[]): FilaDeMedicamento[] => [...filas, filaVacia()];

export const quitarFila = (filas: FilaDeMedicamento[], indice: number): FilaDeMedicamento[] => {
  const resto = filas.filter((_, n) => n !== indice);
  return resto.length === 0 ? [filaVacia()] : resto;
};

export const cambiarCampo = (filas: FilaDeMedicamento[], indice: number, campo: CampoDeMedicamento, valor: string): FilaDeMedicamento[] =>
  filas.map((f, n) => (n === indice ? { ...f, [campo]: valor } : f));

/** Las filas totalmente vacías se descartan; una a medias llega al caso de uso, que la rechaza. */
export const aEntradas = (filas: FilaDeMedicamento[]): EntradaDeMedicamento[] =>
  filas.filter((f) => Object.values(f).some((v) => v.trim() !== ''));

/** "50 mg · cada 24 h · 30 días · Oral" */
export const resumenDelMedicamento = (m: Medicamento): string => [m.dosis, m.frecuencia, m.duracion, m.via].filter(Boolean).join(' · ');
