import { beforeEach, describe, expect, it } from 'vitest';

import { SIN_DATOS, type DatosDeSalud } from '../domain/DatosDeSalud';
import { limpiarSaludPendiente, publicarSalud, saludPendiente, suscribirSaludPendiente } from './saludPendiente';

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
