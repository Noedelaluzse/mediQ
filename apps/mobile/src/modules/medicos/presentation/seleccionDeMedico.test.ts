import { describe, expect, it, vi } from 'vitest';

import type { DatosDeMedicoParaConsulta } from '../application/ElegirMedicoGuardado';
import { seleccionDeMedico } from './seleccionDeMedico';

const datos: DatosDeMedicoParaConsulta = { medicoId: 'a', nombre: 'Dra. Solís', especialidad: 'cardiologia' };

describe('seleccionDeMedico (puente entre el selector y la consulta)', () => {
  it('lo elegido se entrega una sola vez', () => {
    seleccionDeMedico.elegir(datos);
    expect(seleccionDeMedico.consumir()).toEqual(datos);
    expect(seleccionDeMedico.consumir()).toBeNull();
  });

  it('avisa a quien está suscrito y deja de avisar al cancelar', () => {
    const oyente = vi.fn();
    const cancelar = seleccionDeMedico.suscribir(oyente);
    seleccionDeMedico.elegir(datos);
    expect(oyente).toHaveBeenCalledTimes(1);
    cancelar();
    seleccionDeMedico.elegir(datos);
    expect(oyente).toHaveBeenCalledTimes(1);
    seleccionDeMedico.consumir();
  });
});
