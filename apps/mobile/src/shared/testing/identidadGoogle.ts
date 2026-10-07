// Solo para las pruebas de emulador (F042): una sesión con la identidad de Google que trae el token real de Firebase
// (`firebase.identities['google.com'] = [googleSub]`, comprobado con una sesión real el 2026-10-07).
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';

export const contextoConGoogle = (entorno: RulesTestEnvironment, uid: string, googleSub: string) =>
  entorno.authenticatedContext(uid, { firebase: { sign_in_provider: 'google.com', identities: { 'google.com': [googleSub], email: [`${uid}@mail.com`] } } });
