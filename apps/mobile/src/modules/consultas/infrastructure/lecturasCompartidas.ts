import { LecturaCompartida } from '@/shared/kernel/lecturaCompartida';

import type { ProximaCita } from '../domain/ProximaCita';
import type { ProximaCitaRepository } from '../domain/ProximaCitaRepository';
import type { RecordatoriosDeTomaRepository } from '../domain/RecordatoriosDeTomaRepository';
import type { RegistroDeTomasRepository, TomaRegistrada } from '../domain/RegistroDeTomasRepository';
import type { RecordatorioDeToma } from '../domain/Toma';

/**
 * Envoltorios que reparten UNA lectura entre quienes preguntan lo mismo a la vez (F070, AUD-10): al abrir el Diario, la tarjeta «Hoy» y los avisos
 * de toma leían los mismos recordatorios y las mismas dosis marcadas, y la tarjeta «Próxima cita» y los avisos de citas, las mismas citas. Cada
 * quien recibe su propia COPIA de la lista (cambiarla no afecta a los demás). La copia se descarta cuando algo cambia en la app o al cerrar sesión
 * (`LecturaCompartida`) y cuando estos mismos repositorios escriben.
 */
const copia = <T>(lista: T[]): T[] => [...lista];

export class RecordatoriosCompartidos implements RecordatoriosDeTomaRepository {
  constructor(
    private readonly real: RecordatoriosDeTomaRepository,
    private readonly compartida = new LecturaCompartida<RecordatorioDeToma[]>(),
  ) {}

  listar() {
    return this.real.listar();
  }

  async listarActivos(desde: Date): Promise<RecordatorioDeToma[]> {
    return copia(await this.compartida.ejecutar(`activos:${desde.getTime()}`, () => this.real.listarActivos(desde)));
  }

  async reemplazarDe(consultaId: string, recordatorios: RecordatorioDeToma[]): Promise<void> {
    await this.real.reemplazarDe(consultaId, recordatorios);
    this.compartida.limpiar();
  }

  async quitarDe(consultaId: string): Promise<void> {
    await this.real.quitarDe(consultaId);
    this.compartida.limpiar();
  }
}

/**
 * La tarjeta «Hoy» mira 36 horas atrás y los avisos 24: una sola lectura sirve a las dos (cada una recibe solo lo suyo). La lectura compartida abarca
 * una hora MÁS: quien pregunta calcula «hace 36 horas» con su reloj y esta copia con el suyo, unos milisegundos después; sin el margen esa diferencia
 * mínima hacía que la petición pareciera más antigua que la copia y se saltaba el compartir (lo descubrió la medición de F070).
 */
const VENTANA_COMPARTIDA_HORAS = 36 + 1;

export class RegistroDeTomasCompartido implements RegistroDeTomasRepository {
  constructor(
    private readonly real: RegistroDeTomasRepository,
    private readonly ahora: () => number = Date.now,
    private readonly compartida = new LecturaCompartida<{ tomaId: string; tomadaEn: Date }[]>(),
  ) {}

  async tomadasDesde(fecha: Date): Promise<{ tomaId: string; tomadaEn: Date }[]> {
    const inicioDeLaVentana = new Date(this.ahora() - VENTANA_COMPARTIDA_HORAS * 3_600_000);
    // Una ventana más antigua que la compartida no se puede servir de la copia: se lee aparte.
    if (fecha.getTime() < inicioDeLaVentana.getTime()) return this.real.tomadasDesde(fecha);
    const todas = await this.compartida.ejecutar('tomadas', () => this.real.tomadasDesde(inicioDeLaVentana));
    return todas.filter((t) => t.tomadaEn.getTime() >= fecha.getTime());
  }

  async registrar(toma: TomaRegistrada): Promise<void> {
    await this.real.registrar(toma);
    this.compartida.limpiar();
  }

  async deshacer(tomaId: string): Promise<void> {
    await this.real.deshacer(tomaId);
    this.compartida.limpiar();
  }

  async quitarDeMedicamento(consultaId: string, medicamentoId: string): Promise<void> {
    await this.real.quitarDeMedicamento(consultaId, medicamentoId);
    this.compartida.limpiar();
  }
}

export class ProximaCitaCompartida implements ProximaCitaRepository {
  constructor(
    private readonly real: ProximaCitaRepository,
    private readonly compartida = new LecturaCompartida<ProximaCita[]>(),
  ) {}

  /** `ahora` puede diferir unos milisegundos entre quienes preguntan; los dos filtran después las que ya pasaron, así que la lista de la primera sirve. */
  async posterioresA(ahora: Date): Promise<ProximaCita[]> {
    return copia(await this.compartida.ejecutar('citas', () => this.real.posterioresA(ahora)));
  }
}
