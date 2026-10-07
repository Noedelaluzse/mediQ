import { describe, expect, it } from 'vitest';

import type { Biometria, Disponibilidad, PreferenciaDelCandado, PreferenciaDelCandadoStore, ResultadoBiometrico } from '../domain/Candado';
import { preferenciaInicial } from '../domain/Candado';
import { ActivarCandado } from './ActivarCandado';
import { DesactivarCandado } from './DesactivarCandado';
import { DesbloquearConBiometria } from './DesbloquearConBiometria';
import { ObtenerEstadoDelCandado } from './ObtenerEstadoDelCandado';

const montar = (opciones: { disponibilidad?: Disponibilidad; resultado?: ResultadoBiometrico; preferencia?: PreferenciaDelCandado } = {}) => {
  let guardada = opciones.preferencia ?? preferenciaInicial();
  const mensajes: string[] = [];
  const biometria: Biometria = {
    disponibilidad: async () => opciones.disponibilidad ?? 'disponible',
    autenticar: async (mensaje) => {
      mensajes.push(mensaje);
      return opciones.resultado ?? 'ok';
    },
  };
  const store: PreferenciaDelCandadoStore = {
    leer: async () => guardada,
    guardar: async (p) => void (guardada = p),
    limpiar: async () => void (guardada = preferenciaInicial()),
  };
  return { biometria, store, mensajes, guardada: () => guardada };
};

describe('ObtenerEstadoDelCandado', () => {
  it('junta lo guardado con lo que el teléfono permite', async () => {
    const { biometria, store } = montar({ disponibilidad: 'sinRegistro', preferencia: { activado: true, ofrecido: true } });
    expect(await new ObtenerEstadoDelCandado(store, biometria).ejecutar()).toEqual({ activado: true, ofrecido: true, disponibilidad: 'sinRegistro' });
  });
});

describe('ActivarCandado', () => {
  it('pide Face ID/huella y, si pasa, queda activado y ya ofrecido', async () => {
    const m = montar();
    expect(await new ActivarCandado(m.store, m.biometria).ejecutar()).toBe('activado');
    expect(m.guardada()).toEqual({ activado: true, ofrecido: true });
    expect(m.mensajes).toHaveLength(1);
  });

  it('si el usuario cancela no se activa', async () => {
    const m = montar({ resultado: 'cancelado' });
    expect(await new ActivarCandado(m.store, m.biometria).ejecutar()).toBe('cancelado');
    expect(m.guardada().activado).toBe(false);
  });

  it('si la verificación falla no se activa', async () => {
    const m = montar({ resultado: 'fallo' });
    expect(await new ActivarCandado(m.store, m.biometria).ejecutar()).toBe('fallo');
    expect(m.guardada().activado).toBe(false);
  });

  it('si el teléfono no tiene Face ID/huella configurados ni siquiera lo intenta', async () => {
    const m = montar({ disponibilidad: 'sinRegistro' });
    expect(await new ActivarCandado(m.store, m.biometria).ejecutar()).toBe('noDisponible');
    expect(m.mensajes).toHaveLength(0);
    expect(m.guardada().activado).toBe(false);
  });
});

describe('DesactivarCandado', () => {
  it('apaga el candado y recuerda que ya se ofreció (no vuelve a preguntar)', async () => {
    const m = montar({ preferencia: { activado: true, ofrecido: true } });
    await new DesactivarCandado(m.store).ejecutar();
    expect(m.guardada()).toEqual({ activado: false, ofrecido: true });
  });

  it('sirve también para el «Ahora no» de la oferta', async () => {
    const m = montar();
    await new DesactivarCandado(m.store).ejecutar();
    expect(m.guardada()).toEqual({ activado: false, ofrecido: true });
  });
});

describe('DesbloquearConBiometria', () => {
  it('devuelve lo que respondió el teléfono', async () => {
    for (const resultado of ['ok', 'cancelado', 'fallo', 'noDisponible'] as const) {
      const m = montar({ resultado });
      expect(await new DesbloquearConBiometria(m.biometria).ejecutar()).toBe(resultado);
    }
  });
});
