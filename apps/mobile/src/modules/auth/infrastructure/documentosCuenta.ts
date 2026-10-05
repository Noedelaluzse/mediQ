import type { Cuenta, Perfil } from '../domain/Cuenta';

export type DocumentoUsuario = { googleSub: string; email: string; displayName: string };
export type DocumentoPerfil = { fullName: string; isSelf: boolean };

export const aDocumentoUsuario = (c: Cuenta): DocumentoUsuario => ({
  googleSub: c.googleSub,
  email: c.email,
  displayName: c.nombre,
});

export const aDocumentoPerfil = (p: Perfil): DocumentoPerfil => ({ fullName: p.nombreCompleto, isSelf: p.esPropio });

export const deDocumentos = (usuarioId: string, u: DocumentoUsuario, perfilId: string, p: DocumentoPerfil): Cuenta => ({
  usuarioId,
  googleSub: u.googleSub,
  email: u.email,
  nombre: u.displayName,
  perfilPropio: { id: perfilId, nombreCompleto: p.fullName, esPropio: p.isSelf },
});
