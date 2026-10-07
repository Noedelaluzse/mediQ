import { describe, expect, it } from 'vitest';

import { filaDelCandado, mensajeDeActivacion, mensajeDeDesbloqueo } from './candadoPresentacion';

describe('filaDelCandado (Perfil)', () => {
  it('mientras carga no ofrece botón', () => {
    expect(filaDelCandado(null)).toMatchObject({ boton: null });
  });

  it('apagado y disponible: botón «Activar»', () => {
    const f = filaDelCandado({ activado: false, ofrecido: true, disponibilidad: 'disponible' });
    expect(f.boton).toBe('Activar');
    expect(f.estado).toBe('Desactivado');
  });

  it('activado: botón «Desactivar»', () => {
    const f = filaDelCandado({ activado: true, ofrecido: true, disponibilidad: 'disponible' });
    expect(f.boton).toBe('Desactivar');
    expect(f.estado).toBe('Activado');
  });

  it('activado aunque el teléfono ya no lo permita: se puede desactivar igual', () => {
    expect(filaDelCandado({ activado: true, ofrecido: true, disponibilidad: 'sinRegistro' }).boton).toBe('Desactivar');
  });

  it('apagado y el teléfono no puede: sin botón y con la razón', () => {
    const sinRegistro = filaDelCandado({ activado: false, ofrecido: false, disponibilidad: 'sinRegistro' });
    expect(sinRegistro.boton).toBeNull();
    expect(sinRegistro.nota).toMatch(/Ajustes/);
    const sinSensor = filaDelCandado({ activado: false, ofrecido: false, disponibilidad: 'sinSensor' });
    expect(sinSensor.boton).toBeNull();
    expect(sinSensor.nota).toMatch(/no tiene/);
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
