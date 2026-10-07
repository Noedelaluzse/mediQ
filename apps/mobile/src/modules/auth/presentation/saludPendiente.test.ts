import { beforeEach, describe, expect, it } from 'vitest';

import { SIN_DATOS, type DatosDeSalud } from '../domain/DatosDeSalud';
import { anunciarSaludCompleta, limpiarSaludPendiente, publicarSalud, saludPendiente, seCompletoAlGuardar, suscribirSaludPendiente, tomarAnuncioDeSaludCompleta } from './saludPendiente';

const completos: DatosDeSalud = {
  nacimiento: '1990-03-14',
  sexo: 'hombre',
  tipoDeSangre: 'O+',
  alergias: { sinConocidas: true, items: [] },
  alergiasAMedicamentos: { sinConocidas: true, items: [] },
};

describe('saludPendiente (el puntito de la pestaña Perfil)', () => {
  beforeEach(limpiarSaludPendiente);

  it('antes de saber nada no hay puntito (no se muestra algo que luego desaparezca)', () => {
    expect(saludPendiente()).toBe(false);
  });

  it('con datos faltantes hay puntito; completos, no', () => {
    publicarSalud(SIN_DATOS);
    expect(saludPendiente()).toBe(true);
    publicarSalud(completos);
    expect(saludPendiente()).toBe(false);
  });

  it('avisa a quien escucha solo cuando cambia', () => {
    let avisos = 0;
    const baja = suscribirSaludPendiente(() => avisos++);
    publicarSalud(SIN_DATOS);
    publicarSalud(SIN_DATOS);
    publicarSalud(completos);
    expect(avisos).toBe(2);
    baja();
    publicarSalud(SIN_DATOS);
    expect(avisos).toBe(2);
  });
});

describe('aviso temporal de «información completa»', () => {
  beforeEach(limpiarSaludPendiente);
  const faltaUno: DatosDeSalud = { ...completos, sexo: undefined };

  it('se completó al guardar solo si antes faltaba algo y ahora no falta nada', () => {
    expect(seCompletoAlGuardar(SIN_DATOS, completos)).toBe(true);
    expect(seCompletoAlGuardar(faltaUno, completos)).toBe(true);
    expect(seCompletoAlGuardar(completos, completos)).toBe(false);
    expect(seCompletoAlGuardar(SIN_DATOS, faltaUno)).toBe(false);
    expect(seCompletoAlGuardar(completos, faltaUno)).toBe(false);
  });

  it('sin anuncio no hay aviso', () => {
    expect(tomarAnuncioDeSaludCompleta()).toBe(false);
  });

  it('el anuncio se entrega una sola vez (no se queda fijo)', () => {
    anunciarSaludCompleta();
    expect(tomarAnuncioDeSaludCompleta()).toBe(true);
    expect(tomarAnuncioDeSaludCompleta()).toBe(false);
  });

  it('cerrar sesión descarta un anuncio que no se llegó a ver', () => {
    anunciarSaludCompleta();
    limpiarSaludPendiente();
    expect(tomarAnuncioDeSaludCompleta()).toBe(false);
  });
});
