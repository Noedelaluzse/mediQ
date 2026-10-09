import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';
import { deleteObject, getBytes, ref, uploadBytes, type FirebaseStorage } from 'firebase/storage';

import { bytesABase64 } from '@/shared/kernel/base64';
import type { Conectividad } from '@/shared/kernel/Conectividad';
import { diagnostico } from '@/shared/kernel/diagnostico';
import { conTiempoLimite, esErrorDeRed } from '@/shared/kernel/red';
import { LIMITE_DE_LECTURA_MS } from '@/shared/kernel/leerConCopia';

import type { CacheDeFotos } from '../domain/CacheDeFotos';
import type { FotoDeReceta } from '../domain/FotoDeReceta';
import type { FotoDeRecetaRepository } from '../domain/FotoDeRecetaRepository';
import { aDocumentoDeFoto, claveDeCache, datosDeVersion, deDocumentoDeFoto, prefijoDeCache, rutaDeFotoDeReceta, versionDeFoto, type DocumentoDeFoto } from './documentoDeFoto';

/** Archivo en Storage (`rutaDeFotoDeReceta`) + datos en `visits/{id}/prescriptions/receta/attachments/foto`. */
export class FirestoreFotoDeRecetaRepository implements FotoDeRecetaRepository {
  constructor(
    private readonly db: Firestore,
    private readonly storage: FirebaseStorage,
    private readonly usuarioId: () => Promise<string>,
    /** Copia en el teléfono (F051): la foto se baja de Storage una vez. Un fallo de la caché nunca impide ver, guardar o quitar la foto. */
    private readonly cache: CacheDeFotos,
    /** Sin internet se muestra la copia del teléfono, si existe (F051, opción C). */
    private readonly red: Conectividad,
  ) {}

  private async referenciaDelDocumento(consultaId: string) {
    return doc(this.db, 'mediq_users', await this.usuarioId(), 'visits', consultaId, 'prescriptions', 'receta', 'attachments', 'foto');
  }

  async obtener(consultaId: string): Promise<{ foto: FotoDeReceta; uri: string } | null> {
    // Sin internet no se intenta la nube (Firestore tarda ~10 s en rendirse): se muestra la copia del teléfono, si la hay.
    if (!(await this.red.estaConectado())) return this.deLaCopia(consultaId);
    try {
      return await this.deLaNube(consultaId);
    } catch (error) {
      // Un fallo de conexión (no de permisos ni de datos) también cae a la copia; si no hay, el error sube como siempre.
      if (!esErrorDeRed(error)) throw error;
      const copia = await this.deLaCopia(consultaId);
      if (copia) return copia;
      throw error;
    }
  }

  /** La foto guardada en el teléfono de esta consulta, con el tamaño y las dimensiones que recordó su clave. */
  private async deLaCopia(consultaId: string): Promise<{ foto: FotoDeReceta; uri: string } | null> {
    const prefijo = prefijoDeCache(await this.usuarioId(), consultaId);
    const guardada = await this.cache.ultimaDe(prefijo).catch(() => null);
    if (!guardada) return null;
    const datos = datosDeVersion(guardada.clave.slice(prefijo.length));
    if (!datos) return null;
    return { foto: { tipoMime: 'image/jpeg', bytes: datos.bytes, ancho: datos.ancho, alto: datos.alto }, uri: guardada.uri };
  }

  private async deLaNube(consultaId: string): Promise<{ foto: FotoDeReceta; uri: string } | null> {
    const snap = await conTiempoLimite(getDoc(await this.referenciaDelDocumento(consultaId)), LIMITE_DE_LECTURA_MS);
    // La nube confirma que ya no hay foto (se quitó, quizá desde otro aparato): la copia de este teléfono ya no vale. Sin esto,
    // sin internet reaparecería una foto que se quitó (AUD-15).
    if (!snap.exists()) {
      await this.olvidarCopia(consultaId);
      return null;
    }
    const data = snap.data() as DocumentoDeFoto;
    const foto = deDocumentoDeFoto(data);
    if (!foto || !data.storagePath) return null;

    const usuario = await this.usuarioId();
    const clave = claveDeCache(usuario, consultaId, versionDeFoto(data));
    const guardada = await this.cache.obtener(clave).catch(() => null);
    if (guardada) return { foto, uri: guardada };

    // Se bajan los bytes con la sesión (las reglas de Storage mandan); no se usa una URL pública con token.
    // La ruta se calcula (F038), no se lee de `storagePath`: un documento manipulado no puede apuntar a otro archivo.
    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await getBytes(ref(this.storage, rutaDeFotoDeReceta(usuario, consultaId))));
    } catch (error) {
      if ((error as { code?: string }).code !== 'storage/object-not-found') throw error;
      // El registro existe pero su archivo no (quitar se interrumpió entre sus dos pasos): se lee como «sin foto» y se repara el registro.
      await this.repararRegistroSinArchivo(consultaId);
      return null;
    }
    try {
      await this.cache.quitarDe(prefijoDeCache(usuario, consultaId)); // las versiones viejas de esta consulta
      return { foto, uri: await this.cache.guardar(clave, bytes) };
    } catch (error) {
      diagnostico.advertir('foto de la receta: no se pudo guardar la copia en el teléfono', error);
      return { foto, uri: `data:${foto.tipoMime};base64,${bytesABase64(bytes)}` };
    }
  }

  async guardar(consultaId: string, foto: FotoDeReceta, base64: string): Promise<void> {
    const ruta = rutaDeFotoDeReceta(await this.usuarioId(), consultaId);
    // Antes de subir nada se mira si ya había foto: si esa lectura falla no queda nada a medias.
    const documento = await this.referenciaDelDocumento(consultaId);
    const existe = (await getDoc(documento)).exists();
    // Primero el archivo: si falla la subida no queda un registro apuntando a la nada.
    // React Native no puede crear un Blob desde bytes (`uploadString` falla con «Creating blobs from 'ArrayBuffer'…»):
    // se arma el Blob con fetch sobre una URI `data:`, que sí soporta.
    const blob = await (await fetch(`data:${foto.tipoMime};base64,${base64}`)).blob();
    await uploadBytes(ref(this.storage, ruta), blob, { contentType: foto.tipoMime });
    try {
      // `updatedAt` en cada cambio: es lo que le dice a la caché del teléfono que la foto cambió (F051).
      await setDoc(documento, { ...aDocumentoDeFoto(foto, ruta), ...(existe ? {} : { createdAt: serverTimestamp() }), updatedAt: serverTimestamp() }, { merge: true });
    } catch (error) {
      // Storage y Firestore no comparten una operación atómica (AUD-15). Si era la PRIMERA foto, el archivo recién subido se borra para no dejar
      // uno suelto que nadie ve. Si era un reemplazo, la ruta es fija y el archivo anterior ya se sobrescribió: no se puede restaurar; el registro
      // anterior queda intacto, el error sube y reintentar deja todo coherente. En ambos casos esta copia del teléfono se descarta.
      if (!existe) await this.deshacerSubida(ruta);
      await this.olvidarCopia(consultaId);
      throw error;
    }
    await this.olvidarCopia(consultaId);
  }

  /**
   * Primero el ARCHIVO y después el registro (AUD-15). Si falla el primer paso, la foto sigue entera y visible y se reintenta: nunca queda un
   * archivo oculto en la nube. Si falla el segundo, queda un registro sin archivo, que la lectura repara sola (`repararRegistroSinArchivo`).
   */
  async quitar(consultaId: string): Promise<void> {
    try {
      await deleteObject(ref(this.storage, rutaDeFotoDeReceta(await this.usuarioId(), consultaId)));
    } catch (e) {
      if ((e as { code?: string }).code !== 'storage/object-not-found') throw e;
    }
    await deleteDoc(await this.referenciaDelDocumento(consultaId));
    await this.olvidarCopia(consultaId);
  }

  /** El registro de una foto cuyo archivo ya no existe no sirve: se borra (si no se puede, no importa: se intenta en la próxima lectura) y también la copia del teléfono. */
  private async repararRegistroSinArchivo(consultaId: string): Promise<void> {
    await deleteDoc(await this.referenciaDelDocumento(consultaId)).catch((error) => diagnostico.advertir('foto de la receta: no se pudo borrar un registro sin archivo', error));
    await this.olvidarCopia(consultaId);
  }

  /** Quita el archivo que se acaba de subir cuando no se pudo guardar su registro; si tampoco se puede, queda registrado y la baja de la cuenta lo borra. */
  private async deshacerSubida(ruta: string): Promise<void> {
    await deleteObject(ref(this.storage, ruta)).catch((error) => diagnostico.advertir('foto de la receta: no se pudo deshacer una subida', error));
  }

  /** Borra de la caché del teléfono todas las versiones de la foto de esta consulta; si falla, no importa (es solo una copia). */
  private async olvidarCopia(consultaId: string): Promise<void> {
    await this.cache.quitarDe(prefijoDeCache(await this.usuarioId(), consultaId)).catch((error) => diagnostico.advertir('foto de la receta: no se pudo borrar la copia del teléfono', error));
  }
}
