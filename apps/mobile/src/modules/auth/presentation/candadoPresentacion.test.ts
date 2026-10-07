import { describe, expect, it } from 'vitest';

import { filaDelCandado, mensajeDeActivacion, mensajeDeDesbloqueo } from './candadoPresentacion';

describe('filaDelCandado (Perfil)', () => {
  it('mientras carga el interruptor está apagado y deshabilitado', () => {
    expect(filaDelCandado(null)).toMatchObject({ encendido: false, habilitado: false });
  });

  it('apagado y disponible: se puede encender', () => {
    const f = filaDelCandado({ activado: false, ofrecido: true, disponibilidad: 'disponible' });
    expect(f).toMatchObject({ encendido: false, habilitado: true });
    expect(f.subtitulo).toMatch(/abrir MediQ/);
  });

  it('activado: encendido y se puede apagar', () => {
    const f = filaDelCandado({ activado: true, ofrecido: true, disponibilidad: 'disponible' });
    expect(f).toMatchObject({ encendido: true, habilitado: true });
    expect(f.subtitulo).toMatch(/Activado/);
  });

  it('activado aunque el teléfono ya no lo permita: se puede apagar igual', () => {
    expect(filaDelCandado({ activado: true, ofrecido: true, disponibilidad: 'sinRegistro' })).toMatchObject({ encendido: true, habilitado: true });
  });

  it('apagado y el teléfono no puede: deshabilitado y con la razón', () => {
    const sinRegistro = filaDelCandado({ activado: false, ofrecido: false, disponibilidad: 'sinRegistro' });
    expect(sinRegistro).toMatchObject({ encendido: false, habilitado: false });
    expect(sinRegistro.subtitulo).toMatch(/Ajustes/);
    const sinSensor = filaDelCandado({ activado: false, ofrecido: false, disponibilidad: 'sinSensor' });
    expect(sinSensor.habilitado).toBe(false);
    expect(sinSensor.subtitulo).toMatch(/no tiene/);
  });
});

describe('mensajeDeActivacion', () => {
  it('no dice nada si se activó o si el usuario canceló', () => {
    expect(mensajeDeActivacion('activado')).toBeNull();
    expect(mensajeDeActivacion('cancelado')).toBeNull();
  });

  it('explica si falló o si el teléfono no puede', () => {
    expect(mensajeDeActivacion('fallo')).toMatch(/No pudimos verificarte/);
    expect(mensajeDeActivacion('noDisponible')).toMatch(/Ajustes/);
  });
});

describe('mensajeDeDesbloqueo (pantalla de bloqueo)', () => {
  it('sin mensaje cuando todo va bien o aún no se intenta', () => {
    expect(mensajeDeDesbloqueo(null)).toBeNull();
    expect(mensajeDeDesbloqueo('ok')).toBeNull();
    expect(mensajeDeDesbloqueo('cancelado')).toBeNull();
  });

  it('si no pudo verificar, invita a reintentar; si el teléfono ya no puede, lo dice', () => {
    expect(mensajeDeDesbloqueo('fallo')).toMatch(/No pudimos verificarte/);
    expect(mensajeDeDesbloqueo('noDisponible')).toMatch(/cerrar sesión/i);
  });
});
