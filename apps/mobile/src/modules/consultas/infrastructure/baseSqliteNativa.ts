import * as SQLite from 'expo-sqlite';

import type { BaseSqlite } from './BaseSqlite';

/** Abre la base local `mediq.db` (solo en el teléfono; no se puede importar en las pruebas de Node). */
export const abrirBaseSqliteNativa = (): Promise<BaseSqlite> => SQLite.openDatabaseAsync('mediq.db') as Promise<BaseSqlite>;
