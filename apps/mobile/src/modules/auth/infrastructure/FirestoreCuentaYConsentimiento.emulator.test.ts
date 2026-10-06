/// <reference types="node" />
// Integración REAL: el registro de cuenta y los consentimientos, con los repositorios de la app y las reglas reales.
// Es lo primero que ejecuta la app al iniciar sesión: si las reglas no coincidieran con lo que escriben, nadie podría entrar.
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { type Firestore } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { RegistrarCuenta } from '../application/RegistrarCuenta';
import { VERSIONES_VIGENTES } from '../domain/Consentimiento';
import { FirestoreConsentimientosRepository } from './FirestoreConsentimientosRepository';
import { FirestoreCuentasRepository } from './FirestoreCuentasRepository';

const hayEmulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

describe.skipIf(!hayEmulador)('Cuenta y consentimientos con los repositorios reales (reglas reales)', () => {
  let entorno: RulesTestEnvironment;

  beforeAll(async () => {
    const [host, puerto] = (process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080').split(':');
    entorno = await initializeTestEnvironment({
      projectId: 'demo-mediq-cuenta',
      firestore: { host, port: Number(puerto), rules: readFileSync(resolve(__dirname, '../../../../../../firebase/firestore.rules'), 'utf8') },
    });
  });
  afterAll(async () => {
    await entorno?.cleanup();
  });

  const db = (uid: string) => entorno.authenticatedContext(uid).firestore() as unknown as Firestore;
  const identidad = (uid: string, nombre = 'Ana Pérez') => ({ usuarioId: uid, googleSub: `sub-${uid}`, email: `${uid}@mail.com`, nombre });

  it('la primera sesión crea cuenta y perfil propio; la segunda los encuentra', async () => {
    const registrar = new RegistrarCuenta(new FirestoreCuentasRepository(db('a1')));
    const primera = await registrar.ejecutar(identidad('a1'));
    expect(primera.primeraVez).toBe(true);
    expect(primera.cuenta.perfilPropio).toEqual({ id: 'self', nombreCompleto: 'Ana Pérez', esPropio: true });
    const segunda = await registrar.ejecutar(identidad('a1'));
    expect(segunda.primeraVez).toBe(false);
  });

  it('una cuenta de Google sin nombre usa la parte local del correo (nombre de perfil nunca vacío)', async () => {
    const r = await new RegistrarCuenta(new FirestoreCuentasRepository(db('a2'))).ejecutar(identidad('a2', ''));
    expect(r.cuenta.perfilPropio.nombreCompleto).toBe('a2');
  });

  it('aceptar los documentos vigentes registra un recibo por documento y se puede listar', async () => {
    const repo = new FirestoreConsentimientosRepository(db('a3'));
    for (const documento of ['aviso_privacidad', 'terminos'] as const) {
      await repo.registrar('a3', { documento, version: VERSIONES_VIGENTES[documento], aceptadoEn: new Date() });
    }
    const recibos = await repo.listar('a3');
    expect(recibos.map((c) => c.documento).sort()).toEqual(['aviso_privacidad', 'terminos']);
    expect(recibos.every((c) => c.aceptadoEn instanceof Date)).toBe(true);
  });

  it('un recibo ya aceptado no se puede reescribir (queda como prueba inmutable)', async () => {
    const repo = new FirestoreConsentimientosRepository(db('a4'));
    const c = { documento: 'terminos' as const, version: VERSIONES_VIGENTES.terminos, aceptadoEn: new Date() };
    await repo.registrar('a4', c);
    await expect(repo.registrar('a4', c)).rejects.toThrow();
  });

  it('no se puede crear la cuenta de otro usuario', async () => {
    const intruso = new FirestoreCuentasRepository(db('intruso'));
    await expect(intruso.crear({ ...identidad('a5'), perfilPropio: { id: 'self', nombreCompleto: 'X', esPropio: true } })).rejects.toThrow();
  });
});
