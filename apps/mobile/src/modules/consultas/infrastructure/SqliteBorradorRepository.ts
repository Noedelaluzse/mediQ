import type { BorradorDeConsulta } from '../domain/Borrador';
import type { BorradorRepository } from '../domain/BorradorRepository';
import type { BaseSqlite } from './BaseSqlite';

const CREAR_TABLA = `CREATE TABLE IF NOT EXISTS borradores (
  usuario_id TEXT PRIMARY KEY NOT NULL,
  contenido TEXT NOT NULL,
  actualizado_en INTEGER NOT NULL
)`;

/** Borrador local en SQLite: una fila por usuario, con el formulario como JSON. */
export class SqliteBorradorRepository implements BorradorRepository {
  private lista?: Promise<BaseSqlite>;

  constructor(
    private readonly abrir: () => Promise<BaseSqlite>,
    private readonly usuarioId: () => Promise<string>,
  ) {}

  /** Abre la base y crea la tabla una sola vez. */
  private base(): Promise<BaseSqlite> {
    this.lista ??= this.abrir().then(async (b) => {
      await b.execAsync(CREAR_TABLA);
      return b;
    });
    return this.lista;
  }

  async leer(): Promise<BorradorDeConsulta | null> {
    const fila = await (await this.base()).getFirstAsync<{ contenido: string }>(
      'SELECT contenido FROM borradores WHERE usuario_id = ?',
      await this.usuarioId(),
    );
    if (!fila) return null;
    try {
      return JSON.parse(fila.contenido) as BorradorDeConsulta;
    } catch {
      return null;
    }
  }

  async guardar(borrador: BorradorDeConsulta): Promise<void> {
    await (await this.base()).runAsync(
      'INSERT OR REPLACE INTO borradores (usuario_id, contenido, actualizado_en) VALUES (?, ?, ?)',
      await this.usuarioId(),
      JSON.stringify(borrador),
      Date.now(),
    );
  }

  async borrar(): Promise<void> {
    await (await this.base()).runAsync('DELETE FROM borradores WHERE usuario_id = ?', await this.usuarioId());
  }
}
