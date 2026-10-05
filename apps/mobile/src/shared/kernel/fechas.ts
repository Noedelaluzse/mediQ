const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;

/** "28 sep" (hora local, sin depender de Intl, que en Hermes no siempre trae español). */
export const fechaCorta = (f: Date): string => `${f.getDate()} ${MESES[f.getMonth()]}`;
export const fechaConAnio = (f: Date): string => `${fechaCorta(f)} ${f.getFullYear()}`;

const dos = (n: number) => String(n).padStart(2, '0');
/** "09:05" */
export const horaCorta = (f: Date): string => `${dos(f.getHours())}:${dos(f.getMinutes())}`;
