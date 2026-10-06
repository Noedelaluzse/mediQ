import {
  dosisTexto,
  duracionTexto,
  esFrecuenciaDelCatalogo,
  esViaDelCatalogo,
  interpretarDosis,
  interpretarDuracion,
  limiteDeDuracion,
  OTRA,
  type UnidadDeDuracion,
} from '../domain/CatalogoDeReceta';
import type { EntradaDeMedicamento, Medicamento } from '../domain/Receta';

/**
 * Una fila del formulario de la receta (RF-31): los textos que se guardan más cuatro marcas de «modo texto». El texto del
 * catálogo se elige con listas y botones; lo guardado antes de las listas (o «Otra…») se conserva y se edita a mano.
 */
export interface FilaDeMedicamento {
  nombre: string;
  dosis: string;
  via: string;
  frecuencia: string;
  duracion: string;
  indicaciones: string;
  /** La vía no es del catálogo (o se eligió «Otra…»): se muestra un campo de texto. */
  viaOtra: boolean;
  frecuenciaOtra: boolean;
  /** Dosis o duración guardadas antes de las listas: se editan como texto hasta que se elige de la lista. */
  dosisManual: boolean;
  duracionManual: boolean;
}

export type CampoDeTexto = 'nombre' | 'dosis' | 'via' | 'frecuencia' | 'duracion' | 'indicaciones';

/** Lo más común, ya elegido en un medicamento nuevo (decidido con el usuario al ver el prototipo). */
export const DEFECTOS = { dosis: dosisTexto('1', 'tableta'), via: 'Oral', frecuencia: 'Cada 8 horas', duracion: duracionTexto(7, 'dias') } as const;

export const filaNueva = (): FilaDeMedicamento => ({
  nombre: '',
  ...DEFECTOS,
  indicaciones: '',
  viaOtra: false,
  frecuenciaOtra: false,
  dosisManual: false,
  duracionManual: false,
});

/** Una fila nueva que nadie tocó no es un medicamento: no se guarda ni da error por no tener nombre. */
export const esFilaSinTocar = (f: FilaDeMedicamento): boolean =>
  f.nombre.trim() === '' &&
  f.dosis === DEFECTOS.dosis &&
  f.via === DEFECTOS.via &&
  f.frecuencia === DEFECTOS.frecuencia &&
  f.duracion === DEFECTOS.duracion &&
  f.indicaciones.trim() === '' &&
  !f.viaOtra &&
  !f.frecuenciaOtra &&
  !f.dosisManual &&
  !f.duracionManual;

/** Lo guardado se carga tal cual (lo que faltaba sigue vacío); lo que no es del catálogo queda en modo texto. */
export const estadoDesdeReceta = (medicamentos: Medicamento[]): FilaDeMedicamento[] =>
  medicamentos.length === 0
    ? [filaNueva()]
    : medicamentos.map((m) => {
        const dosis = m.dosis ?? '';
        const via = m.via ?? '';
        const frecuencia = m.frecuencia ?? '';
        const duracion = m.duracion ?? '';
        return {
          nombre: m.nombre,
          dosis,
          via,
          frecuencia,
          duracion,
          indicaciones: m.indicaciones ?? '',
          viaOtra: via !== '' && !esViaDelCatalogo(via),
          frecuenciaOtra: frecuencia !== '' && !esFrecuenciaDelCatalogo(frecuencia),
          dosisManual: dosis !== '' && interpretarDosis(dosis) === null,
          duracionManual: duracion !== '' && interpretarDuracion(duracion) === null,
        };
      });

export const agregarFila = (filas: FilaDeMedicamento[]): FilaDeMedicamento[] => [...filas, filaNueva()];

export const quitarFila = (filas: FilaDeMedicamento[], indice: number): FilaDeMedicamento[] => {
  const resto = filas.filter((_, n) => n !== indice);
  return resto.length === 0 ? [filaNueva()] : resto;
};

export const enFila = (filas: FilaDeMedicamento[], indice: number, cambio: (f: FilaDeMedicamento) => FilaDeMedicamento): FilaDeMedicamento[] =>
  filas.map((f, n) => (n === indice ? cambio(f) : f));

export const cambiarCampo = (filas: FilaDeMedicamento[], indice: number, campo: CampoDeTexto, valor: string): FilaDeMedicamento[] =>
  enFila(filas, indice, (f) => ({ ...f, [campo]: valor }));

/** Las filas sin tocar se descartan; una con algo cambiado pero sin nombre llega al caso de uso, que la rechaza. */
export const aEntradas = (filas: FilaDeMedicamento[]): EntradaDeMedicamento[] =>
  filas
    .filter((f) => !esFilaSinTocar(f))
    .map((f) => ({ nombre: f.nombre, dosis: f.dosis, via: f.via, frecuencia: f.frecuencia, duracion: f.duracion, indicaciones: f.indicaciones }));

// --- Dosis -------------------------------------------------------------------------------------------------------------

export const dosisElegida = (f: FilaDeMedicamento): { cantidad: string | null; unidad: string | null } => {
  const d = f.dosisManual ? null : interpretarDosis(f.dosis);
  return { cantidad: d?.cantidad ?? null, unidad: d?.unidad ?? null };
};

export const conCantidad = (f: FilaDeMedicamento, cantidad: string): FilaDeMedicamento => ({
  ...f,
  dosisManual: false,
  dosis: dosisTexto(cantidad, dosisElegida(f).unidad ?? 'tableta'),
});

export const conUnidadDeDosis = (f: FilaDeMedicamento, unidad: string): FilaDeMedicamento => ({
  ...f,
  dosisManual: false,
  dosis: dosisTexto(dosisElegida(f).cantidad ?? '1', unidad),
});

export const escribirDosisAMano = (f: FilaDeMedicamento, texto: string): FilaDeMedicamento => ({ ...f, dosis: texto });
export const volverALaListaDeDosis = (f: FilaDeMedicamento): FilaDeMedicamento => ({ ...f, dosis: DEFECTOS.dosis, dosisManual: false });

// --- Vía y frecuencia --------------------------------------------------------------------------------------------------

export const conVia = (f: FilaDeMedicamento, valor: string): FilaDeMedicamento =>
  valor === OTRA ? { ...f, via: '', viaOtra: true } : { ...f, via: valor, viaOtra: false };

export const conFrecuencia = (f: FilaDeMedicamento, valor: string): FilaDeMedicamento =>
  valor === OTRA ? { ...f, frecuencia: '', frecuenciaOtra: true } : { ...f, frecuencia: valor, frecuenciaOtra: false };

// --- Duración ----------------------------------------------------------------------------------------------------------

export const duracionElegida = (f: FilaDeMedicamento): { cantidad: number | null; unidad: UnidadDeDuracion | null } => {
  const d = f.duracionManual ? null : interpretarDuracion(f.duracion);
  return { cantidad: d?.cantidad ?? null, unidad: d?.unidad ?? null };
};

/** «+» y «−»: de 1 en 1, sin bajar de 1 ni pasar el límite de la unidad. Con la duración vacía, «+» empieza en 1 día. */
export const conDuracionMovida = (f: FilaDeMedicamento, delta: number): FilaDeMedicamento => {
  const { cantidad, unidad } = duracionElegida(f);
  if (cantidad === null || unidad === null) return delta > 0 ? { ...f, duracionManual: false, duracion: duracionTexto(1, 'dias') } : f;
  const nueva = Math.max(1, Math.min(limiteDeDuracion(unidad), cantidad + delta));
  return { ...f, duracionManual: false, duracion: duracionTexto(nueva, unidad) };
};

export const conUnidadDeDuracion = (f: FilaDeMedicamento, unidad: UnidadDeDuracion): FilaDeMedicamento => {
  const { cantidad } = duracionElegida(f);
  const nueva = Math.min(cantidad ?? 1, limiteDeDuracion(unidad));
  return { ...f, duracionManual: false, duracion: duracionTexto(nueva, unidad) };
};

export const escribirDuracionAMano = (f: FilaDeMedicamento, texto: string): FilaDeMedicamento => ({ ...f, duracion: texto });
export const volverALaListaDeDuracion = (f: FilaDeMedicamento): FilaDeMedicamento => ({ ...f, duracion: DEFECTOS.duracion, duracionManual: false });

/** "50 mg · cada 24 h · 30 días · Oral" */
export const resumenDelMedicamento = (m: Medicamento): string => [m.dosis, m.frecuencia, m.duracion, m.via].filter(Boolean).join(' · ');
