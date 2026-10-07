import type { RecordatoriosDeTomaRepository } from '../domain/RecordatoriosDeTomaRepository';
import type { RegistroDeTomasRepository } from '../domain/RegistroDeTomasRepository';
import { tomasDelDia, type TomaDelDia } from '../domain/TomasDelDia';

/** Se leen también las dosis de la víspera: una dosis de hoy puede haberse marcado antes de la medianoche. */
const HORAS_ATRAS = 36;

/** Las tomas de hoy con su estado (F029): lo programado en los recordatorios cruzado con lo ya marcado en `doseLogs`. */
export class ObtenerTomasDeHoy {
  constructor(
    private readonly recordatorios: RecordatoriosDeTomaRepository,
    private readonly registro: RegistroDeTomasRepository,
    private readonly ahora: () => Date,
  ) {}

  async ejecutar(): Promise<{ tomas: TomaDelDia[] }> {
    const ahora = this.ahora();
    const [lista, registradas] = await Promise.all([this.recordatorios.listar(), this.registro.tomadasDesde(new Date(ahora.getTime() - HORAS_ATRAS * 3_600_000))]);
    const tomadas = new Map(registradas.map((t) => [t.tomaId, t.tomadaEn]));
    return { tomas: tomasDelDia(lista, ahora, tomadas, ahora) };
  }
}
