import { collection, doc, getDoc, getDocs, query, where, type Firestore } from 'firebase/firestore';

import type { ConsultaDeMedico, ResumenDeConsultas } from '../domain/Consultas';
import type { ConsultasDeMedicosRepository } from '../domain/ConsultasDeMedicosRepository';
import { deDocumentoConsulta, type DocumentoConsulta } from './documentoConsulta';

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
   * Cuenta las consultas vigentes y las que tienen su documento `prescriptions/receta`. Las recetas cuelgan de cada consulta, así que
   * se lee una por consulta (en paralelo): suficiente para un diario personal; si llegara a miles, conviene guardar una marca
   * `hasPrescription` en la consulta (obliga a cambiar las reglas de `visits`). Las consultas se leen UNA vez para las dos cuentas.
   */
  async totales(): Promise<{ consultas: number; conReceta: number }> {
    const usuario = await this.usuarioId();
    const vigentes = (await getDocs(await this.visitas())).docs.filter((d) => deDocumentoConsulta(d.id, d.data() as DocumentoConsulta));
    const recetas = await Promise.all(vigentes.map((d) => getDoc(doc(this.db, RAIZ, usuario, 'visits', d.id, 'prescriptions', 'receta'))));
    return { consultas: vigentes.length, conReceta: recetas.filter((r) => r.exists()).length };
  }
}
