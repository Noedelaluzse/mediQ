import type { Lugar } from './Lugar';

export interface LugaresRepository {
  listar(): Promise<Lugar[]>;
  obtener(id: string): Promise<Lugar | null>;
  buscarPorClave(clave: string): Promise<Lugar | null>;
  crear(lugar: Lugar): Promise<void>;
  renombrar(id: string, nombre: string): Promise<void>;
  contarConsultas(id: string): Promise<number>;
  /**
   * Cuántas consultas vigentes tiene cada lugar (id → número; los lugares sin consultas no aparecen). Con los `ids` de los lugares se hace un
   * conteo del servidor por lugar sin recorrer las consultas (F068, AUD-08); sin ellos se buscan primero. No hace una consulta por documento (F053).
   */
  consultasPorLugar(ids?: string[]): Promise<Map<string, number>>;
  /** Borra el lugar; las consultas que lo usaban se conservan sin lugar. */
  eliminar(id: string): Promise<void>;
}
