import type { PaginaDelDiario } from '../domain/Diario';
import type { DiarioRepository } from '../domain/DiarioRepository';

/** Modo simulado (sin Firebase): el diario siempre está vacío. */
export class InMemoryDiarioRepository implements DiarioRepository {
  async pagina(): Promise<PaginaDelDiario> {
    return { consultas: [] };
  }
}
