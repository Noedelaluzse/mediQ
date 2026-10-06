import type { ConsultaDelDiario, CursorDelDiario } from '../domain/Diario';
import type { DiarioRepository } from '../domain/DiarioRepository';

/** Tope de seguridad: un diario personal no debería pasar de aquí, y así una búsqueda nunca lee sin fin. */
export const MAXIMO_DE_CONSULTAS_A_BUSCAR = 2000;

export interface DiarioCompleto {
  consultas: ConsultaDelDiario[];
  /** Verdadero si había más consultas que el tope y no se cargaron todas. */
  truncado: boolean;
}

/** RF-17: lee todo el diario, página a página, para buscar en el dispositivo (Firestore no busca subcadenas). */
export class CargarTodoElDiario {
  constructor(private readonly diario: DiarioRepository) {}

  async ejecutar(): Promise<DiarioCompleto> {
    const consultas: ConsultaDelDiario[] = [];
    let cursor: CursorDelDiario | undefined;
    do {
      const pagina = await this.diario.pagina(cursor);
      consultas.push(...pagina.consultas);
      cursor = pagina.siguiente;
      if (cursor && consultas.length >= MAXIMO_DE_CONSULTAS_A_BUSCAR) {
        return { consultas: consultas.slice(0, MAXIMO_DE_CONSULTAS_A_BUSCAR), truncado: true };
      }
    } while (cursor);
    return { consultas, truncado: false };
  }
}
