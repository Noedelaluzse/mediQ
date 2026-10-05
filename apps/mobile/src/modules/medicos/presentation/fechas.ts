import { fechaConAnio, fechaCorta } from '@/shared/kernel/fechas';

import { detalleDeConsultas } from './mensajes';

export { fechaConAnio, fechaCorta };

/** Línea de la lista de médicos: "4 consultas · última 28 sep". */
export const resumenDeConsultas = (consultas: number, ultimaVisita?: Date): string =>
  consultas === 0 || !ultimaVisita
    ? detalleDeConsultas(consultas)
    : `${detalleDeConsultas(consultas)} · última ${fechaCorta(ultimaVisita)}`;
