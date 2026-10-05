import { describe, expect, it } from 'vitest';

import type { Cuenta } from '../domain/Cuenta';
import { aDocumentoPerfil, aDocumentoUsuario, deDocumentos } from './documentosCuenta';

const cuenta: Cuenta = {
  usuarioId: 'u1',
  googleSub: 'g-1',
  email: 'ana@mail.com',
  nombre: 'Ana Pérez',
  perfilPropio: { id: 'self', nombreCompleto: 'Ana Pérez', esPropio: true },
};

describe('documentos de la cuenta en Firestore', () => {
  it('el documento de usuario lleva la identidad', () => {
    expect(aDocumentoUsuario(cuenta)).toEqual({ googleSub: 'g-1', email: 'ana@mail.com', displayName: 'Ana Pérez' });
  });

  it('el documento de perfil marca si es el propio', () => {
    expect(aDocumentoPerfil(cuenta.perfilPropio)).toEqual({ fullName: 'Ana Pérez', isSelf: true });
  });

  it('reconstruye la cuenta desde sus documentos', () => {
    const u = aDocumentoUsuario(cuenta);
    const p = aDocumentoPerfil(cuenta.perfilPropio);
    expect(deDocumentos('u1', u, 'self', p)).toEqual(cuenta);
  });
});
