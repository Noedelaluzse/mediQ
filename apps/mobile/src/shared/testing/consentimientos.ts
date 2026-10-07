// Solo para las pruebas de emulador: deja aceptados el aviso de privacidad y los términos de una cuenta, por el camino real (las reglas
// de `consents` exigen el id `documento_versión` y la hora del servidor). La regla de `visits` pide estos dos recibos (F031).
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, serverTimestamp, setDoc, Timestamp, type Firestore } from 'firebase/firestore';

/** La versión mínima que exigen las reglas de Firestore; la app puede pedir una más nueva sin romper nada. */
export const VERSION_DE_CONSENTIMIENTO_EXIGIDA = '2026-10-06';

export async function aceptarConsentimientos(db: Firestore, uid: string, version: string = VERSION_DE_CONSENTIMIENTO_EXIGIDA): Promise<void> {
  for (const documento of ['aviso_privacidad', 'terminos']) {
    await setDoc(doc(db, `mediq_users/${uid}/consents/${documento}_${version}`), { documento, version, acceptedAt: serverTimestamp() });
  }
}

/**
 * Deja aceptados los consentimientos (y el perfil propio `self`, F041) de muchas cuentas de prueba a la vez, sin pasar por las reglas (es solo preparación del escenario):
 * las pruebas de emulador que escriben consultas con sus cuentas `u1`, `t3`, `r2`… los necesitan desde F031. Cubre los ids de una
 * letra y un dígito más `u3b` e `intruso` (la cuenta que intenta lo que no debe).
 */
export const CUENTAS_DE_PRUEBA: string[] = [...'abfiprstuv'].flatMap((l) => Array.from({ length: 9 }, (_, n) => `${l}${n + 1}`)).concat(['u3b', 'intruso']);

export async function sembrarConsentimientos(entorno: RulesTestEnvironment, uids: string[] = CUENTAS_DE_PRUEBA, version: string = VERSION_DE_CONSENTIMIENTO_EXIGIDA): Promise<void> {
  await entorno.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore() as unknown as Firestore;
    for (const uid of uids) {
      for (const documento of ['aviso_privacidad', 'terminos']) {
        await setDoc(doc(db, `mediq_users/${uid}/consents/${documento}_${version}`), { documento, version, acceptedAt: Timestamp.now() });
      }
      // F041: las consultas apuntan a un perfil de paciente que debe existir; el propio (`self`) lo crea el registro de la cuenta.
      await setDoc(doc(db, `mediq_users/${uid}/patients/self`), { fullName: 'Perfil de prueba', isSelf: true, createdAt: Timestamp.now() });
    }
  });
}

/**
 * F041: las reglas exigen que lo referenciado exista (perfil, médico, lugar, consulta). Deja documentos sueltos de una cuenta, sin pasar por
 * las reglas (es preparación del escenario). Las rutas son relativas a `mediq_users/{uid}/`, p. ej. `{ 'visits/c1': { patientId: 'self' } }`.
 */
export async function sembrarDocumentos(entorno: RulesTestEnvironment, uid: string, documentos: Record<string, Record<string, unknown>>): Promise<void> {
  await entorno.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore() as unknown as Firestore;
    for (const [ruta, datos] of Object.entries(documentos)) await setDoc(doc(db, `mediq_users/${uid}/${ruta}`), datos);
  });
}

/** Perfil propio `self` de cuentas que no están en `CUENTAS_DE_PRUEBA`. */
export const sembrarPerfilPropio = (entorno: RulesTestEnvironment, uids: string[]) =>
  Promise.all(uids.map((uid) => sembrarDocumentos(entorno, uid, { 'patients/self': { fullName: 'Perfil de prueba', isSelf: true } })));

/**
 * Siembra, en una sola pasada, la misma lista de consultas (`visits/{id}`) en muchas cuentas (para recordatorios y tomas, F041).
 * Son consultas válidas por completo: desde F048 guardar una receta actualiza su consulta y las reglas validan el documento entero.
 */
export async function sembrarConsultas(entorno: RulesTestEnvironment, uids: string[], ids: string[]): Promise<void> {
  await entorno.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore() as unknown as Firestore;
    await Promise.all(uids.flatMap((uid) => ids.map((id) => setDoc(doc(db, `mediq_users/${uid}/visits/${id}`), { patientId: 'self', specialty: 'cardiologia', visitType: 'especialista', visitMode: 'presencial', visitedAt: Timestamp.fromDate(new Date(Date.now() - 86_400_000)), deletedAt: null }))));
  });
}
