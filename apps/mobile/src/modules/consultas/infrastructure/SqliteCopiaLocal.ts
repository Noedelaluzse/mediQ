import type { CopiaLocal } from '@/shared/kernel/CopiaLocal';

import type { BaseSqlite } from './BaseSqlite';

const CREAR_TABLA = `CREATE TABLE IF NOT EXISTS copia_local (
  usuario_id TEXT NOT NULL,
  clave TEXT NOT NULL,
  contenido TEXT NOT NULL,
  actualizado_en INTEGER NOT NULL,
  PRIMARY KEY (usuario_id, clave)
)`;

/** Copia de lectura en SQLite (RNF-11): una fila por usuario y clave, con el contenido como texto. */
export class SqliteCopiaLocal implements CopiaLocal {
  private lista?: Promise<BaseSqlite>;

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

  async guardar(clave: string, contenido: string): Promise<void> {
    await (await this.base()).runAsync('INSERT OR REPLACE INTO copia_local (usuario_id, clave, contenido, actualizado_en) VALUES (?, ?, ?, ?)', await this.usuarioId(), clave, contenido, Date.now());
  }

  async leer(clave: string): Promise<string | null> {
    const fila = await (await this.base()).getFirstAsync<{ contenido: string }>('SELECT contenido FROM copia_local WHERE usuario_id = ? AND clave = ?', await this.usuarioId(), clave);
    return fila ? fila.contenido : null;
  }

  async limpiar(): Promise<void> {
    await (await this.base()).runAsync('DELETE FROM copia_local WHERE usuario_id = ?', await this.usuarioId());
  }
}
