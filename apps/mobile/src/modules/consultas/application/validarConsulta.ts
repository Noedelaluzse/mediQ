import type { DomainError } from '@/shared/kernel/DomainError';
import { ok, type Result } from '@/shared/kernel/Result';

import { crearIndicacion, type Indicacion } from '../domain/Indicacion';
import { validarDatosDeConsulta, type EntradaRegistrarConsulta } from './prepararConsulta';

/** Valida una entrada SIN tocar la red (ni médicos ni lugares): lo que dice si se puede guardar, enviada o en la cola (F030). */
export function validarEntradaDeConsulta(e: EntradaRegistrarConsulta, ahora: Date): Result<void, DomainError> {
  const indicaciones: Indicacion[] = [];
  for (const texto of (e.indicaciones ?? []).map((t) => t.trim()).filter(Boolean)) {
    const i = crearIndicacion({ id: `validacion-${indicaciones.length}`, texto, orden: indicaciones.length });
    if (!i.ok) return i;
    indicaciones.push(i.value);
  }
  const valida = validarDatosDeConsulta(e, indicaciones, () => ahora);
  return valida.ok ? ok(undefined) : valida;
}
