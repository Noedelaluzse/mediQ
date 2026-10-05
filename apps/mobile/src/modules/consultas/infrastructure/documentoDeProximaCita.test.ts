import { describe, expect, it } from 'vitest';

import { deDocumentoDeProximaCita } from './documentoDeProximaCita';

describe('deDocumentoDeProximaCita', () => {
  const proxima = new Date(2026, 9, 19, 10, 30);

  it('traduce una consulta con próxima cita', () => {
    const r = deDocumentoDeProximaCita('v1', {
      nextAppointmentAt: { toDate: () => proxima },
      specialty: 'cardiologia',
      doctorName: 'Dra. Mariana Solís',
    });
    expect(r).toEqual({ consultaId: 'v1', fecha: proxima, especialidad: 'cardiologia', medicoNombre: 'Dra. Mariana Solís' });
  });

  it('sin médico queda sin nombre y una especialidad desconocida cae en "otra"', () => {
    const r = deDocumentoDeProximaCita('v2', { nextAppointmentAt: proxima, specialty: 'x', doctorName: null });
    expect(r).toMatchObject({ especialidad: 'otra', medicoNombre: undefined });
  });

  it('descarta una consulta borrada o sin próxima cita', () => {
    expect(deDocumentoDeProximaCita('v3', { nextAppointmentAt: proxima, deletedAt: new Date() })).toBeNull();
    expect(deDocumentoDeProximaCita('v4', { specialty: 'cardiologia' })).toBeNull();
    expect(deDocumentoDeProximaCita('v5', { nextAppointmentAt: null })).toBeNull();
  });
});
