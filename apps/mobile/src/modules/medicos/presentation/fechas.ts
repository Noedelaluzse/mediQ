import { detalleDeConsultas } from './mensajes';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;

/** "28 sep" (hora local, sin depender de Intl, que en Hermes no siempre trae español). */
export const fechaCorta = (f: Date): string => `${f.getDate()} ${MESES[f.getMonth()]}`;
export const fechaConAnio = (f: Date): string => `${fechaCorta(f)} ${f.getFullYear()}`;

/** Línea de la lista de médicos: "4 consultas · última 28 sep". */
export const resumenDeConsultas = (consultas: number, ultimaVisita?: Date): string =>
  consultas === 0 || !ultimaVisita
    ? detalleDeConsultas(consultas)
    : `${detalleDeConsultas(consultas)} · última ${fechaCorta(ultimaVisita)}`;
