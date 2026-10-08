import { collection, doc, getDoc, getDocs, query, runTransaction, where, type Firestore } from 'firebase/firestore';

import type { ConsultaDeMedico, ResumenDeConsultas } from '../domain/Consultas';
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
