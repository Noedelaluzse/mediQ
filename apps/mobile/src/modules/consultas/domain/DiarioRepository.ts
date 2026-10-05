import type { CursorDelDiario, PaginaDelDiario } from './Diario';

export interface DiarioRepository {
  /** Una página de unas 20 consultas vigentes, de la más reciente a la más antigua, a partir del cursor. */
  pagina(cursor?: CursorDelDiario): Promise<PaginaDelDiario>;
}
