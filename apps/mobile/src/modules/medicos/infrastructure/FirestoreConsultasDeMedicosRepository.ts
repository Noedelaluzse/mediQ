import { collection, doc, getCountFromServer, getDoc, getDocs, limit, orderBy, query, runTransaction, where, type Firestore, type QueryConstraint } from 'firebase/firestore';

import { esFaltaDeIndiceOAgregacion, RespaldoPorIndice } from '@/shared/kernel/respaldoPorIndice';

import type { ConsultaDeMedico, ResumenBasicoDeConsultas, ResumenDeConsultas } from '../domain/Consultas';
import type { ConsultasDeMedicosRepository } from '../domain/ConsultasDeMedicosRepository';
import { deDocumentoConsulta, type DocumentoConsulta } from './documentoConsulta';
import { marcaARellenar } from './marcaDeReceta';

const RAIZ = 'mediq_users';

/**
 * Lee `mediq_users/{uid}/visits`. Agrupa en el cliente para no exigir índices compuestos;
 * es suficiente para el volumen de un diario personal.
 */
export class FirestoreConsultasDeMedicosRepository implements ConsultasDeMedicosRepository {
  constructor(
    private readonly db: Firestore,
    private readonly usuarioId: () => Promise<string>,
  ) {}

  private async visitas() {
    return collection(this.db, RAIZ, await this.usuarioId(), 'visits');
  }

  /**
   * Los conteos y la búsqueda de «la última visita» los hace el servidor (F068, AUD-08). Si no puede (índice sin crear o construyéndose,
   * o sin soporte de agregaciones) se usa el recorrido de siempre y la persona no ve ningún error; pasados unos minutos se vuelve a intentar.
   */
  private readonly respaldo = new RespaldoPorIndice(Date.now, 5 * 60_000, esFaltaDeIndiceOAgregacion);

  /**
   * Por médico, un conteo (`count()`) y una búsqueda de su última consulta vigente, en lugar de bajar todas las consultas. La búsqueda ordenada
   * necesita el índice compuesto (`doctorId`, `deletedAt`, `visitedAt` desc) de `firebase/firestore.indexes.json`.
   */
  async resumenBasicoPorMedico(medicoIds: string[]): Promise<Map<string, ResumenBasicoDeConsultas>> {
    return this.respaldo.ejecutar(
      () => this.resumenBasicoContando(medicoIds),
      async () => {
        const completo = await this.resumenPorMedico();
        return new Map([...completo].filter(([id]) => medicoIds.includes(id)).map(([id, r]) => [id, { consultas: r.consultas, ...(r.ultimaVisita ? { ultimaVisita: r.ultimaVisita } : {}) }]));
      },
    );
  }

  private async resumenBasicoContando(medicoIds: string[]): Promise<Map<string, ResumenBasicoDeConsultas>> {
    const visitas = await this.visitas();
    const resumen = new Map<string, ResumenBasicoDeConsultas>();
    await Promise.all(
      medicoIds.map(async (id) => {
        const suyas = [where('doctorId', '==', id), where('deletedAt', '==', null)];
        const [conteo, ultima] = await Promise.all([getCountFromServer(query(visitas, ...suyas)), getDocs(query(visitas, ...suyas, orderBy('visitedAt', 'desc'), limit(1)))]);
        const consultas = conteo.data().count;
        if (consultas === 0) return;
        const fecha = (ultima.docs[0]?.data().visitedAt as { toDate?: () => Date } | undefined)?.toDate?.();
        resumen.set(id, { consultas, ...(fecha ? { ultimaVisita: fecha } : {}) });
      }),
    );
    return resumen;
  }

  async resumenPorMedico(): Promise<Map<string, ResumenDeConsultas>> {
    const lote = await getDocs(await this.visitas());
    const acumulado = new Map<string, { consultas: number; ultimaVisita?: Date; lugares: Map<string, number> }>();
    for (const d of lote.docs) {
      const datos = d.data() as DocumentoConsulta & { doctorId?: string };
      const c = deDocumentoConsulta(d.id, datos);
      if (!c || !datos.doctorId) continue;
      const a = acumulado.get(datos.doctorId) ?? { consultas: 0, lugares: new Map<string, number>() };
      a.consultas += 1;
      if (!a.ultimaVisita || c.fecha > a.ultimaVisita) a.ultimaVisita = c.fecha;
      if (c.lugar) a.lugares.set(c.lugar, (a.lugares.get(c.lugar) ?? 0) + 1);
      acumulado.set(datos.doctorId, a);
    }
    const r = new Map<string, ResumenDeConsultas>();
    for (const [id, a] of acumulado) {
      const lugares = [...a.lugares].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0], 'es')).map(([nombre]) => nombre);
      r.set(id, { consultas: a.consultas, ultimaVisita: a.ultimaVisita, lugares });
    }
    return r;
  }

  async deMedico(medicoId: string): Promise<ConsultaDeMedico[]> {
    const lote = await getDocs(query(await this.visitas(), where('doctorId', '==', medicoId)));
    return lote.docs
      .map((d) => deDocumentoConsulta(d.id, d.data() as DocumentoConsulta))
      .filter((c): c is ConsultaDeMedico => c !== null)
      .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  }

  /**
   * Consultas vigentes y cuántas de ellas tienen receta, recorriendo la colección una sola vez. Cada consulta lleva la marca
   * `hasPrescription` (F048; las nuevas la traen desde que se crean, F060), así que no hace falta abrir sus recetas. Las consultas
   * anteriores a F048 no la tienen: de esas, y solo de esas, se lee la receta una vez y se escribe la marca. La consulta y su receta
   * se leen y se marcan en una transacción, para no pisar una receta guardada mientras tanto (si falla no importa: se cuenta con lo
   * leído y se reintenta la próxima vez).
   */
  async totales(): Promise<{ consultas: number; conReceta: number }> {
    return this.respaldo.ejecutar(
      () => this.totalesContando(),
      () => this.totalesRecorriendo(),
    );
  }

  /**
   * Tres conteos del servidor (vigentes, con receta, sin receta) en lugar de bajar todas las consultas (F068, AUD-08). Son consultas de igualdad,
   * sin índice compuesto. Si alguna consulta anterior no trae la marca `hasPrescription` los conteos no suman: entonces se recorre, que además
   * rellena la marca.
   */
  private async totalesContando(): Promise<{ consultas: number; conReceta: number }> {
    const visitas = await this.visitas();
    const contar = async (...restricciones: QueryConstraint[]) => (await getCountFromServer(query(visitas, where('deletedAt', '==', null), ...restricciones))).data().count;
    const [todas, con, sin] = await Promise.all([contar(), contar(where('hasPrescription', '==', true)), contar(where('hasPrescription', '==', false))]);
    if (con + sin !== todas) return this.totalesRecorriendo();
    return { consultas: todas, conReceta: con };
  }

  private async totalesRecorriendo(): Promise<{ consultas: number; conReceta: number }> {
    const usuario = await this.usuarioId();
    const vigentes = (await getDocs(await this.visitas())).docs.filter((d) => deDocumentoConsulta(d.id, d.data() as DocumentoConsulta));
    const sinMarca = vigentes.filter((d) => typeof d.data().hasPrescription !== 'boolean');
    const rellenadas = await Promise.all(
      sinMarca.map(async (d) => {
        const receta = doc(this.db, RAIZ, usuario, 'visits', d.id, 'prescriptions', 'receta');
        try {
          return await runTransaction(this.db, async (tx) => {
            const consulta = await tx.get(d.ref);
            const existeReceta = (await tx.get(receta)).exists();
            if (!consulta.exists()) return false;
            const marca = marcaARellenar(consulta.data(), existeReceta);
            if (marca) {
              tx.update(d.ref, marca);
              return marca.hasPrescription;
            }
            return consulta.data().hasPrescription === true;
          });
        } catch {
          return (await getDoc(receta)).exists();
        }
      }),
    );
    const marcadas = vigentes.filter((d) => d.data().hasPrescription === true).length;
    return { consultas: vigentes.length, conReceta: marcadas + rellenadas.filter(Boolean).length };
  }
}
