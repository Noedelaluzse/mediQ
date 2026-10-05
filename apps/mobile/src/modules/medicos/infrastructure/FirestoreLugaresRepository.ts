import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';

import { claveDeLugar, type Lugar } from '../domain/Lugar';
import type { LugaresRepository } from '../domain/LugaresRepository';
import { aDocumentoLugar, deDocumentoLugar, type DocumentoLugar } from './documentosMedicos';

const RAIZ = 'mediq_users';

/** Guarda cada lugar en `mediq_users/{uid}/places/{id}` (id aleatorio; `nameKey` evita repetidos). */
export class FirestoreLugaresRepository implements LugaresRepository {
  constructor(
    private readonly db: Firestore,
    private readonly usuarioId: () => Promise<string>,
  ) {}

  private async coleccion(nombre: 'places' | 'visits') {
    return collection(this.db, RAIZ, await this.usuarioId(), nombre);
  }

  /** Consultas vigentes que apuntan a este lugar (se filtra `deletedAt` aquí para no exigir un índice compuesto). */
  private async consultasDe(id: string) {
    const lote = await getDocs(query(await this.coleccion('visits'), where('placeId', '==', id)));
    return lote.docs.filter((d) => !d.data().deletedAt);
  }

  async listar(): Promise<Lugar[]> {
    const lote = await getDocs(await this.coleccion('places'));
    return lote.docs.map((d) => deDocumentoLugar(d.id, d.data() as DocumentoLugar)).filter((l): l is Lugar => l !== null);
  }

  async obtener(id: string): Promise<Lugar | null> {
    const d = await getDoc(doc(await this.coleccion('places'), id));
    return d.exists() ? deDocumentoLugar(d.id, d.data() as DocumentoLugar) : null;
  }

  async buscarPorClave(clave: string): Promise<Lugar | null> {
    const lote = await getDocs(query(await this.coleccion('places'), where('nameKey', '==', clave)));
    const d = lote.docs[0];
    return d ? deDocumentoLugar(d.id, d.data() as DocumentoLugar) : null;
  }

  async crear(lugar: Lugar): Promise<void> {
    await setDoc(doc(await this.coleccion('places'), lugar.id), {
      ...aDocumentoLugar(lugar),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async renombrar(id: string, nombre: string): Promise<void> {
    const lote = writeBatch(this.db);
    lote.update(doc(await this.coleccion('places'), id), {
      name: nombre,
      nameKey: claveDeLugar(nombre),
      updatedAt: serverTimestamp(),
    });
    // El nombre se copia en cada consulta para pintar el diario sin lecturas extra: hay que mantenerlo al día.
    for (const v of await this.consultasDe(id)) lote.update(v.ref, { placeName: nombre });
    await lote.commit();
  }

  async contarConsultas(id: string): Promise<number> {
    return (await this.consultasDe(id)).length;
  }

  async eliminar(id: string): Promise<void> {
    const lote = writeBatch(this.db);
    for (const v of await this.consultasDe(id)) lote.update(v.ref, { placeId: null, placeName: null });
    lote.delete(doc(await this.coleccion('places'), id));
    await lote.commit();
  }
}
