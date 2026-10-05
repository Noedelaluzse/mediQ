import { DOCUMENTOS, type Consentimiento, type Documento } from '../domain/Consentimiento';

export type DocumentoDeConsentimiento = { documento: string; version: string };
type Leido = { documento: string; version: string; acceptedAt: { toDate(): Date } | null };

/** La fecha no se guarda desde el cliente: la pone el servidor (`serverTimestamp`). */
export const aDocumentoConsentimiento = (c: Consentimiento): DocumentoDeConsentimiento => ({
  documento: c.documento,
  version: c.version,
});

export function deDocumentoConsentimiento(d: Leido): Consentimiento | null {
  if (!DOCUMENTOS.includes(d.documento as Documento)) return null;
  return { documento: d.documento as Documento, version: d.version, aceptadoEn: d.acceptedAt?.toDate() ?? new Date() };
}
