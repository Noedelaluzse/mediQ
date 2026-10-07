import type { Biometria, PreferenciaDelCandadoStore } from '../domain/Candado';

export const MENSAJE_DE_ACTIVACION = 'Confirma para activar el candado de MediQ';

/** F036: activa el candado solo si el usuario se verifica en ese momento (así se sabe que funciona y que es quien dice). */
export class ActivarCandado {
  constructor(
    private readonly preferencia: PreferenciaDelCandadoStore,
    private readonly biometria: Biometria,
  ) {}

  async ejecutar(): Promise<'activado' | 'cancelado' | 'fallo' | 'noDisponible'> {
    if ((await this.biometria.disponibilidad()) !== 'disponible') return 'noDisponible';
    const resultado = await this.biometria.autenticar(MENSAJE_DE_ACTIVACION);
    if (resultado !== 'ok') return resultado;
    await this.preferencia.guardar({ activado: true, ofrecido: true });
    return 'activado';
  }
}
