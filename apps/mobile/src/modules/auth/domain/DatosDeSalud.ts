import { err, ok, type Result } from '@/shared/kernel/Result';
import { normalizarTexto } from '@/shared/kernel/texto';

import { AlergiaInvalidaError, DatosDeSaludInvalidosError, DemasiadasAlergiasError } from './errors';

export const SEXOS = ['mujer', 'hombre', 'otro', 'prefiero-no-decir'] as const;
export type Sexo = (typeof SEXOS)[number];
export const ETIQUETA_DE_SEXO: Record<Sexo, string> = { mujer: 'Mujer', hombre: 'Hombre', otro: 'Otro', 'prefiero-no-decir': 'Prefiero no decirlo' };

export const TIPOS_DE_SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'desconocido'] as const;
export type TipoDeSangre = (typeof TIPOS_DE_SANGRE)[number];
/** «AB-» se muestra con el signo menos de verdad; «desconocido» como «No lo sé». */
export const etiquetaDeSangre = (t: TipoDeSangre): string => (t === 'desconocido' ? 'No lo sé' : t.replace('-', '−'));

export const MAX_ALERGIAS = 30;
export const MAX_LARGO_ALERGIA = 60;
const MAX_EDAD = 120;

/**
 * Una lista de alergias. «Ninguna conocida» (`sinConocidas`) es una respuesta distinta de «aún no lo he llenado»: así la app sabe
 * si el dato está pendiente. Si `sinConocidas` es verdadero, `items` va vacío.
 */
export interface Alergias {
  sinConocidas: boolean;
  items: string[];
}

/** Datos de salud del propio usuario (RF-02). Todo es opcional: se llena con el tiempo. La edad NO se guarda: se calcula (`edadEn`). */
export interface DatosDeSalud {
  /** `AAAA-MM-DD`, solo el día (sin hora ni zona). */
  nacimiento?: string;
  sexo?: Sexo;
  tipoDeSangre?: TipoDeSangre;
  alergias: Alergias;
  alergiasAMedicamentos: Alergias;
}

export const SIN_DATOS: DatosDeSalud = {
  alergias: { sinConocidas: false, items: [] },
  alergiasAMedicamentos: { sinConocidas: false, items: [] },
};

/** Año, mes y día de un `AAAA-MM-DD` real (rechaza 30 de febrero y formatos raros); null si no lo es. */
function partes(iso: string): { a: number; m: number; d: number } | null {
  const coincide = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!coincide) return null;
  const [a, m, d] = [Number(coincide[1]), Number(coincide[2]), Number(coincide[3])];
  const f = new Date(a, m - 1, d);
  return f.getFullYear() === a && f.getMonth() === m - 1 && f.getDate() === d ? { a, m, d } : null;
}

/** Años cumplidos hoy; null si la fecha no es válida. Quien nació un 29 de febrero cumple el 1 de marzo en los años no bisiestos. */
export function edadEn(nacimiento: string, hoy: Date): number | null {
  const p = partes(nacimiento);
  if (!p) return null;
  const cumpleYa = hoy.getMonth() + 1 > p.m || (hoy.getMonth() + 1 === p.m && hoy.getDate() >= p.d);
  return hoy.getFullYear() - p.a - (cumpleYa ? 0 : 1);
}

/** Una fecha real, no futura y de una persona de hasta 120 años. */
export function nacimientoValido(nacimiento: string, hoy: Date): boolean {
  const p = partes(nacimiento);
  if (!p) return false;
  const f = new Date(p.a, p.m - 1, p.d);
  const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if (f.getTime() > hoySinHora.getTime()) return false;
  const edad = edadEn(nacimiento, hoy);
  return edad !== null && edad <= MAX_EDAD;
}

const compactar = (t: string): string => t.replace(/\s+/g, ' ').trim();

/** Agrega una alergia: espacios recortados y juntos; si ya estaba (sin importar mayúsculas ni acentos) queda una sola. */
export function agregarAlergia(items: string[], texto: string): Result<string[], AlergiaInvalidaError | DemasiadasAlergiasError> {
  const limpio = compactar(texto);
  if (limpio.length === 0 || limpio.length > MAX_LARGO_ALERGIA) return err(new AlergiaInvalidaError());
  if (items.some((i) => normalizarTexto(i) === normalizarTexto(limpio))) return ok(items);
  if (items.length >= MAX_ALERGIAS) return err(new DemasiadasAlergiasError());
  return ok([...items, limpio]);
}

function lista(a: Alergias, nombre: string): Result<Alergias, DatosDeSaludInvalidosError> {
  let items: string[] = [];
  for (const texto of a.items) {
    const r = agregarAlergia(items, texto);
    if (!r.ok) return err(new DatosDeSaludInvalidosError(`${nombre}: ${r.error.message}`));
    items = r.value;
  }
  if (a.sinConocidas && items.length > 0) return err(new DatosDeSaludInvalidosError(`${nombre}: «ninguna conocida» no puede tener alergias escritas`));
  return ok({ sinConocidas: a.sinConocidas, items });
}

/** Valida y normaliza. Nada es obligatorio; lo que se escribe debe ser correcto. */
export function crearDatosDeSalud(entrada: DatosDeSalud, hoy: Date): Result<DatosDeSalud, DatosDeSaludInvalidosError> {
  if (entrada.nacimiento !== undefined && !nacimientoValido(entrada.nacimiento, hoy)) return err(new DatosDeSaludInvalidosError('la fecha de nacimiento no es válida'));
  if (entrada.sexo !== undefined && !SEXOS.includes(entrada.sexo)) return err(new DatosDeSaludInvalidosError('sexo desconocido'));
  if (entrada.tipoDeSangre !== undefined && !TIPOS_DE_SANGRE.includes(entrada.tipoDeSangre)) return err(new DatosDeSaludInvalidosError('tipo de sangre desconocido'));
  const alergias = lista(entrada.alergias, 'alergias');
  if (!alergias.ok) return alergias;
  const medicamentos = lista(entrada.alergiasAMedicamentos, 'alergias a medicamentos');
  if (!medicamentos.ok) return medicamentos;
  return ok({ ...entrada, alergias: alergias.value, alergiasAMedicamentos: medicamentos.value });
}

export type DatoDeSalud = 'nacimiento' | 'sexo' | 'sangre' | 'alergias' | 'alergiasAMedicamentos';
export const TOTAL_DE_DATOS = 5;

const respondida = (a: Alergias): boolean => a.sinConocidas || a.items.length > 0;

/** Lo que aún falta, en el orden de la pantalla. «Ninguna conocida» y «No lo sé» cuentan como respondidos. */
export function pendientesDeSalud(d: DatosDeSalud): DatoDeSalud[] {
  const faltan: DatoDeSalud[] = [];
  if (d.nacimiento === undefined) faltan.push('nacimiento');
  if (d.sexo === undefined) faltan.push('sexo');
  if (d.tipoDeSangre === undefined) faltan.push('sangre');
  if (!respondida(d.alergias)) faltan.push('alergias');
  if (!respondida(d.alergiasAMedicamentos)) faltan.push('alergiasAMedicamentos');
  return faltan;
}

export function resumenDePendientes(d: DatosDeSalud): { total: number; llenos: number; faltan: number; completo: boolean } {
  const faltan = pendientesDeSalud(d).length;
  return { total: TOTAL_DE_DATOS, llenos: TOTAL_DE_DATOS - faltan, faltan, completo: faltan === 0 };
}
