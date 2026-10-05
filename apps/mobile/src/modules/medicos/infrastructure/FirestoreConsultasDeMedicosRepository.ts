import { collection, getDocs, query, where, type Firestore } from 'firebase/firestore';

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
    const r = new Map<string, ResumenDeConsultas>();
    for (const d of lote.docs) {
      const datos = d.data() as DocumentoConsulta & { doctorId?: string };
      const c = deDocumentoConsulta(d.id, datos);
      if (!c || !datos.doctorId) continue;
      const actual = r.get(datos.doctorId);
      r.set(datos.doctorId, {
        consultas: (actual?.consultas ?? 0) + 1,
        ultimaVisita: !actual?.ultimaVisita || c.fecha > actual.ultimaVisita ? c.fecha : actual.ultimaVisita,
      });
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

  async contarTodas(): Promise<number> {
    const lote = await getDocs(await this.visitas());
    return lote.docs.filter((d) => deDocumentoConsulta(d.id, d.data() as DocumentoConsulta)).length;
  }
}
