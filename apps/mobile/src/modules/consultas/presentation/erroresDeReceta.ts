import { esFilaSinTocar, type CampoDeTexto, type FilaDeMedicamento } from './receta';

/** Un error por campo, con un texto corto: así se marca el campo exacto en vez de un mensaje general. */
export type ErroresDeFila = Partial<Record<CampoDeTexto, string>>;

/** Respaldo cuando el dominio rechaza algo que esta revisión no detectó. */
export const MENSAJE_GENERAL_DE_RECETA = 'Revisa los datos del medicamento';

// Los mismos límites del dominio (`crearMedicamento`): él sigue siendo la última barrera, esto solo dice DÓNDE está el problema.
const LARGO_NOMBRE = 80;
const LARGO_CORTO = 60;
const LARGO_INDICACIONES = 300;

/** Revisa cada fila (la misma posición en el resultado). Una fila nueva que nadie tocó no es un medicamento y no da errores. */
export function erroresDeFilas(filas: FilaDeMedicamento[]): ErroresDeFila[] {
  return filas.map((f) => {
    if (esFilaSinTocar(f)) return {};
    const e: ErroresDeFila = {};
    const nombre = f.nombre.trim();
    if (nombre.length === 0) e.nombre = 'Escribe el nombre del medicamento';
    else if (nombre.length > LARGO_NOMBRE) e.nombre = `El nombre puede tener hasta ${LARGO_NOMBRE} letras`;
    for (const campo of ['dosis', 'via', 'frecuencia', 'duracion'] as const) {
      if (f[campo].trim().length > LARGO_CORTO) e[campo] = `Máximo ${LARGO_CORTO} letras`;
    }
    if (f.indicaciones.trim().length > LARGO_INDICACIONES) e.indicaciones = `Las indicaciones pueden tener hasta ${LARGO_INDICACIONES} letras`;
    return e;
  });
}

export const hayErrores = (errores: ErroresDeFila[]): boolean => errores.some((e) => Object.keys(e).length > 0);
