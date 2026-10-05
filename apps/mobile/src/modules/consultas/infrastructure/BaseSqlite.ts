/** Lo mínimo que se usa de expo-sqlite; permite probar el repositorio con una base falsa. */
export interface BaseSqlite {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: unknown[]): Promise<unknown>;
  getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null>;
}
