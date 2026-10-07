import { agregarAlergia, type DatosDeSalud, type Sexo, type TipoDeSangre } from '../domain/DatosDeSalud';

/** Cuál de las dos listas de alergias. */
export type ListaDeAlergias = 'alergias' | 'medicamentos';

export interface FormularioDeSalud {
  nacimiento: Date | null;
  sexo: Sexo | null;
  tipoDeSangre: TipoDeSangre | null;
  alergias: string[];
  sinAlergias: boolean;
  medicamentos: string[];
  sinMedicamentos: boolean;
}

export const VACIO: FormularioDeSalud = { nacimiento: null, sexo: null, tipoDeSangre: null, alergias: [], sinAlergias: false, medicamentos: [], sinMedicamentos: false };

const dos = (n: number) => String(n).padStart(2, '0');
/** El día local como `AAAA-MM-DD` (sin hora ni zona: así el cumpleaños no se corre un día). */
export const fechaAIso = (f: Date): string => `${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}`;
/**
 * El `AAAA-MM-DD` como Date **a mediodía** local. No a medianoche: el selector de iOS usa la zona horaria histórica (en 1999 Cancún
 * estaba en UTC-6) y JavaScript el desfase de hoy (UTC-5); a medianoche esa hora de diferencia hace que el selector vea el día anterior
 * y al elegir otro día la fecha salte uno. A mediodía ninguna diferencia de horas cambia el día.
 */
export const isoAFecha = (iso: string): Date => new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)), 12);

/** La fecha que propone «Elegir fecha»: hace `anios` años, a mediodía (ver `isoAFecha`). */
export const nacimientoPorDefecto = (hoy: Date, anios = 30): Date => new Date(hoy.getFullYear() - anios, hoy.getMonth(), hoy.getDate(), 12);

export const desdeDatos = (d: DatosDeSalud): FormularioDeSalud => ({
  nacimiento: d.nacimiento ? isoAFecha(d.nacimiento) : null,
  sexo: d.sexo ?? null,
  tipoDeSangre: d.tipoDeSangre ?? null,
  alergias: d.alergias.items,
  sinAlergias: d.alergias.sinConocidas,
  medicamentos: d.alergiasAMedicamentos.items,
  sinMedicamentos: d.alergiasAMedicamentos.sinConocidas,
});

export const aDatos = (f: FormularioDeSalud): DatosDeSalud => ({
  ...(f.nacimiento ? { nacimiento: fechaAIso(f.nacimiento) } : {}),
  ...(f.sexo ? { sexo: f.sexo } : {}),
  ...(f.tipoDeSangre ? { tipoDeSangre: f.tipoDeSangre } : {}),
  alergias: { sinConocidas: f.sinAlergias, items: f.alergias },
  alergiasAMedicamentos: { sinConocidas: f.sinMedicamentos, items: f.medicamentos },
});

const campos = (l: ListaDeAlergias) => (l === 'alergias' ? ({ items: 'alergias', sin: 'sinAlergias' } as const) : ({ items: 'medicamentos', sin: 'sinMedicamentos' } as const));

/** Agrega una etiqueta a la lista; agregar una desmarca «no tengo alergias». Si el texto no sirve, el formulario queda igual y vuelve el motivo. */
export function agregarEnLista(f: FormularioDeSalud, lista: ListaDeAlergias, texto: string): { formulario: FormularioDeSalud; error?: string } {
  const c = campos(lista);
  const r = agregarAlergia(f[c.items], texto);
  if (!r.ok) return { formulario: f, error: r.error.message };
  return { formulario: { ...f, [c.items]: r.value, [c.sin]: false } };
}

export const quitarDeLista = (f: FormularioDeSalud, lista: ListaDeAlergias, item: string): FormularioDeSalud => {
  const c = campos(lista);
  return { ...f, [c.items]: f[c.items].filter((i) => i !== item) };
};

/** Marcar «no tengo alergias» vacía esa lista (no pueden convivir); desmarcar la deja vacía. */
export const alternarSinAlergias = (f: FormularioDeSalud, lista: ListaDeAlergias): FormularioDeSalud => {
  const c = campos(lista);
  return f[c.sin] ? { ...f, [c.sin]: false } : { ...f, [c.sin]: true, [c.items]: [] };
};
