import { describe, expect, it } from 'vitest';

import type { ConsultaPendiente } from '../domain/ConsultaPendiente';
import { avisoDeConexion, aTarjetaPendiente } from './tarjetaPendiente';

const base: ConsultaPendiente = {
  id: 'c1',
  entrada: { fecha: new Date(2026, 9, 4, 9, 30), especialidad: 'cardiologia', medicoNombre: 'Dra. Solís', motivo: 'Revisión', notasDelMedico: 'Bajar la sal' },
  creadaEn: new Date(2026, 9, 5),
  intentos: 0,
};

describe('aTarjetaPendiente (se ve como una consulta del diario, con su etiqueta)', () => {
  it('con médico: título del médico, resumen las notas, especialidad y día', () => {
    expect(aTarjetaPendiente(base)).toMatchObject({ dia: '04', especialidad: 'Cardiología', titulo: 'Dra. Solís', resumen: 'Bajar la sal', estado: 'por-enviar', etiqueta: 'Pendiente de enviar' });
  });

  it('sin médico: el título es el motivo; sin motivo, «Consulta»', () => {
    expect(aTarjetaPendiente({ ...base, entrada: { fecha: base.entrada.fecha, especialidad: 'cardiologia', motivo: 'Dolor' } }).titulo).toBe('Dolor');
    expect(aTarjetaPendiente({ ...base, entrada: { fecha: base.entrada.fecha, especialidad: 'cardiologia' } }).titulo).toBe('Consulta');
  });

  it('una rechazada por el servidor se marca «No se pudo enviar» y trae su motivo', () => {
    const t = aTarjetaPendiente({ ...base, error: 'La fecha no puede ser futura' });
    expect(t).toMatchObject({ estado: 'rechazada', etiqueta: 'No se pudo enviar', motivoDelError: 'La fecha no puede ser futura' });
  });
});

describe('avisoDeConexion (la franja del Diario)', () => {
  it('sin internet y sin nada por enviar: dice que se ve lo último guardado', () => {
    expect(avisoDeConexion(false, 0)).toEqual({ titulo: 'Sin conexión', texto: 'Estás viendo lo último que se guardó. Lo que captures se enviará solo al volver el internet.' });
  });

  it('sin internet y con consultas por enviar: dice cuántas (singular y plural)', () => {
    expect(avisoDeConexion(false, 1)?.texto).toBe('Tienes 1 consulta por enviar; se enviará sola al volver el internet.');
    expect(avisoDeConexion(false, 3)?.texto).toBe('Tienes 3 consultas por enviar; se enviarán solas al volver el internet.');
  });

  it('con internet y consultas por enviar: está enviando', () => {
    expect(avisoDeConexion(true, 2)).toEqual({ titulo: 'Enviando tus consultas', texto: '2 consultas por enviar…' });
    expect(avisoDeConexion(true, 1)?.texto).toBe('1 consulta por enviar…');
  });

  it('con internet y nada por enviar: no hay aviso', () => {
    expect(avisoDeConexion(true, 0)).toBeNull();
  });
});
