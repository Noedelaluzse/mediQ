import type { ColaDeEnvioRepository } from '../domain/ColaDeEnvioRepository';
import type { ConsultaPendiente } from '../domain/ConsultaPendiente';
import type { BaseSqlite } from './BaseSqlite';
import { colaATexto, colaDeTexto } from './codecDeCola';

const CREAR_TABLA = `CREATE TABLE IF NOT EXISTS cola_de_envio (
  usuario_id TEXT PRIMARY KEY NOT NULL,
  contenido TEXT NOT NULL,
  actualizado_en INTEGER NOT NULL
)`;

/**
 * Cola de envío local en SQLite (F030): una fila por usuario con la lista de consultas por enviar en JSON. Como leer-cambiar-guardar
 * podría pisarse si dos operaciones llegan a la vez (capturar mientras se envía), las operaciones corren de una en una.
 */
export class SqliteColaDeEnvioRepository implements ColaDeEnvioRepository {
  private lista?: Promise<BaseSqlite>;
  private turno: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly abrir: () => Promise<BaseSqlite>,
    private readonly usuarioId: () => Promise<string>,
  ) {}

  private base(): Promise<BaseSqlite> {
    this.lista ??= this.abrir().then(async (b) => {
      await b.execAsync(CREAR_TABLA);
      return b;
    });
    return this.lista;
  }

  private enSerie<T>(operacion: () => Promise<T>): Promise<T> {
    const r = this.turno.then(operacion);
    this.turno = r.catch(() => undefined);
    return r;
  }

  private async leer(): Promise<ConsultaPendiente[]> {
    const fila = await (await this.base()).getFirstAsync<{ contenido: string }>('SELECT contenido FROM cola_de_envio WHERE usuario_id = ?', await this.usuarioId());
    return fila ? colaDeTexto(fila.contenido) : [];
  }

  private async escribir(cola: ConsultaPendiente[]): Promise<void> {
    const base = await this.base();
    const uid = await this.usuarioId();
    if (cola.length === 0) await base.runAsync('DELETE FROM cola_de_envio WHERE usuario_id = ?', uid);
    else await base.runAsync('INSERT OR REPLACE INTO cola_de_envio (usuario_id, contenido, actualizado_en) VALUES (?, ?, ?)', uid, colaATexto(cola), Date.now());
  }

  listar(): Promise<ConsultaPendiente[]> {
    return this.enSerie(async () => (await this.leer()).sort((a, b) => a.creadaEn.getTime() - b.creadaEn.getTime()));
  }

  agregar(consulta: ConsultaPendiente): Promise<void> {
    return this.enSerie(async () => this.escribir([...(await this.leer()).filter((c) => c.id !== consulta.id), consulta]));
  }

  actualizar(consulta: ConsultaPendiente): Promise<void> {
    return this.enSerie(async () => this.escribir((await this.leer()).map((c) => (c.id === consulta.id ? consulta : c))));
  }

  vaciar(): Promise<void> {
    return this.enSerie(() => this.escribir([]));
  }

  quitar(id: string): Promise<void> {
    return this.enSerie(async () => this.escribir((await this.leer()).filter((c) => c.id !== id)));
  }
}
