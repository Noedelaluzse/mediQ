import type { Lugar } from './Lugar';

export interface LugaresRepository {
  listar(): Promise<Lugar[]>;
  obtener(id: string): Promise<Lugar | null>;
  buscarPorClave(clave: string): Promise<Lugar | null>;
  crear(lugar: Lugar): Promise<void>;
  renombrar(id: string, nombre: string): Promise<void>;
  contarConsultas(id: string): Promise<number>;
  /** Cuántas consultas vigentes tiene cada lugar (id → número), en una sola lectura: así la lista de lugares no hace una consulta por lugar (F053). */
  consultasPorLugar(): Promise<Map<string, number>>;
  /** Borra el lugar; las consultas que lo usaban se conservan sin lugar. */
  eliminar(id: string): Promise<void>;
}
