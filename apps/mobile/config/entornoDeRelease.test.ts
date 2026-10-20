import { describe, expect, it } from 'vitest';

import { analizarEnv, VARIABLES_DE_RELEASE, variablesFaltantes } from './entornoDeRelease';

/**
 * F019: la versión Release lleva incrustadas las variables EXPO_PUBLIC_* al empaquetar. Si falta alguna, `firebase.ts` no crea el cliente y la app
 * trabaja EN MEMORIA sin avisar (nada se guarda en la nube): hay que detenerlo antes de compilar, no descubrirlo en el teléfono.
 */
const completo = Object.fromEntries(VARIABLES_DE_RELEASE.map((v) => [v, 'valor']));

describe('variablesFaltantes (F019)', () => {
  it('con todas las variables no falta ninguna', () => {
    expect(variablesFaltantes(completo)).toEqual([]);
  });

  it('lista las que faltan, las vacías y las que solo tienen espacios', () => {
    const r = variablesFaltantes({ ...completo, EXPO_PUBLIC_FIREBASE_API_KEY: '', EXPO_PUBLIC_FIREBASE_APP_ID: '   ', EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: undefined });
    expect(r.sort()).toEqual(['EXPO_PUBLIC_FIREBASE_API_KEY', 'EXPO_PUBLIC_FIREBASE_APP_ID', 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'].sort());
  });

  it('sin ninguna variable faltan todas, incluido el bucket de Storage (sin él las fotos no se guardan en la nube)', () => {
    const r = variablesFaltantes({});
    expect(r).toHaveLength(VARIABLES_DE_RELEASE.length);
    expect(r).toContain('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET');
  });
});

describe('analizarEnv (lee el texto de .env.local)', () => {
  it('lee CLAVE=valor, ignora comentarios y líneas vacías, y quita comillas', () => {
    const r = analizarEnv('# comentario\n\nA=1\nB="dos"\nC=\'tres\'\n  D = 4 \n');
    expect(r).toEqual({ A: '1', B: 'dos', C: 'tres', D: '4' });
  });

  it('un valor puede llevar «=» (las llaves de API a veces lo traen)', () => {
    expect(analizarEnv('K=ab=cd==')).toEqual({ K: 'ab=cd==' });
  });

  it('una línea sin «=» no rompe nada', () => {
    expect(analizarEnv('sin igual\nA=1')).toEqual({ A: '1' });
  });
});
