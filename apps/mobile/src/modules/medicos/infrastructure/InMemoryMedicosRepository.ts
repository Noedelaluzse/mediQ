import { claveDeLugar, type Lugar } from '../domain/Lugar';
import type { LugaresRepository } from '../domain/LugaresRepository';
import type { Medico } from '../domain/Medico';
import type { MedicosRepository } from '../domain/MedicosRepository';

/** Modo simulado (Expo Go sin Firebase): vive en memoria y se pierde al cerrar la app. */
export class InMemoryMedicosRepository implements MedicosRepository {
  private readonly datos = new Map<string, Medico>();
  async listar() {
    return [...this.datos.values()];
  }
  async obtener(id: string) {
    return this.datos.get(id) ?? null;
  }
  async guardar(m: Medico) {
    this.datos.set(m.id, m);
  }
  async contarConsultas() {
    return 0;
  }
  async eliminar(id: string) {
    this.datos.delete(id);
  }
}

export class InMemoryLugaresRepository implements LugaresRepository {
  private readonly datos = new Map<string, Lugar>();
  async listar() {
    return [...this.datos.values()];
  }
  async obtener(id: string) {
    return this.datos.get(id) ?? null;
  }
  async buscarPorClave(clave: string) {
    return [...this.datos.values()].find((l) => claveDeLugar(l.nombre) === clave) ?? null;
  }
  async crear(l: Lugar) {
    this.datos.set(l.id, l);
  }
  async renombrar(id: string, nombre: string) {
    this.datos.set(id, { id, nombre });
  }
  async contarConsultas() {
    return 0;
  }
  async eliminar(id: string) {
    this.datos.delete(id);
  }
}
