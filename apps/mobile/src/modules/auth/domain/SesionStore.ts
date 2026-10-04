import type { Sesion } from './Sesion';

/** Puerto: almacén seguro de la sesión en el dispositivo (RNF-02). */
export interface SesionStore {
  guardar(sesion: Sesion): Promise<void>;
  leer(): Promise<Sesion | null>;
  borrar(): Promise<void>;
}
