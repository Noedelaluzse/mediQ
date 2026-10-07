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
 * Deja aceptados los consentimientos de muchas cuentas de prueba a la vez, sin pasar por las reglas (es solo preparación del escenario):
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
    }
  });
}
