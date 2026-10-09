const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;

/** "28 sep" (hora local, sin depender de Intl, que en Hermes no siempre trae español). */
/** Las 00:00 del día de la fecha dada (hora local). */
export const inicioDelDia = (f: Date): Date => new Date(f.getFullYear(), f.getMonth(), f.getDate());
export const fechaCorta = (f: Date): string => `${f.getDate()} ${MESES[f.getMonth()]}`;
export const fechaConAnio = (f: Date): string => `${fechaCorta(f)} ${f.getFullYear()}`;

const dos = (n: number) => String(n).padStart(2, '0');
/** "09:05" */
export const horaCorta = (f: Date): string => `${dos(f.getHours())}:${dos(f.getMinutes())}`;

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'] as const;
const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] as const;
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'] as const;
const capitalizada = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** "lun" */
export const diaDeLaSemanaCorto = (f: Date): string => DIAS_CORTOS[f.getDay()];
/** "Septiembre 2026" */
export const mesYAnio = (f: Date): string => `${capitalizada(MESES_LARGOS[f.getMonth()])} ${f.getFullYear()}`;
/** "Domingo 4 de octubre" */
export const fechaDeHoy = (f: Date): string => `${capitalizada(DIAS_LARGOS[f.getDay()])} ${f.getDate()} de ${MESES_LARGOS[f.getMonth()]}`;

/** "Lunes 28 de septiembre de 2026" */
export const fechaLargaConAnio = (f: Date): string => `${fechaDeHoy(f)} de ${f.getFullYear()}`;
/** "Lunes 28 de septiembre de 2026 · 11:00" */
export const fechaYHoraLarga = (f: Date): string => `${fechaLargaConAnio(f)} · ${horaCorta(f)}`;

/** "OCT" */
export const mesCortoEnMayusculas = (f: Date): string => MESES[f.getMonth()].toUpperCase();
